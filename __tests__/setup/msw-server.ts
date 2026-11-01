/**
 * msw 统一拦截层（测试治理③类重写前置）。
 * 用法：在套件内 `import { server } from "../setup/msw-server"` 并在 beforeAll listen。
 * 默认 handler：拦断真实网络（组件直连 API 的 AggregateError 根因），按需在套件内
 * `server.use(...)` 覆盖场景响应。
 */
import { setupServer } from "msw/node"
import { http, HttpResponse } from "msw"

export const defaultHandlers = [
  // 兜底：任何未显式 mock 的 API 请求返回空成功，避免 AggregateError/连接拒绝
  http.all("*", () => HttpResponse.json({ success: true, data: null })),
]

export const server = setupServer(...defaultHandlers)
