/**
 * @file artist-report-export-client.ts
 * @description 艺人报表导出客户端 — 优先调用服务端导出（带审计），失败回退本地 CSV
 * @module services
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 *
 * 策略：
 * 1. 调用 POST /api/reports/artist/export，由服务端生成 CSV 并写入审计；
 * 2. 服务端不可用（断库/离线/参数拒绝）时，回退到浏览器本地导出，保证演示可用；
 * 3. 本地导出不写审计，仅用于 Mock/离线场景，生产环境应保持服务端导出可用。
 */

import { ARTIST_EXPORT_FIELDS, buildArtistExportFilename, type ArtistExportFilter, type ArtistReportExportType } from "@/lib/services/artist-report-export"
import { exportReportRows } from "@/lib/services/export"

export type ArtistExportOutcome = "server" | "fallback" | "skipped"

/** 本地时区 YYYY-MM-DD，避免 toISOString 的 UTC 偏移 */
export function toArtistExportDate(date?: Date): string | undefined {
  if (!date) return undefined
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function filenameFromDisposition(header: string | null): string | undefined {
  if (!header) return undefined
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1])
    } catch {
      return utf8[1]
    }
  }
  const plain = /filename="([^"]+)"/i.exec(header)
  return plain?.[1]
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = window.localStorage.getItem("auth_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * 导出艺人报表。
 * @param reportType 报表类型
 * @param filter 服务端筛选条件（与页面筛选一致）
 * @param fallbackRows 服务端不可用时用于本地导出的数据
 */
export async function exportArtistReport(
  reportType: ArtistReportExportType,
  filter: ArtistExportFilter,
  fallbackRows: readonly object[]
): Promise<ArtistExportOutcome> {
  try {
    const response = await fetch("/api/reports/artist/export", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ reportType, filter }),
    })

    if (response.ok) {
      const blob = await response.blob()
      const filename =
        filenameFromDisposition(response.headers.get("content-disposition")) ??
        buildArtistExportFilename(reportType)
      downloadBlob(blob, filename)
      return "server"
    }

    const payload = await response.json().catch(() => null)
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message?: unknown }).message)
        : `HTTP ${response.status}`
    console.warn(`[artist-report] 服务端导出失败，回退本地导出：${message}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[artist-report] 服务端导出异常，回退本地导出：${message}`)
  }

  if (fallbackRows.length === 0) return "skipped"

  exportReportRows(
    fallbackRows,
    ARTIST_EXPORT_FIELDS[reportType],
    buildArtistExportFilename(reportType)
  )
  return "fallback"
}
