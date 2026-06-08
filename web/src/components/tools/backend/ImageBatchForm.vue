<script setup lang="ts">
/**
 * ImageBatchForm — 图片批量处理表单
 * 拖入图片或 ZIP → 批量 resize + 格式转换 + 多倍图 → srcset
 */
import { ref } from 'vue'
import { NInputNumber, NSelect, NSlider } from 'naive-ui'
import { validateFile, formatFileSize } from '@/lib/file-utils'
import type { BackendJobToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: BackendJobToolDefinition
  isBusy: boolean
}>()

const emit = defineEmits<{
  submit: [payload: {
    file: File
    widths: number[]
    format: string
    quality: number
    suffixRule: string
  }]
}>()

const selectedFile = ref<File | null>(null)
const fileError = ref<string | null>(null)
const widths = ref<number[]>([1920, 2880, 3840])
const format = ref('webp')
const quality = ref(85)
const suffixRule = ref('@1x')

const FORMATS = [
  { label: 'WebP', value: 'webp', desc: '最佳压缩' },
  { label: 'AVIF', value: 'avif', desc: '下一代格式' },
  { label: 'PNG', value: 'png', desc: '无损' },
  { label: 'JPEG', value: 'jpg', desc: '兼容性' },
]
const SUFFIX_RULES = [
  { label: '倍数后缀 (@1x, @2x, @3x)', value: '@1x' },
  { label: '下划线 (_1x, _2x, _3x)', value: '_1x' },
  { label: '宽度描述 (image-1920w)', value: 'w' },
]

/* 文件 */
const fileInputRef = ref<HTMLInputElement | null>(null)
function triggerFileInput() { fileInputRef.value?.click() }

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  selectFile(file)
  input.value = ''
}

function selectFile(file: File) {
  fileError.value = null
  const err = validateFile(file, props.tool.accept, props.tool.maxSize)
  if (err) { fileError.value = err; return }
  selectedFile.value = file
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) selectFile(file)
}
function handleDragOver(e: DragEvent) { e.preventDefault() }

function clearFile() { selectedFile.value = null; fileError.value = null }

/* 宽度管理 */
function addWidth() { widths.value.push(1920) }
function removeWidth(idx: number) { if (widths.value.length > 1) widths.value.splice(idx, 1) }

const canSubmit = selectedFile.value !== null && !fileError.value
  && widths.value.length > 0 && widths.value.every(w => w > 0)

function handleSubmit() {
  if (!selectedFile.value || !canSubmit) return
  emit('submit', {
    file: selectedFile.value,
    widths: widths.value,
    format: format.value,
    quality: quality.value,
    suffixRule: suffixRule.value,
  })
}
</script>

<template>
  <div class="ibf-form">
    <!-- 上传卡片 -->
    <div class="ibf-card">
      <p class="ibf-card-title">选择图片</p>
      <div
        v-if="!selectedFile"
        class="ibf-dropzone"
        @click="triggerFileInput"
        @drop.prevent="handleDrop"
        @dragover.prevent="handleDragOver"
      >
        <span class="ibf-dropzone-icon">🖼️</span>
        <p class="ibf-dropzone-title">点击或拖拽选择图片或 ZIP 包</p>
        <p class="ibf-dropzone-hint">支持 PNG / JPEG / WebP / BMP，ZIP 批量处理，最大 500MB</p>
      </div>
      <div v-else class="ibf-file-row">
        <div class="ibf-file-info">
          <svg class="ibf-file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <p class="ibf-file-name">{{ selectedFile.name }}</p>
            <p class="ibf-file-size">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
        </div>
        <button class="ibf-file-change" @click="clearFile" :disabled="isBusy">更换</button>
      </div>
      <input ref="fileInputRef" type="file" :accept="tool.accept" class="ibf-hidden"
        :disabled="isBusy" @change="handleFileChange" />
      <p v-if="fileError" class="ibf-error">{{ fileError }}</p>
    </div>

    <!-- 参数卡片 -->
    <div class="ibf-card">
      <p class="ibf-card-title">输出设置</p>

      <!-- 多倍图宽度 -->
      <div class="ibf-section">
        <p class="ibf-section-label">目标宽度（多倍图）</p>
        <div class="ibf-width-grid">
          <div v-for="(w, idx) in widths" :key="idx" class="ibf-width-chip">
            <NInputNumber v-model:value="widths[idx]" :min="1" :max="10000"
              :disabled="isBusy" size="small" class="ibf-width-input" />
            <span class="ibf-width-unit">px</span>
            <button
              v-if="widths.length > 1"
              class="ibf-width-remove"
              @click="removeWidth(idx)"
              aria-label="删除"
            >✕</button>
          </div>
          <button class="ibf-width-add" @click="addWidth">+ 添加</button>
        </div>
      </div>

      <!-- 格式 + 质量 + 后缀 -->
      <div class="ibf-options-grid">
        <div class="ibf-option">
          <p class="ibf-section-label">输出格式</p>
          <NSelect v-model:value="format" :options="FORMATS" :disabled="isBusy" size="small" />
        </div>
        <div class="ibf-option ibf-option--wide">
          <p class="ibf-section-label">Quality: {{ quality }}</p>
          <NSlider v-model:value="quality" :min="10" :max="100" :step="5" :disabled="isBusy" />
        </div>
        <div class="ibf-option">
          <p class="ibf-section-label">后缀规则</p>
          <NSelect v-model:value="suffixRule" :options="SUFFIX_RULES"
            :disabled="isBusy" size="small" />
        </div>
      </div>
    </div>

    <!-- 提交 -->
    <button class="ibf-submit-btn" :disabled="!canSubmit || isBusy" @click="handleSubmit">
      <span v-if="!isBusy">🖼️ 开始批量处理</span>
      <span v-else>处理中…</span>
    </button>
  </div>
</template>

<style scoped>
.ibf-form { max-width: var(--max-content-width); }

.ibf-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}
.ibf-card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 14px;
}

/* 上传区 */
.ibf-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 140px;
  border: 2px dashed var(--color-neutral-300);
  border-radius: 12px;
  cursor: pointer;
  background: var(--color-white);
  transition: all var(--duration-fast);
}
.ibf-dropzone:hover { border-color: var(--color-primary-400); background: var(--color-primary-50); }
.ibf-dropzone-icon { font-size: 32px; }
.ibf-dropzone-title { font-size: var(--text-sm); color: var(--color-neutral-600); margin: 0; }
.ibf-dropzone-hint { font-size: var(--text-xs); color: var(--color-neutral-400); margin: 0; }

.ibf-file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
}
.ibf-file-info { display: flex; align-items: center; gap: 12px; }
.ibf-file-icon { width: 32px; height: 32px; color: var(--color-primary-500); flex-shrink: 0; }
.ibf-file-name { font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-neutral-800); margin: 0; }
.ibf-file-size { font-size: var(--text-xs); color: var(--color-neutral-400); margin: 2px 0 0; }
.ibf-file-change {
  padding: 6px 14px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 6px;
  background: var(--color-white);
  font-size: var(--text-xs);
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all var(--duration-fast);
}
.ibf-file-change:hover { background: var(--color-neutral-50); border-color: var(--color-neutral-300); }
.ibf-file-change:disabled { opacity: .4; cursor: not-allowed; }

.ibf-error { font-size: var(--text-xs); color: var(--color-danger); margin: 8px 0 0; }
.ibf-hidden { display: none; }

/* 分区 */
.ibf-section { margin-bottom: 16px; }
.ibf-section:last-child { margin-bottom: 0; }
.ibf-section-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500);
  margin: 0 0 8px;
}

/* 宽度芯片 */
.ibf-width-grid { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.ibf-width-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 6px;
  background: var(--color-neutral-50);
}
.ibf-width-input { width: 80px; }
.ibf-width-unit { font-size: var(--text-xs); color: var(--color-neutral-400); }
.ibf-width-remove {
  padding: 2px 6px;
  border: none;
  background: transparent;
  font-size: 12px;
  color: var(--color-neutral-400);
  cursor: pointer;
  border-radius: 4px;
  line-height: 1;
}
.ibf-width-remove:hover { color: var(--color-danger); background: var(--color-danger-light); }
.ibf-width-add {
  padding: 6px 14px;
  border: 1px dashed var(--color-neutral-300);
  border-radius: 6px;
  background: transparent;
  font-size: var(--text-xs);
  color: var(--color-primary-500);
  cursor: pointer;
  transition: all var(--duration-fast);
}
.ibf-width-add:hover { border-color: var(--color-primary-400); background: var(--color-primary-50); }

/* 选项网格 */
.ibf-options-grid { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 20px; }
@media (max-width: 640px) { .ibf-options-grid { grid-template-columns: 1fr; } }
.ibf-option { min-width: 0; }

.ibf-submit-btn {
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
.ibf-submit-btn:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.ibf-submit-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
.ibf-submit-btn:active:not(:disabled) { transform: translateY(0); }
</style>
