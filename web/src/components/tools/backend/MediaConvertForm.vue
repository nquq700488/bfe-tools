<script setup lang="ts">
/**
 * MediaConvertForm — 媒体格式转换专属表单
 * 两步流程：选择文件 → 检测类别/选择格式 → 确认转换
 */
import { computed, ref, watch } from 'vue'
import { INPUT_CATEGORY_MAP } from '@/lib/constants'
import { validateFile, formatFileSize } from '@/lib/file-utils'
import type { BackendJobToolDefinition, ConvertFormat, FormatCategory } from '@/types/tool'

const props = defineProps<{
  tool: BackendJobToolDefinition
  isBusy: boolean
}>()

const emit = defineEmits<{
  convert: [payload: { file: File; targetFormat: string }]
}>()

const selectedFile = ref<File | null>(null)
const detectedInputCategory = ref<FormatCategory | null>(null)
const convertFormat = ref(props.tool.convertOptions?.defaultFormat || 'mp4')
const fileError = ref<string | null>(null)

/** 根据输入类别过滤的可用输出格式 */
const availableConvertFormats = computed<ConvertFormat[]>(() => {
  const formats = props.tool.convertOptions?.formats || []
  if (!detectedInputCategory.value) return formats
  return formats.filter((f) => f.category === detectedInputCategory.value)
})

/** 是否显示格式选择器（已选择文件后） */
const showFormatSelector = computed(() => selectedFile.value !== null)

watch(() => props.tool.convertOptions?.defaultFormat, (fmt) => {
  if (fmt) convertFormat.value = fmt
})

/** 文件拖拽区点击 */
const fileInputRef = ref<HTMLInputElement | null>(null)
function triggerFileInput() { fileInputRef.value?.click() }

/** 文件选择 */
function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  selectFile(file)
  input.value = ''
}

/** 拖拽事件 */
function handleDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) selectFile(file)
}

function handleDragOver(e: DragEvent) { e.preventDefault() }

/** 选择文件：校验 → 检测类别 → 自动匹配格式 */
function selectFile(file: File) {
  fileError.value = null
  const err = validateFile(file, props.tool.accept, props.tool.maxSize)
  if (err) {
    fileError.value = err
    return
  }
  selectedFile.value = file
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  detectedInputCategory.value = INPUT_CATEGORY_MAP[ext] || null
  // 当前格式不在可用列表中时，自动切换到第一个
  const available = availableConvertFormats.value
  if (available.length > 0 && !available.some((f) => f.value === convertFormat.value)) {
    convertFormat.value = available[0].value
  }
}

/** 清除已选文件 */
function clearFile() {
  selectedFile.value = null
  detectedInputCategory.value = null
  fileError.value = null
}

/** 确认转换 */
function handleConvert() {
  if (!selectedFile.value) return
  emit('convert', { file: selectedFile.value, targetFormat: convertFormat.value })
}

/** 类别图标映射 */
const categoryIcon = computed(() => {
  if (!detectedInputCategory.value) return ''
  const map: Record<string, string> = { image: '🖼️', video: '🎬', audio: '🎵' }
  return map[detectedInputCategory.value] || ''
})

const categoryLabel = computed(() => {
  if (!detectedInputCategory.value) return ''
  const map: Record<string, string> = { image: '图片', video: '视频', audio: '音频' }
  return map[detectedInputCategory.value] || ''
})
</script>

<template>
  <div>
    <!-- ====== Step 1: 文件选择区 ====== -->
    <div
      v-if="!showFormatSelector"
      class="mcf-dropzone"
      role="button"
      tabindex="0"
      @click="triggerFileInput"
      @keydown.enter="triggerFileInput"
      @drop="handleDrop"
      @dragover="handleDragOver"
    >
      <svg class="mcf-dropzone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <p class="mcf-dropzone-title">点击或拖拽选择媒体文件</p>
      <p class="mcf-dropzone-hint">支持图片（PNG/JPG/WebP/GIF/BMP/HEIC）、视频（MP4/WebM/AVI/MOV/MKV）、音频（MP3/WAV/OGG/M4A/FLAC/AAC）</p>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      :accept="tool.accept"
      class="hidden"
      @change="handleFileChange"
    />

    <!-- 文件校验错误 -->
    <p v-if="fileError" class="mcf-error">{{ fileError }}</p>

    <!-- ====== Step 2: 已选文件 + 格式选择 + 转换按钮 ====== -->
    <div v-if="showFormatSelector" class="mcf-config-area">
      <!-- 已选文件信息 -->
      <div class="tts-card">
        <div class="mcf-file-row">
          <div class="mcf-file-info">
            <svg class="mcf-file-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p class="mcf-file-name">{{ selectedFile?.name }}</p>
              <p class="mcf-file-size">{{ selectedFile ? formatFileSize(selectedFile.size) : '' }}</p>
            </div>
          </div>
          <button class="mcf-file-change" @click="clearFile" :disabled="isBusy" aria-label="更换文件">
            更换
          </button>
        </div>
      </div>

      <!-- 未知格式：显示错误，不展示格式选择 -->
      <div v-if="!detectedInputCategory" class="tts-card">
        <p class="mcf-error">
          无法识别输入格式（.{{ selectedFile?.name.split('.').pop()?.toLowerCase() }}），支持的扩展名: png, jpg, jpeg, webp, gif, bmp, heic, heif, mp4, webm, avi, mov, mkv, mp3, wav, ogg, m4a, flac, aac
        </p>
      </div>

      <!-- 已知格式：展示格式选择 + 转换按钮 -->
      <template v-else>
        <div class="tts-card">
          <p class="tts-card-title">
            输出格式
            <span class="convert-category-badge">
              {{ categoryIcon }} {{ categoryLabel }}
            </span>
          </p>
          <div class="tts-format-toggle convert-format-grid">
            <button
              v-for="fmt in availableConvertFormats"
              :key="fmt.value"
              class="tts-format-btn"
              :class="{ active: convertFormat === fmt.value }"
              :disabled="isBusy"
              @click="convertFormat = fmt.value"
            >
              {{ fmt.label }}
            </button>
          </div>
        </div>

        <button
          class="mcf-submit-btn"
          :disabled="!selectedFile || isBusy"
          @click="handleConvert"
        >
          <span v-if="!isBusy">🎬 开始转换</span>
          <span v-else>转换中…</span>
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* ===== 拖拽上传区 ===== */
.mcf-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 160px;
  border: 2px dashed var(--color-neutral-300);
  border-radius: 12px;
  cursor: pointer;
  transition: all var(--duration-fast);
  background: var(--color-white);
}

.mcf-dropzone:hover {
  border-color: var(--color-primary-400);
  background: var(--color-primary-50);
}

.mcf-dropzone-icon {
  width: 40px;
  height: 40px;
  color: var(--color-neutral-400);
}

.mcf-dropzone-title {
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
}

.mcf-dropzone-hint {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
  max-width: 480px;
  text-align: center;
  line-height: 1.5;
}

.mcf-error {
  margin-top: 8px;
  padding: 8px 12px;
  font-size: var(--text-xs);
  color: var(--color-danger);
  background: var(--color-danger-light, #fef2f2);
  border-radius: 6px;
  border: 1px solid var(--color-danger-light, #fecaca);
}

/* ===== 配置区 ===== */
.mcf-config-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ===== 已选文件信息 ===== */
.mcf-file-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.mcf-file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mcf-file-icon {
  width: 24px;
  height: 24px;
  color: var(--color-primary-600);
  flex-shrink: 0;
}

.mcf-file-name {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-800);
  max-width: 320px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mcf-file-size {
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
}

.mcf-file-change {
  padding: 4px 12px;
  border: 1px solid var(--color-neutral-300);
  border-radius: 6px;
  background: var(--color-white);
  font-size: var(--text-xs);
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all var(--duration-fast);
  flex-shrink: 0;
}

.mcf-file-change:hover:not(:disabled) {
  border-color: var(--color-primary-400);
  color: var(--color-primary-600);
}

.mcf-file-change:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 转换按钮 ===== */
.mcf-submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 10px;
  background: var(--color-primary-600);
  color: var(--color-white);
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--duration-fast);
}

.mcf-submit-btn:hover:not(:disabled) {
  background: var(--color-primary-700);
}

.mcf-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ===== 复用 TTS 卡片/格式切换样式（scoped 内重定义） ===== */
.tts-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.tts-card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin-bottom: 14px;
}

/* 格式切换按钮组 */
.tts-format-toggle {
  display: flex;
  gap: 0;
  background: var(--color-neutral-100);
  border-radius: 8px;
  padding: 3px;
}

.tts-format-btn {
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

.tts-format-btn.active {
  background: var(--color-white);
  color: var(--color-primary-700);
  box-shadow: var(--shadow-sm);
}

.tts-format-btn:hover:not(.active):not(:disabled) {
  color: var(--color-neutral-700);
}

.tts-format-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 格式按钮网格模式 */
.convert-format-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.convert-format-grid .tts-format-btn {
  flex: none;
  min-width: 64px;
  padding: 0 14px;
}

/* 类别标识 */
.convert-category-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-600);
  background: var(--color-primary-100);
  border-radius: 20px;
  vertical-align: middle;
}

@media (max-width: 640px) {
  .mcf-file-name {
    max-width: 180px;
  }

  .mcf-dropzone {
    min-height: 130px;
    padding: 16px;
  }
}
</style>
