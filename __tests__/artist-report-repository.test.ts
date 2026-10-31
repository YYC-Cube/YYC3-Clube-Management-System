jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
  healthCheck: jest.fn(),
  closePool: jest.fn(),
  pool: {},
  db: {},
}))

import { query } from '@/lib/db'
import {
  artistReportRepository,
  buildClockWhere,
  buildDeductionWhere,
  mapClockRow,
  mapClockSummaryRow,
  mapDeductionRow,
  mapFeeSummaryRow,
  type ArtistClockRow,
  type ArtistClockSummaryDbRow,
  type ArtistDeductionRow,
  type ArtistFeeSummaryDbRow,
} from '@/lib/db/repositories/artist-report-repository'

const mockedQuery = query as jest.Mock

describe('艺人报表仓储层（单元）', () => {
  beforeEach(() => {
    mockedQuery.mockReset()
  })

  it('上下钟查询条件映射日期、门店、艺人、状态与关键字', () => {
    const where = buildClockWhere({
      from: '2026-10-24',
      to: '2026-10-31',
      store: 'KTV旗舰店',
      artistId: 'A001',
      status: '服务中',
      search: '苏晚晴',
    })

    expect(where.clause).toContain("r.clock_in_at >= (?::date::timestamp AT TIME ZONE 'Asia/Shanghai')")
    expect(where.clause).toContain("((?::date + 1)::timestamp AT TIME ZONE 'Asia/Shanghai')")
    expect(where.clause).toContain('a.store_id = ?')
    expect(where.clause).toContain('r.artist_id = ?')
    expect(where.clause).toContain('r.status = ?')
    expect(where.clause).toContain('ILIKE')
    expect(where.params.slice(0, 5)).toEqual([
      '2026-10-24',
      '2026-10-31',
      'KTV旗舰店',
      'A001',
      'serving',
    ])
    expect(where.params).toHaveLength(10)
    expect(where.params.slice(5)).toEqual(Array(5).fill('%苏晚晴%'))
  })

  it('扣款查询条件将中文类型/状态映射为数据库枚举', () => {
    const where = buildDeductionWhere({
      from: '2026-10-24',
      to: '2026-10-31',
      type: '服务投诉',
      status: '已扣款',
    })

    expect(where.params).toEqual(['2026-10-24', '2026-10-31', 'complaint', 'confirmed'])
  })

  it('上下钟行映射数值、状态与空下钟时间', () => {
    const row: ArtistClockRow = {
      id: 'C1',
      record_no: 'R1',
      artist_id: 'A1',
      artist_no: 'Y0001',
      artist_name: '苏晚晴',
      level: '首席',
      store_id: 'S1',
      room_no: '8888',
      guest_name: null,
      clock_in: '2026-10-31 20:10',
      clock_out: null,
      duration_minutes: '0',
      stage_fee: '600.00',
      status: 'serving',
      deduction: '100.50',
      net_fee: '499.50',
      operator: null,
    }

    const record = mapClockRow(row)
    expect(record.clockOut).toBeNull()
    expect(record.guestName).toBe('—')
    expect(record.stageFee).toBe(600)
    expect(record.deduction).toBe(100.5)
    expect(record.netFee).toBe(499.5)
    expect(record.status).toBe('服务中')
    expect(record.operator).toBe('—')
  })

  it('扣款行映射类型、状态与关联上钟单', () => {
    const row: ArtistDeductionRow = {
      id: 'D1',
      deduction_no: 'KK1',
      time: '2026-10-31 20:20',
      clock_record_id: 'C1',
      artist_id: 'A1',
      artist_no: 'Y0001',
      artist_name: '苏晚晴',
      level: '首席',
      store_id: 'S1',
      room_no: '8888',
      type: 'violation',
      stage_fee: '600.00',
      amount: '120.00',
      reason: '违规',
      status: 'revoked',
      operator: 'OP1',
    }

    const record = mapDeductionRow(row)
    expect(record.type).toBe('违规罚款')
    expect(record.status).toBe('已撤销')
    expect(record.amount).toBe(120)
    expect(record.stageFee).toBe(600)
    expect(record.clockRecordId).toBe('C1')
  })

  it('汇总行计算平均时长与结算进度，避免除零', () => {
    const clockRow: ArtistClockSummaryDbRow = {
      id: 'A1',
      artist_no: 'Y0001',
      artist_name: '苏晚晴',
      level: '首席',
      store_id: 'S1',
      clock_count: '3',
      total_minutes: '270',
      timed_count: '2',
      total_stage_fee: '1700.00',
      total_deduction: '100.00',
      net_fee: '1600.00',
      active_count: '1',
    }
    const summary = mapClockSummaryRow(clockRow)
    expect(summary.averageMinutes).toBe(135)
    expect(summary.netFee).toBe(1600)
    expect(summary.activeCount).toBe(1)

    const emptyFeeRow: ArtistFeeSummaryDbRow = {
      id: 'A2',
      artist_no: 'Y0002',
      artist_name: '叶知秋',
      level: '金牌',
      store_id: 'S1',
      clock_count: '0',
      stage_fee_total: '0',
      deduction_total: '0',
      net_fee: '0',
      settled_fee: '0',
      unsettled_fee: '0',
    }
    expect(mapFeeSummaryRow(emptyFeeRow).settlementRate).toBe(0)

    const feeRow: ArtistFeeSummaryDbRow = {
      ...emptyFeeRow,
      clock_count: '2',
      net_fee: '1000.00',
      settled_fee: '500.00',
      unsettled_fee: '500.00',
    }
    expect(mapFeeSummaryRow(feeRow).settlementRate).toBe(50)
  })

  it('findClockRecords 组装分页 SQL 并返回映射结果', async () => {
    const row: ArtistClockRow = {
      id: 'C1',
      record_no: 'R1',
      artist_id: 'A1',
      artist_no: 'Y0001',
      artist_name: '苏晚晴',
      level: '首席',
      store_id: 'S1',
      room_no: '8888',
      guest_name: '张先生',
      clock_in: '2026-10-31 20:10',
      clock_out: '2026-10-31 21:05',
      duration_minutes: '55',
      stage_fee: '600.00',
      status: 'unsettled',
      deduction: '0',
      net_fee: '600.00',
      operator: 'OP1',
    }

    mockedQuery
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([{ total: '1' }])

    const result = await artistReportRepository.findClockRecords(
      { from: '2026-10-24', to: '2026-10-31' },
      { page: 2, pageSize: 5, offset: 5 }
    )

    expect(mockedQuery).toHaveBeenCalledTimes(2)
    const [sql, params] = mockedQuery.mock.calls[0]
    expect(sql).toContain('ORDER BY r.clock_in_at DESC')
    expect(sql).toContain('LIMIT ? OFFSET ?')
    expect(params.slice(-2)).toEqual([5, 5])
    expect(result.total).toBe(1)
    expect(result.data[0].netFee).toBe(600)
    expect(result.data[0].status).toBe('待结算')
  })

  it('findDeductions 默认分页查询包含有效与已撤销记录', async () => {
    mockedQuery.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: '0' }])

    const result = await artistReportRepository.findDeductions(
      {},
      { page: 1, pageSize: 20, offset: 0 }
    )

    expect(result.total).toBe(0)
    expect(result.data).toEqual([])
    const [sql] = mockedQuery.mock.calls[0]
    expect(sql).toContain('FROM artist_fee_deduction d')
    expect(sql).toContain('ORDER BY d.created_at DESC')
  })

  it('recordExportAudit 写入报表类型、筛选 JSON 与操作人信息', async () => {
    mockedQuery.mockResolvedValueOnce([])

    await artistReportRepository.recordExportAudit({
      reportType: 'clock-detail',
      filter: { from: '2026-10-24', to: '2026-10-31', store: 'KTV旗舰店' },
      rowCount: 22,
      dataSource: 'db',
      operatorTrust: 'jwt',
      operatorId: 'OP1',
      operatorName: '运营张三',
      clientIp: '127.0.0.1',
      userAgent: 'jest-agent',
    })

    const [sql, params] = mockedQuery.mock.calls[0]
    expect(sql).toContain('INSERT INTO artist_report_export_audit')
    expect(sql).toContain('?::jsonb')
    expect(sql).toContain('operator_trust')
    expect(params[0]).toBe('clock-detail')
    expect(JSON.parse(params[1])).toEqual({
      from: '2026-10-24',
      to: '2026-10-31',
      store: 'KTV旗舰店',
    })
    expect(params.slice(2)).toEqual([
      22,
      'db',
      'jwt',
      'OP1',
      '运营张三',
      '127.0.0.1',
      'jest-agent',
    ])
  })

  it('recordExportAudit 对缺失的可选字段写入 NULL', async () => {
    mockedQuery.mockResolvedValueOnce([])

    await artistReportRepository.recordExportAudit({
      reportType: 'fee-summary',
      filter: {},
      rowCount: 0,
      dataSource: 'mock',
    })

    const [, params] = mockedQuery.mock.calls[0]
    expect(params[1]).toBe('{}')
    // 未提供可信级别时降级为 none，其余可选字段写 NULL
    expect(params.slice(4)).toEqual(['none', null, null, null, null])
  })
})
