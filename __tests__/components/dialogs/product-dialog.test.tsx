/**
 * ProductDialog 契约测试（③类重写试点：msw 拦截层替代真实服务耦合）。
 * 重写自 archive-dialogs 版本：补契约 props（categories/onSubmit）+ msw 拦截
 * 组件内网络调用（原 AggregateError 根因）。
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { ProductDialog } from "@/components/dialogs/product-dialog"
import { server } from "../../setup/msw-server"
import { HttpResponse, http } from "msw"

const mockOnSuccess = jest.fn()
const mockOnSubmit = jest.fn().mockResolvedValue(undefined)
const mockOnOpenChange = jest.fn()
const mockCategories = [
  { id: "cat-1", name: "啤酒" },
  { id: "cat-2", name: "小食" },
]

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe("ProductDialog", () => {
  it("应该渲染新增商品对话框", () => {
    render(
      <ProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        onSuccess={mockOnSuccess}
        categories={mockCategories}
      />,
    )
    expect(screen.getByText("新增商品")).toBeInTheDocument()
  })

  it("应该渲染编辑商品对话框并回填", () => {
    render(
      <ProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        onSuccess={mockOnSuccess}
        categories={mockCategories}
        product={{ id: "1", name: "青岛啤酒", price: 10, category: "啤酒" } as never}
      />,
    )
    expect(screen.getByText("编辑商品")).toBeInTheDocument()
    expect(screen.getByDisplayValue("青岛啤酒")).toBeInTheDocument()
  })

  it("应该验证表单输入（空名称拒绝提交）", async () => {
    server.use(
      http.all("*", () => HttpResponse.json({ success: true, data: null })),
    )
    render(
      <ProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        onSuccess={mockOnSuccess}
        categories={mockCategories}
      />,
    )
    fireEvent.click(screen.getByText("保存"))
    await waitFor(() => {
      expect(screen.getByText(/商品名称不能为空/i)).toBeInTheDocument()
    })
  })

  it("应该提交有效的表单数据并回调成功", async () => {
    server.use(
      http.all("*", () => HttpResponse.json({ success: true, data: null })),
    )
    render(
      <ProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        onSuccess={mockOnSuccess}
        categories={mockCategories}
      />,
    )
    fireEvent.change(screen.getByLabelText("商品名称"), { target: { value: "新商品" } })
    fireEvent.change(screen.getByLabelText("价格"), { target: { value: "15" } })
    fireEvent.click(screen.getByText("保存"))
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled()
    })
  })
})
