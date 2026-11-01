/**
 * 只读样板端点：CMS 页面层从 mock 切真实 operational_* 读模型的迁移模板。
 * GET /api/v1/read-model/products?storeId=xxx
 * - 直接投影表查询（全参数化）；租户以服务间/会话身份为准（样板阶段从 query 取并校验格式）；
 * - 后续各域（member/room/staff/artist/settings）按本模板复制即可完成 mock→真数据迁移。
 */
import { type NextRequest, NextResponse } from "next/server"
import { verifySyncHmac } from "@/lib/sync/hmac"
import { parseRegisteredKeys } from "@/lib/sync/keys"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 服务间身份优先；无 HMAC 头时回退会话（PC 页面直连场景）。
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
  type ProductRow = {
    id: string
    code: string
    name: string
    category_id: string | null
    unit: string
    price_cents: string | number
    member_price_cents: string | number | null
    stock: number
    status: string
    deleted: boolean
    record_version: string | number
  }
  const rows = await query<ProductRow[]>(
    `SELECT id, code, name, category_id, unit, price_cents, member_price_cents,
            stock, status, deleted, record_version
       FROM public.operational_product
      WHERE tenant_id = $1 AND store_id = $2 AND deleted = false
      ORDER BY category_id, name`,
    [tenantId, storeId],
  )

  return NextResponse.json({
    success: true,
    data: rows.map((row) => ({
      ...row,
      priceCents: Number(row.price_cents),
      memberPriceCents: row.member_price_cents === null ? null : Number(row.member_price_cents),
      recordVersion: Number(row.record_version),
    })),
  })
}
