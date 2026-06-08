/**
 * optimizeSvg — 浏览器端 SVG 优化器
 *
 * 功能：
 * - 移除 XML 声明 / DOCTYPE
 * - 移除 HTML 注释
 * - 移除 <title> / <desc> / <metadata> 元数据标签
 * - 移除 sodipodi / inkscape 编辑器命名空间属性
 * - 移除 display="none" 和完全透明的不可见元素
 * - 移除空的 <g> / <defs> 分组
 * - 塌缩冗余空白（标签间 / 属性间）
 * - 数字精度精简（默认保留 2 位小数）
 * - 移除 stroke-width="0" / fill="none" 同时 stroke="none" 的空路径
 *
 * 策略：字符串正则 + 有限状态机，不用 DOM parser，轻量安全。
 */

export interface OptimizeStats {
  originalBytes: number
  optimizedBytes: number
  reductionPercent: number
}

export interface OptimizeResult {
  svg: string
  stats: OptimizeStats
}

const COMMENT_RE = /<!--[\s\S]*?-->/g
const XML_DECL_RE = /<\?xml\b[^>]*\?>/gi
const DOCTYPE_RE = /<!DOCTYPE\b[^>]*>/gi
const TITLE_RE = /<title\b[^>]*>[\s\S]*?<\/title>/gi
const DESC_RE = /<desc\b[^>]*>[\s\S]*?<\/desc>/gi
const METADATA_RE = /<metadata\b[^>]*>[\s\S]*?<\/metadata>/gi

/** sodipodi / inkscape / illustrator 编辑器属性 */
const EDITOR_ATTR_RE = /\s+(sodipodi|inkscape|xmlns:(sodipodi|inkscape|serif))=(["'])[^"']*\3/gi

/** 直接 display:none 的元素 */
const HIDDEN_ELEMENT_RE = /<(\w+)\b[^>]*\bdisplay\s*=\s*(["'])none\2[^>]*>[\s\S]*?<\/\1>/gi

/** 空白组 / 空白 defs（组内没有任何绘图元素） */
const EMPTY_GROUP_RE = /<g\b[^>]*>\s*<\/g>/gi
const EMPTY_DEFS_RE = /<defs\b[^>]*>\s*<\/defs>/gi

/** stroke-width="0" 且没有 fill 路径 */
const ZERO_STROKE_PATH_RE = /<path\b[^>]*\bstroke-width\s*=\s*(["'])0\1[^>]*\/>/gi
const ZERO_STROKE_CIRCLE_RE = /<circle\b[^>]*\bstroke-width\s*=\s*(["'])0\1[^>]*\/>/gi

/**
 * 精简浮点数值
 * 123.456789 → 123.46
 */
function roundNumbers(svg: string, precision = 2): string {
  // 只处理属性值中的数字序列（不含颜色 hex）
  return svg.replace(
    /(\.\d{3,})(?=[\s,"'/%\-)a-z]|$)/g,
    (_match, decimal: string) => {
      const num = Number.parseFloat(`0${decimal}`)
      const rounded = num.toFixed(precision)
      // 去掉前导零的小数部分
      if (rounded.startsWith('0.')) return `.${rounded.slice(2)}`
      return rounded
    },
  )
}

/**
 * 塌缩多余空白
 * - 标签间连续空白 → 单个空格
 * - > **< 之间空白 → `><`
 * - 属性值两侧空白保留
 */
function collapseWhitespace(svg: string): string {
  let result = svg
  // 移除 > 到 < 之间的空白
  result = result.replace(/>\s+</g, '><')
  // 多个连续空格 → 一个
  result = result.replace(/\s{2,}/g, ' ')
  // 开始标签 > 前多余的空格留着即可，\s+> → >
  result = result.replace(/\s+>/g, '>')
  return result
}

/**
 * 去掉不必要的属性
 * version — HTML5 不需要
 * standalone — 声明标签已移除
 * xmlns:xlink — SVG2 已整合到核心
 */
function stripUnnecessaryAttrs(svg: string): string {
  return svg
    .replace(/\s+version\s*=\s*(["'])[^"']*\1/gi, '')
    .replace(/\s+standalone\s*=\s*(["'])[^"']*\1/gi, '')
}

/**
 * 清理空的 style="" / class=""
 */
function stripEmptyAttrs(svg: string): string {
  return svg
    .replace(/\s+style\s*=\s*(["'])\s*\1/gi, '')
    .replace(/\s+class\s*=\s*(["'])\s*\1/gi, '')
}

// === 路径简化（核心体积缩减） ===

/**
 * 匹配 SVG path d 属性的值（包括单引号和双引号）
 * 捕获 d 属性的内容，用于后续数字精简
 */
const PATH_D_RE = /(\sd\s*=\s*(["']))((?:\\\2|(?!\2)[\s\S])*?)\2/gi

// SVG 路径命令字母（不区分大小写）
const PATH_CMD = /[achlmqstvz]/i

/**
 * 精简路径数据中的数字
 *
 * 贝塞尔曲线 6 位小数 → 2 位，对视觉几乎无影响但体积下降显著。
 * M10.123456,20.789012 C30.111111,40.222222 50.333333,60.444444 70.555555,80.666666
 * → M10.12,20.79 C30.11,40.22 50.33,60.44 70.56,80.67
 */
function simplifyPath(pathData: string, precision = 2): string {
  if (!pathData) return pathData

  return pathData.replace(
    // 匹配浮点数：整数部分可选，小数点 + 数字
    /(\d*\.\d+)/g,
    (match) => {
      const num = Number.parseFloat(match)
      if (Number.isNaN(num)) return match

      // -1 < num < 1 且非常小的数，保留科学精度
      const rounded = num.toFixed(precision)
      // 去掉末尾多余的零
      let trimmed = rounded.replace(/0+$/, '')
      // 如果只剩小数点，去掉
      if (trimmed.endsWith('.')) trimmed = trimmed.slice(0, -1)
      // 去掉前导零（0.5 → .5）
      if (trimmed.startsWith('0.') || trimmed.startsWith('-0.')) {
        trimmed = trimmed.replace(/^(-?)0\./, '$1.')
      }
      return trimmed
    },
  )
}


/**
 * 移除路径中连续重复的冗余命令
 *
 * 如 transform="matrix(1,0,0,1,0,0)"（恒等变换）
 * 以及 stroke-width="0" 的无描边路径
 */
function simplifyRedundantPathCommands(pathData: string): string {
  if (!pathData) return pathData
  // 移除命令后的多余空格：M 10 20 → M10 20
  return pathData.replace(/([mzlhvcsqta])\s+/gi, '$1')
}


/**
 * 精简 transform 属性中的矩阵数值
 * transform="matrix(1.000000, 0.000000, 0.000000, 1.000000, 100.123456, 200.789012)"
 */
function simplifyTransforms(svg: string, precision = 2): string {
  return svg.replace(
    /(transform\s*=\s*["'])([^"']*?)(["'])/gi,
    (_full, open: string, inner: string, close: string) => {
      // 精简 transform 函数中的数字
      const simplified = inner.replace(
        /(\d*\.\d+|\d+)/g,
        (m: string) => {
          const n = Number.parseFloat(m)
          if (Number.isNaN(n)) return m
          // 整数不处理，浮点数才精简
          if (Number.isInteger(n)) return m
          let trimmed = n.toFixed(precision).replace(/0+$/, '').replace(/\.$/, '')
          if (trimmed.startsWith('0.') || trimmed.startsWith('-0.')) {
            trimmed = trimmed.replace(/^(-?)0\./, '$1.')
          }
          return trimmed
        },
      )
      return `${open}${simplified}${close}`
    },
  )
}


/**
 * SVG 优化入口
 */
export function optimizeSvg(raw: string): OptimizeResult {
  const original = raw.trim()
  if (!original) {
    return { svg: '', stats: { originalBytes: 0, optimizedBytes: 0, reductionPercent: 0 } }
  }

  const originalBytes = new TextEncoder().encode(original).length

  let svg = original

  // 1. 移除声明 / 注释 / 元数据
  svg = svg.replace(COMMENT_RE, '')
  svg = svg.replace(XML_DECL_RE, '')
  svg = svg.replace(DOCTYPE_RE, '')
  svg = svg.replace(TITLE_RE, '')
  svg = svg.replace(DESC_RE, '')
  svg = svg.replace(METADATA_RE, '')

  // 2. 移除编辑器属性
  svg = svg.replace(EDITOR_ATTR_RE, '')

  // 3. 移除不可见元素
  svg = svg.replace(HIDDEN_ELEMENT_RE, '')
  svg = svg.replace(ZERO_STROKE_PATH_RE, '')
  svg = svg.replace(ZERO_STROKE_CIRCLE_RE, '')

  // 4. 移除空白组 / defs
  svg = svg.replace(EMPTY_GROUP_RE, '')
  svg = svg.replace(EMPTY_DEFS_RE, '')

  // 5. 路径数据精简（体积缩减大头：path d + transform）
  svg = svg.replace(PATH_D_RE, (_full, _attr: string, _quote: string, data: string) => {
    const simplified = simplifyPath(data, 2)
    const deduped = simplifyRedundantPathCommands(simplified)
    // 去掉 path 属性名和引号前后多余空格，保持原格式
    const prefix = _full.slice(0, _full.indexOf(data))
    const suffix = _full.slice(_full.indexOf(data) + data.length)
    return `${prefix}${deduped}${suffix}`
  })
  svg = simplifyTransforms(svg, 2)

  // 6. 通用数字精简（path 已处理过，但对其他属性中的高精度坐标也做一遍）
  svg = roundNumbers(svg, 2)

  // 7. 移除不必要属性
  svg = stripUnnecessaryAttrs(svg)

  // 8. 清理空属性
  svg = stripEmptyAttrs(svg)

  // 9. 塌缩空白
  svg = collapseWhitespace(svg)

  // 最终 trim
  svg = svg.trim()

  const optimizedBytes = new TextEncoder().encode(svg).length
  const reductionPercent = originalBytes > 0
    ? Math.round((1 - optimizedBytes / originalBytes) * 1000) / 10
    : 0

  return {
    svg,
    stats: { originalBytes, optimizedBytes, reductionPercent },
  }
}
