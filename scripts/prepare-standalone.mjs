#!/usr/bin/env node
/**
 * 将 Next.js standalone 产物运行所需的静态资源复制到独立目录，
 * 使 `node .next/standalone/server.js` 可直接提供页面、CSS、图片。
 */
import { cpSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const standaloneDir = resolve(root, '.next/standalone')

if (!existsSync(standaloneDir)) {
  console.error('[standalone] 未找到 .next/standalone，请先执行 pnpm build')
  process.exit(1)
}

const staticSource = resolve(root, '.next/static')
if (existsSync(staticSource)) {
  cpSync(staticSource, resolve(standaloneDir, '.next/static'), { recursive: true })
}

const publicSource = resolve(root, 'public')
if (existsSync(publicSource)) {
  cpSync(publicSource, resolve(standaloneDir, 'public'), { recursive: true })
}

console.log('[standalone] 静态资源已复制到 .next/standalone')
