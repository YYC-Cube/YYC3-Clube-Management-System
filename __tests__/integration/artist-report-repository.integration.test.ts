/**
 * @jest-environment node
 */

/**
 * 艺人报表仓储层 — PostgreSQL 集成验证
 * 运行前提：
 *   1. 已执行 scripts/migrations/20261031_artist_domain.pg.sql
 *   2. 设置 ARTIST_REPORT_IT=1 与 DATABASE_URL
 * 例：
 *   ARTIST_REPORT_IT=1 DATABASE_URL=postgresql://postgres@127.0.0.1:55432/yyc3_it \
 *   pnpm exec jest __tests__/integration/artist-report-repository.integration.test.ts --runInBand
 */

import { closePool, query } from '@/lib/db'
import { artistReportRepository } from '@/lib/db/repositories/artist-report-repository'
import { getArtistExportData } from '@/lib/services/artist-report-data'

const enabled = process.env.ARTIST_REPORT_IT === '1'
const describeIf = enabled ? describe : describe.skip

const ARTIST_ID = 'it-artist-0001'
const CLOCK_SETTLED = 'it-clock-0001'
const CLOCK_SERVING = 'it-clock-0002'
const DEDUCTION_CONFIRMED = 'it-deduction-0001'
const DEDUCTION_REVOKED = 'it-deduction-0002'

describeIf('艺人报表仓储层（PostgreSQL 集成）', () => {
  jest.setTimeout(30000)

  beforeAll(async () => {
    await query(
      `INSERT INTO artist (id, artist_no, name, level, store_id, phone, status, joined_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [ARTIST_ID, 'IT0001', '集成测试艺人', '金牌', 'IT-STORE', '13800009999', 'active', '2026-01-01']
    )

    await query(
      `INSERT INTO artist_clock_record
         (id, record_no, artist_id, store_id, room_no, guest_name, clock_in_at, clock_out_at,
          duration_minutes, stage_fee, status, operator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [
        CLOCK_SETTLED,
        'IT-CLOCK-0001',
        ARTIST_ID,
        'IT-STORE',
        'T888',
        '测试客人甲',
        '2027-01-10T20:00:00+08:00',
        '2027-01-10T21:30:00+08:00',
        90,
        600,
        'settled',
        'IT-OP',
      ]
    )

    await query(
      `INSERT INTO artist_clock_record
         (id, record_no, artist_id, store_id, room_no, guest_name, clock_in_at, clock_out_at,
          duration_minutes, stage_fee, status, operator_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [
        CLOCK_SERVING,
        'IT-CLOCK-0002',
        ARTIST_ID,
        'IT-STORE',
        'T999',
        '测试客人乙',
        '2027-01-11T20:00:00+08:00',
        null,
        0,
        500,
        'serving',
        'IT-OP',
      ]
    )

    await query(
      `INSERT INTO artist_fee_deduction
         (id, deduction_no, clock_record_id, artist_id, type, amount, reason, status,
          operator_id, approved_by, approved_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [
        DEDUCTION_CONFIRMED,
        'IT-KK-0001',
        CLOCK_SETTLED,
        ARTIST_ID,
        'complaint',
        100,
        '集成测试：服务投诉扣款',
        'confirmed',
        'IT-OP',
        'IT-MGR',
        '2027-01-10T21:40:00+08:00',
        '2027-01-10T21:35:00+08:00',
      ]
    )

    await query(
      `INSERT INTO artist_fee_deduction
         (id, deduction_no, clock_record_id, artist_id, type, amount, reason, status,
          operator_id, revoked_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO NOTHING`,
      [
        DEDUCTION_REVOKED,
        'IT-KK-0002',
        CLOCK_SETTLED,
        ARTIST_ID,
        'late',
        50,
        '集成测试：已撤销扣款',
        'revoked',
        'IT-OP',
        '2027-01-10T22:00:00+08:00',
        '2027-01-10T21:45:00+08:00',
      ]
    )
  })

  afterAll(async () => {
    await closePool()
  })

  it('上下钟明细按日期过滤，实收台费 = 台费 - 有效扣款', async () => {
    const result = await artistReportRepository.findClockRecords(
      { from: '2027-01-10', to: '2027-01-11', artistId: ARTIST_ID },
      { page: 1, pageSize: 20, offset: 0 }
    )

    expect(result.total).toBe(2)
    const settled = result.data.find(record => record.id === CLOCK_SETTLED)
    const serving = result.data.find(record => record.id === CLOCK_SERVING)

    expect(settled?.stageFee).toBe(600)
    expect(settled?.deduction).toBe(100)
    expect(settled?.netFee).toBe(500)
    expect(settled?.status).toBe('已结算')
    expect(settled?.clockIn).toBe('2027-01-10 20:00')
    expect(serving?.clockOut).toBeNull()
    expect(serving?.status).toBe('服务中')
    expect(serving?.netFee).toBe(500)
  })

  it('上下钟汇总满足勾稽与平均时长口径', async () => {
    const result = await artistReportRepository.findClockSummary(
      { from: '2027-01-10', to: '2027-01-11', artistId: ARTIST_ID },
      { page: 1, pageSize: 20, offset: 0 }
    )

    expect(result.total).toBe(1)
    const row = result.data[0]
    expect(row.clockCount).toBe(2)
    expect(row.totalMinutes).toBe(90)
    expect(row.averageMinutes).toBe(90)
    expect(row.totalStageFee).toBe(1100)
    expect(row.totalDeduction).toBe(100)
    expect(row.netFee).toBe(1000)
    expect(row.activeCount).toBe(1)
    expect(row.totalStageFee - row.totalDeduction).toBe(row.netFee)
  })

  it('台费流水汇总拆分已结/待结，结算进度正确', async () => {
    const result = await artistReportRepository.findFeeFlowSummary(
      { from: '2027-01-10', to: '2027-01-11', artistId: ARTIST_ID },
      { page: 1, pageSize: 20, offset: 0 }
    )

    const row = result.data[0]
    expect(row.settledFee).toBe(500)
    expect(row.unsettledFee).toBe(500)
    expect(row.netFee).toBe(1000)
    expect(row.settlementRate).toBe(50)
    expect(row.settledFee + row.unsettledFee).toBe(row.netFee)
  })

  it('台费扣款明细保留已撤销记录，指标仅统计有效扣款', async () => {
    const result = await artistReportRepository.findDeductions(
      { from: '2027-01-10', to: '2027-01-11' },
      { page: 1, pageSize: 20, offset: 0 }
    )

    expect(result.total).toBe(2)
    expect(result.data.some(record => record.status === '已撤销')).toBe(true)
    expect(result.data.find(record => record.id === DEDUCTION_CONFIRMED)?.type).toBe('服务投诉')

    const metrics = await artistReportRepository.getDeductionMetrics({
      from: '2027-01-10',
      to: '2027-01-11',
    })
    expect(metrics.recordCount).toBe(1)
    expect(metrics.totalAmount).toBe(100)
    expect(metrics.averageAmount).toBe(100)
  })

  it('报表指标与汇总口径一致', async () => {
    const filter = { from: '2027-01-10', to: '2027-01-11', artistId: ARTIST_ID }
    const clockMetrics = await artistReportRepository.getClockMetrics(filter)
    const feeMetrics = await artistReportRepository.getFeeMetrics(filter)

    expect(clockMetrics.recordCount).toBe(2)
    expect(clockMetrics.artistCount).toBe(1)
    expect(clockMetrics.totalStageFee).toBe(1100)
    expect(clockMetrics.totalDeduction).toBe(100)
    expect(clockMetrics.netFee).toBe(1000)

    expect(feeMetrics.netFee).toBe(1000)
    expect(feeMetrics.settledFee).toBe(500)
    expect(feeMetrics.unsettledFee).toBe(500)
    expect(feeMetrics.settlementRate).toBe(50)
  })

  it('导出数据与报表口径一致，审计写入可查询', async () => {
    const filter = { from: '2027-01-10', to: '2027-01-11', artistId: ARTIST_ID }

    const detail = await getArtistExportData('clock-detail', filter)
    expect(detail.source).toBe('db')
    expect(detail.total).toBe(2)
    expect(detail.data).toHaveLength(2)

    const summary = await getArtistExportData('clock-summary', filter)
    expect(summary.total).toBe(1)
    expect(summary.data).toHaveLength(1)

    await artistReportRepository.recordExportAudit({
      reportType: 'clock-detail',
      filter,
      rowCount: detail.total,
      dataSource: detail.source,
      operatorTrust: 'header',
      operatorId: 'IT-EXPORT-OP',
      operatorName: '导出审计测试',
      clientIp: '127.0.0.1',
      userAgent: 'jest-integration',
    })

    const auditRows = await query<Array<{
      report_type: string
      filter_json: Record<string, unknown>
      row_count: number
      data_source: string
      operator_trust: string
      operator_name: string
    }>>(
      `SELECT report_type, filter_json, row_count, data_source, operator_trust, operator_name
         FROM artist_report_export_audit
        WHERE operator_id = ?
        ORDER BY id DESC
        LIMIT 1`,
      ['IT-EXPORT-OP']
    )

    expect(auditRows).toHaveLength(1)
    expect(auditRows[0].report_type).toBe('clock-detail')
    expect(auditRows[0].filter_json).toEqual(filter)
    expect(auditRows[0].row_count).toBe(2)
    expect(auditRows[0].data_source).toBe('db')
    expect(auditRows[0].operator_trust).toBe('header')
    expect(auditRows[0].operator_name).toBe('导出审计测试')
  })
})
