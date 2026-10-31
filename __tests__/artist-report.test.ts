import {
  ARTIST_CLOCK_RECORDS,
  ARTIST_FEE_DEDUCTIONS,
  buildArtistClockSummary,
  buildArtistFeeFlowSummary,
  computeArtistDeductionMetrics,
  computeArtistFeeMetrics,
  filterArtistClockRecords,
  filterArtistDeductions,
  formatCurrency,
  formatDuration,
} from '@/lib/services/artist-report'

const from = new Date(2026, 9, 24)
const to = new Date(2026, 9, 31)

describe('艺人报表数据服务', () => {
  it('按日期范围过滤上下钟记录，不包含范围外数据', () => {
    const records = filterArtistClockRecords(ARTIST_CLOCK_RECORDS, { from, to })

    expect(records.length).toBe(16)
    expect(records.every(record => record.clockIn.slice(0, 10) >= '2026-10-24')).toBe(true)
    expect(records.every(record => record.clockIn.slice(0, 10) <= '2026-10-31')).toBe(true)
  })

  it('支持门店、艺人、状态与关键字组合筛选', () => {
    const flagship = filterArtistClockRecords(ARTIST_CLOCK_RECORDS, { store: 'KTV旗舰店' })
    expect(flagship.every(record => record.store === 'KTV旗舰店')).toBe(true)

    const artist = filterArtistClockRecords(ARTIST_CLOCK_RECORDS, { artistId: 'A001' })
    expect(artist.every(record => record.artistId === 'A001')).toBe(true)
    expect(artist.length).toBe(3)

    const serving = filterArtistClockRecords(ARTIST_CLOCK_RECORDS, { status: '服务中' })
    expect(serving.length).toBe(1)
    expect(serving[0].clockOut).toBeNull()

    const search = filterArtistClockRecords(ARTIST_CLOCK_RECORDS, { search: '苏晚晴' })
    expect(search.length).toBe(3)
  })

  it('扣款指标排除已撤销记录', () => {
    const metrics = computeArtistDeductionMetrics(ARTIST_FEE_DEDUCTIONS)

    expect(metrics.recordCount).toBe(9)
    expect(metrics.totalAmount).toBe(790)
    expect(metrics.artistCount).toBe(7)
    expect(metrics.averageAmount).toBeCloseTo(87.78, 1)
  })

  it('台费指标满足 台费 - 扣款 = 实收 的勾稽关系', () => {
    const metrics = computeArtistFeeMetrics(ARTIST_CLOCK_RECORDS)

    expect(metrics.clockCount).toBe(22)
    expect(metrics.stageFeeTotal).toBe(10320)
    expect(metrics.deductionTotal).toBe(790)
    expect(metrics.netFee).toBe(9530)
    expect(metrics.stageFeeTotal - metrics.deductionTotal).toBe(metrics.netFee)
    expect(metrics.settledFee + metrics.unsettledFee).toBe(metrics.netFee)
    expect(metrics.settlementRate).toBeCloseTo(76.6, 1)
  })

  it('汇总结果按实收台费倒序且分组字段一致', () => {
    const clockSummary = buildArtistClockSummary(ARTIST_CLOCK_RECORDS)
    const flowSummary = buildArtistFeeFlowSummary(ARTIST_CLOCK_RECORDS)

    expect(clockSummary.length).toBe(8)
    expect(flowSummary.length).toBe(8)
    expect(clockSummary[0].netFee).toBeGreaterThanOrEqual(clockSummary[1].netFee)
    expect(flowSummary[0].netFee).toBeGreaterThanOrEqual(flowSummary[1].netFee)
    clockSummary.forEach(row => {
      expect(row.clockCount).toBeGreaterThan(0)
      expect(row.netFee).toBe(row.totalStageFee - row.totalDeduction)
    })
  })

  it('扣款明细支持按类型与状态过滤', () => {
    const late = filterArtistDeductions(ARTIST_FEE_DEDUCTIONS, { type: '迟到' })
    expect(late.length).toBe(4)
    expect(late.every(record => record.type === '迟到')).toBe(true)

    const confirmed = filterArtistDeductions(ARTIST_FEE_DEDUCTIONS, { status: '已扣款' })
    expect(confirmed.every(record => record.status === '已扣款')).toBe(true)
  })

  it('格式化工具输出符合预期', () => {
    expect(formatCurrency(123.4)).toBe('¥123.40')
    expect(formatDuration(0)).toBe('—')
    expect(formatDuration(95)).toBe('1小时35分')
    expect(formatDuration(120)).toBe('2小时')
  })
})
