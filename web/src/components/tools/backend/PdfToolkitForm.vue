<script setup lang="ts">
/**
 * PdfToolkitForm — PDF 工具箱专属表单
 * 支持：拆分 / 合并 / 压缩 / 提取文字 / 提取图片
 */
import { computed, ref } from 'vue'
import { NInput, NSlider } from 'naive-ui'
import { validateFile, formatFileSize } from '@/lib/file-utils'
import type { BackendJobToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: BackendJobToolDefinition
  isBusy: boolean
}>()

const emit = defineEmits<{
  submit: [payload: {
    file: File
    action: string
    pages?: string
    quality?: number
  }]
}>()

type PdfAction = 'merge' | 'split' | 'compress' | 'extract_text' | 'extract_images'

const actionOptions: { label: string; value: PdfAction; desc: string }[] = [
  { label: '合并 PDF', value: 'merge', desc: '多个 PDF 合并为一个' },
  { label: '拆分 PDF', value: 'split', desc: '按页码范围提取为独立文件' },
  { label: '压缩 PDF', value: 'compress', desc: '减小文件体积' },
  { label: '提取文字', value: 'extract_text', desc: '提取 PDF 中的文本内容' },
  { label: '提取图片', value: 'extract_images', desc: '提取嵌入的图片文件' },
]

const action = ref<PdfAction>('merge')
const pages = ref('')
const quality = ref(2)
const selectedFile = ref<File | null>(null)
const fileError = ref<string | null>(null)

const needsPages = computed(() => action.value === 'split')
const needsQuality = computed(() => action.value === 'compress')
const canSubmit = computed(() =>
  selectedFile.value !== null && !fileError.value &&
  (!needsPages.value || pages.value.trim() !== ''),
)

/* 文件选择 */
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

function handleSubmit() {
  if (!selectedFile.value || !canSubmit.value) return
  emit('submit', {
    file: selectedFile.value,
    action: action.value,
    pages: needsPages.value ? pages.value : undefined,
    quality: needsQuality.value ? quality.value : undefined,
  })
}
</script>

<template>
  <div class="ptf-form">
    <!-- 操作选择卡片 -->
    <div class="ptf-card">
      <p class="ptf-card-title">PDF 操作</p>
      <div class="ptf-action-grid">
        <button
          v-for="opt in actionOptions"
          :key="opt.value"
          class="ptf-action-btn"
          :class="{ active: action === opt.value }"
          :disabled="isBusy"
          @click="action = opt.value"
        >
          <span class="ptf-action-label">{{ opt.label }}</span>
          <span class="ptf-action-desc">{{ opt.desc }}</span>
        </button>
      </div>

      <!-- 拆分：页码范围 -->
      <div v-if="needsPages" class="ptf-sub-row">
        <p class="ptf-sub-label">页码范围</p>
        <NInput
          v-model:value="pages"
          placeholder="如: 1-5, 7, 9-12"
          :disabled="isBusy"
          size="small"
          class="ptf-input"
        />
        <p class="ptf-hint">支持逗号分隔的页码范围，如 1-5,7,9-12</p>
      </div>

      <!-- 压缩：质量滑块 -->
      <div v-if="needsQuality" class="ptf-sub-row">
        <p class="ptf-sub-label">压缩级别</p>
        <div class="ptf-slider-row">
          <span class="ptf-slider-label">轻</span>
          <NSlider
            v-model:value="quality"
            :min="1" :max="3" :step="1"
            :disabled="isBusy"
            class="ptf-slider"
          />
          <span class="ptf-slider-label">重</span>
        </div>
        <p class="ptf-hint">
          {{ quality === 1 ? '质量优先，体积变化较小' : quality === 3 ? '体积优先，质量轻微下降' : '质量与体积平衡' }}
        </p>
      </div>
    </div>

    <!-- 文件上传卡片 -->
    <div class="ptf-card">
      <p class="ptf-card-title">选择文件</p>

      <div
        v-if="!selectedFile"
        class="ptf-dropzone"
        @click="triggerFileInput"
        @drop.prevent="handleDrop"
        @dragover.prevent="handleDragOver"
      >
        <span class="ptf-dropzone-icon">📄</span>
        <p class="ptf-dropzone-title">点击或拖拽选择文件</p>
        <p class="ptf-dropzone-hint">
          {{ action === 'merge' ? '支持 PDF / ZIP（多个 PDF 打包），最大 200MB' : '支持 PDF 文件，最大 200MB' }}
        </p>
      </div>

      <div v-else class="ptf-file-row">
        <div class="ptf-file-info">
          <svg class="ptf-file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div>
            <p class="ptf-file-name">{{ selectedFile.name }}</p>
            <p class="ptf-file-size">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
        </div>
        <button class="ptf-file-change" @click="clearFile" :disabled="isBusy">更换</button>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        :accept="tool.accept"
        class="ptf-hidden"
        :disabled="isBusy"
        @change="handleFileChange"
      />

      <p v-if="fileError" class="ptf-error">{{ fileError }}</p>
    </div>

    <!-- 提交 -->
    <button
      class="ptf-submit-btn"
      :disabled="!canSubmit || isBusy"
      @click="handleSubmit"
    >
      <span v-if="!isBusy">📄 开始处理</span>
      <span v-else>处理中…</span>
    </button>
  </div>
</template>

<style scoped>
.ptf-form { max-width: var(--max-content-width); }

/* 卡片 */
.ptf-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}
.ptf-card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 14px;
}

/* 操作按钮网格 */
.ptf-action-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}
.ptf-action-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  background: var(--color-white);
  cursor: pointer;
  text-align: left;
  transition: all var(--duration-fast) var(--ease-in-out);
}
.ptf-action-btn:hover { border-color: var(--color-primary-400); background: var(--color-primary-50); }
.ptf-action-btn.active {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
  box-shadow: 0 0 0 1px var(--color-primary-500);
}
.ptf-action-btn:disabled { opacity: .4; cursor: not-allowed; }
.ptf-action-label {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-800);
}
.ptf-action-btn.active .ptf-action-label { color: var(--color-primary-700); }
.ptf-action-desc {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}

/* 子行 */
.ptf-sub-row { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--color-neutral-100); }
.ptf-sub-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500);
  margin: 0 0 8px;
}
.ptf-input { max-width: 320px; }
.ptf-slider-row { display: flex; align-items: center; gap: 12px; max-width: 320px; }
.ptf-slider { flex: 1; }
.ptf-slider-label { font-size: var(--text-xs); color: var(--color-neutral-400); }
.ptf-hint { font-size: var(--text-xs); color: var(--color-neutral-400); margin: 6px 0 0; }

/* 上传区 */
.ptf-dropzone {
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
.ptf-dropzone:hover { border-color: var(--color-primary-400); background: var(--color-primary-50); }
.ptf-dropzone-icon { font-size: 32px; }
.ptf-dropzone-title { font-size: var(--text-sm); color: var(--color-neutral-600); margin: 0; }
.ptf-dropzone-hint { font-size: var(--text-xs); color: var(--color-neutral-400); margin: 0; }

/* 已选文件行 */
.ptf-file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
}
.ptf-file-info { display: flex; align-items: center; gap: 12px; }
.ptf-file-icon { width: 32px; height: 32px; color: var(--color-primary-500); flex-shrink: 0; }
.ptf-file-name { font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-neutral-800); margin: 0; }
.ptf-file-size { font-size: var(--text-xs); color: var(--color-neutral-400); margin: 2px 0 0; }
.ptf-file-change {
  padding: 6px 14px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 6px;
  background: var(--color-white);
  font-size: var(--text-xs);
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all var(--duration-fast);
}
.ptf-file-change:hover { background: var(--color-neutral-50); border-color: var(--color-neutral-300); }
.ptf-file-change:disabled { opacity: .4; cursor: not-allowed; }

.ptf-error { font-size: var(--text-xs); color: var(--color-danger); margin: 8px 0 0; }
.ptf-hidden { display: none; }

/* 提交按钮 */
.ptf-submit-btn {
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
.ptf-submit-btn:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.ptf-submit-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
.ptf-submit-btn:active:not(:disabled) { transform: translateY(0); }
</style>
