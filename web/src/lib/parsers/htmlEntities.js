/**
 * HTML 实体编解码 — 纯函数
 *
 * 安全策略：
 * - 解码使用浏览器 textarea 的 innerHTML/textContent 机制（自动处理脚本块）
 * - 编码使用映射表 + 非 ASCII 字符转为数字实体
 * - 支持命名实体和数字实体（&#12345; &#x4e2d;）
 */
/** 常用 HTML 命名实体映射表 */
const NAMED_ENTITIES = {
    lt: '<',
    gt: '>',
    amp: '&',
    quot: '"',
    apos: "'",
    nbsp: ' ',
    copy: '©',
    reg: '®',
    trade: '™',
    mdash: '—',
    ndash: '–',
    lsquo: '‘',
    rsquo: '’',
    ldquo: '“',
    rdquo: '”',
    hellip: '…',
    middot: '·',
    laquo: '«',
    raquo: '»',
    lsquor: '‚',
    rsquor: '‛',
    sbquo: '‚',
    bdquo: '„',
    dagger: '†',
    Dagger: '‡',
    permil: '‰',
    lsaquo: '‹',
    rsaquo: '›',
    euro: '€',
    pound: '£',
    yen: '¥',
    cent: '¢',
    sect: '§',
};
/** 编码 → 实体反向映射 */
const ENTITY_TO_CHAR = {};
for (const [name, char] of Object.entries(NAMED_ENTITIES)) {
    ENTITY_TO_CHAR[`&${name};`] = char;
}
/**
 * 编码 HTML 实体：将 < > & " ' 替换为命名实体，非 ASCII 转为数字实体
 */
export function encodeHtmlEntities(text) {
    return text.replace(/[<>&"' -香]/g, (ch) => {
        if (ch === '<')
            return '&lt;';
        if (ch === '>')
            return '&gt;';
        if (ch === '&')
            return '&amp;';
        if (ch === '"')
            return '&quot;';
        if (ch === "'")
            return '&apos;';
        // 非 ASCII → 数字实体
        return `&#${ch.codePointAt(0)};`;
    });
}
/**
 * 解码 HTML 实体（命名 + 数字实体）
 * 使用浏览器 textarea 安全机制，不执行任何脚本
 */
export function decodeHtmlEntities(text) {
    if (typeof document === 'undefined') {
        // SSR / 测试环境降级：简单替换命名实体
        let result = text;
        for (const [entity, char] of Object.entries(ENTITY_TO_CHAR)) {
            result = result.split(entity).join(char);
        }
        // 数字实体 &#12345; &#x4e2d;
        result = result.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)));
        result = result.replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)));
        return result;
    }
    // 浏览器环境：使用 textarea 安全解码
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
}
