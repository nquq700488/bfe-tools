/**
 * Cron 表达式解析 — 纯函数
 *
 * 5 字段标准 cron（minute hour day-of-month month day-of-week）
 * 不做 NLP，提供字段校验和预设常用表达式
 */
const FIELDS = [
    { name: 'minute', min: 0, max: 59 },
    { name: 'hour', min: 0, max: 23 },
    { name: 'dom', min: 1, max: 31 },
    { name: 'month', min: 1, max: 12 },
    { name: 'dow', min: 0, max: 7 }, // 0 和 7 都表示周日
];
/** 验证单个字段值在有效范围内 */
function validateField(token, def) {
    // 通配符（纯 * 或带步长的 */N 如 */15）
    if (token === '*')
        return undefined;
    // 检测通配符步长格式：*/N（*/5, */15 等）
    const wildcardStepMatch = token.match(/^\*\/(\d+)$/);
    if (wildcardStepMatch) {
        const stepVal = parseInt(wildcardStepMatch[1], 10);
        if (stepVal >= 1)
            return undefined;
    }
    // 步长格式 N/M（如 1-10/2 或 2/3）
    const stepParts = token.split('/');
    if (stepParts.length > 2)
        return `${token}：步长格式错误`;
    const range = stepParts[0];
    const step = stepParts.length === 2 ? Number(stepParts[1]) : null;
    if (step !== null && (isNaN(step) || step < 1)) {
        return `${token}：步长必须为正整数`;
    }
    // 范围格式 1-5
    const rangeParts = range.split('-');
    if (rangeParts.length > 2)
        return `${token}：范围格式错误`;
    if (rangeParts.length === 2) {
        const start = Number(rangeParts[0]);
        const end = Number(rangeParts[1]);
        if (isNaN(start) || isNaN(end))
            return `${token}：范围值必须为数字`;
        if (start < def.min || start > def.max)
            return `${token}：起始值 ${start} 超出范围 ${def.min}-${def.max}`;
        if (end < def.min || end > def.max)
            return `${token}：结束值 ${end} 超出范围 ${def.min}-${def.max}`;
        if (start > end)
            return `${token}：起始值不能大于结束值`;
        return undefined;
    }
    // 列表格式 1,2,3
    const listParts = range.split(',');
    for (const part of listParts) {
        const num = Number(part);
        if (isNaN(num))
            return `${token}：包含非数字值 "${part}"`;
        if (num < def.min || num > def.max)
            return `${token}：值 ${num} 超出范围 ${def.min}-${def.max}`;
    }
    return undefined;
}
/**
 * 校验 5 字段 Cron 表达式
 */
export function validateCron(expr) {
    const trimmed = expr.trim();
    if (!trimmed)
        return { valid: false, error: '表达式不能为空' };
    // 预处理：将 */N 格式替换为 N 个合法值（避免内部校验函数处理 *）
    const normalized = trimmed.replace(/\*\/(\d+)/g, '0');
    const tokens = normalized.split(/\s+/);
    if (tokens.length !== 5) {
        return {
            valid: false,
            error: `需要 5 个字段，当前 ${tokens.length} 个`,
        };
    }
    const fieldErrors = {};
    let hasError = false;
    for (let i = 0; i < FIELDS.length; i++) {
        const err = validateField(tokens[i], FIELDS[i]);
        if (err) {
            fieldErrors[FIELDS[i].name] = err;
            hasError = true;
        }
    }
    if (hasError) {
        return { valid: false, fieldErrors };
    }
    return { valid: true };
}
/** 预设常用 Cron 表达式 */
export const CRON_PRESETS = [
    { label: '每分钟', value: '* * * * *' },
    { label: '每 5 分钟', value: '*/5 * * * *' },
    { label: '每小时', value: '0 * * * *' },
    { label: '每 2 小时', value: '0 */2 * * *' },
    { label: '每天午夜', value: '0 0 * * *' },
    { label: '每天中午', value: '0 12 * * *' },
    { label: '每个工作日 9 点', value: '0 9 * * 1-5' },
    { label: '每周一 8 点', value: '0 8 * * 1' },
    { label: '每月 1 号 0 点', value: '0 0 1 * *' },
    { label: '每季度首日凌晨', value: '0 0 1 1,4,7,10 *' },
    { label: '每年元旦', value: '0 0 1 1 *' },
];
/** Cron 字段的中文描述 */
const DOW_NAMES = ['日', '一', '二', '三', '四', '五', '六'];
const MONTH_NAMES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
/**
 * 生成人类可读的 Cron 描述（预设规则，不做 NLP）
 */
export function describeCron(expr) {
    const result = validateCron(expr);
    if (!result.valid)
        return '无效表达式';
    const tokens = expr.trim().split(/\s+/);
    const [minute, hour, dom, month, dow] = tokens;
    // 简单规则匹配
    if (expr === '* * * * *')
        return '每分钟执行一次';
    if (expr === '0 * * * *')
        return '每小时执行一次';
    if (expr === '0 0 * * *')
        return '每天 00:00 执行';
    if (expr === '0 12 * * *')
        return '每天 12:00 执行';
    // 步长模式 */N
    if (minute.startsWith('*/') && hour === '*' && dom === '*' && month === '*' && dow === '*') {
        const n = minute.split('/')[1];
        return `每 ${n} 分钟执行一次`;
    }
    if (hour.startsWith('*/') && minute === '0' && dom === '*' && month === '*' && dow === '*') {
        const n = hour.split('/')[1];
        return `每 ${n} 小时执行一次`;
    }
    // 工作日模式
    if (hour.match(/^\d+$/) && minute.match(/^\d+$/) && dow === '1-5' && month === '*' && dom === '*') {
        return `每个工作日 ${hour}:${minute.padStart(2, '0')} 执行`;
    }
    // 指定星期
    if (dow.match(/^\d$/) && month === '*' && dom === '*') {
        const dowNum = parseInt(dow, 10);
        const dowLabel = DOW_NAMES[dowNum % 7];
        return `每周${dowLabel} ${hour}:${minute.padStart(2, '0')} 执行`;
    }
    // 指定日期
    if (dom.match(/^\d+$/) && month === '*' && dow === '*') {
        return `每月 ${dom} 号 ${hour}:${minute.padStart(2, '0')} 执行`;
    }
    // 指定月份
    if (month.match(/^[\d,]+$/) && dom.match(/^\d+$/) && dow === '*') {
        const months = month.split(',').map((m) => MONTH_NAMES[parseInt(m, 10)] || m);
        return `每年 ${months.join('/')}月 ${dom} 号 ${hour}:${minute.padStart(2, '0')} 执行`;
    }
    // 通用降级
    return `${minute} ${hour} ${dom} ${month} ${dow}`;
}
