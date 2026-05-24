"use client"

import { DashboardStats } from "@/components/dashboard/dashboard-stats"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { RecentOrders } from "@/components/dashboard/recent-orders"
import { Skeleton } from "@/components/ui/skeleton"
import { Suspense } from "react"

const mockStats = [
  { id: "1", title: "总收入", value: "¥128,950", change: "+12.5%", trend: "up" as const },
  { id: "2", title: "总订单", value: "1,284", change: "+8.2%", trend: "up" as const },
  { id: "3", title: "活跃会员", value: "356", change: "+3.1%", trend: "up" as const },
  { id: "4", title: "平均客单价", value: "¥100.4", change: "-2.3%", trend: "down" as const },
]

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">仪表盘</h1>
        <p className="mt-2 text-muted-foreground">欢迎回来,这是您的业务概览</p>
      </div>

      <Suspense fallback={<StatsLoadingSkeleton />}>
        <DashboardStats data={mockStats} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<OrdersLoadingSkeleton />}>
            <RecentOrders orders={[]} />
          </Suspense>
        </div>
        <QuickActions />
      </div>
    </div>
  )
}

function StatsLoadingSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-32" />
      ))}
    </div>
  )
}

function OrdersLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-20" />
      ))}
    </div>
  )
}
