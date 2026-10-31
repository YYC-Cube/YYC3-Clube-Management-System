// 移动端 API 客户端
// 通过 EXPO_PUBLIC_API_BASE_URL 指向 Web 端 Next.js API（默认本机 3030 端口）

export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:3030'

interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    })

    const payload = (await response.json()) as ApiResponse<T>
    if (!response.ok) {
      return { success: false, error: payload.error || payload.message || '请求失败' }
    }
    return payload
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络错误',
    }
  }
}

export const api = {
  get<T>(path: string) {
    return request<T>(path)
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    })
  },
}
