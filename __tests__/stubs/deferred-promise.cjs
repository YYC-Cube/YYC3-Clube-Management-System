/**
 * @open-draft/deferred-promise CJS stub（jest jsdom；该包仅发布 ESM）。
 * 组件渲染类测试不触发真实延迟兑现，空实现满足模块加载与实例化。
 */
class DeferredPromise {
  constructor() {
    this.status = 'pending'
  }
  resolve(value) {
    this.value = value
    this.status = 'fulfilled'
    return this.value
  }
  reject(reason) {
    this.reason = reason
    this.status = 'rejected'
    return this.reason
  }
  async then(onFulfilled) {
    return this.value
  }
  catch() {
    return this
  }
  finally(cb) {
    if (typeof cb === 'function') cb()
    return this
  }
}

function createDeferredExecutor() {
  let resolve
  let reject
  return {
    get state() {
      return 'pending'
    },
    resolve: (value) => undefined,
    reject: (reason) => undefined,
  }
}

module.exports = { DeferredPromise, createDeferredExecutor }
module.exports.default = module.exports
