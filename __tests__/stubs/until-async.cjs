/**
 * until-async CJS stub（jest jsdom；该包 lib 仅 ESM）。
 * msw 在 server.listen() 的重试路径使用 until——组件渲染类测试不触发真实
 * 网络拦截重试，恒等实现满足模块加载。
 */
async function until(untilFn, method, ...args) {
  const [error, data] = await untilFn(method(...args))
  if (error) throw error
  return data
}

module.exports = { until }
module.exports.default = module.exports
