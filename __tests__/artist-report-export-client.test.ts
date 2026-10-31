/**
 * @file artist-report-export-client.test.ts
 * @description 艺人报表导出客户端 — 服务端优先、鉴权拒绝不回退、其它失败回退本地
 * @module __tests__/artist-report-export-client
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 */

jest.mock('@/hooks/use-toast', () => ({ toast: jest.fn(), useToast: jest.fn() }))
jest.mock('@/lib/services/export', () => ({ exportReportRows: jest.fn() }))

import { toast } from '@/hooks/use-toast'
import { exportReportRows } from '@/lib/services/export'
import { exportArtistReport } from '@/lib/services/artist-report-export-client'

const mockedToast = toast as jest.Mock
const mockedExportRows = exportReportRows as jest.Mock

function jsonResponse(status: number, body: unknown, ok = false) {
  return {
    ok,
    status,
    headers: { get: () => null },
    json: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob()),
  } as unknown as Response
}

const FILTER = { from: '2026-10-01', to: '2026-10-31' }
const ROWS = [{ id: 'R-1' }]

describe('艺人报表导出客户端', () => {
  beforeEach(() => {
    mockedToast.mockReset()
    mockedExportRows.mockReset()
    global.fetch = jest.fn()
  })

  it('服务端返回 403 时返回 forbidden，不执行本地导出并提示登录', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      jsonResponse(403, { success: false, message: '导出需登录且持有有效令牌（生产环境已禁用请求头回退）' })
    )

    const outcome = await exportArtistReport('clock-detail', FILTER, ROWS)

    expect(outcome).toBe('forbidden')
    expect(mockedExportRows).not.toHaveBeenCalled()
    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: '导出被拒绝', variant: 'destructive' })
    )
  })

  it('服务端返回 401 时同样不执行本地导出', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(401, { message: '未登录' }))

    const outcome = await exportArtistReport('clock-detail', FILTER, ROWS)

    expect(outcome).toBe('forbidden')
    expect(mockedExportRows).not.toHaveBeenCalled()
  })

  it('服务端 5xx 且无回退数据时返回 skipped', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(500, { message: '导出失败，请稍后重试' }))

    const outcome = await exportArtistReport('clock-detail', FILTER, [])

    expect(outcome).toBe('skipped')
    expect(mockedExportRows).not.toHaveBeenCalled()
  })

  it('服务端 5xx 且有回退数据时执行本地导出', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(jsonResponse(500, { message: '导出失败，请稍后重试' }))

    const outcome = await exportArtistReport('clock-detail', FILTER, ROWS)

    expect(outcome).toBe('fallback')
    expect(mockedExportRows).toHaveBeenCalledTimes(1)
  })
})
