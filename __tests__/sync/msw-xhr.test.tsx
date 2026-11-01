/**
 * @jest-environment ./node_modules/@happy-dom/jest-environment/lib/index.js
 *
 * msw XHR 拦截语义独立验证（不依赖 dialogs 目录启停）。
 * 闭环：setup-server listen → XHR → XMLHttpRequestInterceptor → mock 响应
 * → 断言未发生真实网络（若 msw 未拦截，happy-dom XHR 直连将 ECONNREFUSED → network-failed；
 *   两条用例均非 network-failed 即证明响应全部来自 mock 层）。
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
    const [status, setStatus] = React.useState<string>("loading")
    React.useEffect(() => {
      // XHR 语义本义：直接走 XMLHttpRequest（XMLHttpRequestInterceptor 的 patch 目标）
      const xhr = new XMLHttpRequest()
      xhr.open("GET", "/api/probe")
      xhr.onload = () => {
        try {
          const parsed: { name?: string | null; message?: string } =
            JSON.parse(xhr.responseText)
          // 兜底 handler 返回 {success:true,data:null} → name 为空；
          // 区分「命名 mock 命中」与「兜底 mock 命中」，两者均证明来自 mock 层
          if (parsed.name == null) setStatus("fallback-hit")
          else if (parsed.name === "TypeError" || parsed.name === "Error")
            setStatus(`${parsed.name}:${String(parsed.message).slice(0, 120)}`)
          else setStatus(String(parsed.name))
        } catch {
          setStatus(`parse-failed:${xhr.status}:${xhr.responseText.slice(0, 80)}`)
        }
      }
      xhr.onerror = () => setStatus("network-failed")
      xhr.send()
    }, [])
    return <div data-testid="probe-status">{status}</div>
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
        expect(screen.getByTestId("probe-status").textContent).toBe(
          "msw-xhr-ok",
        )
      },
      { timeout: 3000 },
    )
  })

  it("未显式 mock 的路径命中兜底 handler——响应来自 mock 层而非真实网络", async () => {
    // 兜底 http.all("*") 使请求不存在「未处理」形态；若拦截链断裂，
    // happy-dom XHR 直连 ECONNREFUSED → network-failed，而非 fallback-hit
    render(<Probe />)
    await waitFor(
      () => {
        expect(screen.getByTestId("probe-status").textContent).toBe(
          "fallback-hit",
        )
      },
      { timeout: 3000 },
    )
  })
})
