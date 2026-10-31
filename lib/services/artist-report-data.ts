/**
 * @file artist-report-data.ts
 * @description 艺人报表数据源编排 — PostgreSQL 优先，不可用时回退 Mock（服务端专用）
 * @module services
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 *
 * 环境变量：
 * - ARTIST_REPORT_DATA_SOURCE=auto（默认）| db | mock
 *   auto：优先读取 PostgreSQL，连接/表结构异常时回退 Mock；
 *   db：强制真实数据，异常直接返回 500；
 *   mock：强制演示数据（离线演示/前端联调）。
 */

import { artistReportRepository } from "@/lib/db/repositories/artist-report-repository"
import { MAX_EXPORT_ROWS, type ArtistReportExportType } from "@/lib/services/artist-report-export"
import type {
  ArtistClockQuery,
  ArtistDeductionQuery,
  ArtistReportPagination,
} from "@/lib/services/artist-report-query"
import {
  ARTIST_CLOCK_RECORDS,
  ARTIST_FEE_DEDUCTIONS,
  buildArtistClockSummary,
  buildArtistFeeFlowSummary,
  computeArtistClockMetrics,
  computeArtistDeductionMetrics,
  computeArtistFeeMetrics,
  filterArtistClockRecords,
  filterArtistDeductions,
  type ArtistClockRecord,
  type ArtistClockSummaryRow,
  type ArtistClockMetrics,
  type ArtistDeductionMetrics,
  type ArtistFeeDeductionRecord,
  type ArtistFeeFlowSummaryRow,
  type ArtistFeeMetrics,
} from "@/lib/services/artist-report"

export type ArtistDataSource = "db" | "mock"
export type ArtistDataSourceMode = "auto" | "db" | "mock"

export interface ArtistReportListResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  source: ArtistDataSource
}

export interface ArtistReportDetailResult<T, M> extends ArtistReportListResult<T> {
  metrics: M
}

export function getArtistDataSourceMode(): ArtistDataSourceMode {
  const raw = process.env.ARTIST_REPORT_DATA_SOURCE?.trim().toLowerCase()
  return raw === "db" || raw === "mock" ? raw : "auto"
}

let fallbackLogged = false

async function withDataSource<T>(
  dbOperation: () => Promise<T>,
  mockOperation: () => T
): Promise<{ payload: T; source: ArtistDataSource }> {
  const mode = getArtistDataSourceMode()

  if (mode === "mock") {
    return { payload: mockOperation(), source: "mock" }
  }

  try {
    return { payload: await dbOperation(), source: "db" }
  } catch (error) {
    if (mode === "db") throw error
    if (!fallbackLogged) {
      fallbackLogged = true
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[artist-report] 数据库查询失败，已回退 Mock：${message}`)
    }
    return { payload: mockOperation(), source: "mock" }
  }
}

function parseDate(value?: string): Date | undefined {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function paginate<T>(
  rows: T[],
  pagination: ArtistReportPagination
): Omit<ArtistReportListResult<T>, "source"> {
  return {
    data: rows.slice(pagination.offset, pagination.offset + pagination.pageSize),
    total: rows.length,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(rows.length / pagination.pageSize),
  }
}

function mockClockRecords(filter: ArtistClockQuery): ArtistClockRecord[] {
  return filterArtistClockRecords(ARTIST_CLOCK_RECORDS, {
    from: parseDate(filter.from),
    to: parseDate(filter.to),
    store: filter.store,
    artistId: filter.artistId,
    status: filter.status,
    search: filter.search,
  })
}

function mockDeductionRecords(filter: ArtistDeductionQuery): ArtistFeeDeductionRecord[] {
  return filterArtistDeductions(ARTIST_FEE_DEDUCTIONS, {
    from: parseDate(filter.from),
    to: parseDate(filter.to),
    store: filter.store,
    type: filter.type,
    status: filter.status,
    search: filter.search,
  })
}

export async function getArtistClockDetail(
  filter: ArtistClockQuery,
  pagination: ArtistReportPagination
): Promise<ArtistReportDetailResult<ArtistClockRecord, ArtistClockMetrics>> {
  const { payload, source } = await withDataSource(
    async () => {
      const [rows, metrics] = await Promise.all([
        artistReportRepository.findClockRecords(filter, pagination),
        artistReportRepository.getClockMetrics(filter),
      ])
      return { rows, metrics }
    },
    () => {
      const records = mockClockRecords(filter)
      return { rows: paginate(records, pagination), metrics: computeArtistClockMetrics(records) }
    }
  )

  return {
    data: payload.rows.data,
    total: payload.rows.total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(payload.rows.total / pagination.pageSize),
    metrics: payload.metrics,
    source,
  }
}

export async function getArtistDeductionDetail(
  filter: ArtistDeductionQuery,
  pagination: ArtistReportPagination
): Promise<ArtistReportDetailResult<ArtistFeeDeductionRecord, ArtistDeductionMetrics>> {
  const { payload, source } = await withDataSource(
    async () => {
      const [rows, metrics] = await Promise.all([
        artistReportRepository.findDeductions(filter, pagination),
        artistReportRepository.getDeductionMetrics(filter),
      ])
      return { rows, metrics }
    },
    () => {
      const records = mockDeductionRecords(filter)
      return { rows: paginate(records, pagination), metrics: computeArtistDeductionMetrics(records) }
    }
  )

  return {
    data: payload.rows.data,
    total: payload.rows.total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(payload.rows.total / pagination.pageSize),
    metrics: payload.metrics,
    source,
  }
}

export async function getArtistClockSummary(
  filter: ArtistClockQuery,
  pagination: ArtistReportPagination
): Promise<ArtistReportDetailResult<ArtistClockSummaryRow, ArtistClockMetrics>> {
  const { payload, source } = await withDataSource(
    async () => {
      const [rows, metrics] = await Promise.all([
        artistReportRepository.findClockSummary(filter, pagination),
        artistReportRepository.getClockMetrics(filter),
      ])
      return { rows, metrics }
    },
    () => {
      const records = mockClockRecords(filter)
      return {
        rows: paginate(buildArtistClockSummary(records), pagination),
        metrics: computeArtistClockMetrics(records),
      }
    }
  )

  return {
    data: payload.rows.data,
    total: payload.rows.total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(payload.rows.total / pagination.pageSize),
    metrics: payload.metrics,
    source,
  }
}

export async function getArtistFeeSummary(
  filter: ArtistClockQuery,
  pagination: ArtistReportPagination
): Promise<ArtistReportDetailResult<ArtistFeeFlowSummaryRow, ArtistFeeMetrics>> {
  const { payload, source } = await withDataSource(
    async () => {
      const [rows, metrics] = await Promise.all([
        artistReportRepository.findFeeFlowSummary(filter, pagination),
        artistReportRepository.getFeeMetrics(filter),
      ])
      return { rows, metrics }
    },
    () => {
      const records = mockClockRecords(filter)
      return {
        rows: paginate(buildArtistFeeFlowSummary(records), pagination),
        metrics: computeArtistFeeMetrics(records),
      }
    }
  )

  return {
    data: payload.rows.data,
    total: payload.rows.total,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: Math.ceil(payload.rows.total / pagination.pageSize),
    metrics: payload.metrics,
    source,
  }
}

export interface ArtistExportData {
  data: object[]
  total: number
  source: ArtistDataSource
}

/**
 * 导出用全量数据（上限 MAX_EXPORT_ROWS + 1，用于判断是否超限）。
 * 与页面报表复用同一数据源编排，保证导出内容与页面口径一致。
 */
export async function getArtistExportData(
  type: ArtistReportExportType,
  filter: ArtistClockQuery | ArtistDeductionQuery
): Promise<ArtistExportData> {
  const pagination: ArtistReportPagination = {
    page: 1,
    pageSize: MAX_EXPORT_ROWS + 1,
    offset: 0,
  }

  const { payload, source } = await withDataSource(
    async () => {
      switch (type) {
        case "clock-detail": {
          const result = await artistReportRepository.findClockRecords(
            filter as ArtistClockQuery,
            pagination
          )
          return { data: result.data as object[], total: result.total }
        }
        case "clock-summary": {
          const result = await artistReportRepository.findClockSummary(
            filter as ArtistClockQuery,
            pagination
          )
          return { data: result.data as object[], total: result.total }
        }
        case "fee-deduction": {
          const result = await artistReportRepository.findDeductions(
            filter as ArtistDeductionQuery,
            pagination
          )
          return { data: result.data as object[], total: result.total }
        }
        case "fee-summary": {
          const result = await artistReportRepository.findFeeFlowSummary(
            filter as ArtistClockQuery,
            pagination
          )
          return { data: result.data as object[], total: result.total }
        }
      }
    },
    () => {
      if (type === "fee-deduction") {
        const records = mockDeductionRecords(filter as ArtistDeductionQuery)
        return { data: records as object[], total: records.length }
      }

      const records = mockClockRecords(filter as ArtistClockQuery)
      const data =
        type === "clock-detail"
          ? records
          : type === "clock-summary"
            ? buildArtistClockSummary(records)
            : buildArtistFeeFlowSummary(records)
      return { data: data as object[], total: data.length }
    }
  )

  return { ...payload, source }
}
