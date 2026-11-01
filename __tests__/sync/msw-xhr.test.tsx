/**
 * @jest-environment ./node_modules/@happy-dom/jest-environment/lib/index.js
 *
 * msw XHR 拦截语义独立验证（不依赖 dialogs 目录启停）。
 * 闭环：setup-server listen → fetch/XHR → XMLHttpRequestInterceptor → mock 响应
 * → 断言未发生真实网络（listen error 语义下未拦截请求会抛错而非静默放行）。
 */
import { render, screen, waitFor } from "@testing-library/react"
import React from "react"
import { server } from "../setup/msw-server"
import { http, HttpResponse } from "msw"

// happy-dom 提供原生 fetch/XHR/Headers（无需 whatwg-fetch/undici 注入）
describe("msw XHR 拦截语义（listen error 闭环）", () => {
  beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  function Probe(): React.ReactElement {
    const [name, setName] = React.useState<string>("")
    const [failed, setFailed] = React.useState(false)
    React.useEffect(() => {
      // XHR 语义本义：直接走 XMLHttpRequest（XMLHttpRequestInterceptor 的 patch 目标）
      const xhr = new XMLHttpRequest()
      xhr.open("GET", "/api/probe")
      xhr.onload = () => {
        try {
          setName(JSON.parse(xhr.responseText).name)
        } catch {
          setFailed(true)
        }
      }
      xhr.onerror = () => setFailed(true)
      xhr.send()
    }, [])
    if (failed) return <div data-testid="probe-failed">network-failed</div>
    return <div data-testid="probe-name">{name || "loading"}</div>
  }

  it("XMLHttpRequest 请求被 msw 拦截并返回 mock 数据（无真实网络）", async () => {
    server.use(
      http.get("*/api/probe", () =>
        HttpResponse.json({ name: "msw-xhr-ok" }),
      ),
    )
    render(<Probe />)
    await waitFor(
      () => {
        const node = screen.getByTestId("probe-name")
        expect(node.textContent).toBe("msw-xhr-ok")
      },
      { timeout: 3000 },
    )
    expect(screen.queryByTestId("probe-failed")).toBeNull()
  })

  it("未处理请求在 error 语义下不会静默真实联网（走 mock 兜底或错误响应）", async () => {
    // 默认兜底 handler（msw-server）覆盖任意路径 → 组件收到 success:null
    render(<Probe />)
    await waitFor(
      () => {
        const failed = screen.queryByTestId("probe-failed")
        expect(failed).not.toBeNull()
      },
      { timeout: 3000 },
    )
  })
})
