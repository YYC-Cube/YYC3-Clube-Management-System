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
    // @open-draft/deferred-promise 仅 ESM：CJS stub（jsdom 渲染测试不触发兑现）
    '^@open-draft/deferred-promise$': '<rootDir>/__tests__/stubs/deferred-promise.cjs',
    // rettime 仅发布 ESM：以 CJS stub 替代（jsdom 测试不触发真实拦截）
    '^rettime$': '<rootDir>/__tests__/stubs/rettime.cjs',
    // until-async：lib 为 ESM；以 CJS stub 替代（jsdom 测试不触发真实拦截重试）
    '^until-async$': '<rootDir>/__tests__/stubs/until-async.cjs',
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
  // ③类生成式测试治理：archive-* 归档批次；components/dialogs 为 msw 重写稿
  // （resolver 映射表已 95%：msw/interceptors/rettime/until-async/deferred-promise
  //   全通，仅剩 BatchInterceptor 子拦截器 jest 互操作一环），启用前保持忽略
  testPathIgnorePatterns: ['/node_modules/', '__tests__/archive-', '__tests__/components/dialogs'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
}

export default createJestConfig(customJestConfig)
