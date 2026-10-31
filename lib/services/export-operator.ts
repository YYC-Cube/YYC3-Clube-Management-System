/**
 * @file export-operator.ts
 * @description 导出操作人解析 — 优先校验签名 JWT，回退请求头并显式标记可信级别
 * @module services
 * @author YYC³
 * @version 1.0.0
 * @created 2026-10-31
 *
 * trust 取值：
 * - jwt：来自 `Authorization: Bearer <HS256 JWT>`，签名与过期时间已校验，不可伪造；
 * - header：来自 `x-operator-id` / `x-operator-name` 请求头，客户端可伪造，仅用于过渡期；
 * - none：未提供任何身份信息，审计仍记录行数与筛选，操作人留空。
 */

import { verifyToken } from "@/lib/security/jwt"

export type OperatorTrust = "jwt" | "header" | "none"

export interface ExportOperator {
  operatorId?: string
  operatorName?: string
  /** 门店 ID（JWT 中携带，供后续门店隔离使用） */
  storeId?: string
  /** 角色（JWT 中携带，供后续角色权限使用） */
  role?: string
  trust: OperatorTrust
}

function trimmed(value: string | null | undefined): string | undefined {
  const text = value?.trim()
  return text ? text : undefined
}

function bearerToken(headers: Headers): string | undefined {
  const authorization = trimmed(headers.get("authorization"))
  if (!authorization) return undefined
  const match = /^Bearer\s+([^\s]+)$/i.exec(authorization)
  return match?.[1]
}

export async function resolveExportOperator(headers: Headers): Promise<ExportOperator> {
  const token = bearerToken(headers)
  if (token) {
    const verified = await verifyToken(token)
    if (verified) {
      return {
        operatorId: verified.userId,
        operatorName: verified.name ?? verified.userId,
        storeId: verified.storeId || undefined,
        role: verified.role || undefined,
        trust: "jwt",
      }
    }
  }

  const operatorId = trimmed(headers.get("x-operator-id"))
  const operatorName = trimmed(headers.get("x-operator-name"))
  if (operatorId || operatorName) {
    return { operatorId, operatorName, trust: "header" }
  }

  return { trust: "none" }
}
