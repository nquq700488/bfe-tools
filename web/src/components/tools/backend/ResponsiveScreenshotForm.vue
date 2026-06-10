<script setup lang="ts">
/**
 * ResponsiveScreenshotForm — 多分辨率截图表单
 * 无文件上传，输入 URL + 选择分辨率
 */
import { ref } from 'vue'
import { NInput, NSelect, NSwitch } from 'naive-ui'
import type { BackendJobToolDefinition } from '@/types/tool'

defineProps<{
  tool: BackendJobToolDefinition
  isBusy: boolean
}>()

const emit = defineEmits<{
  submit: [payload: {
    url: string
    widths: number[]
    fullPage: boolean
    format: string
  }]
}>()

const url = ref('')
const urlError = ref<string | null>(null)
const fullPage = ref(true)
const format = ref('png')

const RESOLUTIONS = [
  { label: '320 (Mobile S)', value: 320 },
  { label: '375 (Mobile M)', value: 375 },
  { label: '768 (Tablet)', value: 768 },
  { label: '1024 (Tablet L)', value: 1024 },
  { label: '1440 (Desktop)', value: 1440 },
  { label: '1920 (Desktop L)', value: 1920 },
]

const selectedWidths = ref<number[]>([320, 768, 1440])

const PRESETS = [
  { label: '📱 手机', widths: [320, 375] },
  { label: '📋 平板', widths: [768, 1024] },
  { label: '🖥️ 桌面', widths: [1440, 1920] },
  { label: '⚡ 全部', widths: RESOLUTIONS.map((r) => r.value) },
]

function applyPreset(widths: number[]) {
  selectedWidths.value = [...widths]
}

function validateUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch { return false }
}

function handleSubmit() {
  urlError.value = null
  if (!url.value.trim()) { urlError.value = '请输入网页地址'; return }
  if (!validateUrl(url.value.trim())) { urlError.value = '请输入有效的 http/https 地址'; return }
  if (selectedWidths.value.length === 0) { urlError.value = '请选择至少一个分辨率'; return }

  emit('submit', {
    url: url.value.trim(),
    widths: selectedWidths.value,
    fullPage: fullPage.value,
    format: format.value,
  })
}
</script>

<template>
  <div class="rsf-form">
    <!-- URL 输入卡片 -->
    <div class="rsf-card">
      <p class="rsf-card-title">网页地址</p>
      <NInput
        v-model:value="url"
        placeholder="https://example.com"
        size="large"
        :disabled="isBusy"
        :status="urlError ? 'error' : undefined"
        class="rsf-url-input"
      />
      <p v-if="urlError" class="rsf-error">{{ urlError }}</p>
    </div>

    <!-- 分辨率选择卡片 -->
    <div class="rsf-card">
      <div class="rsf-card-header">
        <p class="rsf-card-title">分辨率</p>
        <div class="rsf-preset-row">
          <button
            v-for="p in PRESETS"
            :key="p.label"
            class="rsf-preset-btn"
            @click="applyPreset(p.widths)"
          >
            {{ p.label }}
          </button>
        </div>
      </div>

      <div class="rsf-res-grid">
        <label
          v-for="opt in RESOLUTIONS"
          :key="opt.value"
          class="rsf-res-chip"
          :class="{ active: selectedWidths.includes(opt.value) }"
        >
          <input
            type="checkbox"
            :checked="selectedWidths.includes(opt.value)"
            :disabled="isBusy"
            class="rsf-checkbox"
            @change="(e: Event) => {
              const checked = (e.target as HTMLInputElement).checked
              if (checked) selectedWidths.push(opt.value)
              else selectedWidths = selectedWidths.filter(w => w !== opt.value)
            }"
          />
          <span class="rsf-res-value">{{ opt.value }}</span>
          <span class="rsf-res-label">{{ opt.label.match(/\((.+)\)/)?.[1] ?? '' }}</span>
        </label>
      </div>
    </div>

    <!-- 选项卡片 -->
    <div class="rsf-card">
      <p class="rsf-card-title">输出选项</p>
      <div class="rsf-options-row">
        <div class="rsf-option">
          <span class="rsf-option-label">全页截图</span>
          <NSwitch v-model:value="fullPage" :disabled="isBusy" />
        </div>
        <div class="rsf-option">
          <span class="rsf-option-label">输出格式</span>
          <NSelect
            v-model:value="format"
            :options="[{ label: 'PNG', value: 'png' }, { label: 'JPEG', value: 'jpeg' }]"
            :disabled="isBusy"
            size="small"
            class="rsf-select"
          />
        </div>
      </div>
    </div>

    <!-- 提交 -->
    <button
      class="rsf-submit-btn"
      :disabled="!url.trim() || selectedWidths.length === 0 || isBusy"
      @click="handleSubmit"
    >
      <span v-if="!isBusy">📸 开始截图</span>
      <span v-else>截图中…</span>
    </button>
  </div>
</template>

<style scoped>
.rsf-form { max-width: var(--max-content-width); }

.rsf-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}
.rsf-card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 14px;
}
.rsf-card-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.rsf-card-header .rsf-card-title { margin-bottom: 0; padding-top: 4px; }

.rsf-url-input { --n-height: 44px; }

.rsf-preset-row { display: flex; gap: 4px; flex-wrap: wrap; }
.rsf-preset-btn {
  padding: 4px 10px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 6px;
  background: var(--color-white);
  font-size: var(--text-xs);
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all var(--duration-fast);
}
.rsf-preset-btn:hover { border-color: var(--color-primary-400); background: var(--color-primary-50); }

/* 分辨率芯片网格 */
.rsf-res-grid { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
.rsf-res-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--duration-fast);
  user-select: none;
}
.rsf-res-chip:hover { border-color: var(--color-primary-400); }
.rsf-res-chip.active {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}
.rsf-checkbox { display: none; }
.rsf-res-value {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  font-family: var(--font-mono);
}
.rsf-res-chip.active .rsf-res-value { color: var(--color-primary-700); }
.rsf-res-label { font-size: 11px; color: var(--color-neutral-400); }

/* 选项行 */
.rsf-options-row { display: flex; gap: 32px; flex-wrap: wrap; }
.rsf-option { display: flex; align-items: center; gap: 10px; }
.rsf-option-label { font-size: var(--text-sm); color: var(--color-neutral-600); }
.rsf-select { width: 100px; }

.rsf-error { font-size: var(--text-xs); color: var(--color-danger); margin: 8px 0 0; }

.rsf-submit-btn {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500));
  color: #fff;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-in-out);
}
.rsf-submit-btn:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.rsf-submit-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
.rsf-submit-btn:active:not(:disabled) { transform: translateY(0); }
</style>
