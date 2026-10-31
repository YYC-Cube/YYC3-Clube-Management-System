// 艺人在编/上下钟/台费 报表数据服务
// 说明：演示数据（Mock）作为离线回退；真实数据由
// `app/api/reports/artist/*` + `lib/db/repositories/artist-report-repository.ts` 提供，
// 过滤与聚合函数在两种数据源下保持同一口径。

export type ArtistLevel = '首席' | '金牌' | '银牌' | '铜牌'

export type ClockStatus = '服务中' | '待结算' | '已结算'

export type DeductionType =
  | '迟到'
  | '早退'
  | '缺勤'
  | '服务投诉'
  | '违规罚款'
  | '设备损坏'
  | '其他'

export type DeductionStatus = '已扣款' | '待确认' | '已撤销'

export interface Artist {
  id: string
  code: string
  name: string
  level: ArtistLevel
  store: string
  phone: string
  joinedAt: string
}

export interface ArtistClockRecord {
  id: string
  artistId: string
  artistCode: string
  artistName: string
  level: ArtistLevel
  store: string
  room: string
  guestName: string
  clockIn: string
  clockOut: string | null
  durationMinutes: number
  stageFee: number
  deduction: number
  netFee: number
  status: ClockStatus
  operator: string
}

export interface ArtistFeeDeductionRecord {
  id: string
  time: string
  clockRecordId: string
  artistId: string
  artistCode: string
  artistName: string
  level: ArtistLevel
  store: string
  room: string
  type: DeductionType
  stageFee: number
  amount: number
  reason: string
  operator: string
  status: DeductionStatus
}

export interface ArtistClockSummaryRow {
  id: string
  artistId: string
  artistCode: string
  artistName: string
  level: ArtistLevel
  store: string
  clockCount: number
  totalMinutes: number
  averageMinutes: number
  totalStageFee: number
  totalDeduction: number
  netFee: number
  activeCount: number
}

export interface ArtistFeeFlowSummaryRow {
  id: string
  artistId: string
  artistCode: string
  artistName: string
  level: ArtistLevel
  store: string
  clockCount: number
  stageFeeTotal: number
  deductionTotal: number
  netFee: number
  settledFee: number
  unsettledFee: number
  settlementRate: number
}

export interface ArtistReportFilter {
  from?: Date
  to?: Date
  store?: string
  artistId?: string
  status?: ClockStatus | 'all'
  search?: string
}

export interface ArtistDeductionFilter {
  from?: Date
  to?: Date
  store?: string
  type?: DeductionType | 'all'
  status?: DeductionStatus | 'all'
  search?: string
}

export interface ArtistClockMetrics {
  recordCount: number
  artistCount: number
  totalMinutes: number
  totalStageFee: number
  totalDeduction: number
  netFee: number
}

export interface ArtistDeductionMetrics {
  recordCount: number
  artistCount: number
  totalAmount: number
  averageAmount: number
}

export interface ArtistFeeMetrics {
  clockCount: number
  stageFeeTotal: number
  deductionTotal: number
  netFee: number
  settledFee: number
  unsettledFee: number
  settlementRate: number
}

export const ARTIST_STORES = ['启智', 'KTV旗舰店'] as const

export const ARTISTS: Artist[] = [
  { id: 'A001', code: 'Y0001', name: '苏晚晴', level: '首席', store: '启智', phone: '13800001001', joinedAt: '2024-03-12' },
  { id: 'A002', code: 'Y0002', name: '叶知秋', level: '金牌', store: '启智', phone: '13800001002', joinedAt: '2024-06-08' },
  { id: 'A003', code: 'Y0003', name: '林绾绾', level: '金牌', store: 'KTV旗舰店', phone: '13800001003', joinedAt: '2024-09-21' },
  { id: 'A004', code: 'Y0004', name: '沈星河', level: '银牌', store: '启智', phone: '13800001004', joinedAt: '2025-01-15' },
  { id: 'A005', code: 'Y0005', name: '白露', level: '银牌', store: 'KTV旗舰店', phone: '13800001005', joinedAt: '2025-02-27' },
  { id: 'A006', code: 'Y0006', name: '江晚吟', level: '铜牌', store: '启智', phone: '13800001006', joinedAt: '2025-05-09' },
  { id: 'A007', code: 'Y0007', name: '温以凡', level: '铜牌', store: 'KTV旗舰店', phone: '13800001007', joinedAt: '2025-07-18' },
  { id: 'A008', code: 'Y0008', name: '唐糖', level: '金牌', store: '启智', phone: '13800001008', joinedAt: '2024-11-02' },
]

interface ClockSeed {
  id: string
  artistId: string
  room: string
  guestName: string
  clockIn: string
  clockOut: string | null
  durationMinutes: number
  stageFee: number
  operator: string
}

const CLOCK_SEEDS: ClockSeed[] = [
  { id: 'SZ20261031001', artistId: 'A001', room: '8888', guestName: '张先生', clockIn: '2026-10-31 20:10', clockOut: null, durationMinutes: 0, stageFee: 600, operator: '启智网络' },
  { id: 'SZ20261031002', artistId: 'A002', room: '6666', guestName: '李先生', clockIn: '2026-10-31 19:30', clockOut: '2026-10-31 21:05', durationMinutes: 95, stageFee: 500, operator: '启智网络' },
  { id: 'SZ20261031003', artistId: 'A003', room: 'V888', guestName: '王先生', clockIn: '2026-10-31 19:00', clockOut: '2026-10-31 20:40', durationMinutes: 100, stageFee: 480, operator: '周经理' },
  { id: 'SZ20261030001', artistId: 'A004', room: '9999', guestName: '陈先生', clockIn: '2026-10-30 21:20', clockOut: '2026-10-30 23:10', durationMinutes: 110, stageFee: 380, operator: '启智网络' },
  { id: 'SZ20261030002', artistId: 'A005', room: '7777', guestName: '赵先生', clockIn: '2026-10-30 20:00', clockOut: '2026-10-30 21:30', durationMinutes: 90, stageFee: 420, operator: '周经理' },
  { id: 'SZ20261029001', artistId: 'A008', room: '520', guestName: '孙先生', clockIn: '2026-10-29 20:15', clockOut: '2026-10-29 22:35', durationMinutes: 140, stageFee: 560, operator: '启智网络' },
  { id: 'SZ20261029002', artistId: 'A006', room: '3333', guestName: '周先生', clockIn: '2026-10-29 19:40', clockOut: '2026-10-29 21:20', durationMinutes: 100, stageFee: 300, operator: '启智网络' },
  { id: 'SZ20261028001', artistId: 'A007', room: '1111', guestName: '吴先生', clockIn: '2026-10-28 21:00', clockOut: '2026-10-28 23:00', durationMinutes: 120, stageFee: 400, operator: '周经理' },
  { id: 'SZ20261028002', artistId: 'A001', room: '8888', guestName: '郑先生', clockIn: '2026-10-28 20:30', clockOut: '2026-10-28 22:45', durationMinutes: 135, stageFee: 600, operator: '启智网络' },
  { id: 'SZ20261027001', artistId: 'A002', room: '6666', guestName: '冯先生', clockIn: '2026-10-27 19:20', clockOut: '2026-10-27 21:30', durationMinutes: 130, stageFee: 520, operator: '启智网络' },
  { id: 'SZ20261027002', artistId: 'A003', room: 'V888', guestName: '褚先生', clockIn: '2026-10-27 20:50', clockOut: '2026-10-27 22:35', durationMinutes: 105, stageFee: 450, operator: '周经理' },
  { id: 'SZ20261026001', artistId: 'A005', room: '7777', guestName: '卫先生', clockIn: '2026-10-26 20:10', clockOut: '2026-10-26 22:20', durationMinutes: 130, stageFee: 500, operator: '周经理' },
  { id: 'SZ20261025001', artistId: 'A004', room: '9999', guestName: '蒋先生', clockIn: '2026-10-25 21:10', clockOut: '2026-10-25 23:00', durationMinutes: 110, stageFee: 350, operator: '启智网络' },
  { id: 'SZ20261025002', artistId: 'A008', room: '520', guestName: '沈先生', clockIn: '2026-10-25 19:50', clockOut: '2026-10-25 22:10', durationMinutes: 140, stageFee: 540, operator: '启智网络' },
  { id: 'SZ20261024001', artistId: 'A006', room: '3333', guestName: '韩先生', clockIn: '2026-10-24 20:40', clockOut: '2026-10-24 23:00', durationMinutes: 140, stageFee: 320, operator: '启智网络' },
  { id: 'SZ20261024002', artistId: 'A007', room: '1111', guestName: '杨先生', clockIn: '2026-10-24 21:15', clockOut: '2026-10-24 23:40', durationMinutes: 145, stageFee: 430, operator: '周经理' },
  { id: 'SZ20261022001', artistId: 'A001', room: '8888', guestName: '朱先生', clockIn: '2026-10-22 20:00', clockOut: '2026-10-22 22:30', durationMinutes: 150, stageFee: 620, operator: '启智网络' },
  { id: 'SZ20261021001', artistId: 'A002', room: '6666', guestName: '秦先生', clockIn: '2026-10-21 19:30', clockOut: '2026-10-21 22:00', durationMinutes: 150, stageFee: 550, operator: '启智网络' },
  { id: 'SZ20261020001', artistId: 'A003', room: 'V888', guestName: '尤先生', clockIn: '2026-10-20 20:20', clockOut: '2026-10-20 22:50', durationMinutes: 150, stageFee: 470, operator: '周经理' },
  { id: 'SZ20261019001', artistId: 'A004', room: '9999', guestName: '许先生', clockIn: '2026-10-19 20:00', clockOut: '2026-10-19 21:50', durationMinutes: 110, stageFee: 350, operator: '启智网络' },
  { id: 'SZ20261018001', artistId: 'A005', room: '7777', guestName: '何先生', clockIn: '2026-10-18 19:50', clockOut: '2026-10-18 22:20', durationMinutes: 150, stageFee: 480, operator: '周经理' },
  { id: 'SZ20261018002', artistId: 'A008', room: '520', guestName: '吕先生', clockIn: '2026-10-18 21:30', clockOut: '2026-10-18 23:30', durationMinutes: 120, stageFee: 500, operator: '启智网络' },
]

interface DeductionSeed {
  id: string
  clockRecordId: string
  artistId: string
  type: DeductionType
  amount: number
  reason: string
  operator: string
  status: DeductionStatus
}

const DEDUCTION_SEEDS: DeductionSeed[] = [
  { id: 'KK20261031001', clockRecordId: 'SZ20261031001', artistId: 'A001', type: '迟到', amount: 100, reason: '晚于排班时间 15 分钟上钟', operator: '启智网络', status: '待确认' },
  { id: 'KK20261031002', clockRecordId: 'SZ20261031002', artistId: 'A002', type: '服务投诉', amount: 50, reason: '客人反馈服务响应不及时', operator: '周经理', status: '已扣款' },
  { id: 'KK20261029003', clockRecordId: 'SZ20261029001', artistId: 'A008', type: '设备损坏', amount: 150, reason: '包厢麦克风损坏，按责任比例承担', operator: '启智网络', status: '待确认' },
  { id: 'KK20261026004', clockRecordId: 'SZ20261026001', artistId: 'A005', type: '迟到', amount: 80, reason: '晚于排班时间 12 分钟上钟', operator: '周经理', status: '已扣款' },
  { id: 'KK20261025005', clockRecordId: 'SZ20261025001', artistId: 'A004', type: '违规罚款', amount: 120, reason: '私自加钟未走系统开台流程', operator: '启智网络', status: '已扣款' },
  { id: 'KK20261024006', clockRecordId: 'SZ20261024002', artistId: 'A007', type: '服务投诉', amount: 100, reason: '客人反馈服务态度问题', operator: '周经理', status: '已扣款' },
  { id: 'KK20261024007', clockRecordId: 'SZ20261024001', artistId: 'A006', type: '迟到', amount: 50, reason: '晚于排班时间 8 分钟上钟', operator: '启智网络', status: '已扣款' },
  { id: 'KK20261022008', clockRecordId: 'SZ20261022001', artistId: 'A001', type: '迟到', amount: 100, reason: '晚于排班时间 15 分钟上钟', operator: '启智网络', status: '已撤销' },
  { id: 'KK20261021009', clockRecordId: 'SZ20261021001', artistId: 'A002', type: '早退', amount: 80, reason: '提前 20 分钟下钟离场', operator: '启智网络', status: '已扣款' },
  { id: 'KK20261018010', clockRecordId: 'SZ20261018001', artistId: 'A005', type: '早退', amount: 60, reason: '提前 15 分钟下钟离场', operator: '周经理', status: '已扣款' },
]

function clockStatus(seed: ClockSeed): ClockStatus {
  if (!seed.clockOut) return '服务中'
  const dateKey = seed.clockIn.slice(0, 10)
  return dateKey >= '2026-10-30' ? '待结算' : '已结算'
}

function artistOf(artistId: string): Artist {
  const artist = ARTISTS.find(item => item.id === artistId)
  if (!artist) {
    throw new Error(`未找到艺人：${artistId}`)
  }
  return artist
}

function buildDeductionRecords(): ArtistFeeDeductionRecord[] {
  return DEDUCTION_SEEDS.map(seed => {
    const clock = CLOCK_SEEDS.find(item => item.id === seed.clockRecordId)
    const artist = artistOf(seed.artistId)

    return {
      id: seed.id,
      time: clock?.clockIn ?? '',
      clockRecordId: seed.clockRecordId,
      artistId: artist.id,
      artistCode: artist.code,
      artistName: artist.name,
      level: artist.level,
      store: artist.store,
      room: clock?.room ?? '—',
      type: seed.type,
      stageFee: clock?.stageFee ?? 0,
      amount: seed.amount,
      reason: seed.reason,
      operator: seed.operator,
      status: seed.status,
    }
  })
}

export const ARTIST_FEE_DEDUCTIONS: ArtistFeeDeductionRecord[] = buildDeductionRecords()

function clockDeductionOf(clockRecordId: string): number {
  return ARTIST_FEE_DEDUCTIONS.filter(
    item => item.clockRecordId === clockRecordId && item.status !== '已撤销'
  ).reduce((total, item) => total + item.amount, 0)
}

export const ARTIST_CLOCK_RECORDS: ArtistClockRecord[] = CLOCK_SEEDS.map(seed => {
  const artist = artistOf(seed.artistId)
  const deduction = clockDeductionOf(seed.id)

  return {
    id: seed.id,
    artistId: artist.id,
    artistCode: artist.code,
    artistName: artist.name,
    level: artist.level,
    store: artist.store,
    room: seed.room,
    guestName: seed.guestName,
    clockIn: seed.clockIn,
    clockOut: seed.clockOut,
    durationMinutes: seed.durationMinutes,
    stageFee: seed.stageFee,
    deduction,
    netFee: seed.stageFee - deduction,
    status: clockStatus(seed),
    operator: seed.operator,
  }
}).sort((a, b) => (a.clockIn < b.clockIn ? 1 : -1))

export const ARTIST_OPTIONS = ARTISTS.map(artist => ({
  label: `${artist.name}（${artist.code}）`,
  value: artist.id,
}))

export const ARTIST_STORE_OPTIONS = [
  { label: '全部门店', value: 'all' },
  ...ARTIST_STORES.map(store => ({ label: store, value: store })),
]

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function inDateRange(time: string, from?: Date, to?: Date): boolean {
  const dateKey = time.slice(0, 10)
  if (from && dateKey < toDateKey(from)) return false
  if (to && dateKey > toDateKey(to)) return false
  return true
}

function matchSearch(search: string | undefined, values: string[]): boolean {
  const keyword = (search ?? '').trim().toLowerCase()
  if (!keyword) return true
  return values.some(value => value.toLowerCase().includes(keyword))
}

export function filterArtistClockRecords(
  records: ArtistClockRecord[],
  filter: ArtistReportFilter
): ArtistClockRecord[] {
  return records.filter(record => {
    if (!inDateRange(record.clockIn, filter.from, filter.to)) return false
    if (filter.store && filter.store !== 'all' && record.store !== filter.store) return false
    if (filter.artistId && filter.artistId !== 'all' && record.artistId !== filter.artistId) return false
    if (filter.status && filter.status !== 'all' && record.status !== filter.status) return false
    return matchSearch(filter.search, [record.id, record.artistName, record.artistCode, record.room, record.guestName])
  })
}

export function filterArtistDeductions(
  records: ArtistFeeDeductionRecord[],
  filter: ArtistDeductionFilter
): ArtistFeeDeductionRecord[] {
  return records.filter(record => {
    if (!inDateRange(record.time, filter.from, filter.to)) return false
    if (filter.store && filter.store !== 'all' && record.store !== filter.store) return false
    if (filter.type && filter.type !== 'all' && record.type !== filter.type) return false
    if (filter.status && filter.status !== 'all' && record.status !== filter.status) return false
    return matchSearch(filter.search, [record.id, record.artistName, record.artistCode, record.room, record.reason])
  })
}

export function computeArtistClockMetrics(records: ArtistClockRecord[]): ArtistClockMetrics {
  return records.reduce<ArtistClockMetrics>(
    (metrics, record) => ({
      recordCount: metrics.recordCount + 1,
      artistCount: metrics.artistCount,
      totalMinutes: metrics.totalMinutes + record.durationMinutes,
      totalStageFee: metrics.totalStageFee + record.stageFee,
      totalDeduction: metrics.totalDeduction + record.deduction,
      netFee: metrics.netFee + record.netFee,
    }),
    {
      recordCount: 0,
      artistCount: new Set(records.map(record => record.artistId)).size,
      totalMinutes: 0,
      totalStageFee: 0,
      totalDeduction: 0,
      netFee: 0,
    }
  )
}

export function computeArtistDeductionMetrics(
  records: ArtistFeeDeductionRecord[]
): ArtistDeductionMetrics {
  const effective = records.filter(record => record.status !== '已撤销')
  const totalAmount = effective.reduce((total, record) => total + record.amount, 0)

  return {
    recordCount: effective.length,
    artistCount: new Set(effective.map(record => record.artistId)).size,
    totalAmount,
    averageAmount: effective.length === 0 ? 0 : totalAmount / effective.length,
  }
}

export function buildArtistClockSummary(records: ArtistClockRecord[]): ArtistClockSummaryRow[] {
  const groups = new Map<string, ArtistClockRecord[]>()
  records.forEach(record => {
    const list = groups.get(record.artistId) ?? []
    list.push(record)
    groups.set(record.artistId, list)
  })

  return Array.from(groups.values())
    .map(group => {
      const first = group[0]
      const totalMinutes = group.reduce((total, record) => total + record.durationMinutes, 0)
      const settledRecords = group.filter(record => record.durationMinutes > 0)

      return {
        id: first.artistId,
        artistId: first.artistId,
        artistCode: first.artistCode,
        artistName: first.artistName,
        level: first.level,
        store: first.store,
        clockCount: group.length,
        totalMinutes,
        averageMinutes:
          settledRecords.length === 0
            ? 0
            : totalMinutes / settledRecords.length,
        totalStageFee: group.reduce((total, record) => total + record.stageFee, 0),
        totalDeduction: group.reduce((total, record) => total + record.deduction, 0),
        netFee: group.reduce((total, record) => total + record.netFee, 0),
        activeCount: group.filter(record => record.status === '服务中').length,
      }
    })
    .sort((a, b) => b.netFee - a.netFee)
}

export function buildArtistFeeFlowSummary(records: ArtistClockRecord[]): ArtistFeeFlowSummaryRow[] {
  const groups = new Map<string, ArtistClockRecord[]>()
  records.forEach(record => {
    const list = groups.get(record.artistId) ?? []
    list.push(record)
    groups.set(record.artistId, list)
  })

  return Array.from(groups.values())
    .map(group => {
      const first = group[0]
      const settledFee = group
        .filter(record => record.status === '已结算')
        .reduce((total, record) => total + record.netFee, 0)
      const unsettledFee = group
        .filter(record => record.status !== '已结算')
        .reduce((total, record) => total + record.netFee, 0)
      const netFee = settledFee + unsettledFee

      return {
        id: first.artistId,
        artistId: first.artistId,
        artistCode: first.artistCode,
        artistName: first.artistName,
        level: first.level,
        store: first.store,
        clockCount: group.length,
        stageFeeTotal: group.reduce((total, record) => total + record.stageFee, 0),
        deductionTotal: group.reduce((total, record) => total + record.deduction, 0),
        netFee,
        settledFee,
        unsettledFee,
        settlementRate: netFee === 0 ? 0 : (settledFee / netFee) * 100,
      }
    })
    .sort((a, b) => b.netFee - a.netFee)
}

export function computeArtistFeeMetrics(records: ArtistClockRecord[]): ArtistFeeMetrics {
  const stageFeeTotal = records.reduce((total, record) => total + record.stageFee, 0)
  const deductionTotal = records.reduce((total, record) => total + record.deduction, 0)
  const settledFee = records
    .filter(record => record.status === '已结算')
    .reduce((total, record) => total + record.netFee, 0)
  const unsettledFee = records
    .filter(record => record.status !== '已结算')
    .reduce((total, record) => total + record.netFee, 0)
  const netFee = settledFee + unsettledFee

  return {
    clockCount: records.length,
    stageFeeTotal,
    deductionTotal,
    netFee,
    settledFee,
    unsettledFee,
    settlementRate: netFee === 0 ? 0 : (settledFee / netFee) * 100,
  }
}

export function buildArtistChartData(records: ArtistClockRecord[], limit = 6) {
  const summary = buildArtistClockSummary(records).slice(0, limit)

  return summary.map(row => ({
    name: row.artistName,
    clocks: row.clockCount,
    netFee: row.netFee,
  }))
}

export function formatCurrency(value: number): string {
  return `¥${value.toFixed(2)}`
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '—'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}分钟`
  return rest === 0 ? `${hours}小时` : `${hours}小时${rest}分`
}

export function formatHours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`
}

/** 从报表记录动态生成门店筛选项（适配真实数据的 store_id / store 值） */
export function buildArtistStoreOptions(records: Array<{ store: string }>) {
  const stores = Array.from(new Set(records.map(record => record.store).filter(Boolean))).sort(
    (a, b) => a.localeCompare(b, 'zh-CN')
  )
  return [{ label: '全部门店', value: 'all' }, ...stores.map(store => ({ label: store, value: store }))]
}

/** 从报表记录动态生成艺人筛选项（按艺人编号排序） */
export function buildArtistSelectorOptions(
  records: Array<Pick<ArtistClockRecord, 'artistId' | 'artistCode' | 'artistName'>>
) {
  const map = new Map<string, { label: string; value: string; code: string }>()
  records.forEach(record => {
    if (!record.artistId || map.has(record.artistId)) return
    map.set(record.artistId, {
      label: `${record.artistName}（${record.artistCode}）`,
      value: record.artistId,
      code: record.artistCode,
    })
  })
  return Array.from(map.values())
    .sort((a, b) => a.code.localeCompare(b.code))
    .map(({ label, value }) => ({ label, value }))
}
