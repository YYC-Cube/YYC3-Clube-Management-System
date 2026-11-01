/**
 * master.device.updated 投影：按 deviceType 路由到 operational_cashier / operational_printer。
 * 记录版本单调；config 整体快照（08 §3.6 设备域）。
 */
import type { QueryClient } from "./query-client"

export type ProjectionResult =
  | { applied: true; recordVersion: number }
  | { applied: false; code: "version_conflict"; knownVersion: number }

export async function projectDeviceEvent(
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
  const deviceType = envelope.payload.deviceType
  if (deviceType !== "cashier" && deviceType !== "printer") {
    throw new Error(`master.device.updated 非法 deviceType：${String(deviceType)}`)
  }
  const deviceId = typeof envelope.payload.deviceId === "string" ? envelope.payload.deviceId : envelope.aggregateId
  const name = typeof envelope.payload.name === "string" ? envelope.payload.name : "设备"
  const status = envelope.payload.status === "inactive" || envelope.payload.status === "offline" ? envelope.payload.status : "active"
  const recordVersion = typeof envelope.payload.recordVersion === "number" ? envelope.payload.recordVersion : 0
  const config = envelope.payload.config

  const table = deviceType === "cashier" ? "operational_cashier" : "operational_printer"
  const knownResult =
    table === "operational_cashier"
      ? await client.query<{ record_version?: number | string | null }>(
          "SELECT record_version FROM public.operational_cashier WHERE id = $1",
          [deviceId],
        )
      : await client.query<{ record_version?: number | string | null }>(
          "SELECT record_version FROM public.operational_printer WHERE id = $1",
          [deviceId],
        )
  const known = Number(knownResult.rows[0]?.record_version ?? 0)
  if (recordVersion <= known) {
    return { applied: false, code: "version_conflict", knownVersion: known }
  }

  const snapshot = JSON.stringify({
    operation: "update", writer: "app", recordVersion,
    deviceId, deviceType, name, config, status,
  })
  if (table === "operational_cashier") {
    await client.query(
      `INSERT INTO public.operational_cashier
         (id, tenant_id, store_id, name, status, config, record_version, source_event_id, payload)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, status = EXCLUDED.status, config = EXCLUDED.config,
         record_version = EXCLUDED.record_version, source_event_id = EXCLUDED.source_event_id,
         payload = EXCLUDED.payload, updated_at = NOW()`,
      [deviceId, envelope.tenantId, envelope.storeId, name, status, config, recordVersion, envelope.eventId, snapshot],
    )
  } else {
    await client.query(
      `INSERT INTO public.operational_printer
         (id, tenant_id, store_id, name, device_type, status, config, record_version, source_event_id, payload)
       VALUES ($1, $2, $3, $4, 'printer', $5, $6::jsonb, $7, $8, $9::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, status = EXCLUDED.status, config = EXCLUDED.config,
         record_version = EXCLUDED.record_version, source_event_id = EXCLUDED.source_event_id,
         payload = EXCLUDED.payload, updated_at = NOW()`,
      [deviceId, envelope.tenantId, envelope.storeId, name, status, config, recordVersion, envelope.eventId, snapshot],
    )
  }
  return { applied: true, recordVersion }
}
