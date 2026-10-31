import Link from 'next/link'
import { ArrowRight, BarChart3, Music2, Package, Users, Wine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const REPORT_GROUPS = [
  {
    title: '营业报表',
    description: '商品销售明细、销售汇总、盈利与营业收入报表。',
    href: '/dashboard/reports/business',
    icon: BarChart3,
    tag: '营业',
  },
  {
    title: '仓库报表',
    description: '商品入库、出库与库存变化明细报表。',
    href: '/dashboard/reports/warehouse',
    icon: Package,
    tag: '仓库',
  },
  {
    title: '会员报表',
    description: '会员消费、充值、积分与到店统计。',
    href: '/dashboard/reports/members',
    icon: Users,
    tag: '会员',
  },
  {
    title: '酒水存取报表',
    description: '酒水寄存、取酒与充公数据统计。',
    href: '/dashboard/reports/liquor',
    icon: Wine,
    tag: '酒水',
  },
  {
    title: '艺人报表',
    description: '艺人上下钟明细/汇总、台费扣款明细与台费流水汇总。',
    href: '/dashboard/reports/artist',
    icon: Music2,
    tag: '艺人',
  },
]

export default function ReportsCenterPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <BarChart3 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">报表中心</h1>
          <p className="mt-1 text-sm text-muted-foreground">营业、仓库、会员、酒水与艺人报表统一入口</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {REPORT_GROUPS.map(group => {
          const Icon = group.icon
          return (
            <Link key={group.href} href={group.href} className="group">
              <Card className="h-full transition-colors group-hover:border-primary/50 group-hover:bg-accent/30">
                <CardHeader className="flex flex-row items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{group.title}</CardTitle>
                      <Badge variant="outline">{group.tag}</Badge>
                    </div>
                    <CardDescription>{group.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    进入报表
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
