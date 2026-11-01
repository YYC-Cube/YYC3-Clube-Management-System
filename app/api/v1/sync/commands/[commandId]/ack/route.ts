/**
 * App 命令执行回执 ACK（协同规范 02 §6.2；命令生命周期 applied/rejected）。
 * POST /api/v1/sync/commands/[commandId]/ack
 */
import { type NextRequest, NextResponse } from "next/server"
import { ackCommandResult } from "@/lib/sync/command-claim"
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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ commandId: string }> },
): Promise<NextResponse> {
  const rawBody = await request.text()
  const hmac = await verifySyncHmac(
    request.headers,
    rawBody,
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

  const { commandId } = await context.params
  let body: { status?: string; errorCode?: string; resultEventId?: string }
  try {
    body = JSON.parse(rawBody) as typeof body
  } catch {
    return NextResponse.json(
      { success: false, error: "请求体不是合法 JSON", code: "invalid_json" },
      { status: 400 },
    )
  }
  const status = body.status
  if (status !== "applied" && status !== "rejected") {
    return NextResponse.json(
      { success: false, error: "status 仅支持 applied/rejected", code: "validation_error" },
      { status: 400 },
    )
  }

  try {
    const found = await ackCommandResult(
      await openStore(),
      commandId,
      status,
      body.errorCode ?? null,
      body.resultEventId ?? null,
    )
    if (!found) {
      return NextResponse.json(
        { success: false, error: `命令不存在：${commandId}`, code: "not_found" },
        { status: 404 },
      )
    }
    return NextResponse.json({ success: true, data: { commandId, status } })
  } catch (error) {
    console.error("[sync/commands/ack] failed:", error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: "回执写入失败", code: "internal_error" },
      { status: 500 },
    )
  }
}
