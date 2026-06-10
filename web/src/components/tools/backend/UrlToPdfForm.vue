<script setup lang="ts">
/**
 * UrlToPdfForm — 网页转 PDF 表单
 * 输入 URL → 选择页面格式 → 导出 PDF
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
    format: string
    landscape: boolean
    printBackground: boolean
  }]
}>()

const url = ref('')
const urlError = ref<string | null>(null)
const pageFormat = ref('A4')
const landscape = ref(false)
const printBackground = ref(true)

const FORMATS = [
  { label: 'A4', value: 'A4' },
  { label: 'Letter', value: 'Letter' },
  { label: 'Legal', value: 'Legal' },
  { label: 'A3', value: 'A3' },
  { label: 'A5', value: 'A5' },
  { label: 'Tabloid', value: 'Tabloid' },
]

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
    format: pageFormat.value,
    landscape: landscape.value,
    printBackground: printBackground.value,
  })
}
</script>

<template>
  <div class="utp-form">
    <!-- URL 输入 -->
    <div class="utp-card">
      <p class="utp-card-title">网页地址</p>
      <NInput
        v-model:value="url"
        placeholder="https://example.com"
        size="large"
        :disabled="isBusy"
        :status="urlError ? 'error' : undefined"
        class="utp-url-input"
      />
      <p v-if="urlError" class="utp-error">{{ urlError }}</p>
    </div>

    <!-- 输出选项 -->
    <div class="utp-card">
      <p class="utp-card-title">输出选项</p>
      <div class="utp-options-row">
        <div class="utp-option">
          <span class="utp-option-label">页面格式</span>
          <NSelect v-model:value="pageFormat" :options="FORMATS"
            :disabled="isBusy" size="small" style="width:110px" />
        </div>
        <div class="utp-option">
          <span class="utp-option-label">横向</span>
          <NSwitch v-model:value="landscape" :disabled="isBusy" />
        </div>
        <div class="utp-option">
          <span class="utp-option-label">打印背景</span>
          <NSwitch v-model:value="printBackground" :disabled="isBusy" />
        </div>
      </div>
    </div>

    <!-- 提交 -->
    <button class="utp-submit-btn" :disabled="!url.trim() || isBusy" @click="handleSubmit">
      <span v-if="!isBusy">📑 导出 PDF</span>
      <span v-else>导出中…</span>
    </button>
  </div>
</template>

<style scoped>
.utp-form { max-width: var(--max-content-width); }

.utp-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}
.utp-card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 14px;
}
.utp-url-input { --n-height: 44px; }

.utp-options-row { display: flex; gap: 32px; flex-wrap: wrap; align-items: center; }
.utp-option { display: flex; align-items: center; gap: 10px; }
.utp-option-label { font-size: var(--text-sm); color: var(--color-neutral-600); }

.utp-error { font-size: var(--text-xs); color: var(--color-danger); margin: 8px 0 0; }

.utp-submit-btn {
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
.utp-submit-btn:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.utp-submit-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
.utp-submit-btn:active:not(:disabled) { transform: translateY(0); }
</style>
