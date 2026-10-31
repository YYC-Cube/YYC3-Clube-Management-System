/**
 * @file route.ts
 * @description 艺人报表导出接口 — 服务端生成 CSV、写入审计日志、限制导出上限
 * @module api/reports/artist/export
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 *
 * 请求体：
 * {
 *   "reportType": "clock-detail" | "clock-summary" | "fee-deduction" | "fee-summary",
 *   "filter": { "from": "YYYY-MM-DD", "to": "...", "store": "...", "artistId": "...",
 *               "status": "...", "type": "...", "search": "..." }
 * }
 *
 * 响应：
 * - 200：text/csv（UTF-8 BOM），响应头 X-Export-Row-Count / X-Artist-Data-Source
 * - 400：参数错误或超过单次导出行数上限
 * - 500：数据源强制 db 且查询失败（不泄漏内部细节）
 *
 * 安全说明：
 * - 仅接受白名单筛选字段，SQL 全参数化；
 * - 操作人优先取 `Authorization: Bearer <JWT>` 校验结果（trust=jwt，不可伪造）；
 *   无有效令牌时回退 `x-operator-*` 请求头并标记 trust=header（过渡期，可伪造）；
 * - 审计写入失败不阻断导出，仅记录 warn，避免合规日志影响业务可用性。
 */

import { NextRequest, NextResponse } from "next/server"
import { artistReportRepository } from "@/lib/db/repositories/artist-report-repository"
import { getArtistExportData } from "@/lib/services/artist-report-data"
import { resolveExportOperator } from "@/lib/services/export-operator"
import {
  ARTIST_EXPORT_FIELDS,
  MAX_EXPORT_ROWS,
  buildArtistExportFilename,
  isArtistReportExportType,
  toArtistExportSearchParams,
  type ArtistExportFilter,
} from "@/lib/services/artist-report-export"
import {
  parseArtistClockQuery,
  parseArtistDeductionQuery,
} from "@/lib/services/artist-report-query"
import { buildReportCsv } from "@/lib/services/export"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const FILTER_KEYS: Array<keyof ArtistExportFilter> = [
  "from",
  "to",
  "store",
  "artistId",
  "status",
  "type",
  "search",
]

function pickFilter(raw: unknown): ArtistExportFilter {
  if (!raw || typeof raw !== "object") return {}
  const source = raw as Record<string, unknown>
  const filter: ArtistExportFilter = {}
  for (const key of FILTER_KEYS) {
    const value = source[key]
    if (typeof value === "string" && value.trim()) {
      filter[key] = value.trim()
    }
  }
  return filter
}

function contentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, "_")
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

function clientIp(request: NextRequest): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim()
  return request.headers.get("x-real-ip") ?? undefined
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, data: null, message: "请求体不是合法 JSON" },
      { status: 400 }
    )
  }

  const payload = (body ?? {}) as Record<string, unknown>
  const reportType = payload.reportType
  if (!isArtistReportExportType(reportType)) {
    return NextResponse.json(
      { success: false, data: null, message: "参数 reportType 无效" },
      { status: 400 }
    )
  }

  const filter = pickFilter(payload.filter)
  const params = toArtistExportSearchParams(filter)
  const parsed =
    reportType === "fee-deduction"
      ? parseArtistDeductionQuery(params)
      : parseArtistClockQuery(params)

  if (parsed.errors.length > 0) {
    return NextResponse.json(
      { success: false, data: null, message: parsed.errors.join("；") },
      { status: 400 }
    )
  }

  try {
    const { data, total, source } = await getArtistExportData(reportType, parsed.filter)

    if (total > MAX_EXPORT_ROWS) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          message: `当前筛选结果 ${total} 行，超过单次导出上限 ${MAX_EXPORT_ROWS} 行，请缩小日期范围或增加筛选条件`,
        },
        { status: 400 }
      )
    }

    const csv = `\uFEFF${buildReportCsv(data, ARTIST_EXPORT_FIELDS[reportType])}`
    const filename = buildArtistExportFilename(reportType)

    const operator = await resolveExportOperator(request.headers)
    if (operator.trust !== "jwt") {
      console.warn(
        `[artist-report] 导出操作人未通过令牌校验（trust=${operator.trust}），审计记录可能不可信`
      )
    }

    try {
      await artistReportRepository.recordExportAudit({
        reportType,
        filter: { ...filter },
        rowCount: total,
        dataSource: source,
        operatorTrust: operator.trust,
        operatorId: operator.operatorId,
        operatorName: operator.operatorName,
        clientIp: clientIp(request),
        userAgent: request.headers.get("user-agent") ?? undefined,
      })
    } catch (auditError) {
      const message = auditError instanceof Error ? auditError.message : String(auditError)
      console.warn(`[artist-report] 导出审计写入失败：${message}`)
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": contentDisposition(filename),
        "Cache-Control": "no-store",
        "X-Export-Row-Count": String(total),
        "X-Artist-Data-Source": source,
        "X-Operator-Trust": operator.trust,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[artist-report] 导出失败：${message}`)
    return NextResponse.json(
      { success: false, data: null, message: "导出失败，请稍后重试" },
      { status: 500 }
    )
  }
}
