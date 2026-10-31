/**
 * @file route.ts
 * @description 艺人台费扣款明细报表 API — 分页 + 指标 + 数据源标记
 * @module api/reports/artist/fee-deduction
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 */

import { type NextRequest, NextResponse } from "next/server"
import { getArtistDeductionDetail } from "@/lib/services/artist-report-data"
import { parseArtistDeductionQuery } from "@/lib/services/artist-report-query"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const { filter, pagination, errors } = parseArtistDeductionQuery(request.nextUrl.searchParams)

  if (errors.length > 0) {
    return NextResponse.json(
      { success: false, data: null, message: errors.join("；") },
      { status: 400 }
    )
  }

  try {
    const result = await getArtistDeductionDetail(filter, pagination)

    return NextResponse.json(
      {
        success: true,
        data: {
          data: result.data,
          pagination: {
            page: result.page,
            pageSize: result.pageSize,
            total: result.total,
            totalPages: result.totalPages,
          },
          metrics: result.metrics,
          source: result.source,
        },
        message: "获取艺人台费扣款明细成功",
      },
      { headers: { "X-Artist-Data-Source": result.source } }
    )
  } catch (error) {
    console.error("[artist-report] 台费扣款明细查询失败:", error)
    return NextResponse.json(
      { success: false, data: null, message: "获取艺人台费扣款明细失败" },
      { status: 500 }
    )
  }
}
