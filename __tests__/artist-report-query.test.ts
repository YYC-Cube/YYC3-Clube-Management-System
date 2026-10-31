import {
  DEDUCTION_STATUS_VALUES,
  DEDUCTION_TYPE_VALUES,
  CLOCK_STATUS_VALUES,
  parseArtistClockQuery,
  parseArtistDeductionQuery,
  parseArtistReportPagination,
} from '@/lib/services/artist-report-query'

describe('艺人报表查询参数解析', () => {
  it('默认分页为第 1 页、每页 20 条', () => {
    const pagination = parseArtistReportPagination(new URLSearchParams())

    expect(pagination).toEqual({ page: 1, pageSize: 20, offset: 0 })
  })

  it('分页参数合法时计算 offset，并限制最大 pageSize', () => {
    const pagination = parseArtistReportPagination(new URLSearchParams('page=3&pageSize=500'))

    expect(pagination.page).toBe(3)
    expect(pagination.pageSize).toBe(200)
    expect(pagination.offset).toBe(400)
  })

  it('非法分页参数回退默认值', () => {
    const pagination = parseArtistReportPagination(new URLSearchParams('page=-1&pageSize=abc'))

    expect(pagination).toEqual({ page: 1, pageSize: 20, offset: 0 })
  })

  it('解析上下钟查询的日期、门店、艺人、状态与关键字', () => {
    const parsed = parseArtistClockQuery(
      new URLSearchParams(
        'from=2026-10-24&to=2026-10-31&store=KTV旗舰店&artistId=A001&status=服务中&keyword=苏晚晴&page=2'
      )
    )

    expect(parsed.errors).toEqual([])
    expect(parsed.filter).toEqual({
      from: '2026-10-24',
      to: '2026-10-31',
      store: 'KTV旗舰店',
      artistId: 'A001',
      search: '苏晚晴',
      status: '服务中',
    })
    expect(parsed.pagination.page).toBe(2)
    expect(parsed.pagination.pageSize).toBe(20)
  })

  it('非法日期与状态进入错误列表，合法字段仍保留', () => {
    const parsed = parseArtistClockQuery(
      new URLSearchParams('from=2026-13-40&to=2026-10-31&status=未知状态')
    )

    expect(parsed.errors).toHaveLength(2)
    expect(parsed.filter.from).toBeUndefined()
    expect(parsed.filter.to).toBe('2026-10-31')
    expect(parsed.filter.status).toBe('all')
  })

  it('解析扣款查询的类型与状态', () => {
    const parsed = parseArtistDeductionQuery(
      new URLSearchParams('type=服务投诉&status=已扣款&store=启智')
    )

    expect(parsed.errors).toEqual([])
    expect(parsed.filter.type).toBe('服务投诉')
    expect(parsed.filter.status).toBe('已扣款')
  })

  it('未知扣款类型/状态进入错误列表', () => {
    const parsed = parseArtistDeductionQuery(
      new URLSearchParams('type=unknown&status=unknown')
    )

    expect(parsed.errors).toHaveLength(2)
    expect(parsed.filter.type).toBe('all')
    expect(parsed.filter.status).toBe('all')
  })

  it('枚举常量覆盖业务允许值', () => {
    expect(CLOCK_STATUS_VALUES).toEqual(['服务中', '待结算', '已结算'])
    expect(DEDUCTION_TYPE_VALUES).toHaveLength(7)
    expect(DEDUCTION_STATUS_VALUES).toEqual(['已扣款', '待确认', '已撤销'])
  })
})
