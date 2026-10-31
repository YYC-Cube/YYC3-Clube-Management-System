/**
 * 登录API路由
 * 
 * ⚠️ 安全警告 - 开发和测试环境配置:
 * 1. 本文件包含测试用的弱密码（123456）
 * 2. 仅用于开发和测试环境，不适用于生产环境
 * 3. 生产环境必须实现以下安全措施：
 *    - 使用 bcrypt/argon2 进行密码哈希
 *    - 实现账户锁定机制（防暴力破解）
 *    - 使用 jsonwebtoken 库生成真实的 JWT
 *    - 实现密码复杂度要求
 *    - 添加验证码/CAPTCHA
 *    - 实现多因素认证（MFA）
 *    - 记录登录日志和异常行为
 *    - 使用 HTTPS 传输
 */
import { NextRequest, NextResponse } from "next/server"
import type { User, ApiResponse } from "@/lib/types"
import { UserRole, Permission } from "@/lib/types"
import { generateToken } from "@/lib/security/jwt"

// ⚠️ 模拟用户数据（仅用于测试，生产环境应该从数据库查询并验证密码哈希）
const MOCK_USERS: Array<{ phone: string; password: string; user: User }> = [
  {
    phone: "13103790379",
    password: "123456", // ⚠️ 测试密码，生产环境必须使用密码哈希
    user: {
      id: "1",
      name: "管理员",
      phone: "13103790379",
      storeId: "store_1",
      role: UserRole.ADMIN,
      permissions: [Permission.VIEW_SETTINGS, Permission.MANAGE_SETTINGS, Permission.VIEW_PRODUCTS, Permission.VIEW_ORDERS, Permission.MANAGE_MEMBERS],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
  {
    phone: "13800138000",
    password: "123456", // ⚠️ 测试密码，生产环境必须使用密码哈希
    user: {
      id: "2",
      name: "操作员",
      phone: "13800138000",
      storeId: "store_1",
      role: UserRole.MANAGER,
      permissions: [Permission.VIEW_SETTINGS, Permission.VIEW_ORDERS, Permission.VIEW_MEMBERS],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  },
]

// ⚠️ Token 使用 lib/security/jwt.ts 的 HS256 签名实现（与 /api/auth 校验一致）
// 生产环境仍需接入真实用户表、密码哈希与账户锁定策略。

// Next.js 16：使用路由段配置，替代已废弃的 config 对象
export const runtime = "nodejs"

// 处理预检请求
function handleOPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || "*"
  
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Credentials": "true",
      },
    }
  )
}

export async function OPTIONS(request: NextRequest) {
  return handleOPTIONS(request)
}

export async function POST(request: NextRequest) {
  // 允许跨域请求
  const origin = request.headers.get("origin") || "*"

  try {
    const { phone, password } = await request.json()

    if (!phone || !password) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "手机号和密码不能为空" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
          },
        }
      )
    }

    // ⚠️ 查找用户（生产环境必须验证密码哈希，而不是明文比较）
    const userData = MOCK_USERS.find(
      (user) => user.phone === phone && user.password === password
    )

    if (!userData) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: "手机号或密码错误" },
        {
          status: 401,
          headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
          },
        }
      )
    }

    // 生成签名 Token（包含 role/storeId/permissions，供审计与授权使用）
    const token = await generateToken({
      userId: userData.user.id,
      role: userData.user.role,
      storeId: userData.user.storeId,
      permissions: userData.user.permissions,
      name: userData.user.name,
    })

    return NextResponse.json<ApiResponse<{ user: User; token: string }>>(
      {
        success: true,
        data: {
          user: userData.user,
          token,
        },
      },
      {
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Credentials": "true",
        },
      }
    )
  } catch (error) {
    console.error("[API] 登录失败:", error)
    return NextResponse.json<ApiResponse>(
      { success: false, error: "登录失败，请稍后重试" },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Credentials": "true",
        },
      }
    )
  }
}
