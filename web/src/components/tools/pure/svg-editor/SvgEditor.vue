<script setup lang="ts">
/**
 * SvgEditor (Phase 1) — SVG 源码编辑器 + 实时预览
 * 左侧源码编辑，右侧 sandbox iframe 安全预览
 */
import { ref, watch } from 'vue'
import { NButton, NInput, NAlert, NSpace } from 'naive-ui'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import CopyButton from '@/components/tools/shared/CopyButton.vue'
import { sanitizeSvg } from '@/lib/security/sanitizeSvg'
import type { ClientOnlyToolDefinition } from '@/types/tool'

/** 默认 SVG 示例 */
const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <rect x="10" y="10" width="180" height="80" rx="12" fill="#4F46E5" />
  <text x="100" y="58" text-anchor="middle" fill="white" font-size="20" font-family="Arial">Hello SVG</text>
</svg>`

const RECT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect x="30" y="40" width="140" height="120" rx="8" fill="#6366F1" />
</svg>`

const CIRCLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="70" fill="#EC4899" />
  <circle cx="100" cy="100" r="50" fill="#F472B6" />
  <circle cx="100" cy="100" r="30" fill="#F9A8D4" />
</svg>`

const TRIANGLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <polygon points="100,20 180,170 20,170" fill="#10B981" />
</svg>`

const STAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <polygon points="100,10 122,75 190,75 135,115 155,180 100,140 45,180 65,115 10,75 78,75" fill="#F59E0B" />
</svg>`

const GRADIENT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="300" height="200" rx="16" fill="url(#g)" />
  <text x="150" y="108" text-anchor="middle" fill="white" font-size="28" font-family="Arial" font-weight="bold">Gradient</text>
</svg>`

defineProps<{
  tool: ClientOnlyToolDefinition
}>()

const svgCode = ref(DEFAULT_SVG)
const sanitized = ref('')
const previewKey = ref(0)
const svgError = ref<string | null>(null)

const PRESETS: Array<{ label: string; value: string }> = [
  { label: '矩形', value: RECT_SVG },
  { label: '圆形', value: CIRCLE_SVG },
  { label: '三角形', value: TRIANGLE_SVG },
  { label: '星形', value: STAR_SVG },
  { label: '渐变卡片', value: GRADIENT_SVG },
]

// ---- 实时处理 ----
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function processSvg(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    const code = svgCode.value.trim()
    if (!code) {
      sanitized.value = ''
      svgError.value = null
      return
    }

    // 检查是否包含 <svg> 标签
    if (!/<svg\b/i.test(code)) {
      svgError.value = '未检测到有效的 <svg> 标签'
      sanitized.value = ''
      return
    }

    try {
      const cleaned = sanitizeSvg(code)
      sanitized.value = cleaned
      svgError.value = null
      previewKey.value++
    } catch (e) {
      svgError.value = `SVG 解析错误：${e instanceof Error ? e.message : '未知错误'}`
      sanitized.value = ''
    }
  }, 400)
}

watch(svgCode, processSvg, { immediate: true })

// ---- 预设 ----
function applyPreset(svg: string): void {
  svgCode.value = svg
}

// ---- 导出 ----
function exportSvgFile(): void {
  if (!sanitized.value) return
  const blob = new Blob([sanitized.value], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'image.svg'
  a.click()
  URL.revokeObjectURL(url)
}

function exportPng(): void {
  // 通过 canvas 将 SVG 渲染为 PNG
  const svgBlob = new Blob([sanitized.value], { type: 'image/svg+xml' })
  const url = URL.createObjectURL(svgBlob)
  const img = new Image()
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth || 400
    canvas.height = img.naturalHeight || 400
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // 白色背景
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0)
    canvas.toBlob((blob) => {
      if (!blob) return
      const pngUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = pngUrl
      a.download = 'image.png'
      a.click()
      URL.revokeObjectURL(pngUrl)
    }, 'image/png')
    URL.revokeObjectURL(url)
  }
  img.onerror = () => {
    svgError.value = 'SVG 无法渲染为 PNG（可能包含无效内容）'
    URL.revokeObjectURL(url)
  }
  img.src = url
}

// ---- iframe 渲染通过 template 中的 :srcdoc="sanitized" + sandbox="" 安全注入 ----
</script>

<template>
  <section class="svg-editor">
    <ToolHeader :tool="tool" />

    <!-- 预设模板 -->
    <div class="se-presets mb-4">
      <span class="se-presets-label">模板</span>
      <NSpace>
        <NButton
          v-for="preset in PRESETS"
          :key="preset.label"
          size="tiny"
          :type="svgCode === preset.value ? 'primary' : 'default'"
          @click="applyPreset(preset.value)"
        >
          {{ preset.label }}
        </NButton>
      </NSpace>
    </div>

    <!-- 编辑 + 预览双栏 -->
    <div class="se-layout">
      <!-- 左侧：源码 -->
      <div class="se-col">
        <div class="se-col-header">
          <span class="se-col-label">SVG 源码</span>
          <NSpace :size="4">
            <CopyButton :content="svgCode" />
            <NButton text size="tiny" @click="exportSvgFile" :disabled="!sanitized">导出 SVG</NButton>
            <NButton text size="tiny" @click="exportPng" :disabled="!sanitized">导出 PNG</NButton>
          </NSpace>
        </div>
        <NInput
          v-model:value="svgCode"
          type="textarea"
          :rows="18"
          placeholder="输入 SVG 代码..."
          class="se-textarea"
        />
        <NAlert v-if="svgError" type="warning" :bordered="false" class="mt-2">
          {{ svgError }}
        </NAlert>
      </div>

      <!-- 右侧：预览 -->
      <div class="se-col">
        <div class="se-col-header">
          <span class="se-col-label">实时预览</span>
          <span class="se-col-badge">sandbox 安全渲染</span>
        </div>
        <div class="se-preview-wrapper">
          <iframe
            v-if="sanitized"
            class="se-iframe"
            sandbox=""
            :srcdoc="sanitized"
            title="SVG 预览"
          />
          <div v-else class="se-preview-empty">
            <template v-if="!svgCode.trim()">输入 SVG 代码开始预览</template>
            <template v-else-if="svgError">等待有效输入</template>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.svg-editor { max-width: 1200px; }

.se-presets {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px;
  background: var(--color-white); border: 1px solid var(--color-neutral-200);
  border-radius: 10px; box-shadow: var(--shadow-sm);
}
.se-presets-label {
  font-size: var(--text-xs); font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-500); text-transform: uppercase; letter-spacing: 0.5px;
  flex-shrink: 0;
}

.se-layout {
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start;
}
@media (max-width: 900px) { .se-layout { grid-template-columns: 1fr; } }

.se-col {
  background: var(--color-white); border: 1px solid var(--color-neutral-200);
  border-radius: 10px; overflow: hidden; box-shadow: var(--shadow-sm);
}
.se-col-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  background: var(--color-neutral-50); border-bottom: 1px solid var(--color-neutral-100);
}
.se-col-label {
  font-size: var(--text-xs); font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-600); text-transform: uppercase; letter-spacing: 0.5px;
}
.se-col-badge {
  font-size: 10px; color: var(--color-primary-600);
  background: var(--color-primary-50); padding: 2px 8px; border-radius: 4px;
}

.se-textarea {
  --n-font-size: var(--text-sm);
  font-family: var(--font-mono);
  border: none; border-radius: 0;
}

.se-preview-wrapper {
  min-height: 380px; display: flex; align-items: center; justify-content: center;
  background: repeating-conic-gradient(var(--color-neutral-100) 0% 25%, transparent 0% 50%) 50% / 20px 20px;
}
.se-iframe {
  width: 100%; height: 380px; border: none; background: transparent;
}
.se-preview-empty {
  font-size: var(--text-sm); color: var(--color-neutral-300);
  padding: 32px; text-align: center;
}
</style>
