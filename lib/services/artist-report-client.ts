/**
 * @file artist-report-client.ts
 * @description 艺人报表前端数据获取 — 自动分页拉取，失败时由调用方回退 Mock
 * @module services
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 */

import type {
  ArtistClockRecord,
  ArtistFeeDeductionRecord,
} from "@/lib/services/artist-report"

interface ArtistReportApiPayload<T> {
  success: boolean
  data?: {
    data?: T[]
    pagination?: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
    source?: "db" | "mock"
  }
  message?: string
}

const PAGE_SIZE = 200
const MAX_PAGES = 10

async function fetchAllPages<T>(path: string): Promise<T[] | null> {
  const rows: T[] = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await fetch(`${path}?page=${page}&pageSize=${PAGE_SIZE}`, {
      cache: "no-store",
    })
    if (!response.ok) return null

    const payload = (await response.json()) as ArtistReportApiPayload<T>
    const batch = payload?.data?.data
    if (!payload?.success || !Array.isArray(batch)) return null

    rows.push(...batch)

    const totalPages = payload.data?.pagination?.totalPages ?? 0
    if (batch.length === 0 || page >= totalPages) break
  }

  return rows
}

export function fetchArtistClockRecords(): Promise<ArtistClockRecord[] | null> {
  return fetchAllPages<ArtistClockRecord>("/api/reports/artist/clock-detail")
}

export function fetchArtistDeductionRecords(): Promise<ArtistFeeDeductionRecord[] | null> {
  return fetchAllPages<ArtistFeeDeductionRecord>("/api/reports/artist/fee-deduction")
}
