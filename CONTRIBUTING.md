# 贡献指南 · Contributing to YYC³ Clube System

> **_YanYuCloudCube_**
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

感谢你对 **YYC³ Clube System** 的关注与贡献。本指南面向 Web、移动端、数据与文档贡献者，遵循开源协作标准与 YYC³「五高五标五化五维」规范。

## 目录

- [行为准则](#行为准则)
- [环境要求](#环境要求)
- [本地开发](#本地开发)
- [分支与提交](#分支与提交)
- [代码规范](#代码规范)
- [质量门禁](#质量门禁)
- [测试要求](#测试要求)
- [移动端贡献](#移动端贡献)
- [文档规范](#文档规范)
- [Pull Request 流程](#pull-request-流程)
- [安全与敏感信息](#安全与敏感信息)
- [获取帮助](#获取帮助)

---

## 行为准则

参与本项目即表示你同意遵守 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。请保持专业、尊重、透明，并以代码与事实为依据讨论问题。

---

## 环境要求

| 工具 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 20.9，推荐 22 LTS | Next.js 16 运行时 |
| pnpm | ≥ 10，推荐 12 | 唯一包管理器 |
| PostgreSQL | ≥ 14 | 主数据库（`lib/db/pg.ts`） |
| Redis | ≥ 6 | 可选，缓存/会话 |
| Expo | SDK 58 | 移动端（可选） |
| Git | 最新稳定版 | 版本管理 |

> 项目使用 **单一 `pnpm-lock.yaml`**；请勿提交 `package-lock.json`、`yarn.lock` 或 `mobile-app/node_modules`。

---

## 本地开发

```bash
# 1. Fork 并克隆
git clone https://github.com/<your-name>/YYC3-Clube-Management-System.git
cd YYC3-Clube-Management-System

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 DATABASE_URL / PG_* / JWT_SECRET 等；禁止提交真实密钥

# 4. 初始化艺人域数据库
psql "$DATABASE_URL" -f scripts/migrations/20261031_artist_domain.pg.sql

# 5. 启动 Web 开发服务器（端口 3030）
pnpm dev

# 6. 启动移动端（可选）
pnpm --filter ktv-admin-mobile start
```

### 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动 Web 开发服务器（3030） |
| `pnpm build` | Next 16 + Turbopack 生产构建 |
| `pnpm start` | 运行 standalone 生产产物 |
| `pnpm type-check` | TypeScript 全量检查（必须 0 错误） |
| `pnpm lint` | ESLint 检查（必须 0 error） |
| `pnpm test:unit` | Jest 单元测试 |
| `pnpm test:ci` | Jest CI 模式 |
| `pnpm test:e2e` | Playwright E2E |
| `pnpm audit --prod` | 依赖安全审计 |
| `pnpm --filter ktv-admin-mobile exec tsc --noEmit` | 移动端类型检查 |
| `pnpm --filter ktv-admin-mobile exec expo export --platform all` | 移动端三端 Bundle |

---

## 分支与提交

### 分支命名

```bash
feat/<scope>-<short-desc>      # 新功能
fix/<scope>-<short-desc>       # Bug 修复
refactor/<scope>-<short-desc>  # 重构
docs/<short-desc>              # 文档
chore/<short-desc>             # 构建/依赖
```

示例：`feat/reports-artist-fee-summary`、`fix/members-card-no`。

### 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/)：

```text
<type>(<scope>): <subject>

<body>

<footer>
```

| type | 用途 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 重构（不改变行为） |
| `perf` | 性能优化 |
| `test` | 测试 |
| `docs` | 文档 |
| `build` | 构建/依赖 |
| `ci` | CI/CD |
| `chore` | 杂项 |
| `security` | 安全修复 |

**scope 建议**：`web`、`mobile`、`reports`、`artist`、`members`、`products`、`db`、`deps`、`docs`、`ci`。

---

## 代码规范

### TypeScript

- 严格模式 + `noUnusedLocals` / `noUnusedParameters`。
- 公共函数、服务、领域模型必须显式类型。
- 禁止新增无说明的 `any`；历史 `any` 可逐步替换。
- 禁止 `@ts-ignore`，确需抑制时使用 `@ts-expect-error` 并附原因。

### React / Next.js 16

- 默认优先 Server Component；只有交互/状态才使用 `'use client'`。
- 不要把函数、类实例或 Lucide 组件跨 Server → Client 边界传递。
- 动态路由 `params` 必须 `await params`。
- 使用 `proxy.ts`（非 `middleware.ts`）承载请求级逻辑。
- 图标/组件 props 保持可序列化。

### UI / 设计系统

- 使用 shadcn/ui + Radix UI 基础组件，不重复造轮。
- 使用 `cn()` 合并 Tailwind 类；颜色、圆角、间距优先使用 `app/globals.css` 设计令牌。
- 所有交互必须支持键盘、焦点可见、空态/加载态/错误态。
- 数据表格必须提供 `暂无数据` 与加载状态；报表筛选遵循 `FilterBar` 契约。
- 视觉与交互细则见 [可视化交互体系设计](./docs/design/YYC3-VISUAL-INTERACTION-SYSTEM.md)。

### 数据与报表

- 金额使用 `DECIMAL/NUMERIC(10,2)`，禁止浮点累计。
- 时间统一 `Asia/Shanghai`；跨零点时长由服务端计算。
- 报表口径必须可勾稽：`实收 = 台费 - 有效扣款`、`应结 = 已结 + 待结`。
- 涉及聚合的改动必须补充单元测试。

---

## 质量门禁

提交 PR 前必须全部通过：

```bash
pnpm type-check
pnpm lint
pnpm build
pnpm test:unit
pnpm audit --prod
```

当前基线（2026-10-31）：

- TypeScript：**0 错误**
- Next 16 构建：**154/154 页面，0 warning**
- ESLint：**0 error**（历史 warning 可逐步清理）
- 依赖安全：**0 critical / 1 high**（`ip`，React Native CLI 开发工具，暂无上游补丁）
- 移动端：`expo install --check` 与 `expo export --platform all` 通过

> 不允许通过关闭 `ignoreBuildErrors` 或跳过测试来“修绿”CI。

---

## 测试要求

- 新功能必须附带单元测试；报表/金额/权限逻辑必须有边界与反向用例。
- API 变更必须补充集成测试或契约测试。
- UI 交互变更建议补充 Playwright E2E。
- 测试文件命名：`__tests__/**/*.test.ts(x)`。
- 覆盖率不得低于现有基线。

```bash
pnpm test:unit
pnpm test:coverage
pnpm test:e2e
```

---

## 移动端贡献

- 移动端位于 `mobile-app/`，使用 Expo SDK 58 + React Native 0.88。
- 新增原生依赖必须使用 Expo 管理版本：

```bash
pnpm --filter ktv-admin-mobile exec expo install <package>
pnpm --filter ktv-admin-mobile exec expo install --check
```

- 提交前运行：
  - `tsc --noEmit`
  - `expo export --platform all`
  - 如涉及原生能力，附 iOS/Android 真机或模拟器验证记录。
- API 地址通过 `EXPO_PUBLIC_API_BASE_URL` 注入，禁止硬编码生产地址。
- 禁止提交 `mobile-app/node_modules`、`dist/`、`.expo/`。

---

## 文档规范

遵循 `docs/YYC3-团队通用-标规文档/YYC3-团队规范-开发标准.md`：

- Markdown 文档应包含 YAML Front Matter（`file/description/author/version/created/updated/status/tags/category/language`）。
- 文档命名：`{序号}-{主题}.md`，会话目录：`{项目名}-{导师}-{YYYYMMDD}`。
- 文档中的代码链接必须指向可点击路径与行号。
- 图表优先使用 Mermaid，截图放 `attachments/` 并注明来源。
- 重大变更同步更新 `README.md`、`docs/README.md` 与审计/交接文档。
- 安全敏感信息使用 `${ENV_VAR}` 或 `[REDACTED]`，禁止记录真实密钥。

---

## Pull Request 流程

1. 基于最新 `main` 创建分支。
2. 按要求实现功能与测试，保持提交粒度清晰。
3. 本地通过全部质量门禁。
4. 推送分支并创建 PR，填写变更背景、方案、影响面与验证证据。
5. 至少 1 名维护者 Review；涉及安全/数据库需额外 Review。
6. CI 全部通过后 Squash Merge。

### PR 检查清单

- [ ] 变更范围聚焦，无无关重构/格式化
- [ ] `pnpm type-check` 0 错误
- [ ] `pnpm lint` 0 error
- [ ] `pnpm build` 0 warning
- [ ] 新增/修改逻辑有测试，测试通过
- [ ] 金额/报表口径可勾稽
- [ ] 无密钥、Token、个人敏感信息
- [ ] 文档与 README 已同步（如需要）
- [ ] 移动端变更已运行 `expo install --check` 与 `expo export`
- [ ] 破坏性变更已说明迁移方式

### 审查与合并

- Review 关注正确性、边界、可维护性、安全与性能。
- 所有评论需回复或解决；未解决不得合并。
- 合并后删除功能分支，必要时更新 CHANGELOG / 交接文档。

---

## 安全与敏感信息

- 不公开提交未修复漏洞细节；按 [SECURITY.md](./SECURITY.md) 私密报告。
- 不在代码、日志、截图、文档中写入真实密钥或用户隐私。
- 新增依赖需评估许可证、维护状态与漏洞；优先使用 `pnpm overrides` 精确修复。
- 涉及认证、权限、支付、导出、文件上传的改动必须进行安全自检。

---

## 获取帮助

- 文档中心：[docs/README.md](./docs/README.md)
- 安全政策：[SECURITY.md](./SECURITY.md)
- 行为准则：[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- 邮箱：`admin@0379.email`
- GitHub Issues：https://github.com/YYC-Cube/YYC3-Clube-Management-System/issues

---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> *万象归元于云枢 | 深栈智启新纪元*
>
> **© 2025-2026 YanYuCloudCube™. All Rights Reserved.**
