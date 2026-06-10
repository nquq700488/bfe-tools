<script setup lang="ts">
/**
 * PerfSnapshotForm — 页面性能快照表单
 * 输入 URL → 采集 Core Web Vitals + 网络 + 资源统计
 */
import { ref } from 'vue'
import { NInput } from 'naive-ui'
import type { BackendJobToolDefinition } from '@/types/tool'

defineProps<{
  tool: BackendJobToolDefinition
  isBusy: boolean
}>()

const emit = defineEmits<{
  submit: [payload: { url: string }]
}>()

const url = ref('')
const urlError = ref<string | null>(null)

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

  emit('submit', { url: url.value.trim() })
}
</script>

<template>
  <div class="psf-form">
    <!-- URL 输入 -->
    <div class="psf-card">
      <p class="psf-card-title">网页地址</p>
      <NInput
        v-model:value="url"
        placeholder="https://example.com"
        size="large"
        :disabled="isBusy"
        :status="urlError ? 'error' : undefined"
        class="psf-url-input"
      />
      <p v-if="urlError" class="psf-error">{{ urlError }}</p>
    </div>

    <!-- 提交 -->
    <button class="psf-submit-btn" :disabled="!url.trim() || isBusy" @click="handleSubmit">
      <span v-if="!isBusy">⚡ 开始检测</span>
      <span v-else>采集中…</span>
    </button>
  </div>
</template>

<style scoped>
.psf-form { max-width: var(--max-content-width); }

.psf-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}
.psf-card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 14px;
}
.psf-url-input { --n-height: 44px; }

.psf-error { font-size: var(--text-xs); color: var(--color-danger); margin: 8px 0 0; }

.psf-submit-btn {
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
.psf-submit-btn:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.psf-submit-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
.psf-submit-btn:active:not(:disabled) { transform: translateY(0); }
</style>
