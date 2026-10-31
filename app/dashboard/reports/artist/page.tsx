"use client"

import Link from 'next/link'
import {
  ArrowRight,
  Banknote,
  Clock3,
  Music2,
  Receipt,
  Scissors,
  Wallet,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArtistReportNav } from '@/components/reports/artist/artist-report-nav'
import { ArtistReportHeader } from '@/components/reports/artist/artist-report-header'
import { useArtistClockRecords, useArtistDeductionRecords } from '@/hooks/use-artist-report-records'
import {
  computeArtistClockMetrics,
  computeArtistDeductionMetrics,
  computeArtistFeeMetrics,
  formatCurrency,
  formatHours,
} from '@/lib/services/artist-report'

const REPORT_ENTRIES = [
  {
    title: '艺人上下钟明细',
    description: '逐单查看上钟、下钟、服务时长、台费与结算状态，支持按门店、艺人、状态筛选。',
    href: '/dashboard/reports/artist/clock-detail',
    tag: '明细',
    icon: Clock3,
  },
  {
    title: '艺人上下钟汇总',
    description: '按艺人汇总上钟次数、累计与平均时长、台费收益，输出上钟次数排行。',
    href: '/dashboard/reports/artist/clock-summary',
    tag: '汇总',
    icon: Music2,
  },
  {
    title: '艺人台费扣款明细',
    description: '逐笔查看扣款类型、金额、关联上钟单、扣款原因与审批状态。',
    href: '/dashboard/reports/artist/fee-deduction',
    tag: '明细',
    icon: Scissors,
  },
  {
    title: '艺人台费流水汇总',
    description: '按艺人汇总台费产生、扣款、应结、已结与待结金额，跟踪结算进度。',
    href: '/dashboard/reports/artist/fee-summary',
    tag: '汇总',
    icon: Wallet,
  },
]

export default function ArtistReportOverviewPage() {
  const clockRecords = useArtistClockRecords()
  const deductionRecords = useArtistDeductionRecords()

  const clockMetrics = computeArtistClockMetrics(clockRecords)
  const deductionMetrics = computeArtistDeductionMetrics(deductionRecords)
  const feeMetrics = computeArtistFeeMetrics(clockRecords)

  return (
    <div className="space-y-6">
      <ArtistReportHeader
        title="艺人报表"
        description="艺人在编、上下钟与台费结算的全链路报表中心"
        icon={Music2}
      />
      <ArtistReportNav />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">上钟总次数</p>
                <p className="text-3xl font-bold tracking-tight">{clockMetrics.recordCount}</p>
                <p className="text-xs text-muted-foreground">
                  {clockMetrics.artistCount} 位艺人 · {formatHours(clockMetrics.totalMinutes)}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <Clock3 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">台费总额</p>
                <p className="text-3xl font-bold tracking-tight">{formatCurrency(feeMetrics.stageFeeTotal)}</p>
                <p className="text-xs text-muted-foreground">应结 {formatCurrency(feeMetrics.netFee)}</p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <Banknote className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">扣款金额</p>
                <p className="text-3xl font-bold tracking-tight">{formatCurrency(deductionMetrics.totalAmount)}</p>
                <p className="text-xs text-muted-foreground">
                  {deductionMetrics.recordCount} 笔 · 涉及 {deductionMetrics.artistCount} 人
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <Receipt className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">结算进度</p>
                <p className="text-3xl font-bold tracking-tight">{feeMetrics.settlementRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  待结 {formatCurrency(feeMetrics.unsettledFee)}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-3">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {REPORT_ENTRIES.map(entry => {
          const Icon = entry.icon
          return (
            <Link key={entry.href} href={entry.href} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
                <CardHeader className="flex flex-row items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{entry.title}</CardTitle>
                      <Badge variant={entry.tag === '明细' ? 'secondary' : 'outline'}>{entry.tag}</Badge>
                    </div>
                    <CardDescription>{entry.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    查看报表
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
