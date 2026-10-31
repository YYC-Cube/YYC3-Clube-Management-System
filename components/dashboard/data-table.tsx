'use client'

import * as React from 'react'

import { motion } from 'framer-motion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { paginateRows } from '@/lib/utils/pagination'

interface Column {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
}

interface DataTableProps {
  columns: Column[]
  data: any[]
  loading?: boolean
  actions?: (row: any) => React.ReactNode
  onRowClick?: (row: any) => void
  /** 前端分页每页行数；不传则一次性渲染全部（保持既有页面行为） */
  pageSize?: number
}

export function DataTable({ columns, data, loading = false, actions, onRowClick, pageSize = 0 }: DataTableProps) {
  const [page, setPage] = React.useState(1)
  const paginated = pageSize > 0
  const slice = React.useMemo(
    () => (paginated ? paginateRows(data, page, pageSize) : null),
    [paginated, data, page, pageSize]
  )
  const rows = slice ? slice.rows : data

  // 筛选结果变化时回到第 1 页，避免停留在空白页
  React.useEffect(() => {
    if (paginated) setPage(1)
  }, [paginated, data.length])

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(column => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
            {actions && <TableHead className="w-[80px]">操作</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (actions ? 1 : 0)}
                className="h-24 text-center text-muted-foreground"
              >
                加载中...
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length + (actions ? 1 : 0)}
                className="h-24 text-center text-muted-foreground"
              >
                暂无数据
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <motion.tr
                key={row.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group cursor-pointer hover:bg-muted/50"
                onClick={() => onRowClick?.(row)}
              >
                {columns.map(column => (
                  <TableCell key={column.key}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </TableCell>
                ))}
                {actions && (
                  <TableCell onClick={e => e.stopPropagation()}>{actions(row)}</TableCell>
                )}
              </motion.tr>
            ))
          )}
        </TableBody>
      </Table>
      {slice && slice.totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            共 {slice.total} 条 · 第 {slice.page} / {slice.totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={slice.page <= 1}
              onClick={() => setPage(1)}
            >
              首页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={slice.page <= 1}
              onClick={() => setPage(slice.page - 1)}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={slice.page >= slice.totalPages}
              onClick={() => setPage(slice.page + 1)}
            >
              下一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={slice.page >= slice.totalPages}
              onClick={() => setPage(slice.totalPages)}
            >
              末页
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
