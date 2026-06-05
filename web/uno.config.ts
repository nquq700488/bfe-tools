import { defineConfig } from 'unocss'
import presetUno from '@unocss/preset-uno'
import presetAttributify from '@unocss/preset-attributify'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
  ],
  theme: {
    colors: {
      // 工具站蓝色系主色调 — 与 tokens.css 保持一致
      primary: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#3b82f6',
        600: '#0f6bff',
        700: '#0b55d9',
        800: '#1e40af',
        900: '#1e3a8a',
      },
      // 语义色
      success: '#10b981',
      warning: '#f59e0b',
      danger: '#ef4444',
      info: '#6366f1',
      // 中性色
      neutral: {
        50: '#f7f8fb',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
      },
    },
    breakpoints: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
  },
  shortcuts: {
    'page-container': 'max-w-6xl mx-auto px-4 sm:px-6 lg:px-8',
    'card': 'bg-white rounded-2 border border-neutral-200 p-5 shadow-md',
  },
})
