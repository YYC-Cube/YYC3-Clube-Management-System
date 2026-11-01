/**
 * @file export-route-strict.test.ts
 * @description 艺人报表导出接口 — 生产严格模式（禁用请求头回退）路由级验证
 * @module __tests__/export-route-strict
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 *
 * 覆盖点：
 * - `ARTIST_EXPORT_REQUIRE_JWT=true` 时，仅携带 x-operator-* 请求头 → 403，且不触发取数；
 * - 严格模式关闭时，请求头回退可用 → 200，审计记录 operatorTrust=header；
 * - 严格模式开启但携带有效签名令牌 → 200，审计记录 operatorTrust=jwt。
 */

jest.mock('next/server', () => {
  class MockNextResponse {
    public status: number
    public headers: Record<string, string>
    public body: unknown

    constructor(body?: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body
      this.status = init?.status ?? 200
      this.headers = init?.headers ?? {}
    }

    static json(body: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new MockNextResponse(body, init)
    }

    async json() {
      return this.body
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
  }

  return { NextRequest: class {}, NextResponse: MockNextResponse }
})

jest.mock('@/lib/security/jwt', () => ({
  verifyToken: jest.fn(),
  generateToken: jest.fn(),
}))

jest.mock('@/lib/db/repositories/artist-report-repository', () => ({
  artistReportRepository: { recordExportAudit: jest.fn() },
}))

jest.mock('@/lib/services/artist-report-data', () => ({
  getArtistExportData: jest.fn(),
}))

import { verifyToken } from '@/lib/security/jwt'
import { artistReportRepository } from '@/lib/db/repositories/artist-report-repository'
import { getArtistExportData } from '@/lib/services/artist-report-data'
import { POST } from '@/app/api/reports/artist/export/route'

const mockedVerify = verifyToken as jest.Mock
const mockedGetData = getArtistExportData as jest.Mock
const mockedAudit = artistReportRepository.recordExportAudit as jest.Mock

type ExportRouteRequest = Parameters<typeof POST>[0]

function makeRequest(headers: Record<string, string>, body?: unknown): ExportRouteRequest {
  const request = {
    headers: new Headers(headers),
    json: () =>
      Promise.resolve(
        body ?? { reportType: 'clock-detail', filter: { from: '2026-10-01', to: '2026-10-31' } }
      ),
  }
  return request as unknown as ExportRouteRequest
}

const ORIGINAL_FLAG = process.env.ARTIST_EXPORT_REQUIRE_JWT

describe('艺人报表导出 — 生产严格模式', () => {
  beforeEach(() => {
    mockedVerify.mockReset()
    mockedVerify.mockResolvedValue(null)
    mockedGetData.mockReset()
    mockedGetData.mockResolvedValue({ data: [], total: 0, source: 'mock' })
    mockedAudit.mockReset()
    mockedAudit.mockResolvedValue(undefined)
    process.env.ARTIST_EXPORT_REQUIRE_JWT = ORIGINAL_FLAG
  })

  afterAll(() => {
    if (ORIGINAL_FLAG === undefined) {
      delete process.env.ARTIST_EXPORT_REQUIRE_JWT
    } else {
      process.env.ARTIST_EXPORT_REQUIRE_JWT = ORIGINAL_FLAG
    }
  })

  it('严格模式开启时仅有请求头身份 → 403，且不触发取数与审计', async () => {
    process.env.ARTIST_EXPORT_REQUIRE_JWT = 'true'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST(makeRequest({ 'x-operator-id': 'OP-1', 'x-operator-name': '前台小王' }) as any)

    expect(response.status).toBe(403)
    expect(await response.json()).toMatchObject({ success: false })
    expect(mockedGetData).not.toHaveBeenCalled()
    expect(mockedAudit).not.toHaveBeenCalled()
  })

  it('严格模式开启但无任何身份信息 → 403', async () => {
    process.env.ARTIST_EXPORT_REQUIRE_JWT = '1'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST(makeRequest({}) as any)

    expect(response.status).toBe(403)
    expect(mockedGetData).not.toHaveBeenCalled()
  })

  it('严格模式关闭时请求头回退可用 → 200，审计标记 operatorTrust=header', async () => {
    process.env.ARTIST_EXPORT_REQUIRE_JWT = 'false'

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST(makeRequest({ 'x-operator-id': 'OP-2', 'x-operator-name': '运营李四' }) as any)

    expect(response.status).toBe(200)
    expect(mockedGetData).toHaveBeenCalled()
    expect(mockedAudit).toHaveBeenCalledWith(
      expect.objectContaining({ operatorId: 'OP-2', operatorName: '运营李四', operatorTrust: 'header' })
    )
  })

  it('严格模式开启且携带有效令牌 → 200，审计标记 operatorTrust=jwt', async () => {
    process.env.ARTIST_EXPORT_REQUIRE_JWT = 'true'
    mockedVerify.mockResolvedValue({
      userId: 'U-1',
      role: 'admin',
      storeId: 'STORE-1',
      permissions: ['export_reports'],
      name: '管理员',
      iat: 1,
      exp: 2,
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST(makeRequest({ authorization: 'Bearer signed.jwt' }) as any)

    expect(response.status).toBe(200)
    expect(mockedAudit).toHaveBeenCalledWith(
      expect.objectContaining({ operatorId: 'U-1', operatorName: '管理员', operatorTrust: 'jwt' })
    )
  })

  it('非法 reportType 在鉴权前返回 400', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const response = await POST({
      headers: new Headers({}),
      json: () => Promise.resolve({ reportType: 'unknown' }),
    } as any)

    expect(response.status).toBe(400)
    expect(mockedGetData).not.toHaveBeenCalled()
  })
})
