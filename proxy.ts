import { NextResponse } from "next/server"

// Next.js 16：middleware 文件约定已更名为 proxy，此处保持轻量请求透传。
// 后续如需恢复 CSRF 与边缘缓存，可在此统一扩展鉴权/缓存策略。

export function proxy() {
  return NextResponse.next()
}

export const config = {
  matcher: ["/api/:path*"],
}
