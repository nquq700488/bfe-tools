import { Elysia, t } from 'elysia'

export const apiTesterRouter = new Elysia({ prefix: '/api/bun/api-tester' })

  // ── 代理 HTTP 请求（绕过浏览器 CORS）──
  .post('/request', async ({ body }) => {
    const url = new URL(body.url)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { success: false, error: '仅支持 http/https 协议' }
    }

    const headers: Record<string, string> = {}
    if (body.headers) {
      for (const h of body.headers) {
        if (h.name && h.value) headers[h.name] = h.value
      }
    }

    const start = performance.now()
    try {
      const res = await fetch(url.toString(), {
        method: body.method,
        headers,
        body: body.method !== 'GET' && body.method !== 'HEAD' && body.requestBody
          ? body.requestBody
          : undefined,
        signal: AbortSignal.timeout(30_000),
      })

      const elapsed = Math.round(performance.now() - start)
      const responseHeaders: Record<string, string> = {}
      res.headers.forEach((v, k) => { responseHeaders[k] = v })

      const responseBody = await res.text()

      return {
        success: true,
        data: {
          status: res.status,
          statusText: res.statusText,
          headers: responseHeaders,
          body: responseBody,
          elapsedMs: elapsed,
          bodySize: new TextEncoder().encode(responseBody).length,
        },
      }
    } catch (e: unknown) {
      const elapsed = Math.round(performance.now() - start)
      const msg = e instanceof Error ? e.message : String(e)
      return {
        success: false,
        error: msg.includes('timed out') || msg.includes('aborted')
          ? `请求超时（30s）`
          : `请求失败：${msg}`,
        data: { elapsedMs: elapsed },
      }
    }
  }, {
    body: t.Object({
      url: t.String({ minLength: 1, error: '请输入目标 URL' }),
      method: t.String({ default: 'GET' }),
      headers: t.Optional(t.Array(t.Object({
        name: t.String(),
        value: t.String(),
      }))),
      requestBody: t.Optional(t.String()),
    }),
  })
