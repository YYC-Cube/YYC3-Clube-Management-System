/**
 * @file data-table-pagination.test.tsx
 * @description DataTable 前端分页交互 — 翻页、末页、无分页时保持原行为
 * @module __tests__
 * @author YYC³
 * @created 2026-10-31
 */

import { fireEvent, render, screen } from '@testing-library/react'
import { DataTable } from '@/components/dashboard/data-table'

const columns = [
  { key: 'id', label: '编号' },
  { key: 'name', label: '名称' },
]

const rows = Array.from({ length: 45 }, (_, index) => ({
  id: index + 1,
  name: `艺人${index + 1}`,
}))

describe('DataTable 前端分页', () => {
  it('按 pageSize 渲染并展示页码信息', () => {
    render(<DataTable columns={columns} data={rows} pageSize={20} />)

    expect(screen.getByText('共 45 条 · 第 1 / 3 页')).toBeInTheDocument()
    // 表头 1 行 + 当前页 20 行
    expect(screen.getAllByRole('row')).toHaveLength(21)
    expect(screen.getByText('艺人1')).toBeInTheDocument()
    expect(screen.queryByText('艺人21')).not.toBeInTheDocument()
  })

  it('点击下一页/末页/上一页可切换页码与行数', () => {
    render(<DataTable columns={columns} data={rows} pageSize={20} />)

    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(screen.getByText('共 45 条 · 第 2 / 3 页')).toBeInTheDocument()
    expect(screen.getByText('艺人21')).toBeInTheDocument()
    expect(screen.queryByText('艺人1')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '末页' }))
    expect(screen.getByText('共 45 条 · 第 3 / 3 页')).toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(6)

    fireEvent.click(screen.getByRole('button', { name: '上一页' }))
    expect(screen.getByText('共 45 条 · 第 2 / 3 页')).toBeInTheDocument()
  })

  it('首页/上一页在第 1 页禁用，末页/下一页在最后一页禁用', () => {
    render(<DataTable columns={columns} data={rows} pageSize={20} />)

    expect(screen.getByRole('button', { name: '首页' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '末页' }))
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '末页' })).toBeDisabled()
  })

  it('不传 pageSize 时保持一次性渲染，不显示分页页脚', () => {
    render(<DataTable columns={columns} data={rows} />)

    expect(screen.queryByText(/页$/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(46)
  })

  it('数据量不足一页时不显示空分页控件', () => {
    render(<DataTable columns={columns} data={rows.slice(0, 5)} pageSize={20} />)

    expect(screen.queryByText(/第 1 \/ 1 页/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('row')).toHaveLength(6)
  })
})
