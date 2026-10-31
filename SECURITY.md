# Security Policy

## Supported Versions

The following versions of YYC³ Clube System are currently supported with security updates:

| Version / Stack | Supported | Notes |
| --- | --- | --- |
| `0.1.x`（main） | ✅ | Next.js 16.4.3 / React 19.3.1 / Node 22 |
| `< 0.1` | ❌ | 历史版本不再维护 |
| Mobile（Expo 58 / RN 0.88） | ✅ | 三端 JS Bundle 已验证 |
| PostgreSQL 14+ | ✅ | `lib/db/pg.ts` |

## Security Baseline（2026-10）

| 控制项 | 当前状态 |
| --- | --- |
| 密钥管理 | 仅 `.env.local` / 环境变量；`.env*` 已加入 `.gitignore`；禁止硬编码 |
| 输入校验 | Zod 4 Schema（会员、商品、表单）；API 侧持续补齐 |
| 请求入口 | `proxy.ts` 预留鉴权/限流入口；当前为透传，生产部署必须启用认证与限流 |
| 依赖治理 | 单一 pnpm-lock；12+ 项安全 overrides；`pnpm audit --prod` 当前 **0 critical / 1 high** |
| 剩余 high | `ip`（React Native CLI 开发工具，暂无上游补丁，不进入 Web 产物） |
| 构建产物 | Next 16 standalone；构建阶段强制 TypeScript 检查 |
| 数据保护 | 金额 `NUMERIC(10,2)`；敏感字段按角色脱敏；导出需审计与行数限制 |
| 漏洞披露 | 私密报告（邮箱 / GitHub Security Advisory），修复后公开 |

## Known Vulnerabilities and Mitigations

### ✅ Recently Fixed Vulnerabilities

#### Hardcoded Sensitive Credentials (SEC-2025-001)

**Status**: ✅ Fixed (2025-12-22)

**Description**:
Configuration file `env.sync.ts` contained hardcoded sensitive credentials including database passwords, JWT secrets, payment API keys, and encryption keys.

**Impact**:
CRITICAL (CVSS 9.8) - Could lead to:

- Complete database compromise
- Unauthorized payment transactions
- JWT token forgery and identity theft
- Encryption key exposure
- Email system hijacking

**Fix**:

- ✅ Removed all hardcoded credentials from source code
- ✅ Replaced with empty strings and environment variable references
- ✅ Added comprehensive security warnings and documentation
- ✅ Provided production deployment guidelines
- ✅ Current status: No hardcoded credentials in codebase

**Affected Files**:

- `env.sync.ts`

**Fixed Version**:

- Commit: fbc30a8 (2025-12-22)

**References**:

- Detailed Report: [docs/security/CRITICAL_FIXES_2025-12-22.md](docs/security/CRITICAL_FIXES_2025-12-22.md)
- CWE-798: Use of Hard-coded Credentials

---

#### XSS Vulnerability in Chart Component (SEC-2025-002)

**Status**: ✅ Fixed (2025-12-22)

**Description**:
Chart component used `dangerouslySetInnerHTML` without input validation, potentially allowing XSS attacks through malicious CSS injection.

**Impact**:
HIGH (CVSS 7.5) - Could lead to:

- Cross-site scripting attacks
- Malicious script injection
- Data theft through CSS selectors
- Style pollution attacks

**Fix**:

- ✅ Added `sanitizeCSSColor()` function to validate color values
- ✅ Added `sanitizeCSSVarName()` function to sanitize variable names
- ✅ Implemented whitelist-based regex validation
- ✅ Blocked all potentially dangerous input patterns
- ✅ Current status: XSS protection fully implemented

**Affected Files**:

- `components/ui/chart.tsx`

**Fixed Version**:

- Commit: fbc30a8 (2025-12-22)

**References**:

- Detailed Report: [docs/security/CRITICAL_FIXES_2025-12-22.md](docs/security/CRITICAL_FIXES_2025-12-22.md)
- CWE-79: Cross-site Scripting (XSS)

---

#### Weak Test Passwords Without Warnings (SEC-2025-003)

**Status**: ✅ Fixed (2025-12-22)

**Description**:
Test files contained weak passwords (123456) without adequate security warnings, risking production misuse.

**Impact**:
MEDIUM (CVSS 5.0) - Could lead to:

- Weak passwords being used in production
- Security awareness gaps
- Easy account compromise

**Fix**:

- ✅ Added comprehensive security warnings to all test files
- ✅ Clearly marked test-only credentials
- ✅ Provided production environment security guidelines
- ✅ Documented required security implementations

**Affected Files**:

- `lib/api/mock-service.ts`
- `app/api/auth/login/route.ts`

**Fixed Version**:

- Commit: 54d27c8 (2025-12-22)

**References**:

- Detailed Report: [docs/security/CRITICAL_FIXES_2025-12-22.md](docs/security/CRITICAL_FIXES_2025-12-22.md)

---

#### Storybook Environment Variable Exposure (GHSA-8452-54wp-rmv6)

**Status**: ✅ Fixed (2025-12-22)

**Description**:
Storybook manager bundle may expose environment variables during build, leading to potential information disclosure.

**Impact**:
HIGH (CVSS 7.3) - Could expose sensitive configuration data, API keys, and secrets

**Fix**:

- ✅ Upgraded storybook from 10.0.0-10.1.9 to 10.1.10
- ✅ Applied via `npm audit fix`
- ✅ Verified with comprehensive testing (440 tests passed)
- ✅ Current status: 0 vulnerabilities

**Affected Versions**:

- storybook 10.0.0 - 10.1.9

**Fixed Version**:

- storybook >= 10.1.10

**References**:

- GitHub Advisory: https://github.com/advisories/GHSA-8452-54wp-rmv6
- Detailed Report: [docs/security/STORYBOOK_VULNERABILITY_FIX.md](docs/security/STORYBOOK_VULNERABILITY_FIX.md)

---

#### F-ktv Chart Component XSS Vulnerability (SEC-2025-004)

**Status**: ✅ Fixed (2025-12-23)

**Description**:
F-ktv chart component used `dangerouslySetInnerHTML` without input validation for CSS values and variable names, potentially allowing XSS attacks through malicious CSS injection.

**Impact**:
HIGH (CVSS 7.5) - Could lead to:

- Cross-site scripting attacks via CSS injection
- Malicious script injection through CSS color values
- Data theft through CSS selectors
- Style pollution and UI manipulation attacks
- CSS-based JavaScript execution

**Fix**:

- ✅ Added `sanitizeCSSColor()` function to validate color values
- ✅ Added `sanitizeCSSVarName()` function to sanitize variable names
- ✅ Implemented whitelist-based regex validation for color formats
- ✅ Blocked all potentially dangerous input patterns including scripts, URLs, and injections
- ✅ Added 17 comprehensive security test cases (all passing)
- ✅ Current status: XSS protection fully implemented, matching main chart component security

**Affected Files**:

- `F-ktv/components/ui/chart.tsx`

**Fixed Version**:

- Commit: 459809a (2025-12-23)

**Test Coverage**:

- 17 security test cases covering XSS payloads, CSS injection, edge cases
- 457 total tests passing (100% pass rate)

**References**:

- Detailed Report: [docs/security/F-KTV_CHART_XSS_FIX.md](docs/security/F-KTV_CHART_XSS_FIX.md)
- CWE-79: Cross-site Scripting (XSS)
- OWASP XSS Prevention: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html

---

### Node-forge ASN.1 Validator Vulnerability (CVE-2024-48939)

**Status**: ✅ Mitigated (Preventive measures in place)

**Description**:
The node-forge library has a critical vulnerability in its ASN.1 validator that allows for non-synchronous interpretation conflicts, potentially leading to:

- Prototype pollution attacks
- Denial of service through malformed ASN.1 data
- Bypass of certificate validation
- Arbitrary code execution

**Impact**:
HIGH - Could compromise cryptographic operations and certificate validation

**Mitigation**:

1. ✅ Node-forge is **not currently used** as a direct or transitive dependency
2. ✅ Added package.json `overrides` to force node-forge >= 1.3.1 if it gets added
3. ✅ Configured .npmrc with audit settings to catch vulnerable dependencies
4. ✅ Security scanning workflow monitors for node-forge vulnerabilities
5. ✅ Regular dependency audits via GitHub Actions

**Affected Versions**:

- node-forge < 1.3.1

**Safe Versions**:

- node-forge >= 1.3.1

**Recommended Alternatives**:
If cryptographic or ASN.1 functionality is needed, consider:

- `@peculiar/asn1-schema` - Modern ASN.1 parser
- `asn1js` - Pure JavaScript ASN.1 library
- Native Node.js crypto module

**References**:

- GitHub Advisory: https://github.com/advisories/GHSA-cfm4-qjh2-4765
- CVE-2024-48939: https://nvd.nist.gov/vuln/detail/CVE-2024-48939
- node-forge Repository: https://github.com/digitalbazaar/forge

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow these steps:

1. **Do not** open a public issue or disclose details publicly.
2. Email security details to: **admin@0379.email**（主题：`[SECURITY] YYC3-Clube-System + 简述`）。
3. 或通过 GitHub 仓库的 **Security → Advisories → Report a vulnerability** 私密提交。
4. Include:
   - Description of the vulnerability
   - Steps to reproduce / PoC（如可提供）
   - Potential impact and affected components
   - Suggested fix (if any)
   - Your contact and credit preference

**Scope**：

- Web 应用（`app/`、`components/`、`lib/`）
- API Route Handlers、`proxy.ts`
- 移动端（`mobile-app/`）
- 数据库迁移、导出、认证与权限逻辑
- 依赖供应链（`pnpm-lock.yaml`、overrides）

**Out of Scope**：

- 未修复漏洞的公开 Issue 讨论
- 仅影响开发工具且无实际利用路径的理论问题（请仍可告知，我们会评估）
- 社会工程、物理访问、拒绝服务压测（未经授权）

**Response Timeline**:

- **Initial Response**: Within 48 hours
- **Status Update**: Weekly updates on investigation progress
- **Fix Timeline**: Critical ≤ 7 days, High ≤ 14 days, Medium ≤ 30 days
- **Public Disclosure**: 修复发布后 30 天，或经双方约定

**What to Expect**:

- **Accepted**: We will work on a fix, credit you in the advisory, and coordinate disclosure.
- **Declined**: We will provide reasoning and, where useful, mitigation guidance.
- **Safe Harbor**: 善意研究、遵守本政策且不损害用户数据/服务可用性的行为，我们不会采取法律行动。

## Security Best Practices

### For Developers

1. Run `pnpm audit --prod` before committing changes
2. Keep dependencies updated; use `pnpm-workspace.yaml#overrides` for patched transitive versions
3. Review security scan results in CI/CD pipeline
4. Use environment variables for sensitive data; never commit `.env.local`
5. Follow secure coding practices outlined in [CONTRIBUTING.md](./CONTRIBUTING.md)
6. Run `pnpm type-check`, `pnpm lint`, `pnpm build` before opening a PR

### For Deployments

1. Use HTTPS for all communications
2. Enable rate limiting on API endpoints
3. Implement proper authentication and authorization
4. Regular security audits and penetration testing
5. Monitor logs for suspicious activities

## Security Scanning

This project uses multiple security scanning tools:

- **npm audit**: Dependency vulnerability scanning
- **ESLint Security Plugin**: Static code analysis
- **CodeQL**: Advanced security analysis
- **Semgrep**: Pattern-based security checks
- **Trivy**: Container scanning (when applicable)

See `.github/workflows/security-scan.yml` for details.

## Disclosure Policy

1. 报告人私密提交 → 维护者 48 小时内确认。
2. 评估影响、修复范围与发布时间。
3. 在私密分支/Advisory 中修复并回归。
4. 发布补丁版本与安全公告，必要时申请 CVE。
5. 修复公开后更新本文件「Recently Fixed Vulnerabilities」。

## Security Contacts

- Security email: **admin@0379.email**
- Repository: https://github.com/YYC-Cube/YYC3-Clube-Management-System
- Security advisories: GitHub → Security → Advisories

---

> ***YanYuCloudCube***
> *言启象限 | 语枢未来*
> *万象归元于云枢 | 深栈智启新纪元*
>
> **© 2025-2026 YanYuCloudCube™. All Rights Reserved.**
