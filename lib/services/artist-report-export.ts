/**
 * @file artist-report-export.ts
 * @description 艺人报表导出契约 — 报表类型、列定义、行数上限、文件名与筛选参数序列化
 * @module services
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 *
 * 说明：
 * - 本文件为纯函数/常量，服务端（导出 API、审计）与客户端（回退导出）共用；
 * - 服务端导出为审计权威来源，客户端导出仅作为 Mock/离线回退；
 * - 单次导出上限 50000 行，防止全量数据拖垮服务端与浏览器。
 */

import type { ReportExportField } from "@/lib/services/export"

export type ArtistReportExportType =
  | "clock-detail"
  | "clock-summary"
  | "fee-deduction"
  | "fee-summary"

export const ARTIST_REPORT_EXPORT_TYPES: readonly ArtistReportExportType[] = [
  "clock-detail",
  "clock-summary",
  "fee-deduction",
  "fee-summary",
]

export const MAX_EXPORT_ROWS = 50_000

export const ARTIST_EXPORT_REPORT_LABELS: Record<ArtistReportExportType, string> = {
  "clock-detail": "艺人上下钟明细",
  "clock-summary": "艺人上下钟汇总",
  "fee-deduction": "艺人台费扣款明细",
  "fee-summary": "艺人台费流水汇总",
}

export interface ArtistExportFilter {
  from?: string
  to?: string
  store?: string
  artistId?: string
  status?: string
  type?: string
  search?: string
}

export interface ArtistExportAuditInfo {
  operatorId?: string
  operatorName?: string
  clientIp?: string
  userAgent?: string
}

export function isArtistReportExportType(value: unknown): value is ArtistReportExportType {
  return (
    typeof value === "string" &&
    ARTIST_REPORT_EXPORT_TYPES.includes(value as ArtistReportExportType)
  )
}

/** 按类型与门店时区（Asia/Shanghai）生成导出文件名 */
export function buildArtistExportFilename(
  type: ArtistReportExportType,
  date: Date = new Date()
): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
  return `${ARTIST_EXPORT_REPORT_LABELS[type]}_${day}.csv`
}

/** 将导出筛选条件序列化为查询串（空值不写入） */
export function toArtistExportSearchParams(filter: ArtistExportFilter): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filter)) {
    if (typeof value === "string" && value.trim()) {
      params.set(key, value.trim())
    }
  }
  return params
}

/** 报表列定义（服务端 CSV 与客户端回退共用，避免多处漂移） */
export const ARTIST_EXPORT_FIELDS: Record<ArtistReportExportType, readonly ReportExportField[]> = {
  "clock-detail": [
    { key: "id", label: "上钟单号" },
    { key: "artistCode", label: "艺人编号" },
    { key: "artistName", label: "艺人姓名" },
    { key: "level", label: "艺人等级" },
    { key: "store", label: "门店" },
    { key: "room", label: "包厢" },
    { key: "guestName", label: "客人" },
    { key: "clockIn", label: "上钟时间" },
    { key: "clockOut", label: "下钟时间" },
    { key: "durationMinutes", label: "时长(分钟)" },
    { key: "stageFee", label: "台费" },
    { key: "deduction", label: "扣款" },
    { key: "netFee", label: "实收台费" },
    { key: "status", label: "状态" },
    { key: "operator", label: "经办人" },
  ],
  "clock-summary": [
    { key: "artistCode", label: "艺人编号" },
    { key: "artistName", label: "艺人姓名" },
    { key: "level", label: "艺人等级" },
    { key: "store", label: "门店" },
    { key: "clockCount", label: "上钟次数" },
    { key: "totalMinutes", label: "累计时长(分钟)" },
    { key: "averageMinutes", label: "平均时长(分钟)" },
    { key: "totalStageFee", label: "台费收入" },
    { key: "totalDeduction", label: "扣款金额" },
    { key: "netFee", label: "实收台费" },
  ],
  "fee-deduction": [
    { key: "time", label: "扣款时间" },
    { key: "id", label: "扣款单号" },
    { key: "artistCode", label: "艺人编号" },
    { key: "artistName", label: "艺人姓名" },
    { key: "level", label: "艺人等级" },
    { key: "store", label: "门店" },
    { key: "room", label: "包厢" },
    { key: "clockRecordId", label: "关联上钟单" },
    { key: "type", label: "扣款类型" },
    { key: "stageFee", label: "关联台费" },
    { key: "amount", label: "扣款金额" },
    { key: "reason", label: "扣款原因" },
    { key: "operator", label: "经办人" },
    { key: "status", label: "状态" },
  ],
  "fee-summary": [
    { key: "artistCode", label: "艺人编号" },
    { key: "artistName", label: "艺人姓名" },
    { key: "level", label: "艺人等级" },
    { key: "store", label: "门店" },
    { key: "clockCount", label: "上钟次数" },
    { key: "stageFeeTotal", label: "台费总额" },
    { key: "deductionTotal", label: "扣款总额" },
    { key: "netFee", label: "应结台费" },
    { key: "settledFee", label: "已结台费" },
    { key: "unsettledFee", label: "待结台费" },
    { key: "settlementRate", label: "结算进度(%)" },
  ],
}
