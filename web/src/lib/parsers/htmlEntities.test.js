import { describe, it, expect } from 'vitest';
import { encodeHtmlEntities, decodeHtmlEntities } from './htmlEntities';
describe('encodeHtmlEntities', () => {
    it('encodes < > & " \'', () => {
        const result = encodeHtmlEntities('<div class="test">&');
        expect(result).toContain('&lt;');
        expect(result).toContain('&gt;');
        expect(result).toContain('&quot;');
        expect(result).toContain('&amp;');
    });
    it('encodes single quote', () => {
        expect(encodeHtmlEntities("it's")).toContain('&apos;');
    });
    it('converts non-ASCII to numeric entities', () => {
        const result = encodeHtmlEntities('你好');
        expect(result).toMatch(/&#\d+;.*&#\d+;/);
    });
});
describe('decodeHtmlEntities', () => {
    it('decodes named entities', () => {
        expect(decodeHtmlEntities('&lt;div&gt;')).toBe('<div>');
        expect(decodeHtmlEntities('&amp;')).toBe('&');
        expect(decodeHtmlEntities('&quot;hello&quot;')).toBe('"hello"');
        expect(decodeHtmlEntities('&copy;')).toBe('©');
    });
    it('decodes decimal numeric entities', () => {
        expect(decodeHtmlEntities('&#60;div&#62;')).toBe('<div>');
    });
    it('decodes hex numeric entities', () => {
        expect(decodeHtmlEntities('&#x3C;div&#x3E;')).toBe('<div>');
    });
    it('decodes mixed entities', () => {
        const result = decodeHtmlEntities('&lt;span class=&quot;test&quot;&gt;你好&#x21;&lt;/span&gt;');
        expect(result).toBe('<span class="test">你好!</span>');
    });
    it('handles plain text unchanged', () => {
        expect(decodeHtmlEntities('plain text')).toBe('plain text');
    });
});
