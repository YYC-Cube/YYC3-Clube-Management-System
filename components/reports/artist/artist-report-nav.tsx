'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const ARTIST_REPORT_LINKS = [
  { key: 'overview', title: '报表总览', href: '/dashboard/reports/artist' },
  { key: 'clock-detail', title: '上下钟明细', href: '/dashboard/reports/artist/clock-detail' },
  { key: 'clock-summary', title: '上下钟汇总', href: '/dashboard/reports/artist/clock-summary' },
  { key: 'fee-deduction', title: '台费扣款明细', href: '/dashboard/reports/artist/fee-deduction' },
  { key: 'fee-summary', title: '台费流水汇总', href: '/dashboard/reports/artist/fee-summary' },
]

export function ArtistReportNav() {
  const pathname = usePathname()

  return (
    <div className="flex w-full gap-1 overflow-x-auto rounded-lg border bg-card p-1.5">
      {ARTIST_REPORT_LINKS.map(link => {
        const isActive = pathname === link.href
        return (
          <Link
            key={link.key}
            href={link.href}
            className={cn(
              'shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            {link.title}
          </Link>
        )
      })}
    </div>
  )
}
