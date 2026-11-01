# YYC³ 文档中心

> **文档版本**: v4.5  
> **最后更新**: 2026-11-01  
> **维护者**: YYC³ DevOps Team  
> **规范**: 遵循 [YYC³-团队通用-标规文档/](./YYC3-团队通用-标规文档/) 与 [YYC³-团队通用-开发文档.md](./YYC³-团队通用-开发文档.md)
>
> **v4.5 变更**: 新增《11-PC模块命令映射评审与W2建表优先级》，评审 catalog.import / stock.document / bill.correct，给出手册 9/12/10 子模块映射、W2 建表批次与 MVP 4 组/8 张报表基线。  
> **v4.3 变更**: 新增《10-艺人设置配置规范》，按 7 张截图逐项定义 7 项/13 子项（是/否、开关、分钟、台费/台票/自定义）、App 生效规则、数据模型/API 与验收清单。  
> **v4.4 变更**: **数据方向修正**：Club-Ops App 是 B 端生产经营管理运维端，门店级数据由 App 创建/编辑并同步 CMS PC；CMS 管中央配置、汇总、报表、纠正命令。同步 `01`~`07` 全文 v1.1。  
> **v4.2 变更**: 新增《YYC3-Club-Ops_CMS协同规范》初版（数据方向已在 v4.4 修正）。  
> **v4.1 变更**: 账号解封预计 48h；新增艺人设置 7 项（非菜单入口）与 `pc-admin-supplements.json`；明确 App 管理编辑 / CMS 只读+报表+艺人设置；09 新增六条工作流并行开工计划。  
> **v4.0 变更**: 新增《09-推进落地方案与自建可行性》，汇总两次采集的 124 个缺失项，输出 14 项自建判定、Phase 0~3 任务与估算、报表 87 张分批及“不可自建”红线。  
> **v3.9 变更**: 新增《08-PC数据后台全量页面清单》与脱敏结构化数据 `attachments/pc-admin-pages.json`，覆盖在用系统 160/160 页面路由；记录 27 张报表列头待补与账号风控告警。  
> **v3.8 变更**: 新增《07-PC数据后台对标与缺口清单》，以在用「智慧商家桌面版」（160 个菜单项）与官方手册（7 章 42 节）为基线，输出模块覆盖矩阵、14 项缺口与三阶段落地路线。  
> **v3.7 变更**: 新增《06-三仓关系与混淆分析》，补齐 CMS / Futuristic-Dashboard / Club-Ops 的集群关系、混淆根因与收敛建议。  
> **v3.6 变更**: 导出操作人生产严格模式（`trust!=jwt` → HTTP 403，`ARTIST_EXPORT_REQUIRE_JWT` 可覆盖），客户端 401/403 不回退本地 CSV；新增路由级 5 例 + 客户端 4 例测试；全量单测 57 suites / 517 tests。  
> **v3.5 变更**: 4 张艺人报表页上线前端分页（20 条/页，`DataTable.pageSize` + `paginateRows`），Playwright 实测翻页与禁用态。

---

## 目录结构

```
docs/
├── README.md                           ← 本文件 (文档索引)
├── YYC3-团队通用-开发文档.md            ← 团队开发规范 (核心)
├── FEATURE_LIST.md                     ← 功能清单
├── MODULE_OVERVIEW.md                  ← 模块架构概览
├── DATABASE_INTEGRATION.md             ← 数据库集成说明
├── AUDIT_FLOW.md                       ← 审计流程
├── PROMOTION_FLOW.md                   ← 晋升流程
├── ADVANCED_EXTENSIONS.md              ← 高级扩展
├── ADVANCED_FEATURES.md                ← 高级特性
├── README.modules.md                   ← 模块文档索引
│
├── design/                             ← 可视化交互体系
│   └── YYC3-VISUAL-INTERACTION-SYSTEM.md ← 设计令牌/组件/动效/报表/多端
│
├── guides/                             ← 操作指南
│   ├── DEPLOYMENT_GUIDE.md             ← 部署指南
│   ├── SECURITY_GUIDE.md              ← 安全指南
│   ├── VERCEL_ENV_GUIDE.md            ← Vercel 环境配置
│   └── TROUBLESHOOTING.md             ← 故障排查
│
├── standards/                          ← 开发标准
│   ├── DOCUMENTATION_LIFECYCLE_STANDARD.md  ← 文档生命周期规范
│   ├── FILE_HEADER_TEMPLATES.md        ← 文件头模板
│   ├── ITERATION_BOARD_2W.md          ← 迭代看板
│   ├── KANBAN_WORKFLOW.md             ← 看板工作流
│   ├── RESPONSIBLE_ROLES.md           ← 角色职责
│   └── PROJECT_ARCHIVE_CHECKLIST.md   ← 归档检查清单
│
├── modules/                            ← 功能模块文档
│   ├── ai-ops/                        ← AI 智能运营 (13 文档)
│   ├── 5g/                            ← 5G 应用 (3 文档)
│   ├── bigdata/                       ← 大数据分析 (4 文档)
│   ├── blockchain/                    ← 区块链 (2 文档)
│   ├── iot/                           ← 物联网 (3 文档)
│   ├── edge/                          ← 边缘计算 (3 文档)
│   └── hr/                            ← 人力资源 (1 文档)
│
├── YYC3-团队通用-标规文档/             ← 团队五高五标五化五维 SSOT
│
├── YYC3-艺人管理-开发文档/              ← 艺人域开发文档与架构图
│
├── YYC3-Club-Ops_CMS协同规范/          ← Club-Ops ↔ CMS 协同规范（2026-11）
│   ├── 01-协同定义总规范.md
│   ├── 02-主数据同步契约-CMS到App.md
│   ├── 03-交易回传契约-App到CMS.md
│   ├── 04-数据字典与字段映射.md
│   ├── 05-对账异常与联调验收.md
│   ├── 06-变更管理与版本记录.md
│   └── 07-CMS实施排期与就绪门禁.md
│
├── yyc3-clube-system-trae-20261031/    ← 最新全维度审核（2026-10）
│   ├── 00-项目现状审核报告.md
│   ├── 01-任务规划与节点目标.md
│   ├── 02-执行日志与进度跟踪.md
│   ├── 03-总结文档与状态同步.md
│   ├── 04-测试验证方案与报告.md
│   ├── 05-艺人报表数据模型与接口建议.md
│   ├── 06-三仓关系与混淆分析.md
│   ├── 07-PC数据后台对标与缺口清单.md
│   ├── 08-PC数据后台全量页面清单.md
│   ├── 09-推进落地方案与自建可行性.md
│   ├── 10-艺人设置配置规范.md
│   └── 11-PC模块命令映射评审与W2建表优先级.md
│
├── yyc3-admin-audit-20260523/          ← 历史审计报告 (2026-05)
│
└── archived/                           ← 历史归档
    ├── phase-reports/                  ← 阶段报告
    ├── audit-reports/                  ← 审计报告
    ├── test-reports/                   ← 测试报告
    ├── cleanup-reports/               ← 清理报告
    └── implementation-confirmation/    ← 实施确认
```

## 快速导航

| 文档 | 说明 |
|------|------|
| [YYC3-团队通用-开发文档.md](./YYC3-团队通用-开发文档.md) | 团队开发核心规范 |
| [FEATURE_LIST.md](./FEATURE_LIST.md) | 完整功能清单 |
| [MODULE_OVERVIEW.md](./MODULE_OVERVIEW.md) | 模块架构概览 |
| [DATABASE_INTEGRATION.md](./DATABASE_INTEGRATION.md) | PostgreSQL 集成 |
| [design/YYC3-VISUAL-INTERACTION-SYSTEM.md](./design/YYC3-VISUAL-INTERACTION-SYSTEM.md) | 可视化交互体系设计 |
| [YYC3-团队通用-标规文档/](./YYC3-团队通用-标规文档/) | 团队标准 SSOT |
| [YYC3-艺人管理-开发文档/](./YYC3-艺人管理-开发文档/) | 艺人域开发文档 |
| [YYC3-Club-Ops_CMS协同规范/](./YYC3-Club-Ops_CMS协同规范/) | **Club-Ops↔CMS 协同规范总索引**（数据归属/同步/对账） |
| [01-协同定义总规范.md](./YYC3-Club-Ops_CMS协同规范/01-协同定义总规范.md) | 双向边界、App 写门店数据、CMS 中央配置、就绪门禁 |
| [02-主数据同步契约（双向）](./YYC3-Club-Ops_CMS协同规范/02-主数据同步契约-CMS到App.md) | 中央配置 CMS→App、运营数据 App→CMS、纠正命令 |
| [07-CMS实施排期与就绪门禁.md](./YYC3-Club-Ops_CMS协同规范/07-CMS实施排期与就绪门禁.md) | 中央配置、运营投影、纠正命令、事件日志、对账的 10 周排期 |
| [08-PC功能基线与同步映射.md](./YYC3-Club-Ops_CMS协同规范/08-PC功能基线与同步映射.md) | 官方桌面版手册 7 大模块/42+ 子模块 → 数据域/owner/事件/命令 |
| [guides/DEPLOYMENT_GUIDE.md](./guides/DEPLOYMENT_GUIDE.md) | 部署指南 |
| [guides/SECURITY_GUIDE.md](./guides/SECURITY_GUIDE.md) | 安全指南 |
| [05-艺人报表数据模型与接口建议.md](./yyc3-clube-system-trae-20261031/05-艺人报表数据模型与接口建议.md) | 艺人报表数据模型、API 契约与验收 |
| [06-三仓关系与混淆分析.md](./yyc3-clube-system-trae-20261031/06-三仓关系与混淆分析.md) | CMS / FD / OPS 三仓关系、混淆根因与收敛方案 |
| [07-PC数据后台对标与缺口清单.md](./yyc3-clube-system-trae-20261031/07-PC数据后台对标与缺口清单.md) | 在用系统 160 项菜单对标、缺口清单与三阶段路线 |
| [08-PC数据后台全量页面清单.md](./yyc3-clube-system-trae-20261031/08-PC数据后台全量页面清单.md) | 160/160 页面路由、筛选、列头与按钮结构 |
| [09-推进落地方案与自建可行性.md](./yyc3-clube-system-trae-20261031/09-推进落地方案与自建可行性.md) | 124 项缺失、自建判定、Phase 0~3 与报表分批 |
| [10-艺人设置配置规范.md](./yyc3-clube-system-trae-20261031/10-艺人设置配置规范.md) | 艺人设置 7 项/13 子项、App 生效规则、数据模型与验收 |
| [11-PC模块命令映射评审与W2建表优先级.md](./yyc3-clube-system-trae-20261031/11-PC模块命令映射评审与W2建表优先级.md) | 命令映射评审、手册 9/12/10 映射、W2 建表批次、MVP 8 张报表 |
| [yyc3-clube-system-trae-20261031/](./yyc3-clube-system-trae-20261031/) | 最新全维度审核与交接 |
