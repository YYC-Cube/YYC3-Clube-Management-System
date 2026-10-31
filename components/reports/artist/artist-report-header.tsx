'use client'

import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface ArtistReportHeaderProps {
  title: string
  description: string
  icon: LucideIcon
}

export function ArtistReportHeader({ title, description, icon: Icon }: ArtistReportHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-3"
    >
      <div className="rounded-lg bg-primary/10 p-2">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  )
}
