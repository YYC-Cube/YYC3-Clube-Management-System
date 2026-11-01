/**
 * sync_nonce 表驱动的 nonce 存储（09 附录 A-3-3 兑现）：多实例安全。
 * 原子语义：INSERT .. ON CONFLICT DO NOTHING —— 插入失败即重放；
 * 每次校验顺带清理过期行，免独立调度。
 */
import type { QueryClient } from "./query-client"

export class PgNonceStore {
  constructor(private readonly client: QueryClient) {}

  async seen(nonce: string, now = Date.now()): Promise<boolean> {
    const expiresAt = new Date(now + 10 * 60 * 1000).toISOString()
    await this.client.query(
      `DELETE FROM public.sync_nonce WHERE expires_at < NOW()`,
    )
    const inserted = await this.client.query<{ nonce: string }>(
      `INSERT INTO public.sync_nonce (nonce, expires_at)
       VALUES ($1, $2::timestamptz)
       ON CONFLICT (nonce) DO NOTHING
       RETURNING nonce`,
      [nonce, expiresAt],
    )
    return inserted.rows.length === 0
  }
}
