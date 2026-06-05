/**
 * 运行时环境检测与适配
 *
 * 支持两种模式：
 * 1. 浏览器模式：Vite dev proxy `/api` → `localhost:8000`
 * 2. Tauri 桌面模式：通过 URL query param `__bfe_port` 获取后端地址
 *
 * 桌面模式的工作方式：
 * - Tauri 跳转到 web URL 并附带 ?__bfe_port=18000&__bfe_token=xxx
 * - token 从 URL 读取后立即通过 history.replaceState 清除
 * - 优先读 window.__BFE_BACKEND_INFO__，降级 URL query param
 */

export type RuntimeEnv = 'browser' | 'desktop'

export interface BackendInfo {
  baseUrl: string
  token: string
  port: number
}

/** 缓存的 backend 信息 */
let cachedInfo: BackendInfo | null = null

/**
 * 检测当前运行环境
 */
export function detectRuntimeEnv(): RuntimeEnv {
  if (typeof window === 'undefined') return 'browser'

  // Tauri 桌面端：URL 中包含 __bfe_port 参数
  const params = new URLSearchParams(window.location.search)
  if (params.has('__bfe_port')) {
    return 'desktop'
  }

  return 'browser'
}

/**
 * 获取后端连接信息
 *
 * 桌面端：从 URL query param `__bfe_port` 和 `__bfe_token` 读取
 * 浏览器端：返回 Vite proxy 配置
 */
export async function getBackendInfo(): Promise<BackendInfo | null> {
  if (cachedInfo) return cachedInfo

  if (detectRuntimeEnv() === 'desktop') {
    const params = new URLSearchParams(window.location.search)
    const port = params.get('__bfe_port')
    const token = params.get('__bfe_token') || ''

    // 读取后立即清除敏感 URL 参数（token 存内存，不留在浏览器历史中）
    if (port || token) {
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('__bfe_port')
      cleanUrl.searchParams.delete('__bfe_token')
      history.replaceState(null, '', cleanUrl.toString())
    }

    if (port) {
      cachedInfo = {
        baseUrl: `http://127.0.0.1:${port}`,
        token,
        port: Number(port),
      }
      syncToWindow(cachedInfo)
      return cachedInfo
    }
  }

  // 浏览器模式
  cachedInfo = {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
    token: '',
    port: 0,
  }
  return cachedInfo
}

/**
 * 将缓存的 BackendInfo 同步到 window.__BFE_BACKEND_INFO__，
 * 确保 api.ts 和 useDownload.ts 的裸 fetch 调用能读到 token。
 */
function syncToWindow(info: BackendInfo): void {
  if (typeof window !== 'undefined') {
    const g = window as unknown as Record<string, unknown>
    g.__BFE_BACKEND_INFO__ = info
  }
}

/**
 * 获取 API base URL（同步，需先调用 getBackendInfo / initTauriRuntime）
 */
export function getApiBaseUrlSync(): string {
  if (cachedInfo) return cachedInfo.baseUrl
  return import.meta.env.VITE_API_BASE_URL || '/api'
}

/**
 * 获取 API base URL（便捷方法）
 */
export async function getApiBaseUrl(): Promise<string> {
  const info = await getBackendInfo()
  return info?.baseUrl || '/api'
}

/**
 * 将相对后端路径转为绝对 URL
 *
 * 桌面端：/api/v1/jobs/xxx/result → http://127.0.0.1:18000/api/v1/jobs/xxx/result
 * 浏览器端：保持原样（Vite proxy 或同源部署）
 */
export function resolveBackendUrl(path: string): string {
  if (!path) return path
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  // 桌面模式：直接从 URL query 读取端口和 token，读后清除
  if (detectRuntimeEnv() === 'desktop') {
    const params = new URLSearchParams(window.location.search)
    const port = params.get('__bfe_port')
    const token = params.get('__bfe_token') || ''
    if (port) {
      // 清除敏感参数
      const cleanUrl = new URL(window.location.href)
      cleanUrl.searchParams.delete('__bfe_port')
      cleanUrl.searchParams.delete('__bfe_token')
      history.replaceState(null, '', cleanUrl.toString())

      cachedInfo = { baseUrl: `http://127.0.0.1:${port}`, token, port: Number(port) }
      syncToWindow(cachedInfo)
      return `${cachedInfo.baseUrl}${path}`
    }
  }
  return path
}

/**
 * 初始化运行时 — 等待后端就绪
 * 桌面端会轮询 /healthz 直到后端就绪（最长 15 秒）
 */
export async function initTauriRuntime(): Promise<BackendInfo | null> {
  if (detectRuntimeEnv() !== 'desktop') {
    return null
  }

  const info = await getBackendInfo()
  if (!info) return null

  // 轮询等待后端就绪
  for (let i = 0; i < 30; i++) {
    try {
      const resp = await fetch(`${info.baseUrl}/healthz`)
      if (resp.ok) {
        console.info('[runtime] 后端就绪:', info.baseUrl)
        return info
      }
    } catch {
      // 后端尚未就绪，继续等待
    }
    await new Promise((r) => setTimeout(r, 500))
  }

  console.error('[runtime] 后端启动超时')
  return null
}
