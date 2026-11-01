/**
 * master.* 事件投影（协同规范 03 §5.2 B 分支 / 04 §1.2）。
 * - 幂等：record_version 单调，事件版本 ≤ 已存版本 → version_conflict；
 * - 墓碑：delete 事件置 deleted=true（04 §1），不物理删除；
 * - 投影策略：先查版本 → 新记录 INSERT（冲突零概率：版本检查已互斥；用 ON CONFLICT
 *   DO NOTHING 兜底）→ 已存在走 UPDATE；SQL 为函数内参数化模板；
 * - payload 快照经白名单重构后序列化绑定。
 * MVP 范围：master.product.created/updated/deleted；其余 master.* 域随模块建设逐步加入。
 */

export interface QueryClient {
  query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[] }>
}

export type ProjectionResult =
  | { applied: true; recordVersion: number }
  | { applied: false; code: "version_conflict"; knownVersion: number }

interface ProductSnapshot {
  productId: string | null
  name: string | null
  categoryId: string | null
  unit: string | null
  priceCents: number | null
  memberPriceCents: number | null
  stock: number | null
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

/** 白名单重构：只保留投影所需已知字段，未知字段不进入绑定参数。 */
function toSnapshot(payload: Record<string, unknown>): ProductSnapshot {
  return {
    productId: asString(payload.productId),
    name: asString(payload.name),
    categoryId: asString(payload.categoryId),
    unit: asString(payload.unit),
    priceCents: asInt(payload.priceCents),
    memberPriceCents: asInt(payload.memberPriceCents),
    stock: asInt(payload.stock),
    status: asString(payload.status) === "inactive" ? "inactive" : "active",
    recordVersion: asInt(payload.recordVersion) ?? 0,
    deletedAt: asString(payload.deletedAt),
    operation: asString(payload.operation),
  }
}

/** 查 operational_product 已知版本；不存在返回 0。 */
async function knownProductVersion(client: QueryClient, id: string): Promise<number> {
  const result = await client.query<{ record_version?: number | string | null }>(
    "SELECT record_version FROM public.operational_product WHERE id = $1",
    [id],
  )
  const value = result.rows[0]?.record_version
  return value === undefined || value === null ? 0 : Number(value)
}

export async function projectProductEvent(
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
  const productId = snapshot.productId ?? envelope.aggregateId
  const known = await knownProductVersion(client, productId)
  if (snapshot.recordVersion <= known) {
    return { applied: false, code: "version_conflict", knownVersion: known }
  }

  if (envelope.eventType === "master.product.deleted") {
    const deleteSnapshot = JSON.stringify({
      operation: snapshot.operation ?? "delete",
      writer: "app",
      recordVersion: snapshot.recordVersion,
      productId,
      deletedAt: snapshot.deletedAt,
    })
    const result = await client.query(
      `UPDATE public.operational_product
          SET deleted = true,
              deleted_at = COALESCE($2::timestamptz, NOW()),
              record_version = $3,
              source_event_id = $4,
              payload = $5::jsonb,
              updated_at = NOW()
        WHERE id = $1`,
      [productId, snapshot.deletedAt, snapshot.recordVersion, envelope.eventId, deleteSnapshot],
    )
    void result
    return { applied: true, recordVersion: snapshot.recordVersion }
  }

  if (!snapshot.name) {
    throw new Error(`master.product 事件缺少 name：${envelope.eventId}`)
  }

  if (known === 0) {
    const insertSnapshot = JSON.stringify({
      operation: snapshot.operation ?? "create",
      writer: "app",
      recordVersion: snapshot.recordVersion,
      productId,
      name: snapshot.name,
      categoryId: snapshot.categoryId,
      unit: snapshot.unit,
      priceCents: snapshot.priceCents,
      memberPriceCents: snapshot.memberPriceCents,
      stock: snapshot.stock,
      status: snapshot.status,
    })
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO public.operational_product
         (id, tenant_id, store_id, code, name, category_id, unit, price_cents,
          member_price_cents, stock, status, record_version, source_event_id, payload, deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::jsonb, false)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [
        productId,
        envelope.tenantId,
        envelope.storeId,
        snapshot.productId ?? productId,
        snapshot.name,
        snapshot.categoryId,
        snapshot.unit ?? "件",
        snapshot.priceCents ?? 0,
        snapshot.memberPriceCents,
        snapshot.stock ?? 0,
        snapshot.status,
        snapshot.recordVersion,
        envelope.eventId,
        insertSnapshot,
      ],
    )
    void inserted
    return { applied: true, recordVersion: snapshot.recordVersion }
  }

  const updateSnapshot = JSON.stringify({
    operation: snapshot.operation ?? "update",
    writer: "app",
    recordVersion: snapshot.recordVersion,
    productId,
    name: snapshot.name,
    categoryId: snapshot.categoryId,
    unit: snapshot.unit,
    priceCents: snapshot.priceCents,
    memberPriceCents: snapshot.memberPriceCents,
    stock: snapshot.stock,
    status: snapshot.status,
  })
  await client.query(
    `UPDATE public.operational_product
        SET name = $2,
            category_id = $3,
            unit = $4,
            price_cents = $5,
            member_price_cents = $6,
            stock = $7,
            status = $8,
            record_version = $9,
            source_event_id = $10,
            payload = $11::jsonb,
            deleted = false,
            updated_at = NOW()
      WHERE id = $1`,
    [
      productId,
      snapshot.name,
      snapshot.categoryId,
      snapshot.unit ?? "件",
      snapshot.priceCents ?? 0,
      snapshot.memberPriceCents,
      snapshot.stock ?? 0,
      snapshot.status,
      snapshot.recordVersion,
      envelope.eventId,
      updateSnapshot,
    ],
  )
  return { applied: true, recordVersion: snapshot.recordVersion }
}
