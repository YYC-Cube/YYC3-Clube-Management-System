# GitHub Copilot 开发指南

> **YYC3-KTV 商家管理系统** - AI 协作编码规范与项目指南  
> 版本: v1.0 | 创建日期: 2025-01-19 | 维护者: YYC-Cube

---

## 📚 项目概览

### 系统简介

本项目是一个**现代化 KTV 商家后台管理系统**,基于 **Next.js 15 App Router** + **React 19** + **TypeScript** 构建,集成了:

- ✅ **六大核心技术模块**: AI 智能、区块链、边缘计算、5G 应用、物联网、大数据分析
- ✅ **九大 AI 智能运营系统**: 成本计算、客户营销、回访邀约、执行跟踪、反馈体系、内部沟通、人力资源、战略决策、合规审计
- ✅ **完整业务模块**: 销售、商品、仓库、会员、财务、门店、设置等

### 技术架构

```
┌─────────────────────────────────────────────────────────┐
│              前端层 (Next.js 15 + React 19)             │
├─────────────────────────────────────────────────────────┤
│  App Router │ Server Components │ Client Components    │
│  Tailwind v4 │ Framer Motion │ Radix UI + shadcn/ui   │
├─────────────────────────────────────────────────────────┤
│                   API层 (Next.js API Routes)            │
├─────────────────────────────────────────────────────────┤
│  RESTful API │ GraphQL Gateway │ WebSocket             │
│  Rate Limiting │ Authentication │ Authorization        │
├─────────────────────────────────────────────────────────┤
│                   业务服务层                             │
├─────────────────────────────────────────────────────────┤
│  AI Services │ Blockchain │ Edge Computing │ IoT       │
│  Payment │ Notification │ Analytics │ Sync              │
├─────────────────────────────────────────────────────────┤
│                   数据存储层                             │
├─────────────────────────────────────────────────────────┤
│  MySQL 8.0 │ Redis │ Vercel KV │ ClickHouse           │
│  MQTT │ Kafka │ MinIO │ Elasticsearch                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 核心开发原则

### 1. 目录结构规范

严格遵循 **Next.js 15 App Router** 目录结构:

```typescript
/
├── app/                          # Next.js App Router 目录
│   ├── api/                      # API路由 (RESTful endpoints)
│   │   ├── products/route.ts     # 商品API
│   │   ├── orders/route.ts       # 订单API
│   │   ├── ai/                   # AI相关API
│   │   └── blockchain/           # 区块链API
│   ├── dashboard/                # 仪表板页面
│   │   ├── products/page.tsx     # 商品管理页面
│   │   ├── orders/page.tsx       # 订单管理页面
│   │   └── ai/                   # AI管理界面
│   ├── mobile/                   # 移动端页面
│   ├── layout.tsx                # 根布局
│   ├── page.tsx                  # 首页
│   └── globals.css               # 全局样式
├── components/                   # React组件
│   ├── ui/                       # shadcn/ui基础组件
│   ├── products/                 # 商品相关组件
│   ├── auth/                     # 认证组件
│   ├── dashboard/                # 仪表板组件
│   └── layout/                   # 布局组件
├── lib/                          # 业务逻辑库
│   ├── services/                 # 业务服务
│   │   ├── products.ts           # 商品服务
│   │   ├── payment.ts            # 支付服务
│   │   ├── notification.ts       # 通知服务
│   │   └── analytics.ts          # 分析服务
│   ├── ai/                       # AI功能
│   │   ├── chatbot.ts            # 智能客服
│   │   └── dynamic-pricing.ts   # 动态定价
│   ├── blockchain/               # 区块链功能
│   │   └── loyalty-system.ts    # 积分系统
│   ├── iot/                      # 物联网功能
│   │   └── smart-energy-management.ts
│   ├── store/                    # Zustand状态管理
│   │   └── auth-store.ts         # 认证状态
│   ├── validations/              # Zod验证schema
│   │   ├── product.ts            # 商品验证
│   │   └── order.ts              # 订单验证
│   ├── cache/                    # 缓存工具
│   │   └── redis.ts              # Redis缓存
│   ├── monitoring/               # 监控工具
│   │   ├── logger.ts             # 日志系统
│   │   └── metrics.ts            # 性能指标
│   └── utils.ts                  # 工具函数
├── __tests__/                    # 测试文件
│   ├── unit/                     # 单元测试
│   ├── integration/              # 集成测试
│   ├── e2e/                      # 端到端测试
│   └── fixtures/                 # 测试数据
├── docs/                         # 项目文档
│   ├── MODULE_OVERVIEW.md        # 模块概览
│   ├── FEATURE_LIST.md           # 功能清单
│   └── SYSTEM_AUDIT_REPORT.md   # 系统审计报告
├── configs/                      # 配置文件
│   ├── performance_rules.json    # 性能规则
│   └── promotion_criteria.yaml   # 晋升标准
├── jest.config.ts                # Jest配置
├── playwright.config.ts          # Playwright配置
├── next.config.mjs               # Next.js配置
└── tsconfig.json                 # TypeScript配置
```

### 2. 命名规范

#### 文件命名

```typescript
// ✅ 正确示例
route.ts // API路由文件
page.tsx // 页面文件
layout.tsx // 布局文件
product - list.tsx // kebab-case组件
useProducts.ts // camelCase Hook
auth - store.ts // kebab-case状态管理

// ❌ 错误示例
Product.tsx // 组件文件不使用PascalCase命名
products_api.ts // 不使用snake_case
ProductsPage.tsx // 页面文件应为page.tsx
```

#### 变量与函数命名

```typescript
// ✅ 正确: 使用camelCase和语义化命名
const productList = [...];
const isAuthenticated = true;
function calculateTotalPrice(items: Product[]) {}
async function fetchUserData() {}

// ❌ 错误: 命名不清晰或使用错误格式
const data = [...];                // 太泛化
const is_valid = true;             // 应使用camelCase
function calc(x) {}                // 缩写不清晰
```

#### 类型与接口命名

```typescript
// ✅ 正确: 使用PascalCase和描述性命名
interface Product {
  id: string
  name: string
  price: number
}

type ProductStatus = 'active' | 'inactive' | 'discontinued'

// ❌ 错误
interface product {} // 应使用PascalCase
type Status = string // 太泛化
```

### 3. 导入顺序规范

严格按照以下顺序组织导入语句:

```typescript
// 1. React核心库
import React from 'react'
import { useState, useEffect } from 'react'

// 2. Next.js核心库
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// 3. 第三方库 (按字母顺序)
import { Button } from '@/components/ui/button'
import { z } from 'zod'
import { motion } from 'framer-motion'

// 4. 项目内部模块
import { ProductList } from '@/components/products/product-list'
import { useAuth } from '@/lib/store/auth-store'
import { cn } from '@/lib/utils'

// 5. 类型定义
import type { Product } from '@/lib/types'

// 6. 样式文件
import './styles.css'
```

### 4. TypeScript 严格模式

启用严格类型检查,避免使用 `any`:

```typescript
// ✅ 正确: 明确类型定义
interface ProductFilters {
  categoryId?: string
  priceRange?: { min: number; max: number }
  keyword?: string
}

async function fetchProducts(filters: ProductFilters): Promise<Product[]> {
  // 实现逻辑
}

// ❌ 错误: 使用any
async function fetchData(params: any): Promise<any> {
  // 缺少类型安全
}
```

**必须定义类型的场景**:

- 所有函数参数和返回值
- API 响应数据
- 组件 Props
- 状态管理 store
- 事件处理函数参数

---

## 🧩 组件开发规范

### 1. Server Components vs Client Components

**优先使用 Server Components**,仅在以下情况使用 `'use client'`:

- 需要使用 React Hooks (useState, useEffect 等)
- 需要浏览器 API (window, document 等)
- 需要事件处理器 (onClick, onChange 等)
- 需要访问 Context API

```typescript
// ✅ Server Component (默认)
// app/dashboard/products/page.tsx
import { ProductList } from '@/components/products/product-list'

export default async function ProductsPage() {
  const products = await fetchProducts() // 服务端数据获取
  return <ProductList products={products} />
}

// ✅ Client Component (明确标记)
// components/products/product-search.tsx
;('use client')

import { useState } from 'react'

export function ProductSearch() {
  const [query, setQuery] = useState('')
  return <input value={query} onChange={e => setQuery(e.target.value)} />
}
```

### 2. 组件结构模板

```typescript
'use client' // 仅Client Component需要

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Product } from '@/lib/types'

// Props接口定义
interface ProductCardProps {
  product: Product
  onAddToCart?: (productId: string) => void
  className?: string
}

// 组件实现
export function ProductCard({ product, onAddToCart, className }: ProductCardProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    setIsLoading(true)
    try {
      await onAddToCart?.(product.id)
    } catch (error) {
      console.error('添加失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn('rounded-lg border p-4', className)}>
      <h3 className="text-lg font-semibold">{product.name}</h3>
      <p className="text-sm text-muted-foreground">{product.description}</p>
      <Button onClick={handleClick} disabled={isLoading}>
        {isLoading ? '添加中...' : '加入购物车'}
      </Button>
    </div>
  )
}
```

### 3. Tailwind CSS 使用规范

**优先使用 Tailwind 工具类**,避免自定义 CSS:

```typescript
// ✅ 正确: 使用Tailwind工具类
<div className="flex items-center justify-between gap-4 p-6 bg-white rounded-lg shadow-md">
  <h2 className="text-2xl font-bold text-gray-900">商品列表</h2>
  <Button className="bg-blue-500 hover:bg-blue-600">新增商品</Button>
</div>

// ✅ 使用cn()工具合并条件样式
<div className={cn(
  'rounded-lg border p-4',
  isActive && 'bg-blue-50 border-blue-500',
  isDisabled && 'opacity-50 cursor-not-allowed'
)}>
  内容
</div>

// ❌ 错误: 使用内联样式或自定义CSS
<div style={{ display: 'flex', padding: '24px' }}>...</div>
```

### 4. 状态管理 (Zustand)

```typescript
// lib/store/product-store.ts
import { create } from 'zustand'
import type { Product } from '@/lib/types'

interface ProductStore {
  products: Product[]
  selectedProduct: Product | null
  isLoading: boolean
  error: string | null

  // Actions
  setProducts: (products: Product[]) => void
  selectProduct: (id: string) => void
  clearSelection: () => void
}

export const useProductStore = create<ProductStore>(set => ({
  products: [],
  selectedProduct: null,
  isLoading: false,
  error: null,

  setProducts: products => set({ products }),
  selectProduct: id =>
    set(state => ({
      selectedProduct: state.products.find(p => p.id === id) || null,
    })),
  clearSelection: () => set({ selectedProduct: null }),
}))

// 使用示例
// components/products/product-list.tsx
;('use client')

import { useProductStore } from '@/lib/store/product-store'

export function ProductList() {
  const { products, selectProduct } = useProductStore()

  return (
    <div>
      {products.map(product => (
        <div key={product.id} onClick={() => selectProduct(product.id)}>
          {product.name}
        </div>
      ))}
    </div>
  )
}
```

---

## 🔧 API 开发规范

### 1. API 路由结构

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ProductService } from '@/lib/services/products'

// 查询参数验证Schema
const GetProductsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  categoryId: z.string().optional(),
  keyword: z.string().optional(),
})

// GET /api/products - 获取商品列表
export async function GET(request: NextRequest) {
  try {
    // 解析查询参数
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const params = GetProductsSchema.parse(searchParams)

    // 调用业务服务
    const result = await ProductService.getProducts(params)

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      },
    })
  } catch (error) {
    console.error('[API] 获取商品列表失败:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: '参数验证失败', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: false, error: '服务器内部错误' }, { status: 500 })
  }
}

// POST /api/products - 创建商品
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = CreateProductSchema.parse(body)

    const product = await ProductService.createProduct(validatedData)

    return NextResponse.json({ success: true, data: product }, { status: 201 })
  } catch (error) {
    console.error('[API] 创建商品失败:', error)

    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
```

### 2. 数据验证 (Zod)

**所有 API 输入必须使用 Zod 验证**:

```typescript
// lib/validations/product.ts
import { z } from 'zod'

// 商品验证Schema
export const productSchema = z.object({
  name: z.string().min(1, '商品名称不能为空').max(100),
  description: z.string().optional(),
  price: z.number().positive('价格必须大于0'),
  categoryId: z.string().uuid('无效的分类ID'),
  status: z.enum(['active', 'inactive', 'discontinued']),
  stock: z.number().int().nonnegative('库存不能为负数'),
  images: z.array(z.string().url()).max(10),
})

export type Product = z.infer<typeof productSchema>

// 创建商品Schema (部分字段可选)
export const createProductSchema = productSchema.omit({ id: true })

// 更新商品Schema (所有字段可选)
export const updateProductSchema = productSchema.partial()
```

### 3. 错误处理规范

**统一错误响应格式**:

```typescript
// lib/errors.ts
export class APIError extends Error {
  constructor(public message: string, public statusCode: number = 500, public code?: string) {
    super(message)
    this.name = 'APIError'
  }
}

// 使用示例
export async function GET(request: NextRequest) {
  try {
    const data = await fetchData()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode }
      )
    }

    return NextResponse.json({ success: false, error: '未知错误' }, { status: 500 })
  }
}
```

---

## 🧪 测试规范

### 1. 测试覆盖率目标

| 测试类型 | 当前覆盖率 | 目标覆盖率   | 优先级 |
| -------- | ---------- | ------------ | ------ |
| 单元测试 | 10%        | 80%          | 🔴 高  |
| 集成测试 | 5%         | 70%          | 🟡 中  |
| E2E 测试 | 0%         | 40%          | 🟢 低  |
| 安全测试 | 配置完成   | 100%关键路径 | 🔴 高  |

### 2. 单元测试规范 (Jest)

```typescript
// __tests__/lib/services/products.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals'
import { ProductService } from '@/lib/services/products'

describe('ProductService', () => {
  beforeEach(() => {
    // 重置mock和测试数据
  })

  describe('getProducts', () => {
    it('应该返回商品列表', async () => {
      const result = await ProductService.getProducts({ page: 1, pageSize: 10 })

      expect(result.data).toHaveLength(10)
      expect(result.total).toBeGreaterThan(0)
      expect(result.data[0]).toHaveProperty('id')
      expect(result.data[0]).toHaveProperty('name')
    })

    it('应该支持分页查询', async () => {
      const page1 = await ProductService.getProducts({ page: 1, pageSize: 5 })
      const page2 = await ProductService.getProducts({ page: 2, pageSize: 5 })

      expect(page1.data).toHaveLength(5)
      expect(page2.data).toHaveLength(5)
      expect(page1.data[0].id).not.toBe(page2.data[0].id)
    })

    it('应该支持关键词搜索', async () => {
      const result = await ProductService.getProducts({ keyword: '啤酒' })

      expect(result.data.every(p => p.name.includes('啤酒'))).toBe(true)
    })
  })

  describe('createProduct', () => {
    it('应该创建新商品', async () => {
      const newProduct = {
        name: '测试商品',
        price: 99.99,
        categoryId: 'cat-123',
        status: 'active' as const,
        stock: 100,
      }

      const product = await ProductService.createProduct(newProduct)

      expect(product).toHaveProperty('id')
      expect(product.name).toBe(newProduct.name)
    })

    it('应该验证必填字段', async () => {
      const invalidProduct = { name: '' }

      await expect(ProductService.createProduct(invalidProduct as any)).rejects.toThrow(
        '商品名称不能为空'
      )
    })
  })
})
```

### 3. 集成测试规范

**修复已知问题**:

- ❌ **fetch 未定义**: 在 Node.js 环境配置`global.fetch` (使用`node-fetch`或`undici`)
- ❌ **Request 未定义**: 在`jest.setup.ts`中 mock Next.js API 类型
- ❌ **Mock 数据不匹配**: 确保 mockDB 返回`null`而非空数组

```typescript
// jest.setup.ts
import 'whatwg-fetch' // 或 node-fetch

global.Request = class Request {} as any
global.Response = class Response {} as any

// __tests__/integration/api/products.test.ts
import { GET } from '@/app/api/products/route'
import { NextRequest } from 'next/server'

describe('Products API Integration', () => {
  it('GET /api/products 应该返回商品列表', async () => {
    const request = new NextRequest('http://localhost:5001/api/products?page=1&pageSize=10')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toBeInstanceOf(Array)
  })
})
```

### 4. E2E 测试规范 (Playwright)

```typescript
// e2e/products.spec.ts
import { test, expect } from '@playwright/test'

test.describe('商品管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5001/dashboard/products')
  })

  test('应该显示商品列表', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('商品管理')
    await expect(page.locator('[data-testid="product-item"]')).toHaveCount(10)
  })

  test('应该能够创建新商品', async ({ page }) => {
    await page.click('button:has-text("新增商品")')
    await page.fill('input[name="name"]', '测试商品')
    await page.fill('input[name="price"]', '99.99')
    await page.click('button:has-text("保存")')

    await expect(page.locator('text=创建成功')).toBeVisible()
  })
})
```

### 5. 测试命令

```bash
# 单元测试
npm run test:unit           # 运行单元测试
npm run test:unit -- --watch # 监听模式

# 集成测试
npm run test:integration    # 运行集成测试

# E2E测试
npm run test:e2e           # 运行E2E测试
npm run test:e2e -- --ui   # UI模式

# 性能测试
npm run test:performance   # K6性能测试

# 安全测试
npm run test:security      # 安全扫描

# 覆盖率报告
npm run test:coverage      # 生成覆盖率报告
```

---

## 🔒 安全与性能规范

### 1. 环境变量管理

**敏感信息必须使用环境变量**:

```typescript
// ✅ 正确: 使用环境变量
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
}

// ❌ 错误: 硬编码敏感信息
const apiKey = 'sk-abc123...' // 永远不要硬编码密钥
```

**环境变量验证**:

```typescript
// config/env.validator.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  API_KEY: z.string().min(10),
  NODE_ENV: z.enum(['development', 'production', 'test']),
})

export const env = envSchema.parse(process.env)
```

### 2. 缓存策略

**优先使用 Redis 缓存**:

```typescript
// lib/cache/redis.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.REDIS_URL!,
  token: process.env.REDIS_TOKEN!,
})

export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  // 尝试从缓存读取
  const cached = await redis.get<T>(key)
  if (cached) return cached

  // 缓存未命中,获取数据
  const data = await fetcher()
  await redis.setex(key, ttl, data)

  return data
}
```

### 3. 数据库查询优化

```typescript
// ✅ 正确: 使用索引字段查询
SELECT * FROM products WHERE category_id = ? AND status = 'active';

// ✅ 正确: 使用分页
SELECT * FROM products LIMIT 10 OFFSET 0;

// ❌ 错误: 全表扫描
SELECT * FROM products WHERE LOWER(name) LIKE '%关键词%';
```

### 4. 性能监控

```typescript
// lib/monitoring/metrics.ts
export function recordMetric(name: string, value: number) {
  console.log(`[Metric] ${name}: ${value}ms`)
  // 发送到监控服务 (如Vercel Analytics)
}

// 使用示例
const start = Date.now()
const data = await fetchData()
recordMetric('fetchData', Date.now() - start)
```

---

## 📦 常用代码片段

### 1. Server Action 示例

```typescript
// lib/actions/products.ts
'use server'

import { revalidatePath } from 'next/cache'
import { ProductService } from '@/lib/services/products'
import { createProductSchema } from '@/lib/validations/product'

export async function createProduct(formData: FormData) {
  try {
    const data = {
      name: formData.get('name') as string,
      price: Number(formData.get('price')),
      categoryId: formData.get('categoryId') as string,
      status: formData.get('status') as 'active' | 'inactive',
      stock: Number(formData.get('stock')),
    }

    const validated = createProductSchema.parse(data)
    const product = await ProductService.createProduct(validated)

    revalidatePath('/dashboard/products')

    return { success: true, data: product }
  } catch (error) {
    return { success: false, error: error.message }
  }
}
```

### 2. 表单处理 (React Hook Form + Zod)

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createProductSchema } from '@/lib/validations/product'

export function ProductForm() {
  const form = useForm({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: '',
      price: 0,
      status: 'active',
      stock: 0,
    },
  })

  const onSubmit = async data => {
    const result = await createProduct(data)
    if (result.success) {
      alert('创建成功')
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('name')} />
      {form.formState.errors.name && <p>{form.formState.errors.name.message}</p>}

      <button type="submit">提交</button>
    </form>
  )
}
```

### 3. 数据获取模式

```typescript
// Server Component数据获取
export default async function ProductsPage() {
  const products = await fetch('http://localhost:5001/api/products', {
    cache: 'no-store', // 禁用缓存
    // next: { revalidate: 60 }, // 或使用ISR
  }).then(res => res.json())

  return <ProductList products={products.data} />
}

// Client Component数据获取
;('use client')

import { useEffect, useState } from 'react'

export function ProductList() {
  const [products, setProducts] = useState([])

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => setProducts(data.data))
  }, [])

  return <div>{/* 渲染逻辑 */}</div>
}
```

---

## 🚀 Git 提交规范

使用 **Conventional Commits** 格式:

```bash
# 功能开发
git commit -m "feat: 添加商品搜索功能"
git commit -m "feat(products): 支持批量导入商品"

# Bug修复
git commit -m "fix: 修复商品价格计算错误"
git commit -m "fix(api): 修复分页参数验证问题"

# 文档更新
git commit -m "docs: 更新API文档"

# 样式调整
git commit -m "style: 统一商品卡片样式"

# 重构
git commit -m "refactor: 优化商品服务代码结构"

# 性能优化
git commit -m "perf: 优化商品列表查询性能"

# 测试
git commit -m "test: 添加商品服务单元测试"

# 构建配置
git commit -m "build: 升级Next.js到15.1.0"
git commit -m "chore: 配置ESLint规则"
```

---

## 📝 注释规范

### 1. 函数注释 (JSDoc)

```typescript
/**
 * 获取商品列表
 * @param filters - 过滤条件
 * @param filters.page - 页码 (默认1)
 * @param filters.pageSize - 每页数量 (默认10)
 * @param filters.categoryId - 分类ID (可选)
 * @returns 商品列表和分页信息
 * @throws {APIError} 当查询失败时抛出
 * @example
 * const result = await getProducts({ page: 1, pageSize: 20 });
 * console.log(result.data); // Product[]
 */
export async function getProducts(filters: ProductFilters): Promise<ProductsResponse> {
  // 实现逻辑
}
```

### 2. 复杂逻辑注释

```typescript
// ✅ 正确: 解释"为什么"而非"做什么"
// 使用Redis缓存减少数据库查询压力,缓存时间5分钟
const cached = await redis.get(cacheKey)

// ❌ 错误: 说明显而易见的内容
// 设置变量i为0
let i = 0
```

---

## 🛠️ 故障排查指南

### 常见问题与解决方案

#### 1. 测试失败: `fetch is not defined`

**原因**: Node.js 环境缺少 fetch API  
**解决方案**:

```typescript
// jest.setup.ts
import 'whatwg-fetch'
// 或安装 node-fetch
```

#### 2. 测试失败: `Request is not defined`

**原因**: Next.js 服务端 API 类型未 mock  
**解决方案**:

```typescript
// jest.setup.ts
global.Request = class Request {} as any
global.Response = class Response {} as any
```

#### 3. Mock 数据不匹配

**原因**: mockDB 返回空数组而非 null  
**解决方案**:

```typescript
// __tests__/lib/utils/storage.test.ts
it('returns null for non-existent keys', () => {
  const result = mockDB.get('nonexistent')
  expect(result).toBeUndefined() // 改为toBeUndefined或修改mockDB实现
})
```

#### 4. Zod 验证失败

**原因**: schema 定义与实际数据不匹配  
**解决方案**: 检查并更新 validation schema

```typescript
// 检查productSchema定义是否匹配实际使用的字段
export const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  price: z.number().positive(),
  // 确保所有必填字段都已定义
})
```

---

## 📚 相关文档索引

- **项目总览**: `README.md`
- **模块概览**: `docs/MODULE_OVERVIEW.md`
- **功能清单**: `docs/FEATURE_LIST.md`
- **系统审计报告**: `docs/SYSTEM_AUDIT_REPORT.md`
- **路线图**: `docs/NEXT_PHASE_ROADMAP.md`
- **环境配置**: `docs/README.env.md`
- **测试策略**: `__tests__/README.md` (待创建)

---

## ✅ 开发检查清单

在提交代码前,确保完成以下检查:

- [ ] 代码符合 TypeScript 严格模式
- [ ] 所有函数有明确类型定义
- [ ] 使用 Zod 验证 API 输入
- [ ] 添加适当的错误处理
- [ ] 编写单元测试 (目标 80%覆盖率)
- [ ] 更新相关文档
- [ ] 使用 Conventional Commits 格式提交
- [ ] 代码通过 ESLint 检查
- [ ] 测试通过 (`npm run test:unit`)

---

**文档版本**: v1.0  
**最后更新**: 2025-01-19  
**维护者**: YYC-Cube  
**联系方式**: admin@0379.email
