/**
 * HTML/CSS 处理工具 — 压缩、格式化、分析
 */

// === HTML ===

/** HTML 压缩（移除空白和注释） */
export function compressHtml(html: string): { result: string; saved: number } {
  const original = new TextEncoder().encode(html).length
  const result = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/gm, '')
    .trim()
  const compressed = new TextEncoder().encode(result).length
  return { result, saved: original - compressed }
}

/** HTML 格式化（缩进美化） */
export function formatHtml(html: string, indentSize = 2): string {
  const indent = ' '.repeat(indentSize)
  const selfClosing = [
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
    'link', 'meta', 'param', 'source', 'track', 'wbr',
  ]
  let result = ''
  let level = 0

  // 先用简单 tokenizer 处理
  const tokens = html.match(/<[^>]+>|[^<]+/g) || []
  for (const token of tokens) {
    if (token.startsWith('</')) {
      level = Math.max(0, level - 1)
      result += `${indent.repeat(level)}${token}\n`
    } else if (token.startsWith('<')) {
      const tagMatch = token.match(/^<\/?(\w+)/)
      const tagName = tagMatch?.[1]?.toLowerCase()
      const isSelfClosing = token.endsWith('/>') || (tagName && selfClosing.includes(tagName))

      result += `${indent.repeat(level)}${token}\n`
      if (!isSelfClosing && tagName) level++
    } else {
      const trimmed = token.trim()
      if (trimmed) result += `${indent.repeat(level)}${trimmed}\n`
    }
  }
  return result.trim()
}


// === CSS ===

/** CSS 压缩（移除注释、空白、末尾分号） */
export function compressCss(css: string): { result: string; saved: number } {
  const original = new TextEncoder().encode(css).length
  const result = css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/;\s*}/g, '}')
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    .replace(/:\s*/g, ':')
    .replace(/;\s*/g, ';')
    .replace(/,\s*/g, ',')
    .replace(/}\s*/g, '}')
    .trim()
  const compressed = new TextEncoder().encode(result).length
  return { result, saved: original - compressed }
}

/** CSS 格式化（缩进美化） */
export function formatCss(css: string, indentSize = 2): string {
  const indent = ' '.repeat(indentSize)
  // 去除已有空白
  let raw = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ').trim()
  let result = ''
  let level = 1
  const tokens = raw.split(/([{};])/)
  for (const token of tokens) {
    const t = token.trim()
    if (!t) continue
    if (t === '{') {
      result += ` {\n`
      level++
    } else if (t === '}') {
      level = Math.max(0, level - 1)
      result += `${indent.repeat(level)}}\n`
    } else if (t === ';') {
      result += ';\n'
    } else {
      result += `${indent.repeat(level)}${t}`
    }
  }
  return result.trim()
}

/** CSS 统计信息 */
export function analyzeCss(css: string) {
  const rules = css.match(/[^{}]+\{[^}]*\}/g) || []
  const selectors = css.match(/[^{},]+,|[^{}]+(?=\{)/g) || []
  const properties = css.match(/[\w-]+\s*:/g) || []
  const colors = css.match(/#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?)\([^)]+\)|\b[a-z]+(?=\s*[;!}])/g) || []

  return {
    ruleCount: rules.length,
    selectorCount: selectors.length,
    propertyCount: properties.length,
    colors: [...new Set(colors)],
    size: new TextEncoder().encode(css).length,
  }
}
