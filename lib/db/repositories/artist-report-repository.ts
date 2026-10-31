/**
 * @file artist-report-repository.ts
 * @description 艺人报表 PostgreSQL 仓储层 — 上下钟明细/汇总、台费扣款明细、台费流水汇总
 * @module db/repositories
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 * @updated 2026-10-31
 *
 * 业务口径（与 scripts/migrations/20261031_artist_domain.pg.sql 一致）：
 * 1. 实收台费 = 上钟单台费 - SUM(有效扣款)，有效扣款 = status <> 'revoked'
 * 2. 应结台费 = 已结金额 + 待结金额
 * 3. 结算进度 = 已结 / 应结（应结为 0 时返回 0）
 * 4. 服务中记录（clock_out_at IS NULL）计入上钟次数，不计入平均时长
 */

import { query } from "@/lib/db"
import type {
  ArtistClockRecord,
  ArtistClockSummaryRow,
  ArtistFeeDeductionRecord,
  ArtistFeeFlowSummaryRow,
  ArtistLevel,
  ArtistDeductionMetrics,
  ArtistClockMetrics,
  ArtistFeeMetrics,
  ClockStatus,
  DeductionStatus,
  DeductionType,
} from "@/lib/services/artist-report"

export interface PageRequest {
  page: number
  pageSize: number
  offset: number
}

export interface ArtistClockQueryFilter {
  from?: string
  to?: string
  store?: string
  artistId?: string
  status?: ClockStatus | "all"
  search?: string
}

export interface ArtistDeductionQueryFilter {
  from?: string
  to?: string
  store?: string
  type?: DeductionType | "all"
  status?: DeductionStatus | "all"
  search?: string
}

export const CLOCK_STATUS_TO_DB: Record<ClockStatus, string> = {
  服务中: "serving",
  待结算: "unsettled",
  已结算: "settled",
}

export const CLOCK_STATUS_FROM_DB: Record<string, ClockStatus> = {
  serving: "服务中",
  unsettled: "待结算",
  settled: "已结算",
}

export const DEDUCTION_TYPE_TO_DB: Record<DeductionType, string> = {
  迟到: "late",
  早退: "early_leave",
  缺勤: "absent",
  服务投诉: "complaint",
  违规罚款: "violation",
  设备损坏: "equipment",
  其他: "other",
}

export const DEDUCTION_TYPE_FROM_DB: Record<string, DeductionType> = {
  late: "迟到",
  early_leave: "早退",
  absent: "缺勤",
  complaint: "服务投诉",
  violation: "违规罚款",
  equipment: "设备损坏",
  other: "其他",
}

export const DEDUCTION_STATUS_TO_DB: Record<DeductionStatus, string> = {
  待确认: "pending",
  已扣款: "confirmed",
  已撤销: "revoked",
}

export const DEDUCTION_STATUS_FROM_DB: Record<string, DeductionStatus> = {
  pending: "待确认",
  confirmed: "已扣款",
  revoked: "已撤销",
}

interface SqlWhere {
  clause: string
  params: unknown[]
}

function joinWhere(where: SqlWhere): string {
  return where.clause ? `WHERE ${where.clause}` : ""
}

function buildDateRange(
  column: string,
  from: string | undefined,
  to: string | undefined,
  clauses: string[],
  params: unknown[]
) {
  if (from) {
    clauses.push(`${column} >= (?::date::timestamp AT TIME ZONE 'Asia/Shanghai')`)
    params.push(from)
  }
  if (to) {
    clauses.push(`${column} < ((?::date + 1)::timestamp AT TIME ZONE 'Asia/Shanghai')`)
    params.push(to)
  }
}

/** 上下钟记录的过滤条件（r = artist_clock_record，a = artist） */
export function buildClockWhere(filter: ArtistClockQueryFilter): SqlWhere {
  const clauses: string[] = []
  const params: unknown[] = []

  buildDateRange("r.clock_in_at", filter.from, filter.to, clauses, params)

  if (filter.store && filter.store !== "all") {
    clauses.push("a.store_id = ?")
    params.push(filter.store)
  }
  if (filter.artistId && filter.artistId !== "all") {
    clauses.push("r.artist_id = ?")
    params.push(filter.artistId)
  }
  if (filter.status && filter.status !== "all") {
    clauses.push("r.status = ?")
    params.push(CLOCK_STATUS_TO_DB[filter.status])
  }

  const keyword = filter.search?.trim()
  if (keyword) {
    const pattern = `%${keyword}%`
    clauses.push(
      "(r.record_no ILIKE ? OR a.name ILIKE ? OR a.artist_no ILIKE ? OR r.room_no ILIKE ? OR COALESCE(r.guest_name, '') ILIKE ?)"
    )
    params.push(pattern, pattern, pattern, pattern, pattern)
  }

  return { clause: clauses.join(" AND "), params }
}

/** 台费扣款的过滤条件（d = artist_fee_deduction，r = artist_clock_record，a = artist） */
export function buildDeductionWhere(filter: ArtistDeductionQueryFilter): SqlWhere {
  const clauses: string[] = []
  const params: unknown[] = []

  buildDateRange("d.created_at", filter.from, filter.to, clauses, params)

  if (filter.store && filter.store !== "all") {
    clauses.push("a.store_id = ?")
    params.push(filter.store)
  }
  if (filter.type && filter.type !== "all") {
    clauses.push("d.type = ?")
    params.push(DEDUCTION_TYPE_TO_DB[filter.type])
  }
  if (filter.status && filter.status !== "all") {
    clauses.push("d.status = ?")
    params.push(DEDUCTION_STATUS_TO_DB[filter.status])
  }

  const keyword = filter.search?.trim()
  if (keyword) {
    const pattern = `%${keyword}%`
    clauses.push(
      "(d.deduction_no ILIKE ? OR a.name ILIKE ? OR a.artist_no ILIKE ? OR r.room_no ILIKE ? OR d.reason ILIKE ?)"
    )
    params.push(pattern, pattern, pattern, pattern, pattern)
  }

  return { clause: clauses.join(" AND "), params }
}

/** 有效扣款子查询：已撤销不计入实收台费 */
const EFFECTIVE_DEDUCTION_JOIN = `
LEFT JOIN (
  SELECT clock_record_id, SUM(amount) AS deduction
    FROM artist_fee_deduction
   WHERE status <> 'revoked'
   GROUP BY clock_record_id
) d ON d.clock_record_id = r.id`

export interface ArtistClockRow {
  id: string
  record_no: string
  artist_id: string
  artist_no: string
  artist_name: string
  level: string
  store_id: string
  room_no: string
  guest_name: string | null
  clock_in: string
  clock_out: string | null
  duration_minutes: number | string
  stage_fee: number | string
  status: string
  deduction: number | string
  net_fee: number | string
  operator: string | null
}

export interface ArtistDeductionRow {
  id: string
  deduction_no: string
  time: string
  clock_record_id: string
  artist_id: string
  artist_no: string
  artist_name: string
  level: string
  store_id: string
  room_no: string
  type: string
  stage_fee: number | string
  amount: number | string
  reason: string
  status: string
  operator: string | null
}

export interface ArtistClockSummaryDbRow {
  id: string
  artist_no: string
  artist_name: string
  level: string
  store_id: string
  clock_count: number | string
  total_minutes: number | string
  timed_count: number | string
  total_stage_fee: number | string
  total_deduction: number | string
  net_fee: number | string
  active_count: number | string
}

export interface ArtistFeeSummaryDbRow {
  id: string
  artist_no: string
  artist_name: string
  level: string
  store_id: string
  clock_count: number | string
  stage_fee_total: number | string
  deduction_total: number | string
  net_fee: number | string
  settled_fee: number | string
  unsettled_fee: number | string
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = typeof value === "number" ? value : Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function mapClockRow(row: ArtistClockRow): ArtistClockRecord {
  return {
    id: row.id,
    artistId: row.artist_id,
    artistCode: row.artist_no,
    artistName: row.artist_name,
    level: row.level as ArtistLevel,
    store: row.store_id,
    room: row.room_no,
    guestName: row.guest_name ?? "—",
    clockIn: row.clock_in,
    clockOut: row.clock_out ?? null,
    durationMinutes: toNumber(row.duration_minutes),
    stageFee: toNumber(row.stage_fee),
    deduction: toNumber(row.deduction),
    netFee: toNumber(row.net_fee),
    status: CLOCK_STATUS_FROM_DB[row.status] ?? "服务中",
    operator: row.operator || "—",
  }
}

export function mapDeductionRow(row: ArtistDeductionRow): ArtistFeeDeductionRecord {
  return {
    id: row.id,
    time: row.time,
    clockRecordId: row.clock_record_id,
    artistId: row.artist_id,
    artistCode: row.artist_no,
    artistName: row.artist_name,
    level: row.level as ArtistLevel,
    store: row.store_id,
    room: row.room_no,
    type: DEDUCTION_TYPE_FROM_DB[row.type] ?? "其他",
    stageFee: toNumber(row.stage_fee),
    amount: toNumber(row.amount),
    reason: row.reason,
    operator: row.operator || "—",
    status: DEDUCTION_STATUS_FROM_DB[row.status] ?? "待确认",
  }
}

export function mapClockSummaryRow(row: ArtistClockSummaryDbRow): ArtistClockSummaryRow {
  const clockCount = toNumber(row.clock_count)
  const totalMinutes = toNumber(row.total_minutes)
  const timedCount = toNumber(row.timed_count)

  return {
    id: row.id,
    artistId: row.id,
    artistCode: row.artist_no,
    artistName: row.artist_name,
    level: row.level as ArtistLevel,
    store: row.store_id,
    clockCount,
    totalMinutes,
    averageMinutes: timedCount === 0 ? 0 : totalMinutes / timedCount,
    totalStageFee: toNumber(row.total_stage_fee),
    totalDeduction: toNumber(row.total_deduction),
    netFee: toNumber(row.net_fee),
    activeCount: toNumber(row.active_count),
  }
}

export function mapFeeSummaryRow(row: ArtistFeeSummaryDbRow): ArtistFeeFlowSummaryRow {
  const netFee = toNumber(row.net_fee)
  const settledFee = toNumber(row.settled_fee)

  return {
    id: row.id,
    artistId: row.id,
    artistCode: row.artist_no,
    artistName: row.artist_name,
    level: row.level as ArtistLevel,
    store: row.store_id,
    clockCount: toNumber(row.clock_count),
    stageFeeTotal: toNumber(row.stage_fee_total),
    deductionTotal: toNumber(row.deduction_total),
    netFee,
    settledFee,
    unsettledFee: toNumber(row.unsettled_fee),
    settlementRate: netFee === 0 ? 0 : (settledFee / netFee) * 100,
  }
}

const CLOCK_DETAIL_SQL = `
SELECT r.id,
       r.record_no,
       r.artist_id,
       a.artist_no,
       a.name AS artist_name,
       a.level,
       a.store_id,
       r.room_no,
       r.guest_name,
       to_char(r.clock_in_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI') AS clock_in,
       to_char(r.clock_out_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI') AS clock_out,
       r.duration_minutes,
       r.stage_fee,
       r.status,
       COALESCE(d.deduction, 0) AS deduction,
       (r.stage_fee - COALESCE(d.deduction, 0)) AS net_fee,
       r.operator_id AS operator
  FROM artist_clock_record r
  JOIN artist a ON a.id = r.artist_id${EFFECTIVE_DEDUCTION_JOIN}`

const DEDUCTION_DETAIL_SQL = `
SELECT d.id,
       d.deduction_no,
       to_char(d.created_at AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD HH24:MI') AS time,
       d.clock_record_id,
       d.artist_id,
       a.artist_no,
       a.name AS artist_name,
       a.level,
       a.store_id,
       r.room_no,
       d.type,
       r.stage_fee,
       d.amount,
       d.reason,
       d.status,
       d.operator_id AS operator
  FROM artist_fee_deduction d
  JOIN artist a ON a.id = d.artist_id
  JOIN artist_clock_record r ON r.id = d.clock_record_id`

const CLOCK_SUMMARY_SQL = `
SELECT a.id,
       a.artist_no,
       a.name AS artist_name,
       a.level,
       a.store_id,
       COUNT(*)::int AS clock_count,
       COALESCE(SUM(r.duration_minutes), 0) AS total_minutes,
       COUNT(*) FILTER (WHERE r.duration_minutes > 0)::int AS timed_count,
       COALESCE(SUM(r.stage_fee), 0) AS total_stage_fee,
       COALESCE(SUM(d.deduction), 0) AS total_deduction,
       COALESCE(SUM(r.stage_fee - COALESCE(d.deduction, 0)), 0) AS net_fee,
       COUNT(*) FILTER (WHERE r.status = 'serving')::int AS active_count
  FROM artist_clock_record r
  JOIN artist a ON a.id = r.artist_id${EFFECTIVE_DEDUCTION_JOIN}`

const FEE_SUMMARY_SQL = `
SELECT a.id,
       a.artist_no,
       a.name AS artist_name,
       a.level,
       a.store_id,
       COUNT(*)::int AS clock_count,
       COALESCE(SUM(r.stage_fee), 0) AS stage_fee_total,
       COALESCE(SUM(d.deduction), 0) AS deduction_total,
       COALESCE(SUM(r.stage_fee - COALESCE(d.deduction, 0)), 0) AS net_fee,
       COALESCE(SUM(CASE WHEN r.status = 'settled' THEN r.stage_fee - COALESCE(d.deduction, 0) ELSE 0 END), 0) AS settled_fee,
       COALESCE(SUM(CASE WHEN r.status <> 'settled' THEN r.stage_fee - COALESCE(d.deduction, 0) ELSE 0 END), 0) AS unsettled_fee
  FROM artist_clock_record r
  JOIN artist a ON a.id = r.artist_id${EFFECTIVE_DEDUCTION_JOIN}`

export interface ArtistExportAuditEntry {
  reportType: string
  filter: Record<string, unknown>
  rowCount: number
  dataSource: string
  operatorId?: string
  operatorName?: string
  clientIp?: string
  userAgent?: string
}

export class ArtistReportRepository {
  async findClockRecords(
    filter: ArtistClockQueryFilter,
    page: PageRequest
  ): Promise<{ data: ArtistClockRecord[]; total: number }> {
    const where = buildClockWhere(filter)
    const rows = await query<ArtistClockRow[]>(
      `${CLOCK_DETAIL_SQL}
       ${joinWhere(where)}
       ORDER BY r.clock_in_at DESC
       LIMIT ? OFFSET ?`,
      [...where.params, page.pageSize, page.offset]
    )
    const countRows = await query<Array<{ total: number | string }>>(
      `SELECT COUNT(*)::int AS total
         FROM artist_clock_record r
         JOIN artist a ON a.id = r.artist_id
        ${joinWhere(where)}`,
      where.params
    )

    return { data: rows.map(mapClockRow), total: toNumber(countRows[0]?.total) }
  }

  async getClockMetrics(filter: ArtistClockQueryFilter): Promise<ArtistClockMetrics> {
    const where = buildClockWhere(filter)
    const rows = await query<
      Array<{
        record_count: number | string
        artist_count: number | string
        total_minutes: number | string
        total_stage_fee: number | string
        total_deduction: number | string
        net_fee: number | string
      }>
    >(
      `SELECT COUNT(*)::int AS record_count,
              COUNT(DISTINCT r.artist_id)::int AS artist_count,
              COALESCE(SUM(r.duration_minutes), 0) AS total_minutes,
              COALESCE(SUM(r.stage_fee), 0) AS total_stage_fee,
              COALESCE(SUM(d.deduction), 0) AS total_deduction,
              COALESCE(SUM(r.stage_fee - COALESCE(d.deduction, 0)), 0) AS net_fee
         FROM artist_clock_record r
         JOIN artist a ON a.id = r.artist_id${EFFECTIVE_DEDUCTION_JOIN}
        ${joinWhere(where)}`,
      where.params
    )
    const row = rows[0]

    return {
      recordCount: toNumber(row?.record_count),
      artistCount: toNumber(row?.artist_count),
      totalMinutes: toNumber(row?.total_minutes),
      totalStageFee: toNumber(row?.total_stage_fee),
      totalDeduction: toNumber(row?.total_deduction),
      netFee: toNumber(row?.net_fee),
    }
  }

  async findDeductions(
    filter: ArtistDeductionQueryFilter,
    page: PageRequest
  ): Promise<{ data: ArtistFeeDeductionRecord[]; total: number }> {
    const where = buildDeductionWhere(filter)
    const rows = await query<ArtistDeductionRow[]>(
      `${DEDUCTION_DETAIL_SQL}
       ${joinWhere(where)}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...where.params, page.pageSize, page.offset]
    )
    const countRows = await query<Array<{ total: number | string }>>(
      `SELECT COUNT(*)::int AS total
         FROM artist_fee_deduction d
         JOIN artist a ON a.id = d.artist_id
         JOIN artist_clock_record r ON r.id = d.clock_record_id
        ${joinWhere(where)}`,
      where.params
    )

    return { data: rows.map(mapDeductionRow), total: toNumber(countRows[0]?.total) }
  }

  async getDeductionMetrics(filter: ArtistDeductionQueryFilter): Promise<ArtistDeductionMetrics> {
    const where = buildDeductionWhere(filter)
    const effectiveClause = where.clause ? `${where.clause} AND d.status <> 'revoked'` : "d.status <> 'revoked'"
    const rows = await query<
      Array<{
        record_count: number | string
        artist_count: number | string
        total_amount: number | string
      }>
    >(
      `SELECT COUNT(*)::int AS record_count,
              COUNT(DISTINCT d.artist_id)::int AS artist_count,
              COALESCE(SUM(d.amount), 0) AS total_amount
         FROM artist_fee_deduction d
         JOIN artist a ON a.id = d.artist_id
         JOIN artist_clock_record r ON r.id = d.clock_record_id
        WHERE ${effectiveClause}`,
      where.params
    )
    const row = rows[0]
    const recordCount = toNumber(row?.record_count)
    const totalAmount = toNumber(row?.total_amount)

    return {
      recordCount,
      artistCount: toNumber(row?.artist_count),
      totalAmount,
      averageAmount: recordCount === 0 ? 0 : totalAmount / recordCount,
    }
  }

  async findClockSummary(
    filter: ArtistClockQueryFilter,
    page: PageRequest
  ): Promise<{ data: ArtistClockSummaryRow[]; total: number }> {
    const where = buildClockWhere(filter)
    const rows = await query<ArtistClockSummaryDbRow[]>(
      `${CLOCK_SUMMARY_SQL}
       ${joinWhere(where)}
       GROUP BY a.id, a.artist_no, a.name, a.level, a.store_id
       ORDER BY net_fee DESC
       LIMIT ? OFFSET ?`,
      [...where.params, page.pageSize, page.offset]
    )
    const countRows = await query<Array<{ total: number | string }>>(
      `SELECT COUNT(DISTINCT r.artist_id)::int AS total
         FROM artist_clock_record r
         JOIN artist a ON a.id = r.artist_id
        ${joinWhere(where)}`,
      where.params
    )

    return { data: rows.map(mapClockSummaryRow), total: toNumber(countRows[0]?.total) }
  }

  async findFeeFlowSummary(
    filter: ArtistClockQueryFilter,
    page: PageRequest
  ): Promise<{ data: ArtistFeeFlowSummaryRow[]; total: number }> {
    const where = buildClockWhere(filter)
    const rows = await query<ArtistFeeSummaryDbRow[]>(
      `${FEE_SUMMARY_SQL}
       ${joinWhere(where)}
       GROUP BY a.id, a.artist_no, a.name, a.level, a.store_id
       ORDER BY net_fee DESC
       LIMIT ? OFFSET ?`,
      [...where.params, page.pageSize, page.offset]
    )
    const countRows = await query<Array<{ total: number | string }>>(
      `SELECT COUNT(DISTINCT r.artist_id)::int AS total
         FROM artist_clock_record r
         JOIN artist a ON a.id = r.artist_id
        ${joinWhere(where)}`,
      where.params
    )

    return { data: rows.map(mapFeeSummaryRow), total: toNumber(countRows[0]?.total) }
  }

  async getFeeMetrics(filter: ArtistClockQueryFilter): Promise<ArtistFeeMetrics> {
    const where = buildClockWhere(filter)
    const clock = await this.getClockMetrics(filter)
    const rows = await query<Array<{ settled_fee: number | string; unsettled_fee: number | string }>>(
      `SELECT COALESCE(SUM(CASE WHEN r.status = 'settled' THEN r.stage_fee - COALESCE(d.deduction, 0) ELSE 0 END), 0) AS settled_fee,
              COALESCE(SUM(CASE WHEN r.status <> 'settled' THEN r.stage_fee - COALESCE(d.deduction, 0) ELSE 0 END), 0) AS unsettled_fee
         FROM artist_clock_record r
         JOIN artist a ON a.id = r.artist_id${EFFECTIVE_DEDUCTION_JOIN}
        ${joinWhere(where)}`,
      where.params
    )
    const row = rows[0]
    const settledFee = toNumber(row?.settled_fee)
    const unsettledFee = toNumber(row?.unsettled_fee)
    const netFee = settledFee + unsettledFee

    return {
      clockCount: clock.recordCount,
      stageFeeTotal: clock.totalStageFee,
      deductionTotal: clock.totalDeduction,
      netFee,
      settledFee,
      unsettledFee,
      settlementRate: netFee === 0 ? 0 : (settledFee / netFee) * 100,
    }
  }

  /**
   * 写入导出审计日志。
   * 审计为合规要求，但不应阻断业务导出：调用方负责捕获异常并记录 warn。
   */
  async recordExportAudit(entry: ArtistExportAuditEntry): Promise<void> {
    await query(
      `INSERT INTO artist_report_export_audit
         (report_type, filter_json, row_count, data_source, operator_id, operator_name, client_ip, user_agent)
       VALUES (?, ?::jsonb, ?, ?, ?, ?, ?, ?)`,
      [
        entry.reportType,
        JSON.stringify(entry.filter ?? {}),
        entry.rowCount,
        entry.dataSource,
        entry.operatorId ?? null,
        entry.operatorName ?? null,
        entry.clientIp ?? null,
        entry.userAgent ?? null,
      ]
    )
  }
}

export const artistReportRepository = new ArtistReportRepository()
