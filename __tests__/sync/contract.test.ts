/**
 * 同步事件接收契约测试（协同规范 03 §2/§4/§5 + 01 §13 用例）。
 * 覆盖：HMAC 服务间认证（签名/时间窗/nonce 重放）、信封校验（租户隔离/writer/顺序）、
 * ingest 去重/乱序/部分成功、投影幂等（record_version 单调 + 墓碑）。
 * 全部基于内存 mock 存储，不依赖数据库。
 */
import { createHmac, randomUUID } from "node:crypto"
import { validateEnvelopes, type SyncEventEnvelope } from "@/lib/sync/envelope"
import {
  NonceCache,
  computeSignature,
  verifySyncHmac,
} from "@/lib/sync/hmac"
import { ingestBatch, type IngestEvent } from "@/lib/sync/ingest"
import { createMockEventStore } from "@/lib/sync/mock-event-store"
import { projectProductEvent } from "@/lib/sync/product-projection"

const TENANT = "tnt_contract_1"
const STORE = "str_contract_1"
const SECRET = "contract-test-secret"
const ACCESS_KEY = "club-ops-test"

function registered(): Record<string, { secret: string; tenantId: string }> {
  return { [ACCESS_KEY]: { secret: SECRET, tenantId: TENANT } }
}

function signBody(body: string, timestamp: string, nonce: string): string {
  return computeSignature(SECRET, ACCESS_KEY, timestamp, nonce, body)
}

function buildEnvelope(overrides: Partial<SyncEventEnvelope> = {}): SyncEventEnvelope {
  return {
    eventId: `evt_${randomUUID()}`,
    eventType: "master.product.created",
    eventVersion: 1,
    aggregateType: "product",
    aggregateId: `prd_${randomUUID()}`,
    tenantId: TENANT,
    storeId: STORE,
    sequence: 1,
    occurredAt: new Date().toISOString(),
    producer: "yyc3-club-ops",
    idempotencyKey: `master_product_created:${randomUUID()}:v1`,
    payloadChecksum: `sha256:${"a".repeat(64)}`,
    payload: {
      operation: "create",
      writer: "app",
      recordVersion: 1,
      productId: `prd_${randomUUID()}`,
      name: "契约测试商品",
      priceCents: 1500,
    },
    ...overrides,
  }
}

describe("sync/hmac", () => {
  const headers = (body: string, timestamp: string, nonce: string): Headers => {
    const h = new Headers()
    h.set("x-yyc3-access-key", ACCESS_KEY)
    h.set("x-yyc3-timestamp", timestamp)
    h.set("x-yyc3-nonce", nonce)
    h.set("x-yyc3-signature", signBody(body, timestamp, nonce))
    return h
  }

  it("合法签名通过并返回租户身份", async () => {
    const now = Date.now()
    const body = JSON.stringify({ events: [] })
    const result = await verifySyncHmac(headers(body, String(now), `n-${randomUUID()}`), body, registered(), now)
    expect(result.ok).toBe(true)
    expect(result.identity?.tenantId).toBe(TENANT)
  })

  it("缺失头 / 时间窗外 / 未知 key / 签名篡改 全部拒绝", async () => {
    const now = Date.now()
    const body = "{}"
    const empty = new Headers()
    expect((await verifySyncHmac(empty, body, registered(), now)).failure).toBe("missing_headers")

    const stale = headers(body, String(now - 10 * 60 * 1000), `n-${randomUUID()}`)
    expect((await verifySyncHmac(stale, body, registered(), now)).failure).toBe("timestamp_out_of_window")

    const unknownKey = new Headers()
    unknownKey.set("x-yyc3-access-key", "ghost")
    unknownKey.set("x-yyc3-timestamp", String(now))
    unknownKey.set("x-yyc3-nonce", `n-${randomUUID()}`)
    unknownKey.set("x-yyc3-signature", "deadbeef")
    expect((await verifySyncHmac(unknownKey, body, registered(), now)).failure).toBe("unknown_access_key")

    const tampered = new Headers()
    tampered.set("x-yyc3-access-key", ACCESS_KEY)
    tampered.set("x-yyc3-timestamp", String(now))
    tampered.set("x-yyc3-nonce", `n-${randomUUID()}`)
    tampered.set("x-yyc3-signature", "0".repeat(64))
    expect((await verifySyncHmac(tampered, body, registered(), now)).failure).toBe("signature_mismatch")
  })

  it("nonce 重放被拒绝（同 nonce 二次使用）", async () => {
    const now = Date.now()
    const body = "{}"
    const nonce = `n-${randomUUID()}`
    const cache = new NonceCache()
    const first = await verifySyncHmac(headers(body, String(now), nonce), body, registered(), now, cache)
    expect(first.ok).toBe(true)
    const second = await verifySyncHmac(headers(body, String(now), nonce), body, registered(), now, cache)
    expect(second.ok).toBe(false)
    expect(second.failure).toBe("nonce_replayed")
  })
})

describe("sync/envelope", () => {
  it("完整信封通过校验", () => {
    const outcome = validateEnvelopes([buildEnvelope()], { expectedTenantId: TENANT })
    expect(outcome.failures).toHaveLength(0)
    expect(outcome.valid).toHaveLength(1)
  })

  it("租户不匹配被拒绝（租户隔离硬边界）", () => {
    const outcome = validateEnvelopes([buildEnvelope({ tenantId: "tnt_other" })], {
      expectedTenantId: TENANT,
    })
    expect(outcome.valid).toHaveLength(0)
    expect(outcome.failures[0].code).toBe("tenant_mismatch")
  })

  it("master.* 事件 writer 非 app 被拒绝（04 §1.2）", () => {
    const envelope = buildEnvelope()
    envelope.payload = { ...envelope.payload, writer: "cms" }
    const outcome = validateEnvelopes([envelope], { expectedTenantId: TENANT })
    expect(outcome.failures[0].code).toBe("forbidden_writer")
  })

  it("sequence 非法 / checksum 格式错误 / 批量上限", () => {
    const badSeq = buildEnvelope({ sequence: 0 })
    expect(validateEnvelopes([badSeq], { expectedTenantId: TENANT }).failures[0].code).toBe("invalid_sequence")

    const badChecksum = buildEnvelope({ payloadChecksum: "md5:abc" })
    expect(validateEnvelopes([badChecksum], { expectedTenantId: TENANT }).failures[0].code).toBe("bad_checksum_format")

    const many = Array.from({ length: 501 }, () => buildEnvelope())
    expect(validateEnvelopes(many, { expectedTenantId: TENANT }).failures[0].code).toBe("invalid_envelope")
  })
})

describe("sync/ingest + 投影（内存存储）", () => {
  const freshClient = () => createMockEventStore()

  const toIngest = (envelope: SyncEventEnvelope): IngestEvent => envelope as unknown as IngestEvent

  it("首收 accepted；重发 duplicate（03 §5.2 去重）", async () => {
    const client = freshClient()
    const envelope = buildEnvelope()
    const first = await ingestBatch(client, [toIngest(envelope)])
    expect(first).toMatchObject({ accepted: 1, duplicates: 0, rejected: [] })
    const second = await ingestBatch(client, [toIngest(envelope)])
    expect(second).toMatchObject({ accepted: 0, duplicates: 1 })
  })

  it("聚合内乱序事件被拒且保留证据（status=rejected）", async () => {
    const client = freshClient()
    const agg = `prd_${randomUUID()}`
    const v1 = buildEnvelope({ aggregateType: "product", aggregateId: agg, sequence: 1 })
    v1.payload = { ...v1.payload, productId: agg }
    const v2 = buildEnvelope({ aggregateType: "product", aggregateId: agg, sequence: 2 })
    v2.payload = { ...v2.payload, productId: agg, recordVersion: 2 }
    await ingestBatch(client, [toIngest(v2)])
    const result = await ingestBatch(client, [toIngest(v1)])
    expect(result.rejected).toHaveLength(1)
    expect(result.rejected[0].code).toBe("sequence_conflict")
  })

  it("投影 record_version 单调：旧版本事件 version_conflict，新版本生效", async () => {
    const client = freshClient()
    const productId = `prd_${randomUUID()}`
    const v2 = buildEnvelope({
      aggregateType: "product",
      aggregateId: productId,
      sequence: 2,
      payload: {
        operation: "update",
        writer: "app",
        recordVersion: 2,
        productId,
        name: "契约商品 v2",
        priceCents: 2000,
      },
    })
    const first = await ingestBatch(client, [toIngest(v2)])
    expect(first.accepted).toBe(1)

    const stale = buildEnvelope({
      aggregateType: "product",
      aggregateId: productId,
      sequence: 3,
      payload: {
        operation: "update",
        writer: "app",
        recordVersion: 2,
        productId,
        name: "过期版本",
        priceCents: 1,
      },
    })
    const second = await ingestBatch(client, [toIngest(stale)])
    expect(second.rejected).toHaveLength(1)
    expect(second.rejected[0].code).toBe("version_conflict")

    const projection = await projectProductEvent(client, {
      eventId: "evt_direct",
      eventType: "master.product.updated",
      aggregateId: productId,
      tenantId: TENANT,
      storeId: STORE,
      payload: {
        operation: "update",
        writer: "app",
        recordVersion: 5,
        productId,
        name: "契约商品 v5",
        priceCents: 3000,
      },
    })
    expect(projection.applied).toBe(true)
  })

  it("delete 事件落墓碑（deleted=true，不物理删）", async () => {
    const { getMockStoreSnapshot } = await import("@/lib/sync/mock-event-store")
    getMockStoreSnapshot().products.clear()
    const client = freshClient()
    const productId = `prd_${randomUUID()}`
    await projectProductEvent(client, {
      eventId: "evt_c",
      eventType: "master.product.created",
      aggregateId: productId,
      tenantId: TENANT,
      storeId: STORE,
      payload: { operation: "create", writer: "app", recordVersion: 1, productId, name: "待删商品" },
    })
    const result = await projectProductEvent(client, {
      eventId: "evt_d",
      eventType: "master.product.deleted",
      aggregateId: productId,
      tenantId: TENANT,
      storeId: STORE,
      payload: { operation: "delete", writer: "app", recordVersion: 2, productId, deletedAt: new Date().toISOString() },
    })
    expect(result.applied).toBe(true)
    const row = getMockStoreSnapshot().products.get(productId)
    expect(row?.deleted).toBe(true)
    expect(row?.record_version).toBe(2)
  })

  it("master.member.created 投影：手机号脱敏 + 旧版本 version_conflict（C7）", async () => {
    const { getMockStoreSnapshot } = await import("@/lib/sync/mock-event-store")
    getMockStoreSnapshot().events.clear()
    getMockStoreSnapshot().products.clear()
    const client = freshClient()
    const memberId = `mbr_${randomUUID()}`

    const created = buildEnvelope({
      eventType: "master.member.created",
      aggregateType: "member",
      aggregateId: memberId,
      payload: {
        operation: "create",
        writer: "app",
        recordVersion: 1,
        memberId,
        cardNo: "VIP-001",
        name: "契约会员",
        phone: "13800138000",
        balanceCents: 50000,
        points: 1200,
      },
    })
    const outcome = await ingestBatch(client, [toIngest(created)])
    expect(outcome.accepted).toBe(1)

    const row = getMockStoreSnapshot().members.get(memberId)
    expect(row?.phone_masked).toBe("138****00")
    expect(row?.record_version).toBe(1)

    // 旧版本重放（新 eventId、同版本）→ version_conflict
    const stale = buildEnvelope({
      eventType: "master.member.updated",
      aggregateType: "member",
      aggregateId: memberId,
      sequence: 2,
      payload: {
        operation: "update",
        writer: "app",
        recordVersion: 1,
        memberId,
        name: "过期版本",
      },
    })
    const staleOutcome = await ingestBatch(client, [toIngest(stale)])
    expect(staleOutcome.rejected).toHaveLength(1)
    expect(staleOutcome.rejected[0].code).toBe("version_conflict")
  })
})
