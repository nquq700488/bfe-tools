import { Elysia } from 'elysia'
import { htmlCssRouter } from './routes/html-css'
import { apiTesterRouter } from './routes/api-tester'
import { wsTesterRouter } from './routes/ws-tester'
import { fileProxyRouter } from './routes/file-proxy'

const PORT = Number(Bun.env.BFE_BUN_PORT) || 3999
const CORS_ORIGINS = (Bun.env.BFE_BUN_CORS || 'http://localhost:5173,http://localhost:5174').split(',').map(s => s.trim())

const app = new Elysia()
  .use(htmlCssRouter)
  .use(apiTesterRouter)
  .use(wsTesterRouter)
  .use(fileProxyRouter)

  // Health check
  .get('/healthz', () => ({ status: 'ok', runtime: 'bun', version: Bun.version }))

  // Global CORS
  .onRequest(({ request, set }) => {
    const origin = request.headers.get('origin')
    if (origin && CORS_ORIGINS.some(o => origin.startsWith(o))) {
      set.headers['Access-Control-Allow-Origin'] = origin
      set.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
      set.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    }
  })
  .options('/*', ({ set }) => {
    set.status = 204
    return ''
  })

  .listen(PORT)

console.log(`🔥 BFE-Bun 已启动 → http://localhost:${PORT}`)
console.log(`   CORS: ${CORS_ORIGINS.join(', ')}`)
console.log(`   Routes: /api/bun/html-css, /api/bun/api-tester, /api/bun/ws-tester, /api/bun/file-proxy`)

export type App = typeof app
