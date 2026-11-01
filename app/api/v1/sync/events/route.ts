/**
 * App→CMS 事件接收端点（协同规范 03 §4/§5；W3 首批）。
 * 流程：HMAC 服务间认证 → 信封校验（租户隔离硬边界）→ 逐事件入库/投影 → ACK 明细。
 * 环境变量：
 *   SYNC_HMAC_ACCESS_KEY / SYNC_HMAC_SECRET / SYNC_HMAC_TENANT — 服务间登记（单租户首批）
 *   SYNC_EVENT_LOG_DIALECT=pg|mock — DB 方言（默认 pg；mock 供无库环境冒烟）
 */
import { type NextRequest, NextResponse } from "next/server"
import { validateEnvelopes } from "@/lib/sync/envelope"
import { verifySyncHmac, type NonceStore } from "@/lib/sync/hmac"
import { ingestBatch, type IngestAck } from "@/lib/sync/ingest"

export const dynamic = "force-dynamic"

interface RegisteredKey {
  secret: string
  tenantId: string
}

/** 服务间 key 登记：首批单 key→tenant，经 env 注入；多 key 时换表登记。 */
function registeredKeys(): Record<string, RegisteredKey> {
  const accessKey = process.env.SYNC_HMAC_ACCESS_KEY?.trim() ?? ""
  const secret = process.env.SYNC_HMAC_SECRET?.trim() ?? ""
  const tenantId = process.env.SYNC_HMAC_TENANT?.trim() ?? ""
  if (!accessKey || !secret || !tenantId) return {}
  return { [accessKey]: { secret, tenantId } }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text()

  const hmac = await verifySyncHmac(request.headers, rawBody, registeredKeys(), Date.now(), await resolveNonceStore())
  if (!hmac.ok || !hmac.identity) {
    return NextResponse.json(
      { success: false, error: `服务间认证失败：${hmac.failure ?? "unknown"}`, code: "unauthorized" },
      { status: 401 },
    )
  }

  let parsed: { events?: unknown }
  try {
    parsed = JSON.parse(rawBody) as { events?: unknown }
  } catch {
    return NextResponse.json(
      { success: false, error: "请求体不是合法 JSON", code: "invalid_json" },
      { status: 400 },
    )
  }

  const validation = validateEnvelopes(parsed.events, {
    expectedTenantId: hmac.identity.tenantId,
  })
  if (validation.valid.length === 0 && validation.failures.length > 0) {
    return NextResponse.json(
      { success: false, error: "事件校验失败", code: "invalid_events", failures: validation.failures },
      { status: 400 },
    )
  }

  const client = await openEventStore()
  try {
    const ack: IngestAck = await ingestBatch(client, validation.valid as never)
    return NextResponse.json({
      success: true,
      data: {
        ...ack,
        rejected: [
          ...ack.rejected,
          ...validation.failures.map((failure) => ({
            eventId: failure.eventId,
            outcome: "rejected" as const,
            code: failure.code,
          })),
        ],
      },
    })
  } catch (error) {
    return NextOpenError(error)
  }
}

async function openEventStore(): Promise<{
  query: <T = unknown>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>
}> {
  if (process.env.SYNC_EVENT_LOG_DIALECT === "mock") {
    const { createMockEventStore } = await import("@/lib/sync/mock-event-store")
    return createMockEventStore()
  }
  const { query } = await import("@/lib/db/pg")
  return {
    // CMS pg 封装直接返回 rows 数组；此处统一包装为 { rows } 以符合 QueryClient 语义
    query: async <T>(text: string, params?: unknown[]) => ({
      rows: await query<T>(text, params),
    }),
  }
}

/** nonce 存储：pg 方言用 sync_nonce 表（多实例安全）；mock 方言用实例内缓存。 */
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

function NextOpenError(error: unknown): NextResponse {
  console.error("[sync/events] ingest failed:", error instanceof Error ? error.message : error)
  return NextResponse.json(
    { success: false, error: "事件入库失败", code: "internal_error" },
    { status: 500 },
  )
}
