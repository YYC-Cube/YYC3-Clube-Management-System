/**
 * rettime CJS stub（jest jsdom 环境；rettime 仅发布 ESM）。
 * msw 继承链需要 TypedEvent/Emitter/LensList 作为可 extends 基类——
 * 组件渲染类测试不触发真实事件拦截，空实现满足模块加载与继承。
 * 若未来套件需要真实拦截，改用 ESM preset 管线。
 */
class LensList {
  add() {
    return this
  }
  remove() {
    return this
  }
}

class Emitter {
  constructor() {
    this.handlers = new Map()
  }
  on(type, listener) {
    this.handlers.set(type, listener)
    return this
  }
  off(type, listener) {
    this.handlers.delete(type)
    return this
  }
  once(type, listener) {
    return this.on(type, listener)
  }
  emit(type, ...args) {
    const handler = this.handlers.get(type)
    if (handler) handler(...args)
    /* stub：不派发真实事件 */
  }
  addEventListener() {
    return () => undefined
  }
  removeAllListeners() {
    this.handlers.clear()
  }
}

class TypedEvent extends Emitter {
  constructor() {
    super()
    this.listeners = new Map()
  }
  addEventListener(type, listener) {
    this.listeners.set(type, listener)
    return () => this.removeEventListener(type, listener)
  }
  removeEventListener(type) {
    this.listeners.delete(type)
  }
}

module.exports = { LensList, Emitter, TypedEvent }
module.exports.default = module.exports
