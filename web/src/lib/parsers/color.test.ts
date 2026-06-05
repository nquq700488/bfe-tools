import { describe, it, expect } from 'vitest'
import { parseColor, convertColor } from './color'

describe('parseColor', () => {
  it('parses hex #FF5733', () => {
    const result = parseColor('#FF5733')
    expect(result).not.toBeNull()
    expect(result!.hex).toBe('#FF5733')
    expect(result!.rgb.r).toBe(255)
    expect(result!.rgb.g).toBe(87)
    expect(result!.rgb.b).toBe(51)
  })

  it('parses rgb()', () => {
    const result = parseColor('rgb(100, 200, 50)')
    expect(result).not.toBeNull()
    expect(result!.rgb.r).toBe(100)
    expect(result!.rgb.g).toBe(200)
    expect(result!.rgb.b).toBe(50)
  })

  it('parses named color', () => {
    const result = parseColor('tomato')
    expect(result).not.toBeNull()
    expect(result!.hex).toBe('#FF6347')
  })

  it('returns null for invalid input', () => {
    expect(parseColor('not a color')).toBeNull()
    expect(parseColor('')).toBeNull()
  })

  it('handles alpha in rgba', () => {
    const result = parseColor('rgba(255, 0, 0, 0.5)')
    expect(result).not.toBeNull()
    expect(result!.rgb.alpha).toBeCloseTo(0.5, 2)
  })
})

describe('convertColor', () => {
  const color = parseColor('#FF5733')!

  it('converts to hex', () => {
    expect(convertColor(color, 'hex')).toBe('#FF5733')
  })

  it('converts to rgb', () => {
    expect(convertColor(color, 'rgb')).toBe('rgb(255, 87, 51)')
  })

  it('converts to hsl', () => {
    const hsl = convertColor(color, 'hsl')
    expect(hsl).toContain('hsl(')
    expect(hsl).toContain('%')
  })

  it('converts to rgba', () => {
    expect(convertColor(color, 'rgba')).toBe('rgba(255, 87, 51, 1.00)')
  })
})
