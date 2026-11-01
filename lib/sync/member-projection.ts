/**
 * master.member.* 事件投影（04 §7 会员主档；C7 用例）。
 * - 幂等：record_version 单调，事件版本 ≤ 已存版本 → version_conflict；
 * - 墓碑：delete 置 deleted=true；手机号脱敏存储（04 §11 PII）；
 * - SQL 为函数内参数化模板；payload 经白名单重构后绑定。
 */
import type { QueryClient } from "./query-client"

export type ProjectionResult =
  | { applied: true; recordVersion: number }
  | { applied: false; code: "version_conflict"; knownVersion: number }

interface MemberSnapshot {
  memberId: string | null
  cardNo: string | null
  name: string | null
  phoneMasked: string | null
  levelId: string | null
  balanceCents: number | null
  points: number | null
  status: string
  recordVersion: number
  deletedAt: string | null
  operation: string | null
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null
}

function asInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null
}

/** 手机号脱敏：保留前 3 后 2（04 §11 PII；明文不落 CMS 库）。 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length < 7) return "***"
  return `${digits.slice(0, 3)}****${digits.slice(-2)}`
}

function toSnapshot(payload: Record<string, unknown>): MemberSnapshot {
  return {
    memberId: asString(payload.memberId),
    cardNo: asString(payload.cardNo),
    name: asString(payload.name),
    phoneMasked: asString(payload.phone) ? maskPhone(String(payload.phone)) : asString(payload.phoneMasked),
    levelId: asString(payload.levelId),
    balanceCents: asInt(payload.balanceCents),
    points: asInt(payload.points),
    status: asString(payload.status) === "banned" ? "banned" : asString(payload.status) === "inactive" ? "inactive" : "active",
    recordVersion: asInt(payload.recordVersion) ?? 0,
    deletedAt: asString(payload.deletedAt),
    operation: asString(payload.operation),
  }
}

export async function projectMemberEvent(
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
  const snapshot = toSnapshot(envelope.payload)
  const memberId = snapshot.memberId ?? envelope.aggregateId
  const knownResult = await client.query<{ record_version?: number | string | null }>(
    "SELECT record_version FROM public.operational_member WHERE id = $1",
    [memberId],
  )
  const known = Number(knownResult.rows[0]?.record_version ?? 0)
  if (snapshot.recordVersion <= known) {
    return { applied: false, code: "version_conflict", knownVersion: known }
  }

  if (envelope.eventType === "master.member.deleted") {
    const deleteSnapshot = JSON.stringify({
      operation: snapshot.operation ?? "delete",
      writer: "app",
      recordVersion: snapshot.recordVersion,
      memberId,
      deletedAt: snapshot.deletedAt,
    })
    await client.query(
      `UPDATE public.operational_member
          SET deleted = true,
              deleted_at = COALESCE($2::timestamptz, NOW()),
              record_version = $3,
              source_event_id = $4,
              payload = $5::jsonb,
              updated_at = NOW()
        WHERE id = $1`,
      [memberId, snapshot.deletedAt, snapshot.recordVersion, envelope.eventId, deleteSnapshot],
    )
    return { applied: true, recordVersion: snapshot.recordVersion }
  }

  if (known === 0) {
    const insertSnapshot = JSON.stringify({
      operation: snapshot.operation ?? "create",
      writer: "app",
      recordVersion: snapshot.recordVersion,
      memberId,
      cardNo: snapshot.cardNo,
      name: snapshot.name,
      balanceCents: snapshot.balanceCents,
      points: snapshot.points,
      status: snapshot.status,
    })
    await client.query(
      `INSERT INTO public.operational_member
         (id, tenant_id, store_id, card_no, name, phone_masked, level_id,
          balance_cents, points, status, record_version, source_event_id, payload, deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, false)
       ON CONFLICT (id) DO NOTHING`,
      [
        memberId,
        envelope.tenantId,
        envelope.storeId,
        snapshot.cardNo,
        snapshot.name,
        snapshot.phoneMasked,
        snapshot.levelId,
        snapshot.balanceCents ?? 0,
        snapshot.points ?? 0,
        snapshot.status,
        snapshot.recordVersion,
        envelope.eventId,
        insertSnapshot,
      ],
    )
    return { applied: true, recordVersion: snapshot.recordVersion }
  }

  const updateSnapshot = JSON.stringify({
    operation: snapshot.operation ?? "update",
    writer: "app",
    recordVersion: snapshot.recordVersion,
    memberId,
    cardNo: snapshot.cardNo,
    name: snapshot.name,
    levelId: snapshot.levelId,
    balanceCents: snapshot.balanceCents,
    points: snapshot.points,
    status: snapshot.status,
  })
  await client.query(
    `UPDATE public.operational_member
        SET card_no = $2,
            name = $3,
            phone_masked = $4,
            level_id = $5,
            balance_cents = $6,
            points = $7,
            status = $8,
            record_version = $9,
            source_event_id = $10,
            payload = $11::jsonb,
            deleted = false,
            updated_at = NOW()
      WHERE id = $1`,
    [
      memberId,
      snapshot.cardNo,
      snapshot.name,
      snapshot.phoneMasked,
      snapshot.levelId,
      snapshot.balanceCents ?? 0,
      snapshot.points ?? 0,
      snapshot.status,
      snapshot.recordVersion,
      envelope.eventId,
      updateSnapshot,
    ],
  )
  return { applied: true, recordVersion: snapshot.recordVersion }
}
