<script setup lang="ts">
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
    width: number
    fullPage: boolean
    format: string
  }]
}>()

const url = ref('')
const urlError = ref<string | null>(null)
const fullPage = ref(true)
const format = ref('png')

const RESOLUTIONS = [
  { value: 320, label: '📱 320 — 手机 S' },
  { value: 375, label: '📱 375 — 手机 M' },
  { value: 768, label: '📋 768 — 平板' },
  { value: 1024, label: '📋 1024 — 平板 L' },
  { value: 1440, label: '🖥️ 1440 — 桌面' },
  { value: 1920, label: '🖥️ 1920 — 桌面 L' },
]

const selectedWidth = ref<number>(1920)

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

  emit('submit', {
    url: url.value.trim(),
    width: selectedWidth.value,
    fullPage: fullPage.value,
    format: format.value,
  })
}
</script>

<template>
  <div class="rsf-form">
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

    <div class="rsf-card">
      <p class="rsf-card-title">分辨率</p>
      <div class="rsf-radio-grid">
        <label
          v-for="opt in RESOLUTIONS"
          :key="opt.value"
          class="rsf-radio-chip"
          :class="{ active: selectedWidth === opt.value }"
        >
          <input
            type="radio"
            :value="opt.value"
            :checked="selectedWidth === opt.value"
            :disabled="isBusy"
            class="rsf-radio-input"
            @change="selectedWidth = opt.value"
          />
          {{ opt.label }}
        </label>
      </div>
    </div>

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

    <button
      class="rsf-submit-btn"
      :disabled="!url.trim() || isBusy"
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

.rsf-url-input { --n-height: 44px; }

.rsf-radio-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.rsf-radio-chip {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 8px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--duration-fast);
  user-select: none;
  font-size: var(--text-xs);
  color: var(--color-neutral-600);
}
.rsf-radio-chip:hover { border-color: var(--color-primary-400); }
.rsf-radio-chip.active {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
  color: var(--color-primary-700);
  font-weight: var(--font-weight-semibold);
}
.rsf-radio-input { display: none; }

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

@media (max-width: 480px) {
  .rsf-radio-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
