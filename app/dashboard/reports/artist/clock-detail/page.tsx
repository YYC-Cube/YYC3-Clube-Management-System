"use client"

import { useCallback, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Music2, Clock, Timer, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/stat-card'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { DataTable } from '@/components/dashboard/data-table'
import { ArtistReportHeader } from '@/components/reports/artist/artist-report-header'
import { ArtistReportNav } from '@/components/reports/artist/artist-report-nav'
import { useArtistClockRecords } from '@/hooks/use-artist-report-records'
import {
  buildArtistSelectorOptions,
  buildArtistStoreOptions,
  computeArtistClockMetrics,
  filterArtistClockRecords,
  formatCurrency,
  formatDuration,
  formatHours,
  type ArtistClockRecord,
  type ClockStatus,
} from '@/lib/services/artist-report'
import { exportReportRows } from '@/lib/services/export'

const STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '服务中', value: '服务中' },
  { label: '待结算', value: '待结算' },
  { label: '已结算', value: '已结算' },
]

function statusVariant(status: ClockStatus) {
  if (status === '服务中') return 'default' as const
  if (status === '待结算') return 'secondary' as const
  return 'outline' as const
}

export default function ArtistClockDetailPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [store, setStore] = useState('all')
  const [artistId, setArtistId] = useState('all')
  const [status, setStatus] = useState<ClockStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const allRecords = useArtistClockRecords()
  const storeOptions = useMemo(() => buildArtistStoreOptions(allRecords), [allRecords])
  const artistOptions = useMemo(() => buildArtistSelectorOptions(allRecords), [allRecords])

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    setDateRange(range)
  }, [])

  const records = useMemo(
    () =>
      filterArtistClockRecords(allRecords, {
        from: dateRange?.from,
        to: dateRange?.to,
        store,
        artistId,
        status,
        search,
      }),
    [allRecords, dateRange, store, artistId, status, search]
  )

  const metrics = useMemo(() => computeArtistClockMetrics(records), [records])
  const averageMinutes = metrics.recordCount === 0 ? 0 : metrics.totalMinutes / metrics.recordCount

  const columns = [
    { key: 'id', label: '上钟单号', render: (value: string) => <span className="font-mono text-xs">{value}</span> },
    {
      key: 'artistName',
      label: '艺人信息',
      render: (_: unknown, row: ArtistClockRecord) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.artistName}</div>
          <div className="text-xs text-muted-foreground">
            {row.artistCode} · {row.level}
          </div>
        </div>
      ),
    },
    {
      key: 'store',
      label: '门店 / 包厢',
      render: (_: unknown, row: ArtistClockRecord) => (
        <div className="space-y-1">
          <div className="text-sm">{row.store}</div>
          <div className="text-xs text-muted-foreground">包厢 {row.room}</div>
        </div>
      ),
    },
    { key: 'clockIn', label: '上钟时间', render: (value: string) => <span className="text-sm">{value}</span> },
    {
      key: 'clockOut',
      label: '下钟时间',
      render: (value: string | null) => (
        <span className={value ? 'text-sm' : 'text-sm text-muted-foreground'}>{value ?? '服务中'}</span>
      ),
    },
    {
      key: 'durationMinutes',
      label: '时长',
      render: (value: number) => <span className="font-medium">{formatDuration(value)}</span>,
    },
    {
      key: 'stageFee',
      label: '台费',
      render: (value: number) => <span className="font-semibold">{formatCurrency(value)}</span>,
    },
    {
      key: 'deduction',
      label: '扣款',
      render: (value: number) =>
        value > 0 ? (
          <span className="font-semibold text-destructive">-{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'netFee',
      label: '实收台费',
      render: (value: number) => <span className="font-semibold text-primary">{formatCurrency(value)}</span>,
    },
    {
      key: 'status',
      label: '状态',
      render: (value: ClockStatus) => <Badge variant={statusVariant(value)}>{value}</Badge>,
    },
  ]

  const handleExport = () => {
    exportReportRows(
      records,
      [
        { key: 'id', label: '上钟单号' },
        { key: 'artistCode', label: '艺人编号' },
        { key: 'artistName', label: '艺人姓名' },
        { key: 'level', label: '艺人等级' },
        { key: 'store', label: '门店' },
        { key: 'room', label: '包厢' },
        { key: 'guestName', label: '客人' },
        { key: 'clockIn', label: '上钟时间' },
        { key: 'clockOut', label: '下钟时间' },
        { key: 'durationMinutes', label: '时长(分钟)' },
        { key: 'stageFee', label: '台费' },
        { key: 'deduction', label: '扣款' },
        { key: 'netFee', label: '实收台费' },
        { key: 'status', label: '状态' },
        { key: 'operator', label: '经办人' },
      ],
      `艺人上下钟明细_${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  return (
    <div className="space-y-6">
      <ArtistReportHeader title="艺人上下钟明细" description="按上钟单维度查看艺人上下钟、台费与扣款明细" icon={Music2} />
      <ArtistReportNav />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="上钟次数"
          value={metrics.recordCount}
          icon={Music2}
          description={`涉及 ${metrics.artistCount} 位艺人`}
          delay={0}
        />
        <StatCard
          title="累计服务时长"
          value={formatHours(metrics.totalMinutes)}
          icon={Timer}
          description={`平均 ${averageMinutes.toFixed(0)} 分钟/单`}
          delay={0.1}
        />
        <StatCard
          title="台费收入"
          value={formatCurrency(metrics.totalStageFee)}
          icon={Wallet}
          description={`扣款 ${formatCurrency(metrics.totalDeduction)}`}
          delay={0.2}
        />
        <StatCard
          title="实收台费"
          value={formatCurrency(metrics.netFee)}
          icon={Clock}
          description="台费扣除扣款后的实收金额"
          delay={0.3}
        />
      </div>

      <FilterBar
        showDateRange
        onDateRangeChange={handleDateRangeChange}
        searchPlaceholder="搜索单号、艺人、包厢、客人..."
        onSearch={setSearch}
        onExport={handleExport}
        filters={[
          {
            label: '选择门店',
            options: storeOptions,
            onChange: setStore,
          },
          {
            label: '选择艺人',
            options: [{ label: '全部艺人', value: 'all' }, ...artistOptions],
            onChange: setArtistId,
          },
          {
            label: '上钟状态',
            options: STATUS_OPTIONS,
            onChange: value => setStatus(value as ClockStatus | 'all'),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>上下钟明细</CardTitle>
          <CardDescription>当前筛选条件下共 {records.length} 条上钟记录</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={records} />
        </CardContent>
      </Card>
    </div>
  )
}
