/** 同步模块共享的最小查询客户端接口（pg 池与内存 mock 各自实现）。 */
export interface QueryClient {
  query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[] }>
}
