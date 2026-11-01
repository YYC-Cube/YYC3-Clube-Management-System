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
  },
  testEnvironment: 'jest-environment-jsdom',
  transformIgnorePatterns: [
    'node_modules/(?!(msw)/)',
  ],
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
  // ③类生成式测试治理：archive-* 为「归档待重写」批次，不进门禁（协同规范 05 §6 测试建议）
  testPathIgnorePatterns: ['/node_modules/', '__tests__/archive-'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
}

export default createJestConfig(customJestConfig)
