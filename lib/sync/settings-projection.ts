/**
 * master.settings.updated 投影（C5 用例；08 §3.6 store_settings 域）。
 * 目标表 operational_settings（W2-B 已建，domain='store_settings' 单行聚合）；
 * record_version 单调；config 经白名单仅要求对象形态，整体作为 JSONB 快照。
 */
import type { QueryClient } from "./query-client"

export type ProjectionResult =
  | { applied: true; recordVersion: number }
  | { applied: false; code: "version_conflict"; knownVersion: number }

function asInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null
}

export async function projectSettingsEvent(
  client: QueryClient,
  envelope: {
    eventId: string
    eventType: string
    aggregateId: string
    tenantId: string
    storeId: string
    payload: Record<string, unknown>
  },
): Promise<ProjectionResult> {
  const config = envelope.payload.config
  if (typeof config !== "object" || config === null || Array.isArray(config)) {
    throw new Error(`master.settings.updated 缺少 config 对象：${envelope.eventId}`)
  }
  const recordVersion = asInt(envelope.payload.recordVersion) ?? 0
  const knownResult = await client.query<{ record_version?: number | string | null }>(
    "SELECT record_version FROM public.operational_settings WHERE id = $1",
    [envelope.storeId],
  )
  const known = Number(knownResult.rows[0]?.record_version ?? 0)
  if (recordVersion <= known) {
    return { applied: false, code: "version_conflict", knownVersion: known }
  }
  const snapshot = JSON.stringify({
    operation: "update",
    writer: "app",
    recordVersion,
    domain: "store_settings",
    config,
  })
  await client.query(
    `INSERT INTO public.operational_settings
       (id, tenant_id, store_id, domain, config, record_version, source_event_id, payload)
     VALUES ($1, $2, $3, 'store_settings', $4::jsonb, $5, $6, $7::jsonb)
     ON CONFLICT (id) DO UPDATE SET
       config = EXCLUDED.config,
       record_version = EXCLUDED.record_version,
       source_event_id = EXCLUDED.source_event_id,
       payload = EXCLUDED.payload,
       updated_at = NOW()`,
    [envelope.storeId, envelope.tenantId, envelope.storeId, config, recordVersion, envelope.eventId, snapshot],
  )
  return { applied: true, recordVersion }
}
