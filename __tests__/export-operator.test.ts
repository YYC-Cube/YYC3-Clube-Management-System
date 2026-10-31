jest.mock('@/lib/security/jwt', () => ({
  verifyToken: jest.fn(),
  generateToken: jest.fn(),
}))

import { verifyToken } from '@/lib/security/jwt'
import { requireTrustedOperator, resolveExportOperator } from '@/lib/services/export-operator'

const mockedVerify = verifyToken as jest.Mock

function headers(init: Record<string, string> = {}): Headers {
  return new Headers(init)
}

describe('导出操作人解析（可信级别）', () => {
  beforeEach(() => {
    mockedVerify.mockReset()
    mockedVerify.mockResolvedValue(null)
  })

  it('签名 JWT 校验通过时取 userId/name/storeId/role，trust=jwt', async () => {
    mockedVerify.mockResolvedValue({
      userId: 'U-1',
      role: 'admin',
      storeId: 'STORE-1',
      permissions: ['export_reports'],
      name: '管理员',
      iat: 1,
      exp: 2,
    })

    const operator = await resolveExportOperator(headers({ authorization: 'Bearer signed.jwt' }))

    expect(operator).toEqual({
      operatorId: 'U-1',
      operatorName: '管理员',
      storeId: 'STORE-1',
      role: 'admin',
      trust: 'jwt',
    })
    expect(mockedVerify).toHaveBeenCalledWith('signed.jwt')
  })

  it('令牌缺少 name 时使用 userId 作为操作人名称', async () => {
    mockedVerify.mockResolvedValue({
      userId: 'U-2',
      role: 'manager',
      storeId: 'STORE-2',
      permissions: [],
      iat: 1,
      exp: 2,
    })

    const operator = await resolveExportOperator(headers({ authorization: 'Bearer signed.jwt' }))
    expect(operator.trust).toBe('jwt')
    expect(operator.operatorName).toBe('U-2')
  })

  it('非法令牌回退请求头，并标记 trust=header', async () => {
    const operator = await resolveExportOperator(
      headers({
        authorization: 'Bearer forged.token.value',
        'x-operator-id': ' OP-9 ',
        'x-operator-name': '运营李四',
      })
    )

    expect(operator).toEqual({
      operatorId: 'OP-9',
      operatorName: '运营李四',
      trust: 'header',
    })
  })

  it('仅有请求头时 trust=header，并去除首尾空白', async () => {
    const operator = await resolveExportOperator(
      headers({ 'x-operator-id': '  OP-7  ', 'x-operator-name': '  夜班主管 ' })
    )

    expect(operator).toEqual({
      operatorId: 'OP-7',
      operatorName: '夜班主管',
      trust: 'header',
    })
  })

  it('无任何身份信息时 trust=none 且不带操作人字段', async () => {
    const operator = await resolveExportOperator(headers())
    expect(operator).toEqual({ trust: 'none' })
  })

  it('非 Bearer 认证头不参与解析，按请求头处理', async () => {
    const operator = await resolveExportOperator(
      headers({ authorization: 'Basic abc', 'x-operator-name': '匿名' })
    )

    expect(operator.trust).toBe('header')
    expect(operator.operatorName).toBe('匿名')
    expect(mockedVerify).not.toHaveBeenCalled()
  })

  it('Bearer 大小写不敏感，仍调用令牌校验', async () => {
    mockedVerify.mockResolvedValue({
      userId: 'U-3',
      role: 'cashier',
      storeId: 'STORE-3',
      permissions: [],
      iat: 1,
      exp: 2,
    })

    const operator = await resolveExportOperator(headers({ authorization: 'bearer signed.jwt' }))
    expect(operator.trust).toBe('jwt')
    expect(operator.operatorId).toBe('U-3')
  })
})

describe('导出严格模式（requireTrustedOperator）', () => {
  it('生产环境未显式配置时默认要求令牌校验', () => {
    expect(requireTrustedOperator({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toBe(true)
  })

  it('非生产环境未显式配置时允许请求头回退，便于本地联调', () => {
    expect(requireTrustedOperator({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toBe(false)
    expect(requireTrustedOperator({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe(false)
    expect(requireTrustedOperator({} as NodeJS.ProcessEnv)).toBe(false)
  })

  it('ARTIST_EXPORT_REQUIRE_JWT=true / 1 显式开启严格模式（含前后空白与大小写）', () => {
    expect(
      requireTrustedOperator({
        NODE_ENV: 'development',
        ARTIST_EXPORT_REQUIRE_JWT: 'true',
      } as NodeJS.ProcessEnv)
    ).toBe(true)
    expect(
      requireTrustedOperator({
        NODE_ENV: 'development',
        ARTIST_EXPORT_REQUIRE_JWT: ' TRUE ',
      } as NodeJS.ProcessEnv)
    ).toBe(true)
    expect(
      requireTrustedOperator({
        NODE_ENV: 'production',
        ARTIST_EXPORT_REQUIRE_JWT: '1',
      } as NodeJS.ProcessEnv)
    ).toBe(true)
  })

  it('ARTIST_EXPORT_REQUIRE_JWT=false / 0 显式关闭严格模式（覆盖生产默认）', () => {
    expect(
      requireTrustedOperator({
        NODE_ENV: 'production',
        ARTIST_EXPORT_REQUIRE_JWT: 'false',
      } as NodeJS.ProcessEnv)
    ).toBe(false)
    expect(
      requireTrustedOperator({
        NODE_ENV: 'production',
        ARTIST_EXPORT_REQUIRE_JWT: ' 0 ',
      } as NodeJS.ProcessEnv)
    ).toBe(false)
  })

  it('无法识别的取值回落到 NODE_ENV 判定', () => {
    expect(
      requireTrustedOperator({
        NODE_ENV: 'production',
        ARTIST_EXPORT_REQUIRE_JWT: 'yes',
      } as NodeJS.ProcessEnv)
    ).toBe(true)
    expect(
      requireTrustedOperator({
        NODE_ENV: 'development',
        ARTIST_EXPORT_REQUIRE_JWT: '   ',
      } as NodeJS.ProcessEnv)
    ).toBe(false)
  })
})
