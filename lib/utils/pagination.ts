/**
 * @file pagination.ts
 * @description 前端分页工具 — 对已加载的行集合做稳定切片与页码收敛
 * @module utils/pagination
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 *
 * 说明：
 * - 服务端接口已支持 page/pageSize，本工具用于「前端已一次性加载」的报表页面分页；
 * - 页码越界时自动收敛到 [1, totalPages]，避免筛选后出现空白页；
 * - 纯函数，无副作用，便于单测覆盖。
 */

export interface PageSlice<T> {
  /** 实际生效页码（已收敛） */
  page: number
  pageSize: number
  /** 总行数 */
  total: number
  /** 总页数（空数据时为 1，便于 UI 显示「第 1 / 1 页」） */
  totalPages: number
  /** 当前页行 */
  rows: T[]
}

export function paginateRows<T>(
  rows: readonly T[],
  page: number,
  pageSize: number
): PageSlice<T> {
  const total = rows.length
  const size = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : Math.max(total, 1)
  const totalPages = Math.max(1, Math.ceil(total / size))

  const requested = Number.isFinite(page) ? Math.floor(page) : 1
  const current = Math.min(Math.max(1, requested), totalPages)

  const start = (current - 1) * size

  return {
    page: current,
    pageSize: size,
    total,
    totalPages,
    rows: rows.slice(start, start + size),
  }
}
