/**
 * Minimal ambient type declarations for culori
 * culori 4.x ships as plain JS without type definitions.
 * Declares only the subset of the API we actually use.
 */
declare module 'culori' {
  export interface Rgb {
    mode: 'rgb'
    r: number
    g: number
    b: number
    alpha?: number
  }

  export interface Hsl {
    mode: 'hsl'
    h?: number
    s?: number
    l?: number
    alpha?: number
  }

  export interface Oklch {
    mode: 'oklch'
    l?: number
    c?: number
    h?: number
    alpha?: number
  }

  export function formatHex(color: object): string
  export function formatHex8(color: object): string
  export function formatRgb(color: object): string
  export function formatHsl(color: object): string
  export function parse(input: string): object | undefined
}
