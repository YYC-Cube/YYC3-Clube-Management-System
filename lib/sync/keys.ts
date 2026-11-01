/**
 * 服务间 key 登记（S7 密钥轮换双活）：
 * - SYNC_HMAC_KEYS：JSON 映射 { "keyId": { "secret": "...", "tenantId": "..." } }，可同时登记
 *   新旧两把 key（双活窗口：App 切新 key 期间旧 key 仍可验签）；
 * - 兼容旧单 key env：SYNC_HMAC_ACCESS_KEY / SYNC_HMAC_SECRET / SYNC_HMAC_TENANT。
 * 轮换流程：登记新 key → App 切新 keyId → 观察 old key 调用量归零 → 移除旧 key。
 */
export interface RegisteredKey {
  secret: string
  tenantId: string
}

export function parseRegisteredKeys(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, RegisteredKey> {
  const registered: Record<string, RegisteredKey> = {}
  const multi = env.SYNC_HMAC_KEYS?.trim()
  if (multi) {
    try {
      const parsed = JSON.parse(multi) as Record<string, RegisteredKey>
      for (const [keyId, value] of Object.entries(parsed)) {
        if (keyId && value?.secret && value?.tenantId) {
          registered[keyId] = { secret: value.secret, tenantId: value.tenantId }
        }
      }
    } catch {
      console.error("[sync/keys] SYNC_HMAC_KEYS 不是合法 JSON，忽略")
    }
  }
  const accessKey = env.SYNC_HMAC_ACCESS_KEY?.trim() ?? ""
  const secret = env.SYNC_HMAC_SECRET?.trim() ?? ""
  const tenantId = env.SYNC_HMAC_TENANT?.trim() ?? ""
  if (accessKey && secret && tenantId) {
    registered[accessKey] = { secret, tenantId }
  }
  return registered
}
