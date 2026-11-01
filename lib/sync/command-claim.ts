/**
 * 纠正命令认领（协同规范 02 §6.2；命令生命周期 issued→delivered）。
 * 两步认领：先 SELECT .. FOR UPDATE SKIP LOCKED 锁行（多实例互斥），
 * 再逐条 UPDATE 标记 delivered——与 ACK 更新同形态；行已锁，无竞态。
 */
import type { QueryClient } from "./query-client"

interface CommandRow {
  command_id: string
  command_type: string
  aggregate_type: string
  aggregate_id: string | null
  command_version: number | string
  payload: Record<string, unknown>
  reason: string | null
  operator_id: string
}

export interface IssuedCommand {
  commandId: string
  commandType: string
  aggregateType: string
  aggregateId: string | null
  version: number
  payload: Record<string, unknown>
  reason: string | null
  operatorId: string
}

export async function claimIssuedCommands(
  client: QueryClient,
  tenantId: string,
  storeId: string,
  since: number,
  limit: number,
): Promise<IssuedCommand[]> {
  const sinceValue = Number.isFinite(since) ? since : 0
  const limitValue = Math.min(Math.max(Math.trunc(limit) || 50, 1), 200)
  const locked = await client.query<CommandRow>(
    `SELECT command_id, command_type, aggregate_type, aggregate_id,
            command_version, payload, reason, operator_id
       FROM public.command_log
      WHERE tenant_id = $1 AND store_id = $2
        AND status = 'issued' AND command_version > $3
      ORDER BY issued_at, command_id
      LIMIT $4
      FOR UPDATE SKIP LOCKED`,
    [tenantId, storeId, sinceValue, limitValue],
  )
  const claimed: IssuedCommand[] = []
  for (const row of locked.rows) {
    await client.query(
      `UPDATE public.command_log
          SET status = 'delivered', delivered_at = NOW(), attempts = attempts + 1
        WHERE command_id = $1`,
      [row.command_id],
    )
    claimed.push({
      commandId: row.command_id,
      commandType: row.command_type,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      version: Number(row.command_version),
      payload: row.payload,
      reason: row.reason,
      operatorId: row.operator_id,
    })
  }
  return claimed
}

export async function ackCommandResult(
  client: QueryClient,
  commandId: string,
  status: "applied" | "rejected",
  errorCode: string | null,
  resultEventId: string | null,
): Promise<boolean> {
  const updated = await client.query<{ command_id: string }>(
    `UPDATE public.command_log
        SET status = $2,
            error_code = $3,
            result_event_id = $4,
            ack_at = NOW(),
            updated_at = NOW()
      WHERE command_id = $1
      RETURNING command_id`,
    [commandId, status, errorCode, resultEventId],
  )
  return updated.rows.length > 0
}
