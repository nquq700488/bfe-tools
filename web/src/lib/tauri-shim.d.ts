/**
 * Tauri API 类型垫片
 * 运行在浏览器模式时 @tauri-apps/api 不存在，
 * 本文件提供最小类型声明以通过 TypeScript 编译。
 */

declare module '@tauri-apps/api/core' {
  export function invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>
}

declare module '@tauri-apps/api/event' {
  interface Event<T> {
    payload: T
    id: number
  }
  export function listen<T = unknown>(
    event: string,
    handler: (event: Event<T>) => void
  ): Promise<() => void>
}

interface Window {
  __TAURI_INTERNALS__?: unknown
  __BFE_BACKEND_INFO__?: {
    baseUrl: string
    token: string
    port: number
  }
}
