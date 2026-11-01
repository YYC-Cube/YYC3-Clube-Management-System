/**
 * @jest-environment ./node_modules/@happy-dom/jest-environment/lib/index.js
 *
 * ProductDialog 契约测试（③类重写试点：msw 拦截层替代真实服务耦合）。
 * 2026-11-02 二次重写：断言对齐真实契约——调用方（app/dashboard/products/list/page.tsx）
 * 不传 onSuccess（死属性已移除），真实契约=onSubmit 载荷 + 提交成功后 onOpenChange(false)。
 * happy-dom 环境：jsdom 下组件网络请求逃逸 msw 拦截（AggregateError），
 * happy-dom + 真实转译 vendor 链（见 msw-xhr 定案）实现真实拦截。
 * 已知环境约束（实证）：Radix Select 弹层交互后 happy-dom 的「按钮点击→submit」合成失效
 * （原生 submit 事件不派发、requestSubmit 无实现），故用例以 fireEvent.submit(form)
 * 作为等价提交动作——校验→handleFormSubmit→onSubmit 链路与真实点击完全一致。
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProductDialog } from "@/components/dialogs/product-dialog"
import { server } from "../../setup/msw-server"
import { HttpResponse, http } from "msw"

const mockOnSubmit = jest.fn().mockResolvedValue(undefined)
const mockOnOpenChange = jest.fn()
const mockCategories = [
  { id: "cat-1", name: "啤酒" },
  { id: "cat-2", name: "小食" },
]

beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
afterEach(() => {
  server.resetHandlers()
  jest.clearAllMocks()
  mockOnSubmit.mockClear()
  mockOnSubmit.mockResolvedValue(undefined)
})
afterAll(() => server.close())

describe("ProductDialog", () => {
  it("应该渲染新增商品对话框", () => {
    render(
      <ProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        categories={mockCategories}
      />,
    )
    expect(screen.getByText("新增商品")).toBeInTheDocument()
  })

  it("应该渲染编辑商品对话框并回填名称", () => {
    render(
      <ProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        categories={mockCategories}
        product={{ id: "1", name: "青岛啤酒", price: 10, category: "啤酒" } as never}
      />,
    )
    expect(screen.getByText("编辑商品")).toBeInTheDocument()
    expect(screen.getByDisplayValue("青岛啤酒")).toBeInTheDocument()
  })

  it("应该校验空表单（zod 错误渲染、不触发 onSubmit）", async () => {
    render(
      <ProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        categories={mockCategories}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "创建商品" }))
    await waitFor(() => {
      expect(screen.getByText("商品名称不能为空")).toBeInTheDocument()
    })
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it("应该提交有效表单并按真实契约回调（onSubmit 载荷 + 关闭对话框）", async () => {
    const user = userEvent.setup()
    server.use(http.all("*", () => HttpResponse.json({ success: true, data: null })))
    render(
      <ProductDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        categories={mockCategories}
      />,
    )
    fireEvent.change(screen.getByLabelText(/商品名称/), { target: { value: "新商品" } })
    await user.type(screen.getByPlaceholderText("输入或扫描条形码"), "6900000000012")
    await user.type(screen.getByLabelText(/商品单位/), "瓶")
    // 商品类型：Radix Select 键盘流（ArrowDown 打开 + 高亮首项 → Enter 直选）
    const trigger = screen.getByRole("combobox")
    fireEvent.keyDown(trigger, { key: "ArrowDown" })
    fireEvent.keyDown(await screen.findByRole("option", { name: "啤酒" }), { key: "Enter" })
    // 中间断言：SelectValue 已更新（防 select 静默失败）
    await waitFor(() => {
      expect(trigger).toHaveTextContent("啤酒")
    })
    fireEvent.change(screen.getByLabelText(/原价/), { target: { value: "12" } })
    fireEvent.change(screen.getByLabelText(/优惠价/), { target: { value: "10" } })
    fireEvent.change(screen.getByLabelText(/会员价/), { target: { value: "9" } })
    fireEvent.change(screen.getByLabelText(/当前库存/), { target: { value: "100" } })
    fireEvent.change(screen.getByLabelText(/最小库存/), { target: { value: "10" } })
    fireEvent.change(screen.getByLabelText(/成本价/), { target: { value: "5" } })
    // 等价提交（见文件头环境约束注记）：fireEvent.submit 直派 submit 事件
    fireEvent.submit(document.querySelector("form")!)
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "新商品", price: 10, categoryId: "cat-1" }),
      )
    })
    // 真实契约：提交成功后对话框关闭
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
