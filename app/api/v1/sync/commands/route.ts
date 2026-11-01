/**
 * App 拉取纠正命令（协同规范 02 §6.2；C10/C11 反向通道）。
 * GET /api/v1/sync/commands?storeId=&since=&limit=
 * HMAC 认证（GET 签名 body 为空串）；租户以服务间身份绑定为准；
 * 返回 issued 命令并标记 delivered（生命周期 issued→delivered→applied/rejected）。
 */
import { type NextRequest, NextResponse } from "next/server"
import { claimIssuedCommands } from "@/lib/sync/command-claim"
import { verifySyncHmac, type NonceStore } from "@/lib/sync/hmac"

export const dynamic = "force-dynamic"

function registeredKeys(): Record<string, { secret: string; tenantId: string }> {
  const accessKey = process.env.SYNC_HMAC_ACCESS_KEY?.trim() ?? ""
  const secret = process.env.SYNC_HMAC_SECRET?.trim() ?? ""
  const tenantId = process.env.SYNC_HMAC_TENANT?.trim() ?? ""
  if (!accessKey || !secret || !tenantId) return {}
  return { [accessKey]: { secret, tenantId } }
}

async function resolveNonceStore(): Promise<NonceStore> {
  if (process.env.SYNC_EVENT_LOG_DIALECT === "mock") {
    const { nonceCache } = await import("@/lib/sync/hmac")
    return nonceCache
  }
  const { PgNonceStore } = await import("@/lib/sync/pg-nonce-store")
  const { query } = await import("@/lib/db/pg")
  return new PgNonceStore({
    query: async <T>(text: string, params?: unknown[]) => ({
      rows: await query<T>(text, params),
    }),
  })
}

async function openStore(): Promise<{
  query: <T = unknown>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>
}> {
  if (process.env.SYNC_EVENT_LOG_DIALECT === "mock") {
    const { createMockEventStore } = await import("@/lib/sync/mock-event-store")
    return createMockEventStore()
  }
  const { query } = await import("@/lib/db/pg")
  return {
    query: async <T>(text: string, params?: unknown[]) => ({
      rows: await query<T>(text, params),
    }),
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const hmac = await verifySyncHmac(
    request.headers,
    "",
    registeredKeys(),
    Date.now(),
    await resolveNonceStore(),
  )
  if (!hmac.ok || !hmac.identity) {
    return NextResponse.json(
      { success: false, error: `服务间认证失败：${hmac.failure ?? "unknown"}`, code: "unauthorized" },
      { status: 401 },
    )
  }

  // 租户以服务间身份绑定为准（不信任 query 参数）
  const tenantId = hmac.identity.tenantId
  const storeId = request.nextUrl.searchParams.get("storeId")?.trim() ?? ""
  const since = Number(request.nextUrl.searchParams.get("since") ?? "0")
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50")
  if (!/^[A-Za-z0-9_:-]{1,64}$/.test(storeId)) {
    return NextResponse.json(
      { success: false, error: "缺少或非法 storeId", code: "validation_error" },
      { status: 400 },
    )
  }

  try {
    const commands = await claimIssuedCommands(await openStore(), tenantId, storeId, since, limit)
    return NextResponse.json({ success: true, data: { commands } })
  } catch (error) {
    console.error("[sync/commands] claim failed:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: "命令认领失败", code: "internal_error" },
      { status: 500 },
    )
  }
}
