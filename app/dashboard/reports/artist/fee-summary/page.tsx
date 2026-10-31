"use client"

import { useCallback, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Banknote, CircleDollarSign, Music2, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { StatCard } from '@/components/dashboard/stat-card'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { DataTable } from '@/components/dashboard/data-table'
import { ArtistReportHeader } from '@/components/reports/artist/artist-report-header'
import { ArtistReportNav } from '@/components/reports/artist/artist-report-nav'
import { useArtistClockRecords } from '@/hooks/use-artist-report-records'
import {
  buildArtistFeeFlowSummary,
  buildArtistSelectorOptions,
  buildArtistStoreOptions,
  computeArtistFeeMetrics,
  filterArtistClockRecords,
  formatCurrency,
  type ArtistFeeFlowSummaryRow,
} from '@/lib/services/artist-report'
import { exportReportRows } from '@/lib/services/export'

export default function ArtistFeeSummaryPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [store, setStore] = useState('all')
  const [artistId, setArtistId] = useState('all')
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
        search,
      }),
    [allRecords, dateRange, store, artistId, search]
  )

  const metrics = useMemo(() => computeArtistFeeMetrics(records), [records])
  const summary = useMemo(() => buildArtistFeeFlowSummary(records), [records])
  const chartData = useMemo(
    () =>
      summary.slice(0, 8).map(row => ({
        name: row.artistName,
        stageFee: row.stageFeeTotal,
        deduction: row.deductionTotal,
        netFee: row.netFee,
      })),
    [summary]
  )

  const columns = [
    {
      key: 'artistName',
      label: '艺人信息',
      render: (_: unknown, row: ArtistFeeFlowSummaryRow) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.artistName}</div>
          <div className="text-xs text-muted-foreground">
            {row.artistCode} · {row.level}
          </div>
        </div>
      ),
    },
    { key: 'store', label: '门店' },
    {
      key: 'clockCount',
      label: '上钟次数',
      render: (value: number) => <span className="font-medium">{value} 次</span>,
    },
    {
      key: 'stageFeeTotal',
      label: '台费总额',
      render: (value: number) => <span className="font-semibold">{formatCurrency(value)}</span>,
    },
    {
      key: 'deductionTotal',
      label: '扣款总额',
      render: (value: number) =>
        value > 0 ? (
          <span className="font-semibold text-destructive">-{formatCurrency(value)}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'netFee',
      label: '应结台费',
      render: (value: number) => <span className="font-semibold text-primary">{formatCurrency(value)}</span>,
    },
    {
      key: 'settledFee',
      label: '已结台费',
      render: (value: number) => <span className="font-medium">{formatCurrency(value)}</span>,
    },
    {
      key: 'unsettledFee',
      label: '待结台费',
      render: (value: number) => (
        <span className={value > 0 ? 'font-medium text-orange-600' : 'text-muted-foreground'}>
          {value > 0 ? formatCurrency(value) : '—'}
        </span>
      ),
    },
    {
      key: 'settlementRate',
      label: '结算进度',
      render: (value: number) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{value.toFixed(1)}%</div>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(value, 100)}%` }} />
          </div>
        </div>
      ),
    },
  ]

  const handleExport = () => {
    exportReportRows(
      summary,
      [
        { key: 'artistCode', label: '艺人编号' },
        { key: 'artistName', label: '艺人姓名' },
        { key: 'level', label: '艺人等级' },
        { key: 'store', label: '门店' },
        { key: 'clockCount', label: '上钟次数' },
        { key: 'stageFeeTotal', label: '台费总额' },
        { key: 'deductionTotal', label: '扣款总额' },
        { key: 'netFee', label: '应结台费' },
        { key: 'settledFee', label: '已结台费' },
        { key: 'unsettledFee', label: '待结台费' },
        { key: 'settlementRate', label: '结算进度(%)' },
      ],
      `艺人台费流水汇总_${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  return (
    <div className="space-y-6">
      <ArtistReportHeader
        title="艺人台费流水汇总"
        description="按艺人维度汇总台费产生、扣款与结算流水"
        icon={Wallet}
      />
      <ArtistReportNav />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="台费总额"
          value={formatCurrency(metrics.stageFeeTotal)}
          icon={Banknote}
          description={`上钟 ${metrics.clockCount} 次`}
          delay={0}
        />
        <StatCard
          title="扣款总额"
          value={formatCurrency(metrics.deductionTotal)}
          icon={CircleDollarSign}
          description="已撤销扣款不计入"
          delay={0.1}
        />
        <StatCard
          title="应结台费"
          value={formatCurrency(metrics.netFee)}
          icon={Wallet}
          description="台费总额扣除扣款"
          delay={0.2}
        />
        <StatCard
          title="结算进度"
          value={`${metrics.settlementRate.toFixed(1)}%`}
          icon={Music2}
          description={`已结 ${formatCurrency(metrics.settledFee)} · 待结 ${formatCurrency(metrics.unsettledFee)}`}
          delay={0.3}
        />
      </div>

      <FilterBar
        showDateRange
        onDateRangeChange={handleDateRangeChange}
        searchPlaceholder="搜索艺人姓名、编号..."
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
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>台费流水对比</CardTitle>
          <CardDescription>台费总额、扣款总额与应结台费（前 8 位艺人）</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              stageFee: { label: '台费总额', color: 'hsl(var(--chart-1))' },
              deduction: { label: '扣款总额', color: 'hsl(var(--chart-3))' },
              netFee: { label: '应结台费', color: 'hsl(var(--chart-2))' },
            }}
            className="h-[300px] w-full"
          >
            <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip />
              <Bar dataKey="stageFee" fill="var(--color-stageFee)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="deduction" fill="var(--color-deduction)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="netFee" fill="var(--color-netFee)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>台费流水汇总</CardTitle>
          <CardDescription>共 {summary.length} 位艺人，按应结台费从高到低排序</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={summary} />
        </CardContent>
      </Card>
    </div>
  )
}
