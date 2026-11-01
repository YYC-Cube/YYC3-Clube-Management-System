/**
 * 只读读模型端点（五域样板：product/member/room/staff/artist/settings）。
 * GET /api/v1/read-model/[domain]?tenantId=&storeId=
 * - 每域静态列集（SQL 为函数内参数化模板，表名经显式分支不拼接）；
 * - 统一过滤 deleted=false；输出 camelCase；
 * - 各 CMS 页面按本端点替换 mockService（迁移模板见 02 日志 2026-11-01 收尾轮）。
 */
import { type NextRequest, NextResponse } from "next/server"
import { parseRegisteredKeys } from "@/lib/sync/keys"
import { verifySyncHmac } from "@/lib/sync/hmac"

export const dynamic = "force-dynamic"

const DOMAINS = ["product", "member", "room", "staff", "artist", "settings"] as const
type Domain = (typeof DOMAINS)[number]

function isDomain(value: string): value is Domain {
  return (DOMAINS as readonly string[]).includes(value)
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> },
): Promise<NextResponse> {
  const { domain } = await context.params
  if (!isDomain(domain)) {
    return NextResponse.json(
      { success: false, error: `不支持的读模型域：${domain}`, code: "validation_error" },
      { status: 400 },
    )
  }

  const hmac = await verifySyncHmac(request.headers, "", parseRegisteredKeys())
  const tenantId =
    hmac.ok && hmac.identity ? hmac.identity.tenantId : (request.nextUrl.searchParams.get("tenantId") ?? "")
  const storeId = request.nextUrl.searchParams.get("storeId")?.trim() ?? ""
  if (!/^[A-Za-z0-9_:-]{1,64}$/.test(tenantId) || !/^[A-Za-z0-9_:-]{1,64}$/.test(storeId)) {
    return NextResponse.json(
      { success: false, error: "缺少或非法 tenantId/storeId", code: "validation_error" },
      { status: 400 },
    )
  }

  const { query } = await import("@/lib/db/pg")
  try {
    const rows = await selectDomain(query, domain, tenantId, storeId)
    return NextResponse.json({ success: true, data: rows })
  } catch (error) {
    console.error(`[read-model/${domain}] failed:`, error instanceof Error ? error.message : error)
    return NextResponse.json(
      { success: false, error: "读模型查询失败", code: "internal_error" },
      { status: 500 },
    )
  }
}

async function selectDomain(
  query: <T = unknown>(text: string, params?: unknown[]) => Promise<T>,
  domain: Domain,
  tenantId: string,
  storeId: string,
): Promise<unknown[]> {
  if (domain === "product") {
    return query(
      `SELECT id, code, name, category_id AS "categoryId", unit, price_cents AS "priceCents",
              member_price_cents AS "memberPriceCents", stock, status, record_version AS "recordVersion"
         FROM public.operational_product
        WHERE tenant_id = $1 AND store_id = $2 AND deleted = false
        ORDER BY category_id, name`,
      [tenantId, storeId],
    )
  }
  if (domain === "member") {
    return query(
      `SELECT id, card_no AS "cardNo", name, phone_masked AS "phoneMasked", level_id AS "levelId",
              balance_cents AS "balanceCents", points, status, record_version AS "recordVersion"
         FROM public.operational_member
        WHERE tenant_id = $1 AND store_id = $2 AND deleted = false
        ORDER BY card_no`,
      [tenantId, storeId],
    )
  }
  if (domain === "room") {
    return query(
      `SELECT id, room_no AS "roomNo", name, room_type_id AS "roomTypeId", area_id AS "areaId",
              floor, capacity, price_cents AS "priceCents", business_status AS "businessStatus",
              record_version AS "recordVersion"
         FROM public.operational_room
        WHERE tenant_id = $1 AND store_id = $2 AND deleted = false
        ORDER BY room_no`,
      [tenantId, storeId],
    )
  }
  if (domain === "staff") {
    return query(
      `SELECT id, user_id AS "userId", name, group_id AS "groupId", role,
              quota_cents AS "quotaCents", status, record_version AS "recordVersion"
         FROM public.operational_staff
        WHERE tenant_id = $1 AND store_id = $2 AND deleted = false
        ORDER BY name`,
      [tenantId, storeId],
    )
  }
  if (domain === "artist") {
    return query(
      `SELECT id, artist_no AS "artistNo", name, group_id AS "groupId", level_id AS "levelId",
              badge_no AS "badgeNo", stage_fee_rule AS "stageFeeRule", status,
              record_version AS "recordVersion"
         FROM public.operational_artist
        WHERE tenant_id = $1 AND store_id = $2 AND deleted = false
        ORDER BY artist_no`,
      [tenantId, storeId],
    )
  }
  return query(
    `SELECT id, domain, config, record_version AS "recordVersion"
       FROM public.operational_settings
      WHERE tenant_id = $1 AND store_id = $2 AND deleted = false
      ORDER BY domain`,
    [tenantId, storeId],
  )
}
