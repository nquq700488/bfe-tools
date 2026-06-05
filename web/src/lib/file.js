/**
 * 文件工具 — 格式校验、大小格式化、MIME 检测
 *
 * 注意：浏览器端无法精确检测文件真实类型（魔数字节检测），
 * 本文件提供基于文件扩展名和 MIME 类型的前端尽力校验，
 * 真正的安全校验在后端通过 python-magic 完成。
 */
import { ALLOWED_FILE_TYPES, MAX_FILE_SIZES } from './constants';
/**
 * 格式化文件大小为人类可读字符串
 * @param bytes 文件大小（字节）
 * @param decimals 小数位数，默认 1
 */
export function formatFileSize(bytes, decimals = 1) {
    if (bytes === 0)
        return '0 B';
    const k = 1024;
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}
/**
 * 根据文件扩展名获取 MIME 类型
 * @param fileName 文件名
 */
export function getMimeType(fileName) {
    const ext = getFileExtension(fileName);
    if (!ext)
        return null;
    const mimeMap = {
        // 音频
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        m4a: 'audio/mp4',
        ogg: 'audio/ogg',
        flac: 'audio/flac',
        aac: 'audio/aac',
        // 图片
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        webp: 'image/webp',
        gif: 'image/gif',
        bmp: 'image/bmp',
        // 视频
        mp4: 'video/mp4',
        webm: 'video/webm',
        avi: 'video/x-msvideo',
        mov: 'video/quicktime',
        mkv: 'video/x-matroska',
    };
    return mimeMap[ext] || null;
}
/**
 * 获取文件扩展名（小写）
 * @param fileName 文件名
 */
export function getFileExtension(fileName) {
    const idx = fileName.lastIndexOf('.');
    return idx > 0 ? fileName.slice(idx + 1).toLowerCase() : '';
}
/**
 * 校验文件格式是否在工具的允许列表中
 * @param file 文件对象
 * @param tool 工具标识
 */
export function validateFileFormat(file, tool) {
    const allowed = ALLOWED_FILE_TYPES[tool];
    if (!allowed)
        return false;
    const ext = getFileExtension(file.name);
    return allowed.extensions.includes(ext) || allowed.mimeTypes.includes(file.type);
}
/**
 * 校验文件大小是否在工具的限制内
 * @param file 文件对象
 * @param tool 工具标识
 */
export function validateFileSize(file, tool) {
    const maxSize = MAX_FILE_SIZES[tool];
    if (!maxSize)
        return false;
    return file.size <= maxSize;
}
