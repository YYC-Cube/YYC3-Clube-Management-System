# 集成测试环境技术选型分析

> **目标**: 修复 Next.js API Route 集成测试 Response mock 兼容性问题  
> **当前问题**: `NextResponse.json()` 返回的 `response._body` 为 `undefined`  
> **分析时间**: 2025-01-19

---

## 🔍 问题根因分析

### 现象描述

```typescript
// __tests__/integration/api/products.test.ts
const response = await GET(request)
const result = await response.json()

// 实际结果
console.log(result) // {} (空对象)
console.log(response._body) // undefined
```

### 问题原因

Next.js 的 `NextResponse` 继承自标准 Web `Response` API,但我们的 `MockResponse` 实现不完全兼容:

1. **Body 存储机制不同**: Next.js 使用内部 `ReadableStream`
2. **序列化方式不同**: `Response.json()` 静态方法需要特殊处理
3. **Edge Runtime 差异**: Next.js API Routes 运行在 Edge Runtime,与 Node.js 环境不同

---

## 📊 技术方案对比

### 方案 A: @edge-runtime/jest-environment

**简介**: Vercel 官方提供的 Jest 环境,模拟 Edge Runtime

#### ✅ 优势

1. **官方支持**: Vercel 官方维护,与 Next.js 深度集成
2. **完全兼容**: 原生支持 `Request`/`Response`/`Headers` 等 Web APIs
3. **零配置**: 安装即用,无需复杂 mock
4. **真实环境**: 模拟真实 Edge Runtime 行为

#### ❌ 劣势

1. **较新**: 相对较新,社区案例较少
2. **依赖限制**: 需要 Node.js ≥ 16
3. **调试困难**: Edge Runtime 调试工具不如 Node.js 丰富

#### 🔧 实施步骤

```bash
# 1. 安装
npm install --save-dev @edge-runtime/jest-environment

# 2. 配置 jest.config.ts
export default {
  testEnvironment: '@edge-runtime/jest-environment',
  testEnvironmentOptions: {
    // Edge Runtime 特定配置
  },
}

# 3. 移除自定义 mock (jest.setup.ts 大幅简化)
// 删除 MockRequest/MockResponse 类
// 保留 next/navigation mock
```

#### 📝 示例代码

```typescript
// __tests__/integration/api/products.test.ts
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/products/route'

describe('Products API', () => {
  it('should return products', async () => {
    const request = new NextRequest('http://localhost:5001/api/products')
    const response = await GET(request)

    // ✅ 现在可以正常工作
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toHaveProperty('success')
  })
})
```

#### 📊 评分

| 维度     | 评分         | 说明                      |
| -------- | ------------ | ------------------------- |
| 兼容性   | ⭐⭐⭐⭐⭐   | 与 Next.js 完美兼容       |
| 易用性   | ⭐⭐⭐⭐⭐   | 几乎零配置                |
| 维护性   | ⭐⭐⭐⭐     | 官方维护,更新及时         |
| 性能     | ⭐⭐⭐⭐     | 轻量级,测试速度快         |
| 社区支持 | ⭐⭐⭐       | 较新,案例较少             |
| **总评** | **⭐⭐⭐⭐** | **推荐用于 Next.js 项目** |

---

### 方案 B: MSW (Mock Service Worker)

**简介**: 通过拦截网络请求来 mock API

#### ✅ 优势

1. **真实网络**: 模拟真实 HTTP 请求,更接近生产环境
2. **跨环境**: 可用于浏览器和 Node.js
3. **社区活跃**: 大量文档和案例
4. **灵活性高**: 可精确控制请求/响应

#### ❌ 劣势

1. **配置复杂**: 需要配置 handlers/server
2. **学习成本**: 需要理解 MSW 概念
3. **间接测试**: 通过网络层测试,不是直接调用
4. **性能开销**: 网络拦截有一定性能损耗

#### 🔧 实施步骤

```bash
# 1. 安装
npm install --save-dev msw

# 2. 初始化 (浏览器环境需要)
npx msw init public/ --save

# 3. 创建 handlers
mkdir -p __tests__/mocks
touch __tests__/mocks/handlers.ts
touch __tests__/mocks/server.ts

# 4. 配置 jest.setup.ts
import { server } from './__tests__/mocks/server'
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

#### 📝 示例代码

```typescript
// __tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/products', () => {
    return HttpResponse.json({
      success: true,
      data: { data: [], pagination: {} },
    })
  }),
]

// __tests__/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)

// __tests__/integration/api/products.test.ts
import { server } from '../mocks/server'
import { http, HttpResponse } from 'msw'

describe('Products API', () => {
  it('should return products', async () => {
    // 覆盖默认 handler
    server.use(
      http.get('/api/products', () => {
        return HttpResponse.json({ success: true, data: [] })
      })
    )

    const res = await fetch('http://localhost:5001/api/products')
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})
```

#### 📊 评分

| 维度     | 评分         | 说明                         |
| -------- | ------------ | ---------------------------- |
| 兼容性   | ⭐⭐⭐⭐     | 通用方案,不限于 Next.js      |
| 易用性   | ⭐⭐⭐       | 需要配置 handlers            |
| 维护性   | ⭐⭐⭐⭐⭐   | 社区活跃,文档完善            |
| 性能     | ⭐⭐⭐       | 网络拦截有开销               |
| 社区支持 | ⭐⭐⭐⭐⭐   | 大量案例和教程               |
| **总评** | **⭐⭐⭐⭐** | **适合需要细粒度控制的项目** |

---

### 方案 C: node-mocks-http

**简介**: 轻量级 HTTP mock 库,模拟 `req`/`res` 对象

#### ✅ 优势

1. **轻量级**: 体积小,依赖少
2. **简单直接**: API 简洁易懂
3. **Express 兼容**: 适合 Express-style API

#### ❌ 劣势

1. **不支持 Next.js**: 不兼容 `NextRequest`/`NextResponse`
2. **功能有限**: 不支持 Web Streams
3. **不推荐**: Next.js 官方不推荐此方案

#### 📊 评分

| 维度     | 评分     | 说明                      |
| -------- | -------- | ------------------------- |
| 兼容性   | ⭐⭐     | 不兼容 Next.js API Routes |
| **总评** | **⭐⭐** | **不推荐用于本项目**      |

---

## 🎯 最终推荐方案

### ✅ 推荐: @edge-runtime/jest-environment

**理由**:

1. **官方支持**: Vercel 官方维护,与 Next.js 深度集成
2. **零配置**: 安装即用,无需编写复杂 mock
3. **完全兼容**: 原生支持所有 Web APIs
4. **未来保障**: 跟随 Next.js 更新,长期可维护

### 🔄 备选: MSW

**适用场景**:

- 需要精确控制 API 响应
- 需要跨环境(浏览器+Node.js)测试
- 团队对 MSW 熟悉

---

## 📋 实施计划

### Phase 1.1 完成 ✅

**输出**:

- [x] 技术选型分析文档
- [x] 确定使用 `@edge-runtime/jest-environment`
- [x] 制定实施步骤

### Phase 1.2 开始 🚀

**下一步行动**:

1. **安装依赖** (5min)

   ```bash
   npm install --save-dev @edge-runtime/jest-environment
   ```

2. **更新 jest.config.ts** (5min)

   ```typescript
   export default {
     testEnvironment: '@edge-runtime/jest-environment',
     // 移除不需要的配置
   }
   ```

3. **简化 jest.setup.ts** (10min)

   - 删除 `MockRequest`/`MockResponse` 类
   - 保留 `next/navigation` mock
   - 保留环境变量配置

4. **验证测试** (5min)

   ```bash
   npm run test:integration
   ```

**预计总耗时**: 25 分钟

---

## 📚 参考资源

### 官方文档

- [@edge-runtime/jest-environment](https://edge-runtime.vercel.sh/packages/jest-environment)
- [MSW 文档](https://mswjs.io/docs/)
- [Next.js Testing 文档](https://nextjs.org/docs/app/building-your-application/testing)

### 社区案例

- [Vercel Edge Runtime Examples](https://github.com/vercel/edge-runtime/tree/main/examples)
- [MSW with Next.js](https://github.com/mswjs/examples/tree/main/examples/with-nextjs)

---

**结论**: 选择 `@edge-runtime/jest-environment`,立即开始 Phase 1.2 实施 🚀
