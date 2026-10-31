# YYC³ Clube Mobile · 移动端

> **_YanYuCloudCube_**
> _言启象限 | 语枢未来_
> **_Words Initiate Quadrants, Language Serves as Core for Future_**
> _万象归元于云枢 | 深栈智启新纪元_
> **_All things converge in cloud pivot; Deep stacks ignite a new era of intelligence_**

YYC³ Clube System 的 Expo 移动端，覆盖登录、经营仪表盘与订单列表，复用 Web 端 Route Handlers。

## 技术栈

| 技术 | 版本 |
| --- | --- |
| Expo SDK | 58 |
| React Native | 0.88.1 |
| React | 19.3.0 |
| TypeScript | 6.0 |
| React Navigation | 7 |
| New Architecture | 启用 |
| 目标平台 | iOS / Android / Web |

## 目录结构

```text
mobile-app/
├── index.js                 # registerRootComponent 入口
├── app.json                 # Expo 配置
├── tsconfig.json            # Expo + strict + @/* 路径
├── src/
│   ├── App.tsx              # Navigation 栈
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   └── OrdersScreen.tsx
│   └── services/api.ts      # API 基址与请求封装
└── README.md
```

## 环境变量

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | `http://localhost:3030` | Web API 地址 |

> 真机调试时请把 `localhost` 替换为局域网 IP，并确保 Web 服务监听可访问地址。

## 常用命令

```bash
# 安装（在仓库根目录）
pnpm install

# 启动 Expo Dev Server
pnpm --filter ktv-admin-mobile start

# 平台启动
pnpm --filter ktv-admin-mobile android
pnpm --filter ktv-admin-mobile ios
pnpm --filter ktv-admin-mobile web

# 依赖兼容性检查
pnpm --filter ktv-admin-mobile exec expo install --check

# 类型检查
pnpm --filter ktv-admin-mobile exec tsc --noEmit

# 三端 JS Bundle 导出
pnpm --filter ktv-admin-mobile exec expo export --platform all
```

## 构建回归（2026-10-31）

| 验证项 | 结果 |
| --- | --- |
| `expo install --check` | ✅ Dependencies are up to date |
| `tsc --noEmit` | ✅ 0 错误 |
| Web Bundle | ✅ `expo export --platform web` |
| Android Bundle | ✅ `expo export --platform android` |
| iOS Bundle | ✅ `expo export --platform ios` |
| 三端合并导出 | ✅ `expo export --platform all` |

> 原生 IPA/APK 构建需要 Xcode / Android SDK；本仓库验证的是三端 JS Bundle、类型与依赖兼容性。

## 已知事项

- 当前 Token 仅在 Web 端使用 `localStorage`；原生端尚未接入安全存储，建议后续使用 `expo-secure-store` 或 AsyncStorage。
- `pnpm audit` 仍有 1 个 high：`ip`（React Native CLI 开发工具，上游暂无补丁），不进入 Web 生产产物。
- `mobile-app/node_modules` 已从 Git 跟踪中移除，请勿重新提交。
- 新增原生依赖请使用 `expo install`，不要手动指定版本。

## 相关文档

- Web 端说明：[../README.md](../README.md)
- 视觉交互体系：[../docs/design/YYC3-VISUAL-INTERACTION-SYSTEM.md](../docs/design/YYC3-VISUAL-INTERACTION-SYSTEM.md)
- 贡献指南：[../CONTRIBUTING.md](../CONTRIBUTING.md)
- 安全策略：[../SECURITY.md](../SECURITY.md)

---

> **© 2025-2026 YanYuCloudCube™. All Rights Reserved.**
