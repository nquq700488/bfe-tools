/**
 * 颜色空间转换 — 基于 culori
 * 纯函数，无副作用，无 DOM 依赖
 */
import { formatHex, formatHex8, parse as parseCulori } from 'culori';
/**
 * 解析任意颜色字符串为统一中间结构
 * 支持格式：hex(#rgb/#rrggbb/#rrggbbaa)、rgb()、rgba()、hsl()、CSS 颜色名
 */
export function parseColor(input) {
    const color = parseCulori(input.trim());
    if (!color)
        return null;
    // 可能有 alpha（从 hex8/rgba 等格式中提取）
    const alpha = 'alpha' in color ? (color.alpha ?? 1) : 1;
    const rgb = { mode: 'rgb', r: color.r ?? 0, g: color.g ?? 0, b: color.b ?? 0, alpha };
    const hex = alpha < 1 ? formatHex8(rgb) : formatHex(rgb);
    const hslColor = { mode: 'hsl', h: color.h ?? 0, s: color.s ?? 0, l: color.l ?? 0, alpha };
    return {
        rgb: { r: Math.round(rgb.r * 255), g: Math.round(rgb.g * 255), b: Math.round(rgb.b * 255), alpha },
        hex: hex.toUpperCase(),
        hsl: {
            h: Math.round(hslColor.h ?? 0),
            s: Math.round((hslColor.s ?? 0) * 100),
            l: Math.round((hslColor.l ?? 0) * 100),
        },
    };
}
/**
 * 将颜色结果转换为指定格式的字符串
 */
export function convertColor(value, target) {
    const { r, g, b, alpha } = value.rgb;
    switch (target) {
        case 'hex':
            return value.hex;
        case 'rgb':
            return `rgb(${r}, ${g}, ${b})`;
        case 'rgba':
            return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
        case 'hsl':
            return `hsl(${value.hsl.h}, ${value.hsl.s}%, ${value.hsl.l}%)`;
        case 'oklch': {
            const c = parseCulori(`rgba(${r},${g},${b},${alpha})`);
            if (!c)
                return '';
            const o = c;
            const l = ((o.l ?? 0) * 100).toFixed(1);
            const ch = ((o.c ?? 0) * 0.4).toFixed(3);
            const h = (o.h ?? 0).toFixed(1);
            return `oklch(${l}% ${ch} ${h})`;
        }
        default:
            return value.hex;
    }
}
