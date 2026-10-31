"use client"

import { useCallback, useMemo, useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { AlertTriangle, Receipt, Scissors, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/stat-card'
import { FilterBar } from '@/components/dashboard/filter-bar'
import { DataTable } from '@/components/dashboard/data-table'
import { ArtistReportHeader } from '@/components/reports/artist/artist-report-header'
import { ArtistReportNav } from '@/components/reports/artist/artist-report-nav'
import { useArtistDeductionRecords } from '@/hooks/use-artist-report-records'
import {
  buildArtistStoreOptions,
  computeArtistDeductionMetrics,
  filterArtistDeductions,
  formatCurrency,
  type ArtistFeeDeductionRecord,
  type DeductionStatus,
  type DeductionType,
} from '@/lib/services/artist-report'
import { exportArtistReport, toArtistExportDate } from '@/lib/services/artist-report-export-client'

const DEDUCTION_TYPE_OPTIONS = [
  { label: '全部类型', value: 'all' },
  { label: '迟到', value: '迟到' },
  { label: '早退', value: '早退' },
  { label: '缺勤', value: '缺勤' },
  { label: '服务投诉', value: '服务投诉' },
  { label: '违规罚款', value: '违规罚款' },
  { label: '设备损坏', value: '设备损坏' },
  { label: '其他', value: '其他' },
]

const DEDUCTION_STATUS_OPTIONS = [
  { label: '全部状态', value: 'all' },
  { label: '已扣款', value: '已扣款' },
  { label: '待确认', value: '待确认' },
  { label: '已撤销', value: '已撤销' },
]

function typeVariant(type: DeductionType) {
  if (type === '违规罚款') return 'destructive' as const
  if (type === '服务投诉' || type === '设备损坏') return 'secondary' as const
  return 'outline' as const
}

function statusVariant(status: DeductionStatus) {
  if (status === '已扣款') return 'default' as const
  if (status === '待确认') return 'secondary' as const
  return 'outline' as const
}

export default function ArtistFeeDeductionPage() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [store, setStore] = useState('all')
  const [type, setType] = useState<DeductionType | 'all'>('all')
  const [status, setStatus] = useState<DeductionStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const allRecords = useArtistDeductionRecords()
  const storeOptions = useMemo(() => buildArtistStoreOptions(allRecords), [allRecords])

  const handleDateRangeChange = useCallback((range: DateRange | undefined) => {
    setDateRange(range)
  }, [])

  const records = useMemo(
    () =>
      filterArtistDeductions(allRecords, {
        from: dateRange?.from,
        to: dateRange?.to,
        store,
        type,
        status,
        search,
      }),
    [allRecords, dateRange, store, type, status, search]
  )

  const metrics = useMemo(() => computeArtistDeductionMetrics(records), [records])
  const revokedCount = records.filter(record => record.status === '已撤销').length

  const columns = [
    { key: 'time', label: '扣款时间', render: (value: string) => <span className="text-sm">{value}</span> },
    { key: 'id', label: '扣款单号', render: (value: string) => <span className="font-mono text-xs">{value}</span> },
    {
      key: 'artistName',
      label: '艺人信息',
      render: (_: unknown, row: ArtistFeeDeductionRecord) => (
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
      render: (_: unknown, row: ArtistFeeDeductionRecord) => (
        <div className="space-y-1">
          <div className="text-sm">{row.store}</div>
          <div className="text-xs text-muted-foreground">包厢 {row.room}</div>
        </div>
      ),
    },
    {
      key: 'clockRecordId',
      label: '关联上钟单',
      render: (value: string) => <span className="font-mono text-xs text-muted-foreground">{value}</span>,
    },
    {
      key: 'type',
      label: '扣款类型',
      render: (value: DeductionType) => <Badge variant={typeVariant(value)}>{value}</Badge>,
    },
    {
      key: 'stageFee',
      label: '关联台费',
      render: (value: number) => <span className="text-sm">{formatCurrency(value)}</span>,
    },
    {
      key: 'amount',
      label: '扣款金额',
      render: (value: number) => <span className="font-semibold text-destructive">-{formatCurrency(value)}</span>,
    },
    {
      key: 'reason',
      label: '扣款原因',
      render: (value: string) => <span className="block max-w-[240px] text-sm text-muted-foreground">{value}</span>,
    },
    { key: 'operator', label: '经办人', render: (value: string) => <span className="text-sm">{value}</span> },
    {
      key: 'status',
      label: '状态',
      render: (value: DeductionStatus) => <Badge variant={statusVariant(value)}>{value}</Badge>,
    },
  ]

  const handleExport = () => {
    void exportArtistReport(
      'fee-deduction',
      {
        from: toArtistExportDate(dateRange?.from),
        to: toArtistExportDate(dateRange?.to),
        store: store === 'all' ? undefined : store,
        type: type === 'all' ? undefined : type,
        status: status === 'all' ? undefined : status,
        search: search || undefined,
      },
      records
    )
  }

  return (
    <div className="space-y-6">
      <ArtistReportHeader
        title="艺人台费扣款明细"
        description="按扣款单维度查看艺人台费扣款类型、金额与审批状态"
        icon={Scissors}
      />
      <ArtistReportNav />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="有效扣款笔数"
          value={metrics.recordCount}
          icon={Receipt}
          description={revokedCount > 0 ? `另有 ${revokedCount} 笔已撤销` : '已撤销记录不计入'}
          delay={0}
        />
        <StatCard
          title="扣款总额"
          value={formatCurrency(metrics.totalAmount)}
          icon={AlertTriangle}
          description="不含已撤销扣款"
          delay={0.1}
        />
        <StatCard
          title="涉及艺人"
          value={`${metrics.artistCount} 人`}
          icon={Users}
          description="当前筛选范围内的艺人"
          delay={0.2}
        />
        <StatCard
          title="平均单笔扣款"
          value={formatCurrency(metrics.averageAmount)}
          icon={Scissors}
          description="有效扣款平均金额"
          delay={0.3}
        />
      </div>

      <FilterBar
        showDateRange
        onDateRangeChange={handleDateRangeChange}
        searchPlaceholder="搜索扣款单号、艺人、包厢、原因..."
        onSearch={setSearch}
        onExport={handleExport}
        filters={[
          {
            label: '选择门店',
            options: storeOptions,
            onChange: setStore,
          },
          {
            label: '扣款类型',
            options: DEDUCTION_TYPE_OPTIONS,
            onChange: value => setType(value as DeductionType | 'all'),
          },
          {
            label: '扣款状态',
            options: DEDUCTION_STATUS_OPTIONS,
            onChange: value => setStatus(value as DeductionStatus | 'all'),
          },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>台费扣款明细</CardTitle>
          <CardDescription>当前筛选条件下共 {records.length} 条扣款记录</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={records} />
        </CardContent>
      </Card>
    </div>
  )
}
