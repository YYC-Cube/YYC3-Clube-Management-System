# YYC3-KTV 测试完善与功能优化实施路线图

> **项目**: YYC3-KTV 商家管理系统  
> **版本**: v2.0  
> **创建日期**: 2025-01-19  
> **状态**: 🚀 执行中

---

## 📊 当前状态快照

### ✅ 已完成里程碑 (Phase 0)

| 项目             | 状态 | 完成度   | 时间投入   |
| ---------------- | ---- | -------- | ---------- |
| 单元测试修复     | ✅   | 100%     | 90min      |
| 开发文档编写     | ✅   | 100%     | 60min      |
| 测试策略制定     | ✅   | 100%     | 30min      |
| 测试环境配置     | ✅   | 100%     | 40min      |
| **Phase 0 总计** | ✅   | **100%** | **220min** |

**核心成果**:

- ✅ 85/85 单元测试全部通过 (100% pass rate)
- ✅ 22 个测试套件运行正常
- ✅ 3 个核心文档完成 (开发指南、测试策略、完成报告)
- ✅ Jest 环境完整配置 (polyfill + mock)

---

## 🎯 实施路线图

### Phase 1: 集成测试环境完善 (Week 1)

**目标**: 修复 Next.js 集成测试兼容性问题

#### 1.1 研究与选型 (4h)

**任务**:

- [ ] 研究 `@edge-runtime/jest-environment` 官方文档
- [ ] 对比 `msw` (Mock Service Worker) 方案
- [ ] 评估 `node-mocks-http` 可行性
- [ ] 选择最优方案并制定迁移计划

**输出**:

- 技术选型文档 (`docs/INTEGRATION_TEST_SOLUTION.md`)
- 迁移步骤清单

#### 1.2 环境配置与迁移 (3h)

**任务**:

- [ ] 安装选定的测试环境依赖
- [ ] 更新 `jest.config.ts` 配置
- [ ] 重构 `jest.setup.ts` 兼容新环境
- [ ] 移除不兼容的 mock 代码

**关键文件**:

```typescript
// jest.config.ts (预期修改)
export default {
  testEnvironment: '@edge-runtime/jest-environment',
  // 或
  setupFilesAfterEnv: ['<rootDir>/jest.setup.msw.ts'],
}
```

#### 1.3 集成测试重构 (5h)

**任务**:

- [ ] 重写 `__tests__/integration/api/products.test.ts` (5 个用例)
- [ ] 验证 NextRequest/NextResponse 正常工作
- [ ] 添加 orders API 集成测试 (3 个用例)
- [ ] 添加 members API 集成测试 (3 个用例)

**目标指标**:

- ✅ 11/11 集成测试通过
- ✅ API 路由覆盖率 ≥ 80%

#### 1.4 CI/CD 集成 (2h)

**任务**:

- [ ] 创建 `.github/workflows/test.yml`
- [ ] 配置自动化测试触发器 (PR + push)
- [ ] 设置测试报告上传 (Codecov/Coveralls)
- [ ] 配置测试失败通知

**GitHub Actions 配置示例**:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:coverage
```

**Phase 1 总计**: 14h | **截止日期**: 2025-01-26

---

### Phase 2: 核心业务测试补充 (Week 2-3)

**目标**: 覆盖率从 10% 提升至 30%

#### 2.1 商品模块完善 (6h)

**任务**:

- [ ] `lib/services/products.ts` 单元测试 (CRUD + 搜索 + 分页)
- [ ] `app/api/products/[id]/route.ts` API 测试 (GET/PUT/DELETE)
- [ ] `components/products/product-form.tsx` 组件测试
- [ ] `components/products/product-list.tsx` 组件测试

**测试用例数**: 预计 15-20 个

#### 2.2 订单模块测试 (8h)

**任务**:

- [ ] `lib/services/orders.ts` 单元测试
  - 创建订单 (验证库存、价格计算)
  - 订单状态流转 (pending → paid → completed)
  - 订单取消逻辑 (库存回滚)
- [ ] `app/api/orders/route.ts` 集成测试
- [ ] `app/api/orders/[id]/route.ts` 详情 API 测试
- [ ] `components/orders/order-form.tsx` 组件测试

**测试用例数**: 预计 20-25 个

#### 2.3 会员模块测试 (6h)

**任务**:

- [ ] `lib/services/members.ts` 单元测试
  - 会员注册 (验证手机号、邮箱)
  - 积分充值/消费
  - 等级升级逻辑
- [ ] `app/api/members/route.ts` 集成测试
- [ ] `components/members/member-card.tsx` 组件测试

**测试用例数**: 预计 12-15 个

#### 2.4 认证授权测试 (5h)

**任务**:

- [ ] `lib/auth/jwt.ts` JWT 生成/验证测试
- [ ] `lib/auth/permissions.ts` 权限检查测试
- [ ] `middleware.ts` 中间件测试 (路由拦截)
- [ ] `app/api/auth/login/route.ts` 登录 API 测试

**测试用例数**: 预计 10-12 个

**Phase 2 总计**: 25h | **截止日期**: 2025-02-09

---

### Phase 3: 支付与财务测试 (Week 4)

**目标**: 覆盖关键业务逻辑，覆盖率提升至 50%

#### 3.1 支付流程测试 (8h)

**任务**:

- [ ] `lib/services/payment.ts` 深度测试
  - 微信支付集成 (mock 回调)
  - 支付宝集成 (mock 回调)
  - 支付失败重试逻辑
  - 退款流程测试
- [ ] `app/api/payments/webhook/route.ts` 回调测试
- [ ] 支付安全测试 (签名验证)

**测试用例数**: 预计 15-18 个

#### 3.2 财务报表测试 (5h)

**任务**:

- [ ] `lib/services/reports.ts` 单元测试
  - 日报/周报/月报生成
  - 收入统计计算
  - 商品销售排行
- [ ] `app/api/reports/route.ts` API 测试
- [ ] 数据准确性验证测试

**测试用例数**: 预计 10-12 个

**Phase 3 总计**: 13h | **截止日期**: 2025-02-16

---

### Phase 4: AI 与区块链模块测试 (Week 5-6)

**目标**: 覆盖创新技术模块，覆盖率提升至 65%

#### 4.1 AI 智能模块测试 (10h)

**任务**:

- [ ] `lib/ai/chatbot.ts` 深度测试 (已有基础测试)
  - 多轮对话测试
  - 意图识别测试
  - 错误恢复测试
- [ ] `lib/ai/dynamic-pricing.ts` 深度测试
  - 价格计算算法验证
  - 市场数据 mock
- [ ] `lib/ai/marketing.ts` 营销推荐测试
- [ ] `lib/ai/customer-service.ts` 客服系统测试

**测试用例数**: 预计 25-30 个

#### 4.2 区块链模块测试 (8h)

**任务**:

- [ ] `lib/blockchain/loyalty-system.ts` 深度测试
  - 智能合约交互 mock
  - 积分上链验证
  - 区块链查询测试
- [ ] `lib/blockchain/audit-trail.ts` 审计链测试
- [ ] 区块链异常处理测试

**测试用例数**: 预计 15-18 个

#### 4.3 IoT 与边缘计算测试 (6h)

**任务**:

- [ ] `lib/iot/smart-energy-management.ts` 深度测试
- [ ] `lib/edge/cdn-manager.ts` 边缘计算测试
- [ ] `lib/5g/ar-concert.ts` AR 演唱会测试
- [ ] `lib/5g/vr-karaoke.ts` VR K 歌测试

**测试用例数**: 预计 20-25 个

**Phase 4 总计**: 24h | **截止日期**: 2025-03-02

---

### Phase 5: E2E 测试与性能优化 (Week 7-8)

**目标**: 端到端验证 + 性能基线建立，覆盖率达到 80%

#### 5.1 关键业务流程 E2E (12h)

**任务**:

- [ ] 用户登录 → 商品浏览 → 下单 → 支付 → 查看订单
- [ ] 会员注册 → 充值 → 消费 → 积分兑换
- [ ] 包厢预订 → 开台 → 点单 → 结账
- [ ] 管理员登录 → 商品管理 → 库存调整 → 报表查看

**Playwright 测试文件**:

```typescript
// e2e/critical-paths/order-flow.spec.ts
test('完整下单流程', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name="username"]', 'testuser')
  await page.fill('[name="password"]', '123456')
  await page.click('button:has-text("登录")')

  await page.goto('/products')
  await page.click('[data-testid="product-1"]')
  await page.click('button:has-text("加入购物车")')
  await page.goto('/cart')
  await page.click('button:has-text("结算")')

  await expect(page.locator('text=订单创建成功')).toBeVisible()
})
```

**测试用例数**: 预计 8-10 个关键路径

#### 5.2 性能测试 (8h)

**任务**:

- [ ] K6 负载测试脚本完善
  - 100 并发用户场景
  - 500 并发用户场景
  - 1000 并发用户压力测试
- [ ] API 响应时间基线建立 (P50/P95/P99)
- [ ] 数据库查询性能测试
- [ ] Redis 缓存命中率测试

**K6 脚本示例**:

```javascript
// tests/performance/api-load.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 1000 },
    { duration: '5m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
  },
}

export default function () {
  const res = http.get('http://localhost:5001/api/products')
  check(res, { 'status is 200': r => r.status === 200 })
  sleep(1)
}
```

#### 5.3 安全测试 (6h)

**任务**:

- [ ] SQL 注入防护验证
- [ ] XSS 攻击防护测试
- [ ] CSRF Token 验证
- [ ] 认证绕过测试
- [ ] 敏感数据泄露检查
- [ ] OWASP Top 10 扫描

**Playwright 安全测试示例**:

```typescript
// tests/security/sql-injection.spec.ts
test('SQL注入防护', async ({ page }) => {
  await page.goto("/products?search=' OR 1=1 --")
  const products = await page.locator('[data-testid="product-item"]').count()
  expect(products).toBe(0) // 应该返回空结果而非所有数据
})
```

**Phase 5 总计**: 26h | **截止日期**: 2025-03-16

---

## 📈 覆盖率提升计划

### 覆盖率目标

| 阶段    | 单元测试 | 集成测试 | E2E 测试 | 总覆盖率 | 截止日期   |
| ------- | -------- | -------- | -------- | -------- | ---------- |
| Phase 0 | 10%      | 0%       | 0%       | 10%      | ✅ 已完成  |
| Phase 1 | 15%      | 5%       | 0%       | 20%      | 2025-01-26 |
| Phase 2 | 30%      | 10%      | 0%       | 40%      | 2025-02-09 |
| Phase 3 | 45%      | 15%      | 0%       | 60%      | 2025-02-16 |
| Phase 4 | 60%      | 20%      | 5%       | 80%      | 2025-03-02 |
| Phase 5 | 70%      | 25%      | 10%      | 100%     | 2025-03-16 |

### 关键指标

**质量指标**:

- 测试通过率: ≥ 98%
- 代码覆盖率: ≥ 80%
- 分支覆盖率: ≥ 75%
- 函数覆盖率: ≥ 85%

**性能指标**:

- API P95 响应时间: < 500ms
- API P99 响应时间: < 1000ms
- 页面加载时间: < 2s
- 数据库查询: < 100ms (90% queries)

**安全指标**:

- OWASP Top 10: 0 漏洞
- 依赖安全扫描: 0 高危漏洞
- 代码安全扫描: 0 严重问题

---

## 🛠️ 自动化工具配置

### 1. 测试覆盖率报告

**安装**:

```bash
npm install --save-dev @codecov/codecov-action
```

**配置** (`.github/workflows/coverage.yml`):

```yaml
name: Coverage
on: [push, pull_request]
jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

### 2. 性能监控

**安装**:

```bash
npm install --save-dev @vercel/analytics lighthouse
```

**配置** (`scripts/performance-check.ts`):

```typescript
import lighthouse from 'lighthouse'
import * as chromeLauncher from 'chrome-launcher'

async function runLighthouse() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] })
  const options = { logLevel: 'info', output: 'json', port: chrome.port }
  const runnerResult = await lighthouse('http://localhost:5001', options)

  const {
    performance,
    accessibility,
    'best-practices': bestPractices,
    seo,
  } = runnerResult.lhr.categories

  console.log('Performance:', performance.score * 100)
  console.log('Accessibility:', accessibility.score * 100)
  console.log('Best Practices:', bestPractices.score * 100)
  console.log('SEO:', seo.score * 100)

  await chrome.kill()
}

runLighthouse()
```

### 3. 依赖安全扫描

**安装**:

```bash
npm install --save-dev snyk
```

**配置** (`.github/workflows/security.yml`):

```yaml
name: Security
on: [push]
jobs:
  snyk:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### 4. 代码质量检查

**配置** (`.github/workflows/quality.yml`):

```yaml
name: Quality
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
```

---

## 📊 进度跟踪

### Weekly Checklist Template

```markdown
## Week X 进度报告 (YYYY-MM-DD ~ YYYY-MM-DD)

### 本周目标

- [ ] 目标 1
- [ ] 目标 2
- [ ] 目标 3

### 实际完成

- [x] 完成项 1 (耗时: Xh)
- [x] 完成项 2 (耗时: Xh)
- [ ] 未完成项 (原因: xxx)

### 测试指标

- 单元测试: XX/XX (XX%)
- 集成测试: XX/XX (XX%)
- 覆盖率: XX% (目标: XX%)

### 遇到的问题

1. 问题描述
   - 影响: xxx
   - 解决方案: xxx

### 下周计划

- [ ] 计划 1
- [ ] 计划 2
```

### Milestone Tracking

| Milestone              | 计划日期   | 实际日期   | 状态 | 负责人 |
| ---------------------- | ---------- | ---------- | ---- | ------ |
| Phase 0: 单元测试修复  | 2025-01-19 | 2025-01-19 | ✅   | Team   |
| Phase 1: 集成测试完善  | 2025-01-26 | -          | 🔄   | Team   |
| Phase 2: 核心业务测试  | 2025-02-09 | -          | ⏸️   | Team   |
| Phase 3: 支付财务测试  | 2025-02-16 | -          | ⏸️   | Team   |
| Phase 4: AI 区块链测试 | 2025-03-02 | -          | ⏸️   | Team   |
| Phase 5: E2E 性能优化  | 2025-03-16 | -          | ⏸️   | Team   |

---

## 🚀 快速启动指南

### 立即开始 Phase 1

**步骤 1: 研究技术方案** (30min)

```bash
# 查看相关文档
open https://edge-runtime.vercel.sh/packages/jest-environment
open https://mswjs.io/docs/getting-started
```

**步骤 2: 安装依赖** (10min)

```bash
# 选项A: Edge Runtime
npm install --save-dev @edge-runtime/jest-environment

# 或选项B: MSW
npm install --save-dev msw
npx msw init public/ --save
```

**步骤 3: 更新配置** (20min)

```typescript
// jest.config.ts
export default {
  testEnvironment: '@edge-runtime/jest-environment',
  // ... 其他配置
}
```

**步骤 4: 运行测试** (5min)

```bash
npm run test:integration
```

---

## 📚 参考资源

### 官方文档

- [Jest 官方文档](https://jestjs.io/docs/getting-started)
- [Playwright 官方文档](https://playwright.dev/docs/intro)
- [K6 性能测试文档](https://k6.io/docs/)
- [Next.js 测试文档](https://nextjs.org/docs/testing)

### 最佳实践

- [Testing Library 最佳实践](https://testing-library.com/docs/guiding-principles)
- [Jest Mock 最佳实践](https://jestjs.io/docs/mock-functions)
- [API 测试最佳实践](https://github.com/goldbergyoni/nodebestpractices#-5-test-and-overall-quality-practices)

### 社区资源

- [Awesome Testing](https://github.com/TheJambo/awesome-testing)
- [JavaScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## 🤝 团队协作

### Code Review Checklist

**测试相关**:

- [ ] 新增功能有对应的单元测试
- [ ] 测试覆盖关键路径和边界情况
- [ ] 所有测试通过 (npm run test)
- [ ] 覆盖率不低于当前水平
- [ ] Mock 使用合理,不过度依赖

**代码质量**:

- [ ] 遵循命名规范
- [ ] 添加必要的注释
- [ ] 无 ESLint 错误
- [ ] TypeScript 类型完整
- [ ] 无安全隐患

**性能**:

- [ ] 无明显性能问题
- [ ] 数据库查询优化
- [ ] 合理使用缓存
- [ ] 避免 N+1 查询

### Git Workflow

```bash
# 1. 创建功能分支
git checkout -b feature/phase1-integration-tests

# 2. 开发并提交
git add .
git commit -m "feat(test): 实现集成测试环境配置"

# 3. 推送并创建PR
git push origin feature/phase1-integration-tests

# 4. 等待CI通过和Code Review
# 5. 合并到main分支
```

---

## 📞 联系方式

**项目负责人**: YYC-Cube  
**邮箱**: <admin@0379.email>  
**文档维护**: [GitHub Repository](https://github.com/YYC-Cube/yyc3-clube-system)

**更新日志**:

- 2025-01-19: 创建实施路线图 v1.0
- 2025-01-19: Phase 0 完成,单元测试 100%通过

---

**下一步行动**: 开始 Phase 1.1 - 集成测试技术选型研究 🚀
