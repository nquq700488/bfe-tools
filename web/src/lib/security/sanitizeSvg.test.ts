import { describe, it, expect } from 'vitest'
import { sanitizeSvg } from './sanitizeSvg'

describe('sanitizeSvg', () => {
  it('passes simple valid SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" fill="red"/></svg>'
    const result = sanitizeSvg(svg)
    expect(result).toContain('rect')
  })

  it('removes script tags', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert("xss")</script><rect/></svg>'
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('alert')
  })

  it('removes on* event handlers', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" onclick="alert(1)"/></svg>'
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('onclick')
  })

  it('removes dangerous foreignObject content', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div>html</div></foreignObject></svg>'
    const result = sanitizeSvg(svg)
    // At minimum, the HTML content inside foreignObject must be gone
    expect(result).not.toMatch(/<div>/i)
  })

  it('blocks javascript: protocol', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:alert(1)"><text>click</text></a></svg>'
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('javascript:')
  })

  it('returns empty string for empty input', () => {
    expect(sanitizeSvg('')).toBe('')
  })

  it('removes external HTTP references', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://evil.com/image.png"/></svg>'
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('evil.com')
  })

  it('removes data: URIs', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><image href="data:image/svg+xml;base64,PHN2Zy8+"/></svg>'
    const result = sanitizeSvg(svg)
    expect(result).not.toContain('data:')
  })

  it('produces non-empty valid output for SVG', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#ff0000" /></svg>'
    const result = sanitizeSvg(svg)
    expect(result.length).toBeGreaterThan(0)
    expect(result).toContain('circle')
  })
})
