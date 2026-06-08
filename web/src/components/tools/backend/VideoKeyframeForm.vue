<script setup lang="ts">
/**
 * VideoKeyframeForm — 视频关键帧提取表单
 * 上传视频 → 按间隔/时间点提取帧 → 打包下载
 */
import { computed, ref } from 'vue'
import { NInput, NInputNumber, NSelect } from 'naive-ui'
import { validateFile, formatFileSize } from '@/lib/file-utils'
import type { BackendJobToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: BackendJobToolDefinition
  isBusy: boolean
}>()

const emit = defineEmits<{
  submit: [payload: {
    file: File
    mode: 'interval' | 'timestamps'
    interval?: number
    timestamps?: string
    format: 'png' | 'webp'
    width?: number
  }]
}>()

const selectedFile = ref<File | null>(null)
const fileError = ref<string | null>(null)
const mode = ref<'interval' | 'timestamps'>('interval')
const interval = ref(5)
const timestamps = ref('')
const outputFormat = ref<'png' | 'webp'>('png')
const targetWidth = ref<number | null>(null)

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

const canSubmit = computed(() =>
  selectedFile.value !== null && !fileError.value &&
  (mode.value !== 'timestamps' || timestamps.value.trim() !== ''),
)

function handleSubmit() {
  if (!selectedFile.value || !canSubmit.value) return
  emit('submit', {
    file: selectedFile.value,
    mode: mode.value,
    interval: mode.value === 'interval' ? interval.value : undefined,
    timestamps: mode.value === 'timestamps' ? timestamps.value.trim() : undefined,
    format: outputFormat.value,
    width: targetWidth.value || undefined,
  })
}
</script>

<template>
  <div class="vkf-form">
    <!-- 上传卡片 -->
    <div class="vkf-card">
      <p class="vkf-card-title">选择视频</p>
      <div
        v-if="!selectedFile"
        class="vkf-dropzone"
        @click="triggerFileInput"
        @drop.prevent="handleDrop"
        @dragover.prevent="handleDragOver"
      >
        <span class="vkf-dropzone-icon">🎬</span>
        <p class="vkf-dropzone-title">点击或拖拽选择视频</p>
        <p class="vkf-dropzone-hint">支持 MP4 / WebM / AVI / MOV / MKV，最大 2GB</p>
      </div>
      <div v-else class="vkf-file-row">
        <div class="vkf-file-info">
          <svg class="vkf-file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <div>
            <p class="vkf-file-name">{{ selectedFile.name }}</p>
            <p class="vkf-file-size">{{ formatFileSize(selectedFile.size) }}</p>
          </div>
        </div>
        <button class="vkf-file-change" @click="clearFile" :disabled="isBusy">更换</button>
      </div>
      <input ref="fileInputRef" type="file" :accept="tool.accept" class="vkf-hidden"
        :disabled="isBusy" @change="handleFileChange" />
      <p v-if="fileError" class="vkf-error">{{ fileError }}</p>
    </div>

    <!-- 参数卡片 -->
    <div class="vkf-card">
      <p class="vkf-card-title">提取设置</p>

      <!-- 提取模式 -->
      <div class="vkf-section">
        <p class="vkf-section-label">提取模式</p>
        <div class="vkf-mode-tabs">
          <button
            :class="{ active: mode === 'interval' }"
            @click="mode = 'interval'"
            :disabled="isBusy"
          >⏱ 按时间间隔</button>
          <button
            :class="{ active: mode === 'timestamps' }"
            @click="mode = 'timestamps'"
            :disabled="isBusy"
          >📍 指定时间点</button>
        </div>
      </div>

      <!-- 间隔模式 -->
      <div v-if="mode === 'interval'" class="vkf-section">
        <div class="vkf-param-row">
          <span class="vkf-param-label">间隔</span>
          <NInputNumber v-model:value="interval" :min="0.5" :max="3600" :step="0.5"
            :disabled="isBusy" size="small" style="width:100px" />
          <span class="vkf-param-unit">秒</span>
        </div>
        <p class="vkf-hint">每 {{ interval }} 秒提取一帧</p>
      </div>

      <!-- 时间点模式 -->
      <div v-if="mode === 'timestamps'" class="vkf-section">
        <p class="vkf-section-label">时间点</p>
        <NInput v-model:value="timestamps" placeholder="如: 5.0, 15.0, 30.0" :disabled="isBusy" />
        <p class="vkf-hint">逗号分隔，单位秒。如 5, 15.5, 30</p>
      </div>

      <div class="vkf-divider" />

      <!-- 输出选项 -->
      <div class="vkf-options-row">
        <div class="vkf-option">
          <p class="vkf-section-label">输出格式</p>
          <NSelect v-model:value="outputFormat"
            :options="[{ label: 'PNG', value: 'png' }, { label: 'WebP', value: 'webp' }]"
            :disabled="isBusy" size="small" style="width:120px" />
        </div>
        <div class="vkf-option">
          <p class="vkf-section-label">画面宽度</p>
          <NInputNumber v-model:value="targetWidth" :min="100" :max="7680"
            :disabled="isBusy" size="small" placeholder="原始" style="width:100px" />
          <span class="vkf-hint">px，留空保持原始</span>
        </div>
      </div>
    </div>

    <!-- 提交 -->
    <button class="vkf-submit-btn" :disabled="!canSubmit || isBusy" @click="handleSubmit">
      <span v-if="!isBusy">🎞️ 开始提取</span>
      <span v-else>提取中…</span>
    </button>
  </div>
</template>

<style scoped>
.vkf-form { max-width: var(--max-content-width); }

.vkf-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}
.vkf-card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0 0 14px;
}

/* 上传区 */
.vkf-dropzone {
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
.vkf-dropzone:hover { border-color: var(--color-primary-400); background: var(--color-primary-50); }
.vkf-dropzone-icon { font-size: 32px; }
.vkf-dropzone-title { font-size: var(--text-sm); color: var(--color-neutral-600); margin: 0; }
.vkf-dropzone-hint { font-size: var(--text-xs); color: var(--color-neutral-400); margin: 0; }

.vkf-file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
}
.vkf-file-info { display: flex; align-items: center; gap: 12px; }
.vkf-file-icon { width: 32px; height: 32px; color: var(--color-primary-500); flex-shrink: 0; }
.vkf-file-name { font-size: var(--text-sm); font-weight: var(--font-weight-medium); color: var(--color-neutral-800); margin: 0; }
.vkf-file-size { font-size: var(--text-xs); color: var(--color-neutral-400); margin: 2px 0 0; }
.vkf-file-change {
  padding: 6px 14px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 6px;
  background: var(--color-white);
  font-size: var(--text-xs);
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all var(--duration-fast);
}
.vkf-file-change:hover { background: var(--color-neutral-50); border-color: var(--color-neutral-300); }
.vkf-file-change:disabled { opacity: .4; cursor: not-allowed; }

.vkf-error { font-size: var(--text-xs); color: var(--color-danger); margin: 8px 0 0; }
.vkf-hidden { display: none; }

/* 分区 */
.vkf-section { margin-bottom: 16px; }
.vkf-section:last-child { margin-bottom: 0; }
.vkf-section-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500);
  margin: 0 0 8px;
}

/* 模式切换 */
.vkf-mode-tabs {
  display: flex;
  gap: 0;
  background: var(--color-neutral-100);
  border-radius: 8px;
  padding: 3px;
}
.vkf-mode-tabs button {
  flex: 1;
  height: 34px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-in-out);
}
.vkf-mode-tabs button.active {
  background: var(--color-white);
  color: var(--color-neutral-800);
  box-shadow: var(--shadow-sm);
}
.vkf-mode-tabs button:disabled { opacity: .4; cursor: not-allowed; }

.vkf-hint { font-size: var(--text-xs); color: var(--color-neutral-400); margin: 6px 0 0; }

/* 参数行：label + input + unit 同行 */
.vkf-param-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.vkf-param-label {
  font-size: var(--text-sm);
  color: var(--color-neutral-600);
}
.vkf-param-unit {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}

/* 分割线 */
.vkf-divider {
  height: 1px;
  background: var(--color-neutral-100);
  margin: 0 0 16px;
}

/* 输出选项 */
.vkf-options-row {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}
.vkf-option {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.vkf-option .vkf-hint { margin-top: 2px; }

.vkf-submit-btn {
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
.vkf-submit-btn:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.vkf-submit-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
.vkf-submit-btn:active:not(:disabled) { transform: translateY(0); }
</style>
