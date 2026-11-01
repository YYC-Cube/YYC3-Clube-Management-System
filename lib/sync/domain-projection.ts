/**
 * master.room.* / master.staff.* / master.artist.* 事件投影（C4/C6/C7 用例）。
 * 与 member 样板同构：record_version 单调 + 墓碑 + 白名单快照；SQL 为函数内参数化模板。
 * staff 不含密码/登录凭据；artist 归属 App 写、CMS 投影（10 号规范 v1.3.0）。
 */
import type { QueryClient } from "./query-client"

export type ProjectionResult =
  | { applied: true; recordVersion: number }
  | { applied: false; code: "version_conflict"; knownVersion: number }

export type Domain = "room" | "staff" | "artist"

interface CommonSnapshot {
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

function commonOf(payload: Record<string, unknown>): CommonSnapshot {
  return {
    recordVersion: asInt(payload.recordVersion) ?? 0,
    deletedAt: asString(payload.deletedAt),
    operation: asString(payload.operation),
  }
}

/** 三域显式静态分支（表名不拼接）。 */
async function knownVersionOf(client: QueryClient, domain: Domain, id: string): Promise<number> {
  if (domain === "staff") {
    const r = await client.query<{ record_version?: number | string | null }>(
      "SELECT record_version FROM public.operational_staff WHERE id = $1",
      [id],
    )
    return Number(r.rows[0]?.record_version ?? 0)
  }
  if (domain === "artist") {
    const r = await client.query<{ record_version?: number | string | null }>(
      "SELECT record_version FROM public.operational_artist WHERE id = $1",
      [id],
    )
    return Number(r.rows[0]?.record_version ?? 0)
  }
  const r = await client.query<{ record_version?: number | string | null }>(
    "SELECT record_version FROM public.operational_room WHERE id = $1",
    [id],
  )
  return Number(r.rows[0]?.record_version ?? 0)
}

async function tombstoneOf(
  client: QueryClient,
  domain: Domain,
  id: string,
  deletedAt: string | null,
  recordVersion: number,
  eventId: string,
  snapshot: string,
): Promise<void> {
  if (domain === "staff") {
    await client.query(
      `UPDATE public.operational_staff
          SET deleted = true, deleted_at = COALESCE($2::timestamptz, NOW()),
              record_version = $3, source_event_id = $4, payload = $5::jsonb, updated_at = NOW()
        WHERE id = $1`,
      [id, deletedAt, recordVersion, eventId, snapshot],
    )
    return
  }
  if (domain === "artist") {
    await client.query(
      `UPDATE public.operational_artist
          SET deleted = true, deleted_at = COALESCE($2::timestamptz, NOW()),
              record_version = $3, source_event_id = $4, payload = $5::jsonb, updated_at = NOW()
        WHERE id = $1`,
      [id, deletedAt, recordVersion, eventId, snapshot],
    )
    return
  }
  await client.query(
    `UPDATE public.operational_room
        SET deleted = true, deleted_at = COALESCE($2::timestamptz, NOW()),
            record_version = $3, source_event_id = $4, payload = $5::jsonb, updated_at = NOW()
      WHERE id = $1`,
    [id, deletedAt, recordVersion, eventId, snapshot],
  )
}

async function projectTombstone(
  client: QueryClient,
  domain: Domain,
  envelope: { eventId: string; payload: Record<string, unknown> },
  id: string,
  common: CommonSnapshot,
): Promise<void> {
  const snapshot = JSON.stringify({
    operation: common.operation ?? "delete",
    writer: "app",
    recordVersion: common.recordVersion,
    [`${domain}Id`]: id,
    deletedAt: common.deletedAt,
  })
  await tombstoneOf(client, domain, id, common.deletedAt, common.recordVersion, envelope.eventId, snapshot)
}

/** 幂等骨架：版本检查 → deleted 分支 → write 回调（域特有 INSERT/UPDATE）。 */
async function projectWithSkeleton(
  client: QueryClient,
  domain: Domain,
  envelope: {
    eventId: string
    eventType: string
    aggregateId: string
    tenantId: string
    storeId: string
    payload: Record<string, unknown>
  },
  id: string,
  write: (mode: "insert" | "update", known: number) => Promise<void>,
): Promise<ProjectionResult> {
  const common = commonOf(envelope.payload)
  const known = await knownVersionOf(client, domain, id)
  if (common.recordVersion <= known) {
    return { applied: false, code: "version_conflict", knownVersion: known }
  }
  if (envelope.eventType === `master.${domain}.deleted`) {
    await projectTombstone(client, domain, envelope, id, common)
    return { applied: true, recordVersion: common.recordVersion }
  }
  await write(known === 0 ? "insert" : "update", known)
  return { applied: true, recordVersion: common.recordVersion }
}

export async function projectRoomEvent(
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
  const payload = envelope.payload
  const common = commonOf(payload)
  const roomId = asString(payload.roomId) ?? envelope.aggregateId
  return projectWithSkeleton(client, "room", envelope, roomId, async (mode) => {
    if (mode === "insert") {
      await client.query(
        `INSERT INTO public.operational_room
           (id, tenant_id, store_id, room_no, name, room_type_id, area_id, floor, capacity,
            price_cents, business_status, record_version, source_event_id, payload, deleted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, false)
         ON CONFLICT (id) DO NOTHING`,
        [roomId, envelope.tenantId, envelope.storeId, asString(payload.roomNo) ?? roomId,
          asString(payload.name) ?? asString(payload.roomNo) ?? "包厢",
          asString(payload.roomTypeId), asString(payload.areaId), asInt(payload.floor),
          asInt(payload.capacity), asInt(payload.priceCents) ?? 0,
          asString(payload.businessStatus) ?? "available", common.recordVersion,
          envelope.eventId, JSON.stringify(payload)],
      )
      return
    }
    await client.query(
      `UPDATE public.operational_room
          SET room_no = $2, name = $3, room_type_id = $4, area_id = $5, floor = $6, capacity = $7,
              price_cents = $8, business_status = $9, record_version = $10,
              source_event_id = $11, payload = $12::jsonb, deleted = false, updated_at = NOW()
        WHERE id = $1`,
      [roomId, asString(payload.roomNo) ?? roomId,
        asString(payload.name) ?? asString(payload.roomNo) ?? "包厢",
        asString(payload.roomTypeId), asString(payload.areaId), asInt(payload.floor),
        asInt(payload.capacity), asInt(payload.priceCents) ?? 0,
        asString(payload.businessStatus) ?? "available", common.recordVersion,
        envelope.eventId, JSON.stringify(payload)],
    )
  })
}

export async function projectStaffEvent(
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
  const payload = envelope.payload
  const common = commonOf(payload)
  const staffId = asString(payload.staffId) ?? envelope.aggregateId
  return projectWithSkeleton(client, "staff", envelope, staffId, async (mode) => {
    if (mode === "insert") {
      await client.query(
        `INSERT INTO public.operational_staff
           (id, tenant_id, store_id, user_id, name, group_id, role, quota_cents,
            status, record_version, source_event_id, payload, deleted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, false)
         ON CONFLICT (id) DO NOTHING`,
        [staffId, envelope.tenantId, envelope.storeId, asString(payload.userId),
          asString(payload.name) ?? "员工", asString(payload.groupId), asString(payload.role),
          asInt(payload.quotaCents), asString(payload.status) ?? "active",
          common.recordVersion, envelope.eventId, JSON.stringify(payload)],
      )
      return
    }
    await client.query(
      `UPDATE public.operational_staff
          SET user_id = $2, name = $3, group_id = $4, role = $5, quota_cents = $6,
              status = $7, record_version = $8, source_event_id = $9,
              payload = $10::jsonb, deleted = false, updated_at = NOW()
        WHERE id = $1`,
      [staffId, asString(payload.userId), asString(payload.name) ?? "员工",
        asString(payload.groupId), asString(payload.role), asInt(payload.quotaCents),
        asString(payload.status) ?? "active", common.recordVersion,
        envelope.eventId, JSON.stringify(payload)],
    )
  })
}

export async function projectArtistEvent(
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
  const payload = envelope.payload
  const common = commonOf(payload)
  const artistId = asString(payload.artistId) ?? envelope.aggregateId
  return projectWithSkeleton(client, "artist", envelope, artistId, async (mode) => {
    if (mode === "insert") {
      await client.query(
        `INSERT INTO public.operational_artist
           (id, tenant_id, store_id, artist_no, name, group_id, level_id, badge_no,
            stage_fee_rule, status, record_version, source_event_id, payload, deleted)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13::jsonb, false)
         ON CONFLICT (id) DO NOTHING`,
        [artistId, envelope.tenantId, envelope.storeId, asString(payload.artistNo),
          asString(payload.name) ?? "艺人", asString(payload.groupId), asString(payload.levelId),
          asString(payload.badgeNo), payload.stageFeeRule ?? null,
          asString(payload.status) ?? "active", common.recordVersion,
          envelope.eventId, JSON.stringify(payload)],
      )
      return
    }
    await client.query(
      `UPDATE public.operational_artist
          SET artist_no = $2, name = $3, group_id = $4, level_id = $5, badge_no = $6,
              stage_fee_rule = $7::jsonb, status = $8, record_version = $9,
              source_event_id = $10, payload = $11::jsonb, deleted = false, updated_at = NOW()
        WHERE id = $1`,
      [artistId, asString(payload.artistNo), asString(payload.name) ?? "艺人",
        asString(payload.groupId), asString(payload.levelId), asString(payload.badgeNo),
        payload.stageFeeRule ?? null, asString(payload.status) ?? "active",
        common.recordVersion, envelope.eventId, JSON.stringify(payload)],
    )
  })
}
