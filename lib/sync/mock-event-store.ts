/**
 * 无库环境的同步事件内存存储（SYNC_EVENT_LOG_DIALECT=mock）。
 * 用途：CMS dev 无 DATABASE_URL 时端到端验证 HMAC→信封校验→去重→投影→ACK 全流程；
 * 仅实现 lib/sync/ingest 与 product-projection 所需的 7 类语句形态（前缀匹配 + $n 绑定），
 * 非生产组件；生产使用 pg 方言。
 */

export interface MockEventRow {
  event_id: string
  event_type: string
  aggregate_type: string
  aggregate_id: string
  tenant_id: string
  store_id: string
  sequence: number
  writer: string
  record_version: number | null
  status: string
  payload: Record<string, unknown>
}

export interface MockProductRow {
  id: string
  tenant_id: string
  store_id: string
  name: string
  price_cents: number
  record_version: number
  status: string
  deleted: boolean
  payload: Record<string, unknown>
}

const EVENT_INSERT = "INSERT INTO public.sync_event_log"
const EVENT_MAX_SEQ = "SELECT MAX(sequence) AS sequence FROM public.sync_event_log"
const EVENT_REJECT = "UPDATE public.sync_event_log SET status = 'rejected'"
const PRODUCT_VERSION = "SELECT record_version FROM public.operational_product WHERE id = $1"
const PRODUCT_DELETE = "UPDATE public.operational_product"
const PRODUCT_INSERT = "INSERT INTO public.operational_product"
const PRODUCT_UPDATE = "UPDATE public.operational_product SET name = $2"

export interface MockStore {
  events: Map<string, MockEventRow>
  products: Map<string, MockProductRow>
}

export function createMockStore(): MockStore {
  return { events: new Map(), products: new Map() }
}

const globalForMock = globalThis as unknown as { __yyc3MockSyncStore?: MockStore }

/** 测试观测用：返回当前全局 mock 存储实例。 */
export function getMockStoreSnapshot(): MockStore {
  return (globalForMock.__yyc3MockSyncStore ??= createMockStore())
}

export function createMockEventStore(): {
  query: <T = unknown>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>
} {
  const store = getMockStoreSnapshot()
  return {
    async query<T = unknown>(text: string, params: unknown[] = []): Promise<{ rows: T[] }> {
      return { rows: execute(store, text, params) as T[] }
    },
  }
}

function execute(store: MockStore, text: string, params: unknown[]): unknown[] {
  const normalized = text.replace(/\s+/g, " ").trim()

  if (normalized.startsWith(EVENT_INSERT)) {
    const existing = store.events.get(String(params[0]))
    if (existing) return []
    store.events.set(String(params[0]), {
      event_id: String(params[0]),
      event_type: String(params[1]),
      aggregate_type: String(params[3]),
      aggregate_id: String(params[4]),
      tenant_id: String(params[5]),
      store_id: String(params[6]),
      sequence: Number(params[7]),
      writer: String(params[8]),
      record_version: params[9] === null ? null : Number(params[9]),
      status: "applied",
      payload: typeof params[12] === "string" ? JSON.parse(params[12] as string) : (params[12] as Record<string, unknown>),
    })
    return [{ event_id: String(params[0]) }]
  }

  if (normalized.startsWith(EVENT_MAX_SEQ)) {
    let max = 0
    const aggType = String(params[0])
    const aggId = String(params[1])
    for (const row of store.events.values()) {
      if (
        row.aggregate_type === aggType &&
        row.aggregate_id === aggId &&
        row.status === "applied"
      ) {
        max = Math.max(max, row.sequence)
      }
    }
    return [{ sequence: max }]
  }

  if (normalized.startsWith(EVENT_REJECT)) {
    const row = store.events.get(String(params[0]))
    if (row) row.status = "rejected"
    return []
  }

  if (normalized === PRODUCT_VERSION) {
    const row = store.products.get(String(params[0]))
    return [{ record_version: row ? row.record_version : null }]
  }

  if (normalized.startsWith(PRODUCT_DELETE)) {
    const row = store.products.get(String(params[0]))
    if (row) {
      row.deleted = true
      row.record_version = Number(params[2])
      row.payload = typeof params[4] === "string" ? JSON.parse(params[4] as string) : {}
    }
    return []
  }

  if (normalized.startsWith(PRODUCT_INSERT)) {
    const id = String(params[0])
    if (store.products.has(id)) return []
    store.products.set(id, {
      id,
      tenant_id: String(params[1]),
      store_id: String(params[2]),
      name: String(params[4]),
      price_cents: Number(params[7]),
      record_version: Number(params[11]),
      status: String(params[10]),
      deleted: false,
      payload: typeof params[13] === "string" ? JSON.parse(params[13] as string) : {},
    })
    return [{ id }]
  }

  if (normalized.startsWith(PRODUCT_UPDATE)) {
    const row = store.products.get(String(params[0]))
    if (row) {
      row.name = String(params[1])
      row.price_cents = Number(params[4])
      row.record_version = Number(params[8])
      row.status = String(params[7])
      row.deleted = false
      row.payload = typeof params[10] === "string" ? JSON.parse(params[10] as string) : {}
    }
    return []
  }

  throw new Error(`mock-event-store 不支持的语句：${normalized.slice(0, 80)}`)
}
