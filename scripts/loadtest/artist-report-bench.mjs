#!/usr/bin/env node
/**
 * 艺人报表压测脚本（Node 18+，无需额外依赖）
 *
 * 用途：对 4 个只读报表接口与导出接口做并发压测，输出 P50/P95/P99 与错误率。
 *
 * 环境变量：
 * - BENCH_BASE_URL     服务地址（默认 http://127.0.0.1:3032）
 * - BENCH_REQUESTS     每个接口请求数（默认 30）
 * - BENCH_CONCURRENCY  并发数（默认 10）
 * - BENCH_FROM/TO      压测日期范围（默认 2026-10-01 ~ 2026-10-31）
 * - BENCH_OUTPUT       结果输出路径（默认 docs/.../attachments/artist-report-bench.json）
 *
 * 使用示例：
 *   BENCH_BASE_URL=http://127.0.0.1:3032 node scripts/loadtest/artist-report-bench.mjs
 */

import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { performance } from "node:perf_hooks"

const BASE_URL = process.env.BENCH_BASE_URL || "http://127.0.0.1:3032"
const REQUESTS = Number(process.env.BENCH_REQUESTS || 30)
const CONCURRENCY = Number(process.env.BENCH_CONCURRENCY || 10)
const FROM = process.env.BENCH_FROM || "2026-10-01"
const TO = process.env.BENCH_TO || "2026-10-31"
const OUTPUT =
  process.env.BENCH_OUTPUT ||
  "docs/yyc3-clube-system-trae-20261031/attachments/artist-report-bench.json"

const ENDPOINTS = [
  { name: "clock-detail", path: "/api/reports/artist/clock-detail" },
  { name: "clock-summary", path: "/api/reports/artist/clock-summary" },
  { name: "fee-deduction", path: "/api/reports/artist/fee-deduction" },
  { name: "fee-summary", path: "/api/reports/artist/fee-summary" },
]

const EXPORT_PAYLOADS = [
  { name: "export-clock-detail", reportType: "clock-detail" },
  { name: "export-fee-summary", reportType: "fee-summary" },
]

function percentile(sorted, p) {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[index]
}

function summarize(latencies, errors) {
  const sorted = [...latencies].sort((a, b) => a - b)
  const round = (value) => Math.round(value * 10) / 10
  return {
    count: latencies.length,
    errors,
    errorRate: latencies.length + errors === 0 ? 0 : round((errors / (latencies.length + errors)) * 100),
    minMs: round(sorted[0] ?? 0),
    p50Ms: round(percentile(sorted, 50)),
    p95Ms: round(percentile(sorted, 95)),
    p99Ms: round(percentile(sorted, 99)),
    maxMs: round(sorted[sorted.length - 1] ?? 0),
    avgMs: round(sorted.reduce((sum, value) => sum + value, 0) / (sorted.length || 1)),
  }
}

async function request(url, init) {
  const started = performance.now()
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(20_000),
    })
    const body = await response.text()
    const elapsed = performance.now() - started
    if (!response.ok) {
      return { ok: false, elapsed, status: response.status, message: body.slice(0, 120) }
    }
    return { ok: true, elapsed, status: response.status, size: body.length }
  } catch (error) {
    return {
      ok: false,
      elapsed: performance.now() - started,
      status: 0,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

async function benchEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}?from=${FROM}&to=${TO}&pageSize=200`
  const latencies = []
  const errors = []

  // 预热 2 次，避免首请求编译影响
  await request(url)
  await request(url)

  let cursor = 0
  async function worker() {
    while (cursor < REQUESTS) {
      cursor += 1
      const result = await request(url)
      if (result.ok) latencies.push(result.elapsed)
      else errors.push({ status: result.status, message: result.message })
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, REQUESTS) }, worker))
  return { endpoint: endpoint.name, ...summarize(latencies, errors.length), errorSamples: errors.slice(0, 3) }
}

async function benchExport(payload, rounds = 3) {
  const url = `${BASE_URL}/api/reports/artist/export`
  const latencies = []
  const errors = []

  for (let i = 0; i < rounds; i += 1) {
    const result = await request(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reportType: payload.reportType,
        filter: { from: FROM, to: TO },
      }),
    })
    if (result.ok) latencies.push(result.elapsed)
    else errors.push({ status: result.status, message: result.message })
  }

  return {
    endpoint: payload.name,
    ...summarize(latencies, errors.length),
    errorSamples: errors.slice(0, 3),
  }
}

async function main() {
  const startedAt = new Date().toISOString()
  const started = performance.now()

  const results = []
  for (const endpoint of ENDPOINTS) {
    results.push(await benchEndpoint(endpoint))
  }
  for (const payload of EXPORT_PAYLOADS) {
    results.push(await benchExport(payload))
  }

  const report = {
    baseUrl: BASE_URL,
    range: { from: FROM, to: TO },
    concurrency: CONCURRENCY,
    requestsPerEndpoint: REQUESTS,
    startedAt,
    durationMs: Math.round(performance.now() - started),
    thresholds: { p95Ms: 500 },
    results,
  }

  const outputPath = resolve(OUTPUT)
  mkdirSync(dirname(outputPath), { recursive: true })
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8")

  console.log(`压测完成，结果已写入：${outputPath}`)
  for (const result of results) {
    const flag = result.p95Ms <= 500 ? "PASS" : "SLOW"
    console.log(
      `${flag}\t${result.endpoint}\tp95=${result.p95Ms}ms\tp99=${result.p99Ms}ms\terrors=${result.errors}/${result.count}`
    )
  }

  const failed = results.filter(result => result.p95Ms > 500 || result.errorRate > 0)
  if (failed.length > 0) {
    console.error(`存在未达标接口：${failed.map(item => item.endpoint).join(", ")}`)
    process.exitCode = 1
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
