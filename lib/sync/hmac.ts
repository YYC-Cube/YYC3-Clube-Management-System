/**
 * 服务间 HMAC 认证（协同规范 01 §安全 / 02 §6；W3 首批落地，不留 Bearer 过渡）。
 *
 * App（Club-Ops）签名算法：
 *   signature = hex( HMAC-SHA256( secret, `${accessKey}.${timestamp}.${nonce}.${rawBody}` ) )
 * 请求头：
 *   X-YYC3-Access-Key / X-YYC3-Timestamp（毫秒）/ X-YYC3-Nonce / X-YYC3-Signature
 *
 * 防重放：时间窗 ±SYNC_HMAC_WINDOW_SECONDS（默认 300s）+ nonce 实例内缓存。
 * 注意：nonce 缓存为单实例实现；多实例部署前须换 Redis 或 sync_nonce 表（09 附录 A-3）。
 */
import { createHmac, timingSafeEqual } from "node:crypto"

export const HMAC_WINDOW_MS = 5 * 60 * 1000

export interface HmacHeaders {
  accessKey: string
  timestamp: string
  nonce: string
  signature: string
}

export type HmacFailure =
  | "missing_headers"
  | "bad_timestamp"
  | "timestamp_out_of_window"
  | "nonce_replayed"
  | "unknown_access_key"
  | "signature_mismatch"

/** 实例内 nonce 缓存（容量上限淘汰，过期懒清理）。 */
export class NonceCache {
  private readonly entries = new Map<string, number>()

  constructor(private readonly capacity = 10_000) {}

  /** 已见返回 true（重放）；否则登记并返回 false。 */
  seen(nonce: string, now = Date.now()): boolean {
    for (const [key, expiresAt] of this.entries) {
      if (expiresAt < now) this.entries.delete(key)
    }
    if (this.entries.has(nonce)) return true
    if (this.entries.size >= this.capacity) {
      const oldest = this.entries.keys().next().value
      if (oldest !== undefined) this.entries.delete(oldest)
    }
    this.entries.set(nonce, now + HMAC_WINDOW_MS * 2)
    return false
  }
}

const globalForNonce = globalThis as unknown as { __yyc3SyncNonceCache?: NonceCache }
export const nonceCache = (globalForNonce.__yyc3SyncNonceCache ??= new NonceCache())

export function computeSignature(
  secret: string,
  accessKey: string,
  timestamp: string,
  nonce: string,
  rawBody: string,
): string {
  return createHmac("sha256", secret)
    .update(`${accessKey}.${timestamp}.${nonce}.${rawBody}`)
    .digest("hex")
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8")
  const right = Buffer.from(b, "utf8")
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export interface HmacIdentity {
  accessKey: string
  tenantId: string
}

export interface HmacVerifyResult {
  ok: boolean
  failure?: HmacFailure
  identity?: HmacIdentity
}

/** 校验签名头；identity 为服务端登记的 key→tenant 绑定（env 注入，见 route）。 */
export function verifySyncHmac(
  headers: Headers,
  rawBody: string,
  registered: Record<string, { secret: string; tenantId: string }>,
  now = Date.now(),
  nonceCacheInstance: NonceCache = nonceCache,
): HmacVerifyResult {
  const accessKey = headers.get("x-yyc3-access-key")?.trim() ?? ""
  const timestamp = headers.get("x-yyc3-timestamp")?.trim() ?? ""
  const nonce = headers.get("x-yyc3-nonce")?.trim() ?? ""
  const signature = headers.get("x-yyc3-signature")?.trim() ?? ""
  if (!accessKey || !timestamp || !nonce || !signature) {
    return { ok: false, failure: "missing_headers" }
  }
  if (!/^\d{13,16}$/.test(timestamp)) {
    return { ok: false, failure: "bad_timestamp" }
  }
  const ts = Number(timestamp)
  if (Math.abs(now - ts) > HMAC_WINDOW_MS) {
    return { ok: false, failure: "timestamp_out_of_window" }
  }
  const record = registered[accessKey]
  if (!record) {
    return { ok: false, failure: "unknown_access_key" }
  }
  if (nonceCacheInstance.seen(nonce, now)) {
    return { ok: false, failure: "nonce_replayed" }
  }
  const expected = computeSignature(record.secret, accessKey, timestamp, nonce, rawBody)
  if (!safeEqual(expected, signature.toLowerCase())) {
    return { ok: false, failure: "signature_mismatch" }
  }
  return { ok: true, identity: { accessKey, tenantId: record.tenantId } }
}
