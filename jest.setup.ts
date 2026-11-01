import '@testing-library/jest-dom'
import { jest } from '@jest/globals'
import { TextEncoder, TextDecoder } from 'node:util'
import { TransformStream, ReadableStream, WritableStream } from 'node:stream/web'
import { BroadcastChannel, MessageChannel, MessagePort } from 'node:worker_threads'
import { Event as NodeEvent, EventTarget as NodeEventTarget } from 'node:events'

// msw/undici 依赖 Node 全局（jsdom 环境缺省）——polyfill 先于 undici require
// （undici 用运行期 require，避开 ES import 提升）
if (!globalThis.TextEncoder) globalThis.TextEncoder = TextEncoder
if (!globalThis.TextDecoder) globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder
if (!globalThis.TransformStream) globalThis.TransformStream = TransformStream as typeof TransformStream
if (!globalThis.ReadableStream) globalThis.ReadableStream = ReadableStream as typeof ReadableStream
if (!globalThis.WritableStream) globalThis.WritableStream = WritableStream as typeof WritableStream
if (!globalThis.BroadcastChannel) globalThis.BroadcastChannel = BroadcastChannel as typeof BroadcastChannel
if (!globalThis.MessageChannel) globalThis.MessageChannel = MessageChannel as typeof MessageChannel
if (!globalThis.MessagePort) globalThis.MessagePort = MessagePort as typeof MessagePort
if (!globalThis.Event) globalThis.Event = NodeEvent as typeof NodeEvent
if (!globalThis.EventTarget) globalThis.EventTarget = NodeEventTarget as typeof NodeEventTarget

// undici fetch 注入实验已回滚：undici fetch 走自有连接器（非 http.ClientRequest），
// 与 msw(node) 的 ClientRequestInterceptor 不匹配；jsdom XHR 拦截语义列专项继续

// Mock完整的Response类
class MockResponse {
  public status: number
  public statusText: string
  public headers: Map<string, string>
  public ok: boolean
  private _body: any
  private _bodyUsed: boolean = false

  constructor(body?: any, init?: { status?: number; statusText?: string; headers?: any }) {
    this._body = body
    this.status = init?.status || 200
    this.statusText = init?.statusText || 'OK'
    this.ok = this.status >= 200 && this.status < 300
    this.headers = new Map(Object.entries(init?.headers || {}))
  }

  static json(data: any, init?: any) {
    // 直接存储数据对象而非字符串
    const response = new MockResponse(data, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    })
    return response
  }

  async json() {
    if (this._bodyUsed) {
      throw new Error('Body已经被读取')
    }
    this._bodyUsed = true

    // 如果_body已经是对象,直接返回
    if (typeof this._body === 'object' && this._body !== null) {
      return this._body
    }

    // 如果是字符串,解析为JSON
    if (typeof this._body === 'string') {
      return JSON.parse(this._body || '{}')
    }

    return {}
  }

  async text() {
    if (this._bodyUsed) {
      throw new Error('Body已经被读取')
    }
    this._bodyUsed = true

    if (typeof this._body === 'string') {
      return this._body
    }

    if (typeof this._body === 'object' && this._body !== null) {
      return JSON.stringify(this._body)
    }

    return ''
  }

  clone() {
    return new MockResponse(this._body, {
      status: this.status,
      statusText: this.statusText,
      headers: Object.fromEntries(this.headers),
    })
  }
}

// 将MockResponse设为全局,Next.js会使用它
global.Response = MockResponse as any
global.Headers = class Headers extends Map {
  constructor(init?: any) {
    super(Object.entries(init || {}))
  }
  get(name: string) {
    return super.get(name.toLowerCase())
  }
  set(name: string, value: string) {
    return super.set(name.toLowerCase(), value)
  }
  has(name: string) {
    return super.has(name.toLowerCase())
  }
  // msw/interceptors recordRawHeaders 会 Proxy append（缺省即崩）
  append(name: string, value: string) {
    const prev = this.get(name)
    this.set(name, prev ? `${prev}, ${value}` : value)
  }
  forEach(cb: (value: string, name: string) => void) {
    for (const [name, value] of this.entries()) cb(value, name)
  }
  *entries(): IterableIterator<[string, string]> {
    for (const [name, value] of super.entries()) yield [name, value] as [string, string]
  }
  [Symbol.iterator](): IterableIterator<[string, string]> {
    return this.entries()
  }
} as any

// 注意: 移除MockRequest,使用真实Request类(从whatwg-fetch)

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(() => undefined),
    set: jest.fn(),
    delete: jest.fn(),
    has: jest.fn(() => false),
    clear: jest.fn(),
    getAll: jest.fn(() => []),
  }),
}))

// Mock环境变量
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mysql://test:test@localhost:3306/test'
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    span: 'span',
    tr: 'tr',
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock console方法 (减少测试输出噪音)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
} as any
