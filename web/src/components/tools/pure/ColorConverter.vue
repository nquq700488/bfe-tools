<script setup lang="ts">
/**
 * ColorConverter — 颜色空间转换器
 * 功能：HEX/RGB/HSL/RGBA 4 格式双向实时转换、色板预览、历史记录 (localStorage)
 */
import { ref, computed, onMounted } from 'vue'
import { NButton, NInput } from 'naive-ui'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import ColorPicker from '@/components/tools/shared/ColorPicker.vue'
import CopyButton from '@/components/tools/shared/CopyButton.vue'
import { parseColor, convertColor } from '@/lib/parsers/color'
import type { ColorResult } from '@/lib/parsers/color'
import type { ClientOnlyToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: ClientOnlyToolDefinition
}>()

const HISTORY_KEY = 'color-converter-history'
const MAX_HISTORY = 10

// ---- 格式字段 ----
const hexValue = ref('#FF5733')
const rgbValue = ref('rgb(255, 87, 51)')
const hslValue = ref('hsl(12, 100%, 60%)')
const rgbaValue = ref('rgba(255, 87, 51, 1.00)')

// ---- 校验状态 ----
const hexError = ref<string | null>(null)
const rgbError = ref<string | null>(null)
const hslError = ref<string | null>(null)
const rgbaError = ref<string | null>(null)

// ---- 当前解析的颜色 ----
const parsedColor = ref<ColorResult | null>(null)

// ---- 历史 ----
const history = ref<string[]>([])

// ---- 更新来源标记（防止循环更新） ----
let updatingFrom: string | null = null

onMounted(() => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY)
    if (stored) history.value = JSON.parse(stored) as string[]
  } catch { /* ignore */ }
  // 初始化解析默认色值
  updateFromHex(hexValue.value)
})

function saveHistory(): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value))
}

function addToHistory(hex: string): void {
  const upper = hex.toUpperCase()
  history.value = [upper, ...history.value.filter((h) => h !== upper)].slice(0, MAX_HISTORY)
  saveHistory()
}

function clearHistory(): void {
  history.value = []
  localStorage.removeItem(HISTORY_KEY)
}

/** 从 HEX 输入更新全部字段 */
function updateFromHex(val: string): void {
  hexError.value = null
  const color = parseColor(val)
  if (!color) {
    hexError.value = '无效的颜色值'
    return
  }
  parsedColor.value = color
  updatingFrom = 'hex'
  hexValue.value = color.hex
  rgbValue.value = convertColor(color, 'rgb')
  hslValue.value = convertColor(color, 'hsl')
  rgbaValue.value = convertColor(color, 'rgba')
  rgbError.value = null
  hslError.value = null
  rgbaError.value = null
  addToHistory(color.hex)
  updatingFrom = null
}

function updateFromRgb(val: string): void {
  if (updatingFrom) return
  rgbError.value = null
  const color = parseColor(val)
  if (!color) {
    rgbError.value = '无效的 RGB 值'
    return
  }
  parsedColor.value = color
  updatingFrom = 'rgb'
  hexValue.value = color.hex
  hslValue.value = convertColor(color, 'hsl')
  rgbaValue.value = convertColor(color, 'rgba')
  hexError.value = null
  hslError.value = null
  rgbaError.value = null
  addToHistory(color.hex)
  updatingFrom = null
}

function updateFromHsl(val: string): void {
  if (updatingFrom) return
  hslError.value = null
  const color = parseColor(val)
  if (!color) {
    hslError.value = '无效的 HSL 值'
    return
  }
  parsedColor.value = color
  updatingFrom = 'hsl'
  hexValue.value = color.hex
  rgbValue.value = convertColor(color, 'rgb')
  rgbaValue.value = convertColor(color, 'rgba')
  hexError.value = null
  rgbError.value = null
  rgbaError.value = null
  addToHistory(color.hex)
  updatingFrom = null
}

function updateFromRgba(val: string): void {
  if (updatingFrom) return
  rgbaError.value = null
  const color = parseColor(val)
  if (!color) {
    rgbaError.value = '无效的 RGBA 值'
    return
  }
  parsedColor.value = color
  updatingFrom = 'rgba'
  hexValue.value = color.hex
  rgbValue.value = convertColor(color, 'rgb')
  hslValue.value = convertColor(color, 'hsl')
  hexError.value = null
  rgbError.value = null
  hslError.value = null
  addToHistory(color.hex)
  updatingFrom = null
}

function applyHistory(hex: string): void {
  updateFromHex(hex)
}

// ---- 色板预览 ----
const swatchColor = computed(() => parsedColor.value?.hex ?? '#000000')
</script>

<template>
  <section class="color-converter">
    <ToolHeader :tool="props.tool" />

    <div class="cc-layout">
      <!-- 左侧：输入区 -->
      <div class="cc-inputs">
        <!-- ColorPicker + 色板 -->
        <div class="cc-swatch-area mb-5">
          <div class="cc-swatch" :style="{ backgroundColor: swatchColor }" />
          <ColorPicker v-model="hexValue" />
        </div>

        <!-- HEX -->
        <div class="cc-field">
          <label class="cc-field-label">
            HEX
            <CopyButton :content="hexValue" />
          </label>
          <NInput
            :value="hexValue"
            size="small"
            placeholder="#RRGGBB"
            :status="hexError ? 'error' : undefined"
            class="cc-input"
            @update:value="updateFromHex"
          />
          <p v-if="hexError" class="cc-error">{{ hexError }}</p>
        </div>

        <!-- RGB -->
        <div class="cc-field">
          <label class="cc-field-label">
            RGB
            <CopyButton :content="rgbValue" />
          </label>
          <NInput
            :value="rgbValue"
            size="small"
            placeholder="rgb(r, g, b)"
            :status="rgbError ? 'error' : undefined"
            class="cc-input"
            @update:value="updateFromRgb"
          />
          <p v-if="rgbError" class="cc-error">{{ rgbError }}</p>
        </div>

        <!-- HSL -->
        <div class="cc-field">
          <label class="cc-field-label">
            HSL
            <CopyButton :content="hslValue" />
          </label>
          <NInput
            :value="hslValue"
            size="small"
            placeholder="hsl(h, s%, l%)"
            :status="hslError ? 'error' : undefined"
            class="cc-input"
            @update:value="updateFromHsl"
          />
          <p v-if="hslError" class="cc-error">{{ hslError }}</p>
        </div>

        <!-- RGBA -->
        <div class="cc-field">
          <label class="cc-field-label">
            RGBA
            <CopyButton :content="rgbaValue" />
          </label>
          <NInput
            :value="rgbaValue"
            size="small"
            placeholder="rgba(r, g, b, a)"
            :status="rgbaError ? 'error' : undefined"
            class="cc-input"
            @update:value="updateFromRgba"
          />
          <p v-if="rgbaError" class="cc-error">{{ rgbaError }}</p>
        </div>
      </div>

      <!-- 右侧：历史记录 -->
      <div class="cc-history">
        <div class="cc-history-header">
          <h3 class="cc-history-title">最近使用</h3>
          <NButton text size="tiny" @click="clearHistory" v-if="history.length > 0">
            清除
          </NButton>
        </div>
        <div v-if="history.length === 0" class="cc-history-empty">
          暂无历史记录
        </div>
        <div v-else class="cc-history-grid">
          <button
            v-for="hex in history"
            :key="hex"
            class="cc-history-item"
            :class="{ active: hex === swatchColor }"
            :title="hex"
            @click="applyHistory(hex)"
          >
            <span class="cc-history-swatch" :style="{ backgroundColor: hex }" />
            <span class="cc-history-hex">{{ hex }}</span>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.color-converter {
}

.cc-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 32px;
  align-items: start;
}

@media (max-width: 768px) {
  .cc-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .cc-history {
    order: -1;
  }
}

/* 色板 */
.cc-swatch-area {
  display: flex;
  align-items: center;
  gap: 20px;
}

.cc-swatch {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  border: 2px solid var(--color-neutral-200);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

/* 输入字段 */
.cc-field {
  margin-bottom: 16px;
}

.cc-field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-500);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cc-input {
  font-family: var(--font-mono);
  --n-height: 36px;
}

.cc-error {
  margin: 4px 0 0;
  font-size: var(--text-xs);
  color: var(--color-danger);
}

/* 历史 */
.cc-history {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.cc-history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.cc-history-title {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
}

.cc-history-empty {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
  padding: 16px 0;
  text-align: center;
}

.cc-history-grid {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cc-history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  transition: all var(--duration-fast);
}

.cc-history-item:hover {
  background: var(--color-neutral-50);
  border-color: var(--color-neutral-200);
}

.cc-history-item.active {
  background: var(--color-primary-50);
  border-color: var(--color-primary-200);
}

.cc-history-swatch {
  display: block;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--color-neutral-200);
  flex-shrink: 0;
}

.cc-history-hex {
  font-size: var(--text-sm);
  font-family: var(--font-mono);
  color: var(--color-neutral-700);
}
</style>
