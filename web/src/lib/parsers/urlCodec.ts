/**
 * URL 编解码 — 纯函数
 *
 * 安全策略：
 * - decodeURIComponent 捕获 malformed URI 错误，不崩溃
 * - 参数解析容错非标准格式
 */

/** 查询参数条目 */
export interface QueryParam {
  key: string
  value: string
}

/**
 * 对整体 URL 字符串进行编码（保留协议和域名中的特殊字符）
 */
export function encodeUrl(text: string): string {
  try {
    // 尝试用 URL 类解析以保留结构字符
    const url = new URL(text)
    url.search = encodeUrlComponent(url.searchParams.toString())
    return url.toString()
  } catch {
    return encodeURIComponent(text)
  }
}

/**
 * 整体 URL 解码，容错处理 malformed percent encoding
 */
export function decodeUrl(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    // 逐个 % 段尝试解码，跳过无法解码的部分
    return text.replace(/%[0-9A-Fa-f]{2}/g, (match) => {
      try {
        return decodeURIComponent(match)
      } catch {
        return match
      }
    })
  }
}

/**
 * 编码 URL 组件（query param value）
 */
export function encodeUrlComponent(text: string): string {
  return encodeURIComponent(text)
}

/**
 * 解析 URL 查询参数字符串为键值对数组
 */
export function parseQueryParams(url: string): QueryParam[] {
  const params: QueryParam[] = []

  let queryString = ''
  try {
    const parsed = new URL(url)
    queryString = parsed.search
  } catch {
    // 非完整 URL，提取 ? 后面的部分
    const idx = url.indexOf('?')
    queryString = idx >= 0 ? url.slice(idx) : ''
    if (!queryString.startsWith('?')) queryString = '?' + queryString
  }

  if (!queryString || queryString === '?') return params

  const search = queryString.startsWith('?') ? queryString.slice(1) : queryString
  const pairs = search.split('&')

  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx < 0) {
      params.push({ key: decodeUrl(pair), value: '' })
    } else {
      params.push({
        key: decodeUrl(pair.slice(0, eqIdx)),
        value: decodeUrl(pair.slice(eqIdx + 1)),
      })
    }
  }

  return params
}

/**
 * 从基础 URL 和参数数组构建完整 URL
 */
export function buildUrl(base: string, params: QueryParam[]): string {
  const searchParts = params.map((p) =>
    `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`
  )
  const search = searchParts.join('&')

  // 移除 base 中已有的查询参数
  const baseWithoutSearch = base.split('?')[0]
  return search ? `${baseWithoutSearch}?${search}` : baseWithoutSearch
}
