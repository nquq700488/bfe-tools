import { Elysia, t } from 'elysia'

/**
 * 文件代理 — 获取远程文件的原始内容并返回给前端
 * 用于文件预览工具绕过浏览器 CORS 限制
 */
export const fileProxyRouter = new Elysia({ prefix: '/api/bun/file-proxy' })

  .post('/fetch', async ({ body }) => {
    const url = new URL(body.url)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return Response.json(
        { success: false, error: '仅支持 http/https 协议' },
        { status: 400 },
      )
    }

    // SSRF 防护 — 阻断内网地址
    const hostname = url.hostname.toLowerCase()
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname === '0.0.0.0' ||
      hostname.endsWith('.local')
    ) {
      return Response.json(
        { success: false, error: '不允许访问内网地址' },
        { status: 403 },
      )
    }

    try {
      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(body.timeout ?? 60_000),
        headers: body.userAgent
          ? { 'User-Agent': body.userAgent }
          : undefined,
      })

      if (!res.ok) {
        return Response.json(
          {
            success: false,
            error: `请求失败：HTTP ${res.status} ${res.statusText}`,
            status: res.status,
          },
          { status: 200 },
        )
      }

      // 检查文件大小
      const contentLength = res.headers.get('content-length')
      const maxSize = body.maxSize ?? 200 * 1024 * 1024 // 默认 200MB
      if (contentLength && parseInt(contentLength, 10) > maxSize) {
        return Response.json(
          {
            success: false,
            error: `文件过大（${(parseInt(contentLength, 10) / 1024 / 1024).toFixed(1)}MB），最大 ${(maxSize / 1024 / 1024).toFixed(0)}MB`,
          },
          { status: 200 },
        )
      }

      // 返回原始二进制数据
      const arrayBuffer = await res.arrayBuffer()
      const contentType = res.headers.get('content-type') || 'application/octet-stream'

      return new Response(arrayBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(arrayBuffer.byteLength),
          'X-Proxied-From': url.toString(),
          'X-Original-Status': String(res.status),
          'Access-Control-Expose-Headers': 'X-Proxied-From, X-Original-Status, Content-Type',
        },
      })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('timed out') || msg.includes('aborted')) {
        return Response.json(
          { success: false, error: `请求超时（${(body.timeout || 60_000) / 1000}s）` },
          { status: 200 },
        )
      }
      return Response.json(
        { success: false, error: `请求失败：${msg}` },
        { status: 200 },
      )
    }
  }, {
    body: t.Object({
      url: t.String({ minLength: 1, error: '请输入目标 URL' }),
      timeout: t.Optional(t.Number({ minimum: 5000, maximum: 300_000, default: 60_000 })),
      maxSize: t.Optional(t.Number({ minimum: 0, maximum: 500 * 1024 * 1024, default: 200 * 1024 * 1024 })),
      userAgent: t.Optional(t.String()),
    }),
  })
