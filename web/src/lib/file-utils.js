/**
 * 文件校验公共工具
 */
/** 格式化文件大小（字节 → 可读字符串） */
export function formatFileSize(bytes) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
/**
 * 校验单个文件是否符合 accept + maxSize 约束
 * @returns 错误描述字符串，校验通过返回 null
 */
export function validateFile(file, accept, maxSize) {
    if (file.size > maxSize) {
        return `文件 "${file.name}" 超出大小限制（最大 ${formatFileSize(maxSize)}）`;
    }
    if (accept && accept !== '*') {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const isAccepted = acceptedTypes.some((type) => {
            if (type.startsWith('.')) {
                return file.name.toLowerCase().endsWith(type.toLowerCase());
            }
            if (type.endsWith('/*')) {
                return file.type.startsWith(type.replace('/*', '/'));
            }
            return file.type === type;
        });
        if (!isAccepted) {
            return `文件 "${file.name}" 格式不支持（允许: ${accept}）`;
        }
    }
    return null;
}
