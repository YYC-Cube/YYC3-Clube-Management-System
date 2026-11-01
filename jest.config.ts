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
  // ③类生成式测试治理：archive-* 归档批次不进门禁；components/dialogs 为 msw 重写稿
  // （resolver/listen 全通；XHR 拦截语义已定案——msw-xhr 转正全绿，见 vendor 三链转译）
  testPathIgnorePatterns: ['/node_modules/', '__tests__/archive-'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
}

export default createJestConfig(customJestConfig)
