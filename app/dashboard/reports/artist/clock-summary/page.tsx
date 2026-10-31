"use client"

import { useCallback, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { BarChart3, Music2, Timer, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip } from '@/components/ui/chart'
import { StatCard } from '@/components/dashboard/stat-card'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { DataTable } from '@/components/dashboard/data-table'
import { ArtistReportHeader } from '@/components/reports/artist/artist-report-header'
import { ArtistReportNav } from '@/components/reports/artist/artist-report-nav'
import { useArtistClockRecords } from '@/hooks/use-artist-report-records'
import {
  buildArtistChartData,
  buildArtistClockSummary,
  buildArtistSelectorOptions,
  buildArtistStoreOptions,
  computeArtistClockMetrics,
  filterArtistClockRecords,
  formatCurrency,
  formatDuration,
  formatHours,
  type ArtistClockSummaryRow,
} from '@/lib/services/artist-report'
import { exportReportRows } from '@/lib/services/export'

export default function ArtistClockSummaryPage() {
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

  const metrics = useMemo(() => computeArtistClockMetrics(records), [records])
  const summary = useMemo(() => buildArtistClockSummary(records), [records])
  const chartData = useMemo(() => buildArtistChartData(records, 8), [records])

  const columns = [
    {
      key: 'artistName',
      label: '艺人信息',
      render: (_: unknown, row: ArtistClockSummaryRow) => (
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
      render: (value: number, row: ArtistClockSummaryRow) => (
        <div className="space-y-1">
          <div className="text-sm font-semibold">{value} 次</div>
          {row.activeCount > 0 && (
            <div className="text-xs text-primary">服务中 {row.activeCount} 单</div>
          )}
        </div>
      ),
    },
    {
      key: 'totalMinutes',
      label: '累计时长',
      render: (value: number) => <span className="font-medium">{formatHours(value)}</span>,
    },
    {
      key: 'averageMinutes',
      label: '平均时长',
      render: (value: number) => <span className="text-sm">{formatDuration(value)}</span>,
    },
    {
      key: 'totalStageFee',
      label: '台费收入',
      render: (value: number) => <span className="font-semibold">{formatCurrency(value)}</span>,
    },
    {
      key: 'totalDeduction',
      label: '扣款金额',
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
        { key: 'totalMinutes', label: '累计时长(分钟)' },
        { key: 'averageMinutes', label: '平均时长(分钟)' },
        { key: 'totalStageFee', label: '台费收入' },
        { key: 'totalDeduction', label: '扣款金额' },
        { key: 'netFee', label: '实收台费' },
      ],
      `艺人上下钟汇总_${new Date().toISOString().slice(0, 10)}.csv`
    )
  }

  return (
    <div className="space-y-6">
      <ArtistReportHeader
        title="艺人上下钟汇总"
        description="按艺人维度汇总上钟次数、服务时长与台费收益"
        icon={Music2}
      />
      <ArtistReportNav />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="上钟总次数"
          value={metrics.recordCount}
          icon={Music2}
          description={`涉及 ${metrics.artistCount} 位艺人`}
          delay={0}
        />
        <StatCard
          title="累计服务时长"
          value={formatHours(metrics.totalMinutes)}
          icon={Timer}
          description="按上钟记录累计"
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
          icon={BarChart3}
          description="台费扣除扣款后的实收金额"
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
          <CardTitle>上钟次数排行</CardTitle>
          <CardDescription>当前筛选条件下上钟次数排名前 8 的艺人</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              clocks: { label: '上钟次数', color: 'hsl(var(--chart-1))' },
            }}
            className="h-[280px] w-full"
          >
            <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
              <ChartTooltip />
              <Bar dataKey="clocks" fill="var(--color-clocks)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>艺人上钟汇总</CardTitle>
          <CardDescription>共 {summary.length} 位艺人，按实收台费从高到低排序</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={summary} />
        </CardContent>
      </Card>
    </div>
  )
}
