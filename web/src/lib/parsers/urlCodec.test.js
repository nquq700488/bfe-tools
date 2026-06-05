import { describe, it, expect } from 'vitest';
import { encodeUrl, decodeUrl, parseQueryParams, buildUrl } from './urlCodec';
describe('encodeUrl', () => {
    it('encodes a URL', () => {
        const result = encodeUrl('hello world');
        expect(result).toBe('hello%20world');
    });
    it('encodes spaces via encodeURIComponent', () => {
        const result = encodeUrl('hello world');
        expect(result).toContain('hello');
        expect(result).toContain('%20');
    });
});
describe('decodeUrl', () => {
    it('decodes a URL', () => {
        expect(decodeUrl('hello%20world')).toBe('hello world');
    });
    it('handles malformed percent encoding', () => {
        const result = decodeUrl('%ZZ%20hello');
        expect(result).toContain('%ZZ');
        expect(result).toContain(' hello');
    });
    it('decodes empty string', () => {
        expect(decodeUrl('')).toBe('');
    });
});
describe('parseQueryParams', () => {
    it('parses URL query string', () => {
        const params = parseQueryParams('https://example.com?name=张三&age=18');
        expect(params).toHaveLength(2);
        expect(params[0]).toEqual({ key: 'name', value: '张三' });
        expect(params[1]).toEqual({ key: 'age', value: '18' });
    });
    it('handles URL without query', () => {
        expect(parseQueryParams('https://example.com')).toHaveLength(0);
    });
    it('handles query-only string', () => {
        const params = parseQueryParams('?a=1&b=2');
        expect(params).toHaveLength(2);
    });
});
describe('buildUrl', () => {
    it('builds URL with params', () => {
        const url = buildUrl('https://example.com', [
            { key: 'hello', value: 'world' },
            { key: 'a', value: 'b' },
        ]);
        expect(url).toBe('https://example.com?hello=world&a=b');
    });
    it('strips existing query params', () => {
        const url = buildUrl('https://example.com?old=1', [{ key: 'new', value: '2' }]);
        expect(url).toBe('https://example.com?new=2');
    });
});
