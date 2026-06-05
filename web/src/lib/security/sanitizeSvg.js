/**
 * SVG 安全清洗
 *
 * 策略：使用 DOMParser 解析 SVG，移除危险元素和属性：
 * - script 标签
 * - on* 事件处理器属性
 * - 外部引用（href/xlink:href 指向外部 URL、data:image/svg+xml 等可嵌入内容）
 * - foreignObject（可能包含 HTML/脚本）
 * - 可执行 data URI
 * - CSS url() 外部引用
 */
/** 危险的 SVG 元素 */
const DANGEROUS_ELEMENTS = [
    'script',
    'foreignObject',
    'use', // 如果 xlink:href 指向外部需要考虑，一并清洗其引用属性
];
/** 事件处理器属性前缀 */
const EVENT_ATTR_PREFIX = 'on';
/** 需要检查的外部引用属性 */
const EXTERNAL_REF_ATTRS = ['href', 'xlink:href', 'src'];
/**
 * 检查 URL 是否为危险协议（包括可执行脚本或可嵌入外部内容）
 */
function isDangerousUrl(value) {
    const trimmed = value.trim().toLowerCase();
    return (trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:') || // 阻止所有 data: URI（含 image/svg+xml）
        trimmed.startsWith('vbscript:') ||
        trimmed.startsWith('http://') || // 阻断外部 HTTP 引用
        trimmed.startsWith('https://') // 阻断外部 HTTPS 引用
    );
}
/**
 * 清洗 SVG 字符串，移除危险内容。
 * 解析失败时返回空字符串，调用方不应使用未清洗的原始输入。
 */
export function sanitizeSvg(svgString) {
    if (!svgString)
        return '';
    if (typeof DOMParser === 'undefined') {
        // SSR 降级：简单正则清洗后返回
        // 无法保证完全安全，调用方应在浏览器环境重新清洗
        return svgString
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/gi, '')
            .replace(/\bon\w+\s*=\s*"[^"]*"/gi, '')
            .replace(/\bon\w+\s*=\s*'[^']*'/gi, '');
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const svg = doc.documentElement;
    // 解析失败（非 SVG 内容或 parse error）— 返回空字符串，不允许未清洗内容泄露
    if (!svg || svg.tagName !== 'svg') {
        return '';
    }
    // 检查是否有 parse error（解析器错误节点）
    const parserError = doc.querySelector('parsererror');
    if (parserError) {
        return '';
    }
    sanitizeElement(svg);
    // 二次正则安全网：DOM 解析器在不同环境行为可能有差异，额外正则清洗确保安全
    let result = new XMLSerializer().serializeToString(svg);
    // 二次正则安全网：DOM 解析器在不同环境行为可能有差异，确保所有危险模式被清洗
    // 匹配双引号和单引号两种序列化格式
    result = result.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    result = result.replace(/<foreignObject\b[^>]*>[\s\S]*?<\/foreignObject>/gi, '');
    result = result.replace(/<use\b[^>]*\/?>/gi, '');
    result = result.replace(/\bon\w+\s*=\s*"[^"]*"/gi, '');
    result = result.replace(/\bon\w+\s*=\s*'[^']*'/gi, '');
    result = result.replace(/\b(href|xlink:href|src)\s*=\s*"data:[^"]*"/gi, '');
    result = result.replace(/\b(href|xlink:href|src)\s*=\s*'data:[^']*'/gi, '');
    result = result.replace(/\b(href|xlink:href|src)\s*=\s*"https?:\/\/[^"]*"/gi, '');
    result = result.replace(/\b(href|xlink:href|src)\s*=\s*'https?:\/\/[^']*'/gi, '');
    result = result.replace(/\b(href|xlink:href|src)\s*=\s*"javascript:[^"]*"/gi, '');
    result = result.replace(/\b(href|xlink:href|src)\s*=\s*'javascript:[^']*'/gi, '');
    result = result.replace(/\bstyle\s*=\s*"[^"]*url\s*\([^)]*\)[^"]*"/gi, '');
    result = result.replace(/\bstyle\s*=\s*'[^']*url\s*\([^)]*\)[^']*'/gi, '');
    return result;
}
/**
 * 递归清洗 DOM 元素
 */
function sanitizeElement(el) {
    // 移除危险元素
    if (DANGEROUS_ELEMENTS.includes(el.tagName.toLowerCase())) {
        el.remove();
        return;
    }
    // 移除事件处理器属性和危险引用
    const attrsToRemove = [];
    for (const attr of el.attributes) {
        const attrLower = attr.name.toLowerCase();
        // 事件处理器
        if (attrLower.startsWith(EVENT_ATTR_PREFIX)) {
            attrsToRemove.push(attr.name);
            continue;
        }
        // 外部引用属性
        if (EXTERNAL_REF_ATTRS.includes(attrLower) || attrLower.endsWith(':href')) {
            if (isDangerousUrl(attr.value)) {
                attrsToRemove.push(attr.name);
            }
        }
        // CSS 属性中的 url() 引用
        if (attrLower === 'style' && /url\s*\(/i.test(attr.value)) {
            attrsToRemove.push(attr.name);
        }
    }
    for (const name of attrsToRemove) {
        el.removeAttribute(name);
    }
    // 递归子元素
    for (const child of [...el.children]) {
        sanitizeElement(child);
    }
}
