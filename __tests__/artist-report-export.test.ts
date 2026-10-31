/**
 * @jest-environment node
 */

import {
  ARTIST_EXPORT_FIELDS,
  ARTIST_REPORT_EXPORT_TYPES,
  MAX_EXPORT_ROWS,
  buildArtistExportFilename,
  isArtistReportExportType,
  toArtistExportSearchParams,
} from '@/lib/services/artist-report-export'
import { toArtistExportDate } from '@/lib/services/artist-report-export-client'
import { buildReportCsv } from '@/lib/services/export'

describe('艺人报表导出契约', () => {
  it('报表类型白名单仅接受 4 类报表', () => {
    expect(ARTIST_REPORT_EXPORT_TYPES).toHaveLength(4)
    expect(isArtistReportExportType('clock-detail')).toBe(true)
    expect(isArtistReportExportType('fee-summary')).toBe(true)
    expect(isArtistReportExportType('unknown')).toBe(false)
    expect(isArtistReportExportType(null)).toBe(false)
  })

  it('每一类报表都有列定义，且列 key 唯一', () => {
    for (const type of ARTIST_REPORT_EXPORT_TYPES) {
      const fields = ARTIST_EXPORT_FIELDS[type]
      expect(fields.length).toBeGreaterThan(0)
      const keys = fields.map(field => field.key)
      expect(new Set(keys).size).toBe(keys.length)
    }
    expect(ARTIST_EXPORT_FIELDS['clock-detail'].map(field => field.key)).toContain('netFee')
    expect(ARTIST_EXPORT_FIELDS['fee-summary'].map(field => field.key)).toContain('settlementRate')
  })

  it('单次导出上限为 50000 行', () => {
    expect(MAX_EXPORT_ROWS).toBe(50000)
  })

  it('文件名按门店时区生成（Asia/Shanghai 跨日边界）', () => {
    const beforeMidnightUtc = new Date('2026-10-31T15:59:00Z')
    expect(buildArtistExportFilename('clock-detail', beforeMidnightUtc)).toBe(
      '艺人上下钟明细_2026-10-31.csv'
    )
    const afterMidnightUtc = new Date('2026-10-31T16:01:00Z')
    expect(buildArtistExportFilename('clock-summary', afterMidnightUtc)).toBe(
      '艺人上下钟汇总_2026-11-01.csv'
    )
  })

  it('筛选参数序列化忽略空值并去除首尾空格', () => {
    const params = toArtistExportSearchParams({
      from: ' 2026-10-24 ',
      to: '',
      store: 'KTV旗舰店',
      artistId: undefined,
      search: '   ',
    })

    expect(params.get('from')).toBe('2026-10-24')
    expect(params.has('to')).toBe(false)
    expect(params.get('store')).toBe('KTV旗舰店')
    expect(params.has('artistId')).toBe(false)
    expect(params.has('search')).toBe(false)
  })

  it('本地日期使用本地时区，避免 UTC 偏移', () => {
    expect(toArtistExportDate(new Date(2026, 9, 31, 23, 30))).toBe('2026-10-31')
    expect(toArtistExportDate(undefined)).toBeUndefined()
  })

  it('CSV 构建转义逗号、引号与换行', () => {
    const csv = buildReportCsv(
      [
        { name: '张,三', remark: '含"引号"', note: '第一行\n第二行' },
        { name: '李四', remark: '', note: null },
      ],
      [
        { key: 'name', label: '姓名' },
        { key: 'remark', label: '备注' },
        { key: 'note', label: '说明' },
      ]
    )

    expect(csv.startsWith('姓名,备注,说明\n')).toBe(true)
    expect(csv).toContain('"张,三","含""引号""","第一行')
    expect(csv).toContain('第二行"')
    expect(csv.endsWith('李四,,')).toBe(true)
  })

  it('CSV 空数据仅输出表头', () => {
    const csv = buildReportCsv([], [
      { key: 'artistName', label: '艺人姓名' },
      { key: 'netFee', label: '实收台费' },
    ])
    expect(csv).toBe('艺人姓名,实收台费')
  })
})
