# 全局测试策略与覆盖计划

> **YYC3-KTV 商家管理系统** - 测试体系建设与质量保障方案  
> 版本: v1.0 | 创建日期: 2025-01-19 | 维护者: QA Team

---

## 📊 当前测试现状

### 测试覆盖概览

| 指标               | 当前值      | 目标值         | 差距   | 优先级 |
| ------------------ | ----------- | -------------- | ------ | ------ |
| **测试文件数**     | 79          | 150+           | +71    | 🟡 中  |
| **源文件数**       | 190         | -              | -      | -      |
| **测试覆盖率**     | 10%         | 80%            | +70%   | 🔴 高  |
| **单元测试通过率** | 88% (75/85) | 100%           | +12%   | 🔴 高  |
| **集成测试通过率** | 0% (0/1)    | 100%           | +100%  | 🔴 高  |
| **E2E 测试覆盖**   | 0%          | 40%            | +40%   | 🟢 低  |
| **性能测试**       | 已配置      | 关键路径全覆盖 | 待执行 | 🟡 中  |
| **安全测试**       | 已配置      | 100%关键路径   | 待执行 | 🔴 高  |

### 失败测试分析 (10 个单元测试 + 1 个集成测试)

#### 单元测试失败详情

| 测试文件           | 失败测试数 | 主要问题                  | 优先级 |
| ------------------ | ---------- | ------------------------- | ------ |
| `storage.test.ts`  | 1          | mockDB 返回`[]`而非`null` | P2     |
| `product.test.ts`  | 1          | Zod schema 验证失败       | P1     |
| `products.test.ts` | 8          | `fetch is not defined`    | P0     |

#### 集成测试失败详情

- **文件**: `integration/api/products.test.ts`
- **错误**: `ReferenceError: Request is not defined`
- **原因**: Next.js 服务端 API 类型未在 Jest 环境中 mock
- **优先级**: P0 (阻塞其他集成测试)

---

## 🎯 测试策略目标

### 短期目标 (1-2 周)

1. **修复所有失败测试** (P0)

   - 配置 fetch polyfill
   - Mock Next.js Request/Response
   - 修复 Zod schema 不匹配

2. **提升单元测试覆盖率至 50%** (P1)

   - 优先覆盖核心业务逻辑 (ProductService, OrderService, PaymentService)
   - 添加关键工具函数测试 (validation, utils, cache)

3. **建立集成测试基础** (P1)
   - 修复 Jest 环境配置
   - 覆盖 5 个核心 API 路由 (products, orders, members, payments, auth)

### 中期目标 (3-4 周)

1. **单元测试覆盖率达到 80%** (P1)

   - 覆盖所有 lib/services 下的业务服务
   - 覆盖所有 lib/validations 下的验证逻辑
   - 覆盖所有 lib/store 下的状态管理

2. **集成测试覆盖率达到 70%** (P2)

   - 覆盖所有 API 路由
   - 测试 API 错误处理和边界情况
   - 测试数据库交互和事务

3. **E2E 测试覆盖关键业务流程** (P2)
   - 商品管理完整流程 (增删改查)
   - 订单处理完整流程 (创建 → 支付 → 完成)
   - 会员管理完整流程 (注册 → 充值 → 消费)

### 长期目标 (5-8 周)

1. **测试自动化与持续集成** (P2)

   - 配置 GitHub Actions 自动运行测试
   - 设置代码覆盖率门禁 (≥80%)
   - 配置测试报告自动生成

2. **性能与安全测试全覆盖** (P1)

   - K6 性能测试覆盖所有 API
   - 安全扫描覆盖关键路径
   - 建立性能基线和监控

3. **测试文档与最佳实践** (P3)
   - 编写测试编写指南
   - 建立测试代码审查流程
   - 培训团队测试技能

---

## 🧪 测试分层架构

### 1. 单元测试 (Unit Tests)

**目标覆盖率**: 80%  
**测试框架**: Jest + Testing Library  
**覆盖范围**:

```typescript
lib/
├── services/               # 业务服务 (100%覆盖)
│   ├── products.ts         ✅ 已有测试 (需修复fetch问题)
│   ├── payment.ts          ✅ 已有测试
│   ├── notification.ts     ✅ 已有测试
│   ├── analytics.ts        ✅ 已有测试
│   ├── orders.ts           ❌ 缺失测试 (P1)
│   └── members.ts          ❌ 缺失测试 (P1)
├── validations/            # 数据验证 (100%覆盖)
│   ├── product.ts          ✅ 已有测试 (需修复schema)
│   ├── order.ts            ✅ 已有测试
│   ├── member.ts           ✅ 已有测试
│   └── payment.ts          ❌ 缺失测试 (P2)
├── store/                  # 状态管理 (100%覆盖)
│   ├── auth-store.ts       ✅ 已有测试
│   ├── product-store.ts    ❌ 缺失测试 (P2)
│   └── order-store.ts      ❌ 缺失测试 (P2)
├── cache/                  # 缓存工具 (100%覆盖)
│   └── redis.ts            ✅ 已有测试
├── monitoring/             # 监控工具 (100%覆盖)
│   ├── logger.ts           ✅ 已有测试
│   └── metrics.ts          ✅ 已有测试
├── ai/                     # AI功能 (80%覆盖)
│   ├── chatbot.ts          ✅ 已有测试
│   └── dynamic-pricing.ts  ✅ 已有测试
├── blockchain/             # 区块链 (80%覆盖)
│   └── loyalty-system.ts   ✅ 已有测试
├── iot/                    # 物联网 (80%覆盖)
│   └── smart-energy-management.ts ✅ 已有测试
├── bigdata/                # 大数据 (80%覆盖)
│   └── business-intelligence.ts ✅ 已有测试
├── security/               # 安全工具 (100%覆盖)
│   └── encryption.ts       ✅ 已有测试
└── utils.ts                # 工具函数 (100%覆盖)
                            ✅ 已有测试
```

**优先补充测试**:

1. **P1**: orders.ts, members.ts (核心业务)
2. **P2**: payment.ts validation, product/order stores
3. **P3**: 边缘计算、5G 应用等扩展模块

### 2. 集成测试 (Integration Tests)

**目标覆盖率**: 70%  
**测试框架**: Jest + MSW (Mock Service Worker)  
**覆盖范围**:

```typescript
app/api/
├── products/route.ts       ✅ 已有测试 (需修复Request问题)
├── orders/route.ts         ✅ 已有测试
├── members/route.ts        ✅ 已有测试
├── auth/route.ts           ❌ 缺失测试 (P0 - 安全关键)
├── payments/route.ts       ❌ 缺失测试 (P0 - 业务关键)
├── ai/                     ❌ 缺失测试 (P2)
├── blockchain/             ❌ 缺失测试 (P2)
├── edge/                   ❌ 缺失测试 (P3)
├── 5g/                     ❌ 缺失测试 (P3)
├── iot/                    ❌ 缺失测试 (P3)
└── bigdata/                ❌ 缺失测试 (P3)
```

**测试重点**:

- API 请求/响应格式验证
- 错误处理和状态码
- 数据验证和边界条件
- 数据库交互和事务
- 缓存机制测试

### 3. 端到端测试 (E2E Tests)

**目标覆盖率**: 40% (关键业务流程)  
**测试框架**: Playwright  
**覆盖范围**:

```typescript
e2e/
├── auth/                   # 认证流程 (P0)
│   ├── login.spec.ts       ❌ 缺失
│   ├── logout.spec.ts      ❌ 缺失
│   └── register.spec.ts    ❌ 缺失
├── products/               # 商品管理 (P1)
│   ├── list.spec.ts        ❌ 缺失
│   ├── create.spec.ts      ❌ 缺失
│   ├── edit.spec.ts        ❌ 缺失
│   └── delete.spec.ts      ❌ 缺失
├── orders/                 # 订单管理 (P0)
│   ├── create.spec.ts      ❌ 缺失
│   ├── payment.spec.ts     ❌ 缺失
│   └── complete.spec.ts    ❌ 缺失
├── members/                # 会员管理 (P1)
│   ├── register.spec.ts    ❌ 缺失
│   ├── recharge.spec.ts    ❌ 缺失
│   └── consume.spec.ts     ❌ 缺失
├── dashboard/              # 仪表板 (P2)
│   └── overview.spec.ts    ❌ 缺失
└── mobile/                 # 移动端 (P3)
    └── basic.spec.ts       ❌ 缺失
```

**测试场景**:

- 用户完整业务流程
- 跨页面交互测试
- 移动端响应式测试
- 浏览器兼容性测试

### 4. 性能测试 (Performance Tests)

**目标**: 关键路径全覆盖  
**测试框架**: K6  
**覆盖范围**:

```typescript
performance/
├── api/                    # API性能测试
│   ├── products-load.js    ❌ 缺失 (P1)
│   ├── orders-load.js      ❌ 缺失 (P1)
│   └── auth-load.js        ❌ 缺失 (P0)
├── database/               # 数据库性能
│   ├── query-perf.js       ❌ 缺失 (P2)
│   └── transaction-perf.js ❌ 缺失 (P2)
└── scenarios/              # 场景测试
    ├── spike-test.js       ❌ 缺失 (P1)
    ├── stress-test.js      ❌ 缺失 (P1)
    └── endurance-test.js   ❌ 缺失 (P2)
```

**性能指标**:

- API 响应时间 < 500ms (P95)
- 数据库查询 < 100ms (P95)
- 页面加载时间 < 3s (P95)
- 并发用户数 > 1000

### 5. 安全测试 (Security Tests)

**目标**: 100%关键路径覆盖  
**测试工具**: 自动化安全扫描 + 手动渗透测试  
**覆盖范围**:

```typescript
security/
├── authentication/         # 认证安全 (P0)
│   ├── jwt-validation.test.ts      ❌ 缺失
│   ├── session-management.test.ts  ❌ 缺失
│   └── brute-force.test.ts         ❌ 缺失
├── authorization/          # 授权安全 (P0)
│   ├── rbac.test.ts                ❌ 缺失
│   └── data-access.test.ts         ❌ 缺失
├── injection/              # 注入攻击 (P0)
│   ├── sql-injection.test.ts       ❌ 缺失
│   ├── xss.test.ts                 ❌ 缺失
│   └── command-injection.test.ts   ❌ 缺失
├── data-protection/        # 数据保护 (P1)
│   ├── encryption.test.ts          ✅ 已有测试
│   └── pii-masking.test.ts         ❌ 缺失
└── api-security/           # API安全 (P1)
    ├── rate-limiting.test.ts       ❌ 缺失
    ├── csrf.test.ts                ❌ 缺失
    └── cors.test.ts                ❌ 缺失
```

**安全检查清单**:

- ✅ 敏感信息不硬编码 (使用环境变量)
- ❌ SQL 注入防护 (需添加测试)
- ❌ XSS 防护 (需添加测试)
- ❌ CSRF 防护 (需添加测试)
- ❌ 输入验证 (需添加测试)
- ❌ 错误处理不泄露信息 (需添加测试)

---

## 🔧 测试环境配置

### Jest 配置优化

```typescript
// jest.config.ts (优化后)
const config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testEnvironment: 'jest-environment-jsdom',

  // 修复fetch未定义
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },

  // 提升覆盖率阈值
  coverageThreshold: {
    global: {
      branches: 80, // 从10%提升到80%
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // 排除不需要测试的文件
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/coverage/'],

  // 收集覆盖率
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
}
```

### Jest Setup 文件

```typescript
// jest.setup.ts (修复后)
import '@testing-library/jest-dom'
import 'whatwg-fetch' // 修复fetch未定义

// 修复Next.js API类型
global.Request = class Request {} as any
global.Response = class Response {} as any
global.Headers = class Headers {} as any

// Mock环境变量
process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.JWT_SECRET = 'test-secret'

// Mock console方法 (减少测试输出噪音)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
}
```

### Playwright 配置

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 2,

  use: {
    baseURL: 'http://localhost:5001',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 📅 实施时间表

### 第 1 周: 修复失败测试 + 建立基础

| 任务                          | 负责人   | 预计时间 | 优先级 |
| ----------------------------- | -------- | -------- | ------ |
| 配置 fetch polyfill           | Dev Team | 2h       | P0     |
| Mock Next.js Request/Response | Dev Team | 2h       | P0     |
| 修复 Zod schema 不匹配        | Dev Team | 1h       | P1     |
| 修复 mockDB 返回值问题        | Dev Team | 1h       | P2     |
| 编写测试环境配置文档          | QA Team  | 4h       | P1     |
| **总计**                      | -        | **10h**  | -      |

### 第 2-3 周: 提升单元测试覆盖率

| 任务                         | 负责人   | 预计时间 | 优先级 |
| ---------------------------- | -------- | -------- | ------ |
| 补充 orders/members 服务测试 | Dev Team | 8h       | P1     |
| 补充 payment validation 测试 | Dev Team | 4h       | P2     |
| 补充 store 状态管理测试      | Dev Team | 6h       | P2     |
| 运行覆盖率报告并分析         | QA Team  | 2h       | P1     |
| **总计**                     | -        | **20h**  | -      |

### 第 4 周: 建立集成测试

| 任务                       | 负责人   | 预计时间 | 优先级 |
| -------------------------- | -------- | -------- | ------ |
| 编写 auth API 集成测试     | Dev Team | 4h       | P0     |
| 编写 payments API 集成测试 | Dev Team | 4h       | P0     |
| 编写 AI/区块链 API 测试    | Dev Team | 6h       | P2     |
| 配置 MSW mock 服务器       | Dev Team | 3h       | P1     |
| **总计**                   | -        | **17h**  | -      |

### 第 5-6 周: 建立 E2E 测试

| 任务                  | 负责人  | 预计时间 | 优先级 |
| --------------------- | ------- | -------- | ------ |
| 编写认证流程 E2E 测试 | QA Team | 6h       | P0     |
| 编写订单流程 E2E 测试 | QA Team | 8h       | P0     |
| 编写商品管理 E2E 测试 | QA Team | 6h       | P1     |
| 编写会员流程 E2E 测试 | QA Team | 6h       | P1     |
| **总计**              | -       | **26h**  | -      |

### 第 7 周: 性能与安全测试

| 任务                 | 负责人        | 预计时间 | 优先级 |
| -------------------- | ------------- | -------- | ------ |
| 编写 K6 性能测试脚本 | DevOps        | 8h       | P1     |
| 配置安全扫描工具     | Security Team | 6h       | P0     |
| 执行性能基线测试     | DevOps        | 4h       | P1     |
| 执行安全扫描         | Security Team | 4h       | P0     |
| **总计**             | -             | **22h**  | -      |

### 第 8 周: 持续集成与文档

| 任务                   | 负责人  | 预计时间 | 优先级 |
| ---------------------- | ------- | -------- | ------ |
| 配置 GitHub Actions CI | DevOps  | 4h       | P1     |
| 设置覆盖率门禁         | DevOps  | 2h       | P1     |
| 编写测试编写指南       | QA Team | 6h       | P2     |
| 团队培训与分享         | QA Team | 4h       | P2     |
| **总计**               | -       | **16h**  | -      |

**总预计时间**: **111 小时** (约 14 个工作日,2 人团队)

---

## 📈 成功指标

### 量化指标

| 指标           | 当前值 | 目标值 | 达成标准 |
| -------------- | ------ | ------ | -------- |
| 单元测试覆盖率 | 10%    | 80%    | ≥80%     |
| 集成测试覆盖率 | 0%     | 70%    | ≥70%     |
| E2E 测试覆盖率 | 0%     | 40%    | ≥40%     |
| 测试通过率     | 88%    | 100%   | 100%     |
| Bug 发现率     | -      | -      | 提升 50% |
| 回归缺陷数     | -      | -      | 降低 80% |

### 质量指标

- **代码质量**: 所有提交必须通过测试和覆盖率检查
- **自动化率**: 90%的测试自动化执行
- **测试维护**: 测试代码与业务代码同步更新
- **文档完整**: 所有测试有清晰的注释和文档

---

## 🚀 持续改进

### 测试代码审查

- 所有测试代码必须经过 Code Review
- 测试用例需包含正向和负向场景
- Mock 和 Fixture 数据需规范化
- 测试命名清晰描述测试意图

### 测试维护策略

- 定期 review 并更新测试用例 (每月)
- 删除过时或冗余的测试
- 优化慢速测试 (目标: 单元测试<5s, 集成测试<30s)
- 监控测试稳定性 (flaky tests)

### 团队技能建设

- 每周测试技术分享 (1 小时)
- 季度测试最佳实践培训
- 建立测试知识库和 FAQ
- 鼓励团队贡献测试工具和框架

---

## 📚 参考资源

- [Jest 官方文档](https://jestjs.io/)
- [Playwright 官方文档](https://playwright.dev/)
- [K6 性能测试指南](https://k6.io/docs/)
- [Testing Library 最佳实践](https://testing-library.com/docs/)
- [Next.js 测试指南](https://nextjs.org/docs/testing)

---

**文档版本**: v1.0  
**最后更新**: 2025-01-19  
**维护者**: QA Team  
**审核者**: Tech Lead, Project Manager
