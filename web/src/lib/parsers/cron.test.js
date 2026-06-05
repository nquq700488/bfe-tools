import { describe, it, expect } from 'vitest';
import { validateCron, describeCron, CRON_PRESETS } from './cron';
describe('validateCron', () => {
    it('validates a correct expression', () => {
        expect(validateCron('* * * * *').valid).toBe(true);
        expect(validateCron('0 9 * * 1-5').valid).toBe(true);
    });
    it('rejects empty expression', () => {
        const result = validateCron('');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('不能为空');
    });
    it('rejects wrong field count', () => {
        const result = validateCron('* * *');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('5 个字段');
    });
    it('detects out-of-range minute', () => {
        const result = validateCron('60 * * * *');
        expect(result.valid).toBe(false);
        expect(result.fieldErrors?.minute).toBeDefined();
    });
    it('detects out-of-range month', () => {
        const result = validateCron('* * * 13 *');
        expect(result.valid).toBe(false);
        expect(result.fieldErrors?.month).toBeDefined();
    });
    it('validates range format', () => {
        expect(validateCron('0 9-17 * * 1-5').valid).toBe(true);
    });
    it('validates step format', () => {
        expect(validateCron('*/15 * * * *').valid).toBe(true);
    });
    it('validates list format', () => {
        expect(validateCron('0 9,12,15 * * *').valid).toBe(true);
    });
});
describe('describeCron', () => {
    it('describes known patterns', () => {
        expect(describeCron('* * * * *')).toBe('每分钟执行一次');
        expect(describeCron('0 0 * * *')).toBe('每天 00:00 执行');
        expect(describeCron('0 9 * * 1-5')).toBe('每个工作日 9:00 执行');
    });
    it('returns invalid for bad expression', () => {
        expect(describeCron('bad')).toBe('无效表达式');
    });
});
describe('CRON_PRESETS', () => {
    it('all presets are valid', () => {
        for (const preset of CRON_PRESETS) {
            expect(validateCron(preset.value).valid).toBe(true);
        }
    });
});
