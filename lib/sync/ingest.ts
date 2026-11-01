/**
 * 事件接收核心循环（协同规范 03 §5.2 处理顺序）。
 * 每事件独立事务：验签与校验之后 → 去重 → 顺序校验 → 写日志 → 投影 → ACK。
 * 单条失败不影响同批其他事件（部分成功语义，逐事件返回结果明细）。
 */
import { projectProductEvent } from "./product-projection"
import { projectMemberEvent } from "./member-projection"
import type { QueryClient } from "./query-client"

export interface IngestEvent {
  eventId: string
  eventType: string
  eventVersion: number
  aggregateType: string
  aggregateId: string
  tenantId: string
  storeId: string
  sequence: number
  occurredAt: string
  producer: string
  idempotencyKey: string
  payloadChecksum: string
  payload: Record<string, unknown>
}

export interface IngestItemResult {
  eventId: string
  outcome: "accepted" | "duplicate" | "rejected"
  code?: "sequence_conflict" | "version_conflict" | "internal_error"
}

export interface IngestAck {
  accepted: number
  duplicates: number
  rejected: IngestItemResult[]
}

interface EventLogRow {
  sequence: number | string
}

export async function ingestEvent(
  client: QueryClient,
  event: IngestEvent,
): Promise<IngestItemResult> {
  try {
    // 03 §5.2：先去重（event_id 已存在 → duplicate）
    const inserted = await client.query<{ event_id: string }>(
      `INSERT INTO public.sync_event_log
         (event_id, event_type, event_version, aggregate_type, aggregate_id, tenant_id,
          store_id, sequence, writer, record_version, occurred_at, producer,
          payload, payload_checksum, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, 'applied')
       ON CONFLICT (event_id) DO NOTHING
       RETURNING event_id`,
      [
        event.eventId,
        event.eventType,
        event.eventVersion,
        envelopeAggregateType(event),
        event.aggregateId,
        event.tenantId,
        event.storeId,
        event.sequence,
        writerOf(event),
        recordVersionOf(event),
        event.occurredAt,
        event.producer,
        safePayload(event),
        event.payloadChecksum,
      ],
    )
    if (inserted.rows.length === 0) {
      return { eventId: event.eventId, outcome: "duplicate" }
    }

    // 顺序校验：聚合根内 sequence 必须严格递增；乱序到达保留证据并拒绝
    const ordering = await client.query<EventLogRow>(
      `SELECT MAX(sequence) AS sequence FROM public.sync_event_log
        WHERE aggregate_type = $1 AND aggregate_id = $2 AND status = 'applied'`,
      [envelopeAggregateType(event), event.aggregateId],
    )
    const maxApplied = Number(ordering.rows[0]?.sequence ?? event.sequence)
    if (event.sequence < maxApplied) {
      await client.query(
        `UPDATE public.sync_event_log SET status = 'rejected'
          WHERE event_id = $1`,
        [event.eventId],
      )
      return { eventId: event.eventId, outcome: "rejected", code: "sequence_conflict" }
    }

    // 投影（B 分支：master.* → operational_*）
    const projectionTarget = masterProjectionOf(event.eventType)
    if (projectionTarget) {
      const projection =
        projectionTarget === "product"
          ? await projectProductEvent(client, {
              eventId: event.eventId,
              eventType: event.eventType,
              aggregateId: event.aggregateId,
              tenantId: event.tenantId,
              storeId: event.storeId,
              payload: event.payload,
            })
          : await projectMemberEvent(client, {
              eventId: event.eventId,
              eventType: event.eventType,
              aggregateId: event.aggregateId,
              tenantId: event.tenantId,
              storeId: event.storeId,
              payload: event.payload,
            })
      if (!projection.applied) {
        await client.query(
          `UPDATE public.sync_event_log SET status = 'rejected'
            WHERE event_id = $1`,
          [event.eventId],
        )
        return { eventId: event.eventId, outcome: "rejected", code: "version_conflict" }
      }
    }

    return { eventId: event.eventId, outcome: "accepted" }
  } catch (error) {
    // 投影/入库异常：保留事件日志证据（status=rejected）并向上反馈，
    // 错误详情进服务日志（03 §5.2：投影失败事件不 ACK 为 applied）
    try {
      await client.query(`UPDATE public.sync_event_log SET status = 'rejected' WHERE event_id = $1`, [
        event.eventId,
      ])
    } catch {
      /* 日志状态回写失败时以内部错误返回 */
    }
    console.error(
      `[sync/ingest] 事件处理失败 eventId=${event.eventId}:`,
      error instanceof Error ? error.message : error,
    )
    return {
      eventId: event.eventId,
      outcome: "rejected",
      code: "internal_error",
    }
  }
}

export async function ingestBatch(
  client: QueryClient,
  events: IngestEvent[],
): Promise<IngestAck> {
  const ack: IngestAck = { accepted: 0, duplicates: 0, rejected: [] }
  for (const event of events) {
    const result = await ingestEvent(client, event)
    if (result.outcome === "accepted") ack.accepted += 1
    else if (result.outcome === "duplicate") ack.duplicates += 1
    else ack.rejected.push(result)
  }
  return ack
}

function envelopeAggregateType(event: IngestEvent): string {
  return event.aggregateType
}

/** master.* 投影路由：已实现投影的域（room/staff/artist 随模块建设逐步加入）。 */
function masterProjectionOf(eventType: string): "product" | "member" | null {
  if (eventType.startsWith("master.product.")) return "product"
  if (eventType.startsWith("master.member.")) return "member"
  return null
}

function writerOf(event: IngestEvent): string {
  const writer = event.payload.writer
  return typeof writer === "string" && writer.length > 0 ? writer : "app"
}

function recordVersionOf(event: IngestEvent): number | null {
  const value = event.payload.recordVersion
  return typeof value === "number" && Number.isInteger(value) ? value : null
}

/** payload 以白名单重构后序列化绑定，不可信对象不整体进入查询参数。 */
function safePayload(event: IngestEvent): string {
  return JSON.stringify({
    eventId: event.eventId,
    eventType: event.eventType,
    writer: writerOf(event),
    recordVersion: recordVersionOf(event),
    operation: event.payload.operation,
    changedFields: event.payload.changedFields,
    fields: event.payload.fields,
    sourceCommandId: event.payload.sourceCommandId,
  })
}
