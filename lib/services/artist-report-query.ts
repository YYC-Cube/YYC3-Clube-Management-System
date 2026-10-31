/**
 * @file artist-report-query.ts
 * @description 艺人报表 API 查询参数解析与校验（纯函数，可单测）
 * @module services
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 */

import type { ClockStatus, DeductionStatus, DeductionType } from "@/lib/services/artist-report"

export const CLOCK_STATUS_VALUES: ClockStatus[] = ["服务中", "待结算", "已结算"]

export const DEDUCTION_TYPE_VALUES: DeductionType[] = [
  "迟到",
  "早退",
  "缺勤",
  "服务投诉",
  "违规罚款",
  "设备损坏",
  "其他",
]

export const DEDUCTION_STATUS_VALUES: DeductionStatus[] = ["已扣款", "待确认", "已撤销"]

export interface ArtistReportPagination {
  page: number
  pageSize: number
  offset: number
}

export interface ArtistClockQuery {
  from?: string
  to?: string
  store?: string
  artistId?: string
  status?: ClockStatus | "all"
  search?: string
}

export interface ArtistDeductionQuery {
  from?: string
  to?: string
  store?: string
  type?: DeductionType | "all"
  status?: DeductionStatus | "all"
  search?: string
}

export interface ParsedQuery<T> {
  filter: T
  pagination: ArtistReportPagination
  errors: string[]
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MAX_PAGE_SIZE = 200
const DEFAULT_PAGE_SIZE = 20

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return false
  return date.toISOString().slice(0, 10) === value
}

function readDate(
  params: URLSearchParams,
  key: "from" | "to",
  errors: string[]
): string | undefined {
  const raw = params.get(key)?.trim()
  if (!raw) return undefined
  if (!isValidIsoDate(raw)) {
    errors.push(`参数 ${key} 日期格式无效，应为 YYYY-MM-DD`)
    return undefined
  }
  return raw
}

function readPositiveInt(raw: string | null, fallback: number, max: number): number {
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(parsed, max)
}

export function parseArtistReportPagination(params: URLSearchParams): ArtistReportPagination {
  const page = readPositiveInt(params.get("page"), 1, Number.MAX_SAFE_INTEGER)
  const pageSize = readPositiveInt(params.get("pageSize"), DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)
  return { page, pageSize, offset: (page - 1) * pageSize }
}

function readCommon(params: URLSearchParams, errors: string[]) {
  return {
    from: readDate(params, "from", errors),
    to: readDate(params, "to", errors),
    store: params.get("store")?.trim() || undefined,
    artistId: params.get("artistId")?.trim() || params.get("artist")?.trim() || undefined,
    search: params.get("search")?.trim() || params.get("keyword")?.trim() || undefined,
  }
}

export function parseArtistClockQuery(params: URLSearchParams): ParsedQuery<ArtistClockQuery> {
  const errors: string[] = []
  const common = readCommon(params, errors)
  const rawStatus = params.get("status")?.trim()

  let status: ClockStatus | "all" = "all"
  if (rawStatus) {
    if (rawStatus === "all") {
      status = "all"
    } else if (CLOCK_STATUS_VALUES.includes(rawStatus as ClockStatus)) {
      status = rawStatus as ClockStatus
    } else {
      errors.push(`参数 status 无效，可选值：all、${CLOCK_STATUS_VALUES.join("、")}`)
    }
  }

  return {
    filter: { ...common, status },
    pagination: parseArtistReportPagination(params),
    errors,
  }
}

export function parseArtistDeductionQuery(params: URLSearchParams): ParsedQuery<ArtistDeductionQuery> {
  const errors: string[] = []
  const common = readCommon(params, errors)

  const rawType = params.get("type")?.trim()
  let type: DeductionType | "all" = "all"
  if (rawType) {
    if (rawType === "all") {
      type = "all"
    } else if (DEDUCTION_TYPE_VALUES.includes(rawType as DeductionType)) {
      type = rawType as DeductionType
    } else {
      errors.push(`参数 type 无效，可选值：all、${DEDUCTION_TYPE_VALUES.join("、")}`)
    }
  }

  const rawStatus = params.get("status")?.trim()
  let status: DeductionStatus | "all" = "all"
  if (rawStatus) {
    if (rawStatus === "all") {
      status = "all"
    } else if (DEDUCTION_STATUS_VALUES.includes(rawStatus as DeductionStatus)) {
      status = rawStatus as DeductionStatus
    } else {
      errors.push(`参数 status 无效，可选值：all、${DEDUCTION_STATUS_VALUES.join("、")}`)
    }
  }

  return {
    filter: { ...common, type, status },
    pagination: parseArtistReportPagination(params),
    errors,
  }
}
