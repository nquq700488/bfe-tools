/**
 * @name apiClient
 * @description 基于 fetch 的 HTTP 客户端封装
 * 提供 baseURL 配置、请求/响应拦截、统一 JSON 解析
 * 所有 API 方法返回 Go 风格的 [data, error] 元组（配合 to() 使用）
 */

/** API 响应通用信封 */
export interface APIResponse<T = unknown> {
  success: boolean
  data: T | null
  error: string | null
  meta?: Record<string, unknown>
}

/** 请求配置 */
interface RequestConfig {
  baseURL?: string
  timeout?: number
  headers?: Record<string, string>
  signal?: AbortSignal
}

/** 默认配置 */
const defaults: RequestConfig = {
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
}

/**
 * 创建 API 客户端实例
 */
function createAPIClient(config: RequestConfig = {}) {
  const mergedConfig = { ...defaults, ...config }

  /**
   * 构建完整 URL
   * Tauri 桌面端：拼接 127.0.0.1:{port}/api/...
   * 浏览器模式：使用 Vite proxy（baseURL 为空或 /api）
   */
  function buildURL(path: string): string {
    if (typeof window !== 'undefined') {
      const g = window as unknown as Record<string, unknown>
      // 1. Rust setup hook 注入的全局变量
      if (g.__BFE_BACKEND_INFO__) {
        const info = g.__BFE_BACKEND_INFO__ as { baseUrl: string; token: string; port: number }
        return `${info.baseUrl}${path}`
      }
      // 2. URL query param 回退（lib.rs location.replace 传参场景）
      const params = new URLSearchParams(window.location.search)
      const port = params.get('__bfe_port')
      if (port) {
        return `http://127.0.0.1:${port}${path}`
      }
    }
    const base = mergedConfig.baseURL || ''
    return `${base}${path}`
  }

  /**
   * 发起请求的通用方法
   */
  async function request<T>(
    path: string,
    options: RequestInit & { params?: Record<string, string>; signal?: AbortSignal } = {}
  ): Promise<APIResponse<T>> {
    const { params, signal, ...init } = options
    let url = buildURL(path)

    // 拼接查询参数
    if (params) {
      const searchParams = new URLSearchParams(params)
      url += `?${searchParams.toString()}`
    }

    // 创建超时 AbortController
    const timeoutController = new AbortController()
    const timeoutId = setTimeout(() => timeoutController.abort(), mergedConfig.timeout)

    // 合并外部 signal 与超时 signal
    const combinedSignal = signal
      ? combineSignals(signal, timeoutController.signal)
      : timeoutController.signal

    try {
      // 合并请求头：FormData 必须跳过 Content-Type（浏览器自动设置 multipart/form-data boundary）
      const isFormData = init.body instanceof FormData
      const mergedHeaders: Record<string, string> = {}
      for (const [key, value] of Object.entries(mergedConfig.headers || {})) {
        if (isFormData && key.toLowerCase() === 'content-type') continue
        mergedHeaders[key] = value
      }
      if (init.headers) {
        const customHeaders = init.headers as Record<string, string>
        for (const [key, value] of Object.entries(customHeaders)) {
          if (isFormData && key.toLowerCase() === 'content-type') continue
          mergedHeaders[key] = value
        }
      }

      // Tauri 桌面端：自动注入安全 token
      if (typeof window !== 'undefined') {
        const g = window as unknown as Record<string, unknown>
        const info = g.__BFE_BACKEND_INFO__ as { token?: string } | undefined
        if (info?.token && !mergedHeaders['X-BFE-Desktop-Token']) {
          mergedHeaders['X-BFE-Desktop-Token'] = info.token
        }
      }

      const response = await fetch(url, {
        ...init,
        signal: combinedSignal,
        headers: mergedHeaders,
      })

      clearTimeout(timeoutId)

      const json = (await response.json()) as APIResponse<T>

      if (!response.ok) {
        return {
          success: false,
          data: null,
          error: json.error || `HTTP ${response.status}`,
        }
      }

      return json
    } catch (err) {
      clearTimeout(timeoutId)
      if (err instanceof DOMException && err.name === 'AbortError') {
        return { success: false, data: null, error: '请求已取消或超时' }
      }
      return {
        success: false,
        data: null,
        error: err instanceof Error ? err.message : '未知网络错误',
      }
    }
  }

  return {
    get<T>(path: string, config?: { params?: Record<string, string>; signal?: AbortSignal }) {
      return request<T>(path, { method: 'GET', ...config })
    },
    post<T>(path: string, body?: unknown, config?: { signal?: AbortSignal }) {
      return request<T>(path, {
        method: 'POST',
        body: body instanceof FormData ? body : JSON.stringify(body),
        ...config,
      })
    },
    put<T>(path: string, body?: unknown, config?: { signal?: AbortSignal }) {
      return request<T>(path, {
        method: 'PUT',
        body: body instanceof FormData ? body : JSON.stringify(body),
        ...config,
      })
    },
    delete<T>(path: string, config?: { signal?: AbortSignal }) {
      return request<T>(path, { method: 'DELETE', ...config })
    },
  }
}

/**
 * 合并多个 AbortSignal：任一触发即整体中止
 */
function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController()

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      return controller.signal
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true,
    })
  }

  return controller.signal
}

/** 导出默认实例 */
export const apiClient = createAPIClient()
