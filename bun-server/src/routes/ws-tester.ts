import { Elysia } from 'elysia'

/** 活跃的 WebSocket 连接 */
const activeConnections = new Map<string, { url: string; createdAt: number }>()

export const wsTesterRouter = new Elysia({ prefix: '/api/bun/ws-tester' })

  // ── 代理 WebSocket 连接 ──
  .ws('/proxy', {
    open(ws) {
      const id = crypto.randomUUID()
      ;(ws as any)._id = id
      ;(ws as any)._targetWs = null

      activeConnections.set(id, { url: '(pending)', createdAt: Date.now() })
      ws.send(JSON.stringify({ type: 'connected', id, message: '已连接。发送 {\"type\":\"connect\",\"url\":\"wss://...\"}' }))
    },

    async message(ws, msg) {
      let data: Record<string, unknown>
      try {
        data = typeof msg === 'string' ? JSON.parse(msg) : (msg as any)
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: '消息格式错误，需要 JSON' }))
        return
      }

      const id = (ws as any)._id

      switch (data.type) {
        case 'connect': {
          const targetUrl = String(data.url || '')
          if (!targetUrl || !targetUrl.startsWith('ws')) {
            ws.send(JSON.stringify({ type: 'error', message: '请输入 ws:// 或 wss:// 开头的地址' }))
            return
          }

          // 关闭旧的
          const old = (ws as any)._targetWs as WebSocket | null
          if (old) old.close()

          try {
            const target = new WebSocket(targetUrl)
            ;(ws as any)._targetWs = target

            target.addEventListener('open', () => {
              ws.send(JSON.stringify({ type: 'proxy-connected', url: targetUrl, message: `已连接 ${targetUrl}` }))
              if (id) activeConnections.set(id, { url: targetUrl, createdAt: Date.now() })
            })

            target.addEventListener('message', (event: MessageEvent) => {
              ws.send(JSON.stringify({
                type: 'message', direction: 'in',
                data: typeof event.data === 'string' ? event.data : '[binary]',
                timestamp: Date.now(),
              }))
            })

            target.addEventListener('close', (event: CloseEvent) => {
              ws.send(JSON.stringify({ type: 'closed', direction: 'remote', code: event.code, reason: event.reason }))
            })

            target.addEventListener('error', () => {
              ws.send(JSON.stringify({ type: 'error', message: 'WebSocket 连接错误' }))
            })
          } catch (e) {
            ws.send(JSON.stringify({ type: 'error', message: `连接失败：${e instanceof Error ? e.message : e}` }))
          }
          break
        }

        case 'send': {
          const target = (ws as any)._targetWs as WebSocket | null
          if (!target || target.readyState !== WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'error', message: '未连接，请先 connect' }))
            return
          }
          const payload = typeof data.data === 'string' ? data.data : JSON.stringify(data.data)
          target.send(payload)
          ws.send(JSON.stringify({ type: 'message', direction: 'out', data: payload, timestamp: Date.now() }))
          break
        }

        case 'disconnect': {
          const target = (ws as any)._targetWs as WebSocket | null
          if (target) target.close()
          ws.send(JSON.stringify({ type: 'disconnected', message: '已断开' }))
          break
        }

        default:
          ws.send(JSON.stringify({ type: 'error', message: `未知类型：${data.type}。支持：connect, send, disconnect` }))
      }
    },

    close(ws) {
      const target = (ws as any)._targetWs as WebSocket | null
      if (target) target.close()
      const id = (ws as any)._id
      if (id) activeConnections.delete(id)
    },
  })

  // ── 活跃连接 ──
  .get('/connections', () => ({
    connections: [...activeConnections.values()],
    count: activeConnections.size,
  }))
