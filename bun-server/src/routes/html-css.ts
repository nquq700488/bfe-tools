import { Elysia, t } from 'elysia'
import { compressHtml, compressCss, formatHtml, formatCss, analyzeCss } from '../lib/html-css'

export const htmlCssRouter = new Elysia({ prefix: '/api/bun/html-css' })

  // ── HTML 压缩 ──
  .post('/compress-html', ({ body }) => {
    const { result, saved } = compressHtml(body.html)
    return { success: true, data: { result, saved, savedPercent: body.originalSize ? Math.round(saved / body.originalSize * 1000) / 10 : 0 } }
  }, {
    body: t.Object({
      html: t.String({ minLength: 1, error: '请输入 HTML 内容' }),
      originalSize: t.Optional(t.Number()),
    }),
  })

  // ── HTML 格式化 ──
  .post('/format-html', ({ body }) => {
    const result = formatHtml(body.html, body.indentSize ?? 2)
    return { success: true, data: { result } }
  }, {
    body: t.Object({
      html: t.String({ minLength: 1 }),
      indentSize: t.Optional(t.Number({ minimum: 1, maximum: 8 })),
    }),
  })

  // ── CSS 压缩 ──
  .post('/compress-css', ({ body }) => {
    const { result, saved } = compressCss(body.css)
    return { success: true, data: { result, saved, savedPercent: body.originalSize ? Math.round(saved / body.originalSize * 1000) / 10 : 0 } }
  }, {
    body: t.Object({
      css: t.String({ minLength: 1, error: '请输入 CSS 内容' }),
      originalSize: t.Optional(t.Number()),
    }),
  })

  // ── CSS 格式化 ──
  .post('/format-css', ({ body }) => {
    const result = formatCss(body.css, body.indentSize ?? 2)
    return { success: true, data: { result } }
  }, {
    body: t.Object({
      css: t.String({ minLength: 1 }),
      indentSize: t.Optional(t.Number({ minimum: 1, maximum: 8 })),
    }),
  })

  // ── CSS 分析 ──
  .post('/analyze-css', ({ body }) => {
    const stats = analyzeCss(body.css)
    return { success: true, data: stats }
  }, {
    body: t.Object({
      css: t.String({ minLength: 1 }),
    }),
  })
