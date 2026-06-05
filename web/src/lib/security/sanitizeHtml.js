/**
 * HTML 安全清洗
 *
 * 策略：使用浏览器 DOMParser 解析后只保留 textContent，
 * 移除所有标签和可能执行的脚本。
 */
/**
 * 清洗 HTML 字符串，移除所有标签，只保留纯文本内容
 */
export function sanitizeHtml(input) {
    if (!input)
        return '';
    if (typeof DOMParser === 'undefined') {
        // SSR / 测试环境降级：简单移除标签
        return input
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<\/?[^>]+(>|$)/g, '')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
            .replace(/&#x([0-9A-Fa-f]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
            .trim();
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(input, 'text/html');
    // 移除所有 script/style 标签
    doc.querySelectorAll('script, style, iframe, object, embed').forEach((el) => el.remove());
    return doc.body.textContent?.trim() ?? '';
}
