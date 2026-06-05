/**
 * URL 安全检查
 */
/** 危险协议列表 */
const DANGEROUS_PROTOCOLS = ['javascript:', 'data:', 'vbscript:', 'file:'];
/**
 * 检测 URL 是否包含危险协议
 */
export function isDangerousProtocol(url) {
    if (!url)
        return false;
    const trimmed = url.trim().toLowerCase();
    return DANGEROUS_PROTOCOLS.some((proto) => trimmed.startsWith(proto));
}
/**
 * 清洗 URL，移除危险协议前缀
 * 如果检测到危险协议，返回空字符串
 */
export function sanitizeUrl(url) {
    if (!url)
        return '';
    if (isDangerousProtocol(url))
        return '';
    // 允许 http/https/mailto/tel/ftp 等安全协议通过
    if (/^[a-z][\w.+-]*:\/\//i.test(url)) {
        try {
            const parsed = new URL(url);
            if (parsed.protocol === 'data:')
                return '';
        }
        catch {
            // 无法解析的 URL 返回空
            return '';
        }
    }
    return url;
}
