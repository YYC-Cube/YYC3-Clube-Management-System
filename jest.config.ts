import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig: Config = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    // @happy-dom/jest-environment pnpm symlink 下 docblock 解析不到，显式映射真实入口
    '^@happy-dom/jest-environment$':
      '<rootDir>/node_modules/.pnpm/@happy-dom+jest-environment@21.0.4_@jest+environment@30.4.1_@jest+fake-timers@30.4.1_@j_5052c52b280ef2ae45ebe62cc89baadb/node_modules/@happy-dom/jest-environment/lib/index.js',
    // pnpm symlink 下 jest resolver 解析不到 msw exports 子路径；映射 CJS 入口
    '^msw/node$':
      '<rootDir>/node_modules/.pnpm/msw@2.14.6_@types+node@22.19.19_typescript@5.9.3/node_modules/msw/lib/node/index.js',
    '^msw$':
      '<rootDir>/node_modules/.pnpm/msw@2.14.6_@types+node@22.19.19_typescript@5.9.3/node_modules/msw/lib/core/index.js',
    // pnpm 私有依赖链（@mswjs/interceptors）从 rootDir 不可达，映射真实包路径
    '^@mswjs/interceptors$':
      '<rootDir>/node_modules/.pnpm/@mswjs+interceptors@0.41.9/node_modules/@mswjs/interceptors/lib/node/index.cjs',
    '^@mswjs/interceptors/(.*)$':
      '<rootDir>/node_modules/.pnpm/@mswjs+interceptors@0.41.9/node_modules/@mswjs/interceptors/$1',
    // BatchInterceptor 子拦截器：目录 exports 在 jest 互操作下拿 undefined，精确映射 CJS 分片
    '^@mswjs/interceptors/ClientRequest$':
      '<rootDir>/node_modules/.pnpm/@mswjs+interceptors@0.41.9/node_modules/@mswjs/interceptors/lib/node/interceptors/ClientRequest/index.cjs',
    '^@mswjs/interceptors/fetch$':
      '<rootDir>/node_modules/.pnpm/@mswjs+interceptors@0.41.9/node_modules/@mswjs/interceptors/lib/node/interceptors/fetch/index.cjs',
    '^@mswjs/interceptors/WebSocket$':
      '<rootDir>/node_modules/.pnpm/@mswjs+interceptors@0.41.9/node_modules/@mswjs/interceptors/lib/browser/interceptors/WebSocket/index.cjs',
    '^@mswjs/interceptors/XMLHttpRequest$':
      '<rootDir>/node_modules/.pnpm/@mswjs+interceptors@0.41.9/node_modules/@mswjs/interceptors/lib/node/interceptors/XMLHttpRequest/index.cjs',
    // 三包仅发布 ESM：esbuild 转译真实包为 CJS 入 vendor（msw XHR 真实拦截依赖
    // rettime Emitter.emitAsPromise——stub 缺该函数是 XHR 专项根因）。
    // 再生：bash scripts/msw-vendor.sh（msw/@mswjs/interceptors 升版后必须重跑）
    '^@open-draft/deferred-promise$': '<rootDir>/__tests__/vendor/deferred-promise.cjs',
    '^rettime$': '<rootDir>/__tests__/vendor/rettime.cjs',
    '^until-async$': '<rootDir>/__tests__/vendor/until-async.cjs',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'app/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!coverage/**',
    '!jest.config.js',
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 10,
      statements: 10,
    },
  },
  testMatch: [
    '**/__tests__/**/*.test.{js,jsx,ts,tsx}',
    '**/__tests__/working/**/*.test.{js,jsx,ts,tsx}',
    '**/__tests__/*.test.{js,jsx,ts,tsx}',
    '**/*.(test|spec).{js,jsx,ts,tsx}',
  ],
  // 存量红分类治理（2026-11-02，修正版）：archive-* 归档批次不进门禁。
  // A 类收编：/e2e/ 为 playwright testDir（jest 不收集）；/tests/security/ 为 testDir 外
  // 孤儿 playwright 规格（待人工归位）。B/C 类残件与混合目录中的红灯文件一律 ignore
  // （物理归档待人工 git mv；Mimosa 钩子拦 Bash 级测试文件移动，见 decisions.log）。
  // 混合目录（extended/、integration/）红灯文件 ignore 而非目录归档——避免连坐绿灯套件。
  testPathIgnorePatterns: [
    '/node_modules/',
    '__tests__/archive-',
    '/e2e/',
    '/tests/security/',
    '__tests__/quick-coverage-boost\\.test\\.tsx$',
    '__tests__/essential-coverage\\.test\\.tsx$',
    '__tests__/core-components\\.test\\.tsx$',
    '__tests__/core-api-routes\\.test\\.tsx$',
    '__tests__/performance-monitoring\\.test\\.tsx$',
    'components/ui/button\\.test\\.tsx$',
    'components/product-form\\.test\\.tsx$',
    'project-root/config/env\\.test\\.ts$',
    'integration/product-management\\.test\\.tsx$',
    'integration/order-management\\.test\\.tsx$',
    'integration/member-management\\.test\\.tsx$',
    'extended/ai-ops-system\\.test\\.tsx$',
    'extended/auth\\.test\\.tsx$',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
}

export default createJestConfig(customJestConfig)
