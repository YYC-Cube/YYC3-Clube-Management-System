/**
 * App→CMS 事件信封校验（协同规范 03 §2 / §3.6 / 04 §1.2）。
 * 纯函数，无 IO；route 层负责 DB 去重/顺序/投影。
 */

export interface SyncEventEnvelope {
  eventId: string
  eventType: string
  eventVersion: number
  aggregateType: string
  aggregateId: string
  tenantId: string
  storeId: string
  sequence: number
  occurredAt: string
  actorId?: string
  producer: string
  idempotencyKey: string
  payloadChecksum: string
  payload: Record<string, unknown>
}

export type EnvelopeErrorCode =
  | "invalid_envelope"
  | "tenant_mismatch"
  | "forbidden_writer"
  | "invalid_sequence"
  | "bad_checksum_format"

export interface ValidateOptions {
  /** HMAC 身份绑定的租户；信封必须一致（租户隔离硬边界）。 */
  expectedTenantId: string
  /** master.* 运营数据必须 writer=app（04 §1.2）。 */
  now?: number
  /** occurredAt 允许偏移（毫秒，默认 1 天）。 */
  occurredAtToleranceMs?: number
}

export interface ValidateFailure {
  index: number
  eventId: string
  code: EnvelopeErrorCode
  detail: string
}

export interface ValidateOutcome {
  valid: SyncEventEnvelope[]
  failures: ValidateFailure[]
}

const ID_RE = /^[A-Za-z0-9_:-]{1,64}$/
const CHECKSUM_RE = /^sha256:[0-9a-f]{64}$/

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requireString(value: unknown, max = 64): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= max && ID_RE.test(value)
}

export function validateEnvelopes(
  rawEvents: unknown,
  options: ValidateOptions,
): ValidateOutcome {
  const valid: SyncEventEnvelope[] = []
  const failures: ValidateFailure[] = []
  const now = options.now ?? Date.now()
  const tolerance = options.occurredAtToleranceMs ?? 24 * 60 * 60 * 1000

  if (!Array.isArray(rawEvents) || rawEvents.length === 0) {
    return {
      valid: [],
      failures: [
        { index: -1, eventId: "", code: "invalid_envelope", detail: "events 必须为非空数组" },
      ],
    }
  }
  if (rawEvents.length > 500) {
    return {
      valid: [],
      failures: [
        { index: -1, eventId: "", code: "invalid_envelope", detail: "单批不超过 500 条" },
      ],
    }
  }

  rawEvents.forEach((raw, index) => {
    const fail = (code: EnvelopeErrorCode, detail: string): void => {
      failures.push({ index, eventId: String((raw as { eventId?: unknown })?.eventId ?? ""), code, detail })
    }
    if (!isPlainObject(raw)) {
      fail("invalid_envelope", "事件必须是对象")
      return
    }
    const envelope = raw as Partial<SyncEventEnvelope>
    // 稳定 ID 类字段：受限字符集；eventType/idempotencyKey 等业务字段：非空即可
    if (!requireString(envelope.eventId)) {
      fail("invalid_envelope", "eventId 缺失或非法")
      return
    }
    if (!requireString(envelope.aggregateId)) {
      fail("invalid_envelope", "aggregateId 缺失或非法")
      return
    }
    if (!requireString(envelope.aggregateType)) {
      fail("invalid_envelope", "aggregateType 缺失或非法")
      return
    }
    if (!requireString(envelope.tenantId)) {
      fail("invalid_envelope", "tenantId 缺失或非法")
      return
    }
    if (!requireString(envelope.storeId)) {
      fail("invalid_envelope", "storeId 缺失或非法")
      return
    }
    if (typeof envelope.eventType !== "string" || envelope.eventType.length === 0 || envelope.eventType.length > 96) {
      fail("invalid_envelope", "eventType 缺失或非法")
      return
    }
    if (
      typeof envelope.idempotencyKey !== "string" ||
      envelope.idempotencyKey.length === 0 ||
      envelope.idempotencyKey.length > 128
    ) {
      fail("invalid_envelope", "idempotencyKey 缺失或非法")
      return
    }
    if (!Number.isInteger(envelope.eventVersion) || (envelope.eventVersion as number) < 1) {
      fail("invalid_envelope", "eventVersion 必须为 ≥1 整数")
      return
    }
    if (!Number.isInteger(envelope.sequence) || (envelope.sequence as number) < 1) {
      fail("invalid_sequence", "sequence 必须为 ≥1 整数")
      return
    }
    if (typeof envelope.occurredAt !== "string" || Number.isNaN(Date.parse(envelope.occurredAt))) {
      fail("invalid_envelope", "occurredAt 必须为 ISO8601 时间")
      return
    }
    if (Math.abs(now - Date.parse(envelope.occurredAt)) > tolerance) {
      fail("invalid_envelope", "occurredAt 超出允许偏移")
      return
    }
    if (!CHECKSUM_RE.test(envelope.payloadChecksum as string)) {
      fail("bad_checksum_format", "payloadChecksum 必须为 sha256:<64hex>")
      return
    }
    if (!isPlainObject(envelope.payload)) {
      fail("invalid_envelope", "payload 必须为对象")
      return
    }
    if (envelope.producer !== "yyc3-club-ops") {
      fail("invalid_envelope", "producer 非法")
      return
    }
    if (envelope.tenantId !== options.expectedTenantId) {
      fail("tenant_mismatch", `信封租户 ${envelope.tenantId} 与服务间身份不符`)
      return
    }
    // master.* 运营数据：writer 必须 app（04 §1.2）
    if (envelope.eventType?.startsWith("master.")) {
      const writer = envelope.payload.writer
      if (writer !== "app") {
        fail("forbidden_writer", `master.* 事件 payload.writer 必须为 app，实际 ${String(writer)}`)
        return
      }
      const recordVersion = envelope.payload.recordVersion
      if (!Number.isInteger(recordVersion) || (recordVersion as number) < 1) {
        fail("invalid_envelope", "master.* 事件 payload.recordVersion 必须为 ≥1 整数")
        return
      }
    }
    valid.push(envelope as SyncEventEnvelope)
  })

  return { valid, failures }
}
