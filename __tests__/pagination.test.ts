/**
 * @jest-environment node
 */

import { paginateRows } from '@/lib/utils/pagination'

const rows = Array.from({ length: 45 }, (_, index) => ({ id: index + 1 }))

describe('前端分页工具 paginateRows', () => {
  it('按 pageSize 切片并返回总页数', () => {
    const slice = paginateRows(rows, 1, 20)
    expect(slice.page).toBe(1)
    expect(slice.total).toBe(45)
    expect(slice.totalPages).toBe(3)
    expect(slice.rows).toHaveLength(20)
    expect(slice.rows[0]).toEqual({ id: 1 })
    expect(slice.rows[19]).toEqual({ id: 20 })
  })

  it('最后一页只返回剩余行', () => {
    const slice = paginateRows(rows, 3, 20)
    expect(slice.rows).toHaveLength(5)
    expect(slice.rows[0]).toEqual({ id: 41 })
    expect(slice.rows[4]).toEqual({ id: 45 })
  })

  it('页码越界收敛到最后一页，不返回空白', () => {
    expect(paginateRows(rows, 99, 20).page).toBe(3)
    expect(paginateRows(rows, 99, 20).rows).toHaveLength(5)
    expect(paginateRows(rows, 0, 20).page).toBe(1)
    expect(paginateRows(rows, -5, 20).page).toBe(1)
    expect(paginateRows(rows, 1.7, 20).page).toBe(1)
  })

  it('空数据返回第 1 页且 totalPages 为 1', () => {
    const slice = paginateRows([], 5, 20)
    expect(slice.page).toBe(1)
    expect(slice.total).toBe(0)
    expect(slice.totalPages).toBe(1)
    expect(slice.rows).toEqual([])
  })

  it('非法 pageSize 时回退为全量一页，不丢数据', () => {
    expect(paginateRows(rows, 1, 0).rows).toHaveLength(45)
    expect(paginateRows(rows, 1, -3).rows).toHaveLength(45)
    expect(paginateRows(rows, 1, Number.NaN).totalPages).toBe(1)
    expect(paginateRows(rows, 1, 12.9).pageSize).toBe(12)
  })

  it('不修改原数组引用', () => {
    const slice = paginateRows(rows, 2, 10)
    expect(slice.rows).not.toBe(rows)
    expect(rows).toHaveLength(45)
  })
})
