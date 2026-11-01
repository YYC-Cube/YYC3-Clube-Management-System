#!/usr/bin/env ts-node

/**
 * 完整的单元测试运行脚本
 * 用于执行所有测试并生成详细报告
 */

import { spawnSync } from "child_process"
import * as fs from "fs"
import * as path from "path"

interface TestResult {
  suite: string
  passed: number
  failed: number
  skipped: number
  duration: number
  coverage?: {
    lines: number
    functions: number
    branches: number
    statements: number
  }
}

interface TestReport {
  timestamp: string
  totalTests: number
  passed: number
  failed: number
  skipped: number
  duration: number
  suites: TestResult[]
  coverage: {
    lines: number
    functions: number
    branches: number
    statements: number
  }
  status: "success" | "failure" | "partial"
}

class TestRunner {
  private startTime = 0

  async runAllTests(): Promise<TestReport> {
    console.log("🚀 启动完整测试套件...\n")
    this.startTime = Date.now()

    // 运行单元测试（固定命令 + 字面量参数数组，不经 shell）
    await this.runUnitTests()

    // 运行集成测试
    await this.runIntegrationTests()

    // 运行覆盖率测试
    await this.runCoverageTest()

    // 生成报告
    return this.generateReport()
  }

  private async runUnitTests(): Promise<void> {
    console.log(`\n📋 运行单元测试...`)

    try {
      // 固定命令 + 字面量参数数组，不经 shell 拼接（安全门禁要求）
      spawnSync("npm", ["run", "test:unit", "--", "--ci", "--json", "--outputFile=test-results-unit.json"], {
        stdio: "inherit",
        cwd: process.cwd(),
      })
      console.log(`✅ 单元测试 完成`)
    } catch (error) {
      console.error(`❌ 单元测试 失败`)
      // 继续执行其他测试
    }
  }

  private async runIntegrationTests(): Promise<void> {
    console.log(`\n📋 运行集成测试...`)

    try {
      // 固定命令 + 字面量参数数组，不经 shell 拼接（安全门禁要求）
      spawnSync("npm", ["run", "test:integration", "--", "--ci", "--json", "--outputFile=test-results-integration.json"], {
        stdio: "inherit",
        cwd: process.cwd(),
      })
      console.log(`✅ 集成测试 完成`)
    } catch (error) {
      console.error(`❌ 集成测试 失败`)
      // 继续执行其他测试
    }
  }

  private async runCoverageTest(): Promise<void> {
    console.log("\n📊 运行覆盖率测试...")

    try {
      // 固定命令 + 字面量参数数组，不经 shell 拼接（安全门禁要求）
      spawnSync("npm", ["run", "test:coverage", "--", "--ci"], {
        stdio: "inherit",
        cwd: process.cwd(),
      })
      console.log("✅ 覆盖率测试完成")
    } catch (error) {
      console.error("❌ 覆盖率测试失败")
    }
  }

  private generateReport(): TestReport {
    const duration = Date.now() - this.startTime

    // 读取测试结果
    const unitResults = this.readTestResults("test-results-unit.json")
    const integrationResults = this.readTestResults("test-results-integration.json")
    const coverage = this.readCoverageResults()

    const totalPassed = unitResults.passed + integrationResults.passed
    const totalFailed = unitResults.failed + integrationResults.failed
    const totalSkipped = unitResults.skipped + integrationResults.skipped
    const totalTests = totalPassed + totalFailed + totalSkipped

    const report: TestReport = {
      timestamp: new Date().toISOString(),
      totalTests,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      duration,
      suites: [unitResults, integrationResults],
      coverage,
      status: totalFailed === 0 ? "success" : totalPassed > 0 ? "partial" : "failure",
    }

    // 保存报告
    this.saveReport(report)
    this.printReport(report)

    return report
  }

  private readTestResults(filename: string): TestResult {
    try {
      const cwd = path.resolve(process.cwd())
      const filePath = path.resolve(cwd, filename)
      // 防路径穿越：仅读取 cwd 内的结果文件
      if (filePath.startsWith(cwd + path.sep) && fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"))
        return {
          suite: filename.includes("unit") ? "单元测试" : "集成测试",
          passed: data.numPassedTests || 0,
          failed: data.numFailedTests || 0,
          skipped: data.numPendingTests || 0,
          duration: data.testResults?.reduce((sum: number, r: any) => sum + (r.perfStats?.runtime || 0), 0) || 0,
        }
      }
    } catch (error) {
      console.error(`读取测试结果失败: ${filename}`, error)
    }

    return {
      suite: filename.includes("unit") ? "单元测试" : "集成测试",
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
    }
  }

  private readCoverageResults() {
    try {
      const coveragePath = path.join(process.cwd(), "coverage", "coverage-summary.json")
      if (fs.existsSync(coveragePath)) {
        const data = JSON.parse(fs.readFileSync(coveragePath, "utf-8"))
        const total = data.total
        return {
          lines: total.lines.pct,
          functions: total.functions.pct,
          branches: total.branches.pct,
          statements: total.statements.pct,
        }
      }
    } catch (error) {
      console.error("读取覆盖率结果失败", error)
    }

    return {
      lines: 0,
      functions: 0,
      branches: 0,
      statements: 0,
    }
  }

  private saveReport(report: TestReport): void {
    const reportPath = path.join(process.cwd(), "docs", "TEST_REPORT.md")
    const markdown = this.generateMarkdownReport(report)
    fs.writeFileSync(reportPath, markdown, "utf-8")
    console.log(`\n📄 测试报告已保存: ${reportPath}`)
  }

  private generateMarkdownReport(report: TestReport): string {
    const statusEmoji = report.status === "success" ? "✅" : report.status === "partial" ? "⚠️" : "❌"

    return `# 启智KTV商家后台系统 - 测试报告

${statusEmoji} **测试状态**: ${report.status === "success" ? "全部通过" : report.status === "partial" ? "部分通过" : "失败"}

**生成时间**: ${new Date(report.timestamp).toLocaleString("zh-CN")}

## 测试概览

| 指标 | 数值 |
|------|------|
| 总测试数 | ${report.totalTests} |
| 通过 | ${report.passed} ✅ |
| 失败 | ${report.failed} ❌ |
| 跳过 | ${report.skipped} ⏭️ |
| 总耗时 | ${(report.duration / 1000).toFixed(2)}s |
| 通过率 | ${((report.passed / report.totalTests) * 100).toFixed(2)}% |

## 测试套件详情

${report.suites
  .map(
    (suite) => `
### ${suite.suite}

- 通过: ${suite.passed}
- 失败: ${suite.failed}
- 跳过: ${suite.skipped}
- 耗时: ${(suite.duration / 1000).toFixed(2)}s
`,
  )
  .join("\n")}

## 代码覆盖率

| 类型 | 覆盖率 | 状态 |
|------|--------|------|
| 语句 | ${report.coverage.statements.toFixed(2)}% | ${report.coverage.statements >= 80 ? "✅" : "❌"} |
| 分支 | ${report.coverage.branches.toFixed(2)}% | ${report.coverage.branches >= 80 ? "✅" : "❌"} |
| 函数 | ${report.coverage.functions.toFixed(2)}% | ${report.coverage.functions >= 80 ? "✅" : "❌"} |
| 行数 | ${report.coverage.lines.toFixed(2)}% | ${report.coverage.lines >= 80 ? "✅" : "❌"} |

## 测试命令

\`\`\`bash
# 运行所有测试
npm run test:all

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行覆盖率测试
npm run test:coverage

# 运行E2E测试
npm run test:e2e
\`\`\`

## 建议

${this.generateRecommendations(report)}

---

*此报告由自动化测试系统生成*
`
  }

  private generateRecommendations(report: TestReport): string {
    const recommendations: string[] = []

    if (report.failed > 0) {
      recommendations.push("- ❌ 存在失败的测试用例，请优先修复")
    }

    if (report.coverage.lines < 80) {
      recommendations.push("- 📊 代码覆盖率低于80%，建议增加测试用例")
    }

    if (report.coverage.branches < 80) {
      recommendations.push("- 🔀 分支覆盖率低于80%，建议增加边界条件测试")
    }

    if (report.skipped > 0) {
      recommendations.push("- ⏭️ 存在跳过的测试用例，建议完善这些测试")
    }

    if (recommendations.length === 0) {
      recommendations.push("- ✅ 所有测试通过，代码质量良好")
    }

    return recommendations.join("\n")
  }

  private printReport(report: TestReport): void {
    console.log("\n" + "=".repeat(60))
    console.log("📊 测试报告摘要")
    console.log("=".repeat(60))
    console.log(
      `状态: ${report.status === "success" ? "✅ 全部通过" : report.status === "partial" ? "⚠️ 部分通过" : "❌ 失败"}`,
    )
    console.log(`总测试数: ${report.totalTests}`)
    console.log(`通过: ${report.passed} | 失败: ${report.failed} | 跳过: ${report.skipped}`)
    console.log(`耗时: ${(report.duration / 1000).toFixed(2)}s`)
    console.log(`覆盖率: ${report.coverage.lines.toFixed(2)}%`)
    console.log("=".repeat(60) + "\n")
  }
}

// 运行测试
const runner = new TestRunner()
runner
  .runAllTests()
  .then(() => {
    console.log("\n✅ 测试运行完成")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ 测试运行失败:", error)
    process.exit(1)
  })
