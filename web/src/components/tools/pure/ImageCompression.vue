<script setup lang="ts">
/**
 * ImageCompression — 图片压缩工具
 * 拖拽/点击选择图片 → browser-image-compression 压缩 → 原图 vs 压缩对比
 */
import { ref, computed, onUnmounted } from 'vue'
import { NButton, NSlider, NSelect, NAlert, NInputNumber } from 'naive-ui'
import imageCompression from 'browser-image-compression'
import { formatFileSize } from '@/lib/file-utils'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import type { ClientOnlyToolDefinition } from '@/types/tool'

defineProps<{
  tool: ClientOnlyToolDefinition
}>()

const LARGE_IMAGE_SIZE = 20 * 1024 * 1024 // 20MB

type OutputFormat = 'image/png' | 'image/jpeg' | 'image/webp'
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const formatOptions = [
  { label: 'PNG', value: 'image/png' },
  { label: 'JPEG', value: 'image/jpeg' },
  { label: 'WebP', value: 'image/webp' },
]

// ---- 文件状态 ----
const originalFile = ref<File | null>(null)
const originalUrl = ref<string | null>(null)
const compressedUrl = ref<string | null>(null)
const compressedBlob = ref<Blob | null>(null)
const isProcessing = ref(false)
const errorMsg = ref<string | null>(null)
const isLarge = computed(() => (originalFile.value?.size ?? 0) > LARGE_IMAGE_SIZE)

// ---- 压缩参数 ----
const quality = ref(80)
const outputFormat = ref<OutputFormat>('image/jpeg')
const maxWidth = ref<number | null>(null)
const maxHeight = ref<number | null>(null)

// ---- 计算结果 ----
const compressedSize = ref(0)
const originalSize = computed(() => originalFile.value?.size ?? 0)
const compressionRatio = computed(() => {
  if (originalSize.value === 0 || compressedSize.value === 0) return 0
  return Math.round((1 - compressedSize.value / originalSize.value) * 100)
})
const compressedFileName = computed(() => {
  if (!originalFile.value) return 'compressed'
  const name = originalFile.value.name.replace(/\.[^.]+$/, '')
  const ext = outputFormat.value.split('/')[1]
  return `${name}.${ext}`
})

const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerFileInput(): void {
  fileInputRef.value?.click()
}

function handleFileChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) selectFile(file)
  input.value = ''
}

function handleDrop(e: DragEvent): void {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) selectFile(file)
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault()
}

function selectFile(file: File): void {
  errorMsg.value = null
  if (!ALLOWED_TYPES.includes(file.type)) {
    errorMsg.value = '不支持的文件格式，请选择 PNG、JPEG 或 WebP 图片'
    return
  }
  cleanup()
  originalFile.value = file
  originalUrl.value = URL.createObjectURL(file)
}

async function handleCompress(): Promise<void> {
  if (!originalFile.value) return
  errorMsg.value = null
  isProcessing.value = true

  try {
    const options: Record<string, unknown> = {
      maxSizeMB: originalFile.value.size / 1024 / 1024,
      maxWidthOrHeight: 4096,
      useWebWorker: true,
      fileType: outputFormat.value,
      initialQuality: quality.value / 100,
    }
    if (maxWidth.value) options.maxWidthOrHeight = Math.max(maxWidth.value, maxHeight.value ?? 0)
    else if (maxHeight.value) options.maxWidthOrHeight = maxHeight.value

    const result = await imageCompression(originalFile.value, options)
    compressedBlob.value = result
    compressedSize.value = result.size

    // 释放旧 URL
    if (compressedUrl.value) URL.revokeObjectURL(compressedUrl.value)
    compressedUrl.value = URL.createObjectURL(result)
  } catch (e) {
    errorMsg.value = `压缩失败：${e instanceof Error ? e.message : '未知错误'}`
  } finally {
    isProcessing.value = false
  }
}

function handleDownload(): void {
  if (!compressedBlob.value) return
  const url = URL.createObjectURL(compressedBlob.value)
  const a = document.createElement('a')
  a.href = url
  a.download = compressedFileName.value
  a.click()
  URL.revokeObjectURL(url)
}

function cleanup(): void {
  if (originalUrl.value) { URL.revokeObjectURL(originalUrl.value); originalUrl.value = null }
  if (compressedUrl.value) { URL.revokeObjectURL(compressedUrl.value); compressedUrl.value = null }
  originalFile.value = null
  compressedBlob.value = null
  compressedSize.value = 0
  errorMsg.value = null
}

onUnmounted(cleanup)
</script>

<template>
  <section class="image-compression">
    <ToolHeader :tool="tool" />

    <!-- 上传区 -->
    <div
      v-if="!originalFile"
      class="ic-dropzone"
      role="button" tabindex="0"
      @click="triggerFileInput"
      @keydown.enter="triggerFileInput"
      @drop="handleDrop"
      @dragover="handleDragOver"
    >
      <svg class="ic-dropzone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
      <p class="ic-dropzone-title">点击或拖拽选择图片</p>
      <p class="ic-dropzone-hint">支持 PNG / JPEG / WebP，最大 50MB</p>
    </div>

    <input ref="fileInputRef" type="file" :accept="ALLOWED_TYPES.join(',')" class="hidden" @change="handleFileChange" />

    <!-- 大文件警告 -->
    <NAlert v-if="isLarge" type="warning" :bordered="false" class="mb-4">
      图片较大（>20MB），压缩可能需要较长时间，请耐心等待
    </NAlert>

    <!-- 错误 -->
    <NAlert v-if="errorMsg" type="error" :bordered="false" class="mb-4">{{ errorMsg }}</NAlert>

    <!-- 压缩参数 -->
    <div v-if="originalFile" class="ic-params">
      <div class="ic-param">
        <label class="ic-param-label">质量 {{ quality }}</label>
        <NSlider v-model:value="quality" :min="1" :max="100" :step="1" />
      </div>
      <div class="ic-param-row">
        <div class="ic-param">
          <label class="ic-param-label">输出格式</label>
          <NSelect v-model:value="outputFormat" :options="formatOptions" size="small" />
        </div>
        <div class="ic-param">
          <label class="ic-param-label">最大宽度 (px)</label>
          <NInputNumber v-model:value="maxWidth" :min="1" :max="8192" size="small" placeholder="不限" />
        </div>
        <div class="ic-param">
          <label class="ic-param-label">最大高度 (px)</label>
          <NInputNumber v-model:value="maxHeight" :min="1" :max="8192" size="small" placeholder="不限" />
        </div>
      </div>

      <div class="ic-actions mt-3">
        <NButton type="primary" :loading="isProcessing" @click="handleCompress">
          🗜️ 压缩
        </NButton>
        <NButton size="small" @click="cleanup">重新选择</NButton>
      </div>
    </div>

    <!-- 对比区 -->
    <div v-if="compressedUrl" class="ic-compare">
      <div class="ic-compare-col">
        <p class="ic-compare-label">原图</p>
        <img :src="originalUrl!" class="ic-compare-img" alt="原图" />
        <p class="ic-compare-size">{{ formatFileSize(originalSize) }}</p>
      </div>
      <div class="ic-compare-col">
        <p class="ic-compare-label">压缩后 —— {{ compressionRatio }}% 减小</p>
        <img :src="compressedUrl" class="ic-compare-img" alt="压缩后" />
        <p class="ic-compare-size">{{ formatFileSize(compressedSize) }}</p>
        <NButton size="small" type="primary" class="mt-2" @click="handleDownload">
          📥 下载 ({{ compressedFileName }})
        </NButton>
      </div>
    </div>

    <!-- 仅原图预览（未压缩时） -->
    <div v-if="originalFile && !compressedUrl" class="ic-preview">
      <img :src="originalUrl!" class="ic-preview-img" alt="原图预览" />
      <p class="ic-preview-size">{{ originalFile.name }} — {{ formatFileSize(originalSize) }}</p>
    </div>
  </section>
</template>

<style scoped>

.ic-dropzone {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; min-height: 180px;
  border: 2px dashed var(--color-neutral-300); border-radius: 12px;
  cursor: pointer; background: var(--color-white);
  transition: all var(--duration-fast);
}
.ic-dropzone:hover { border-color: var(--color-primary-400); background: var(--color-primary-50); }
.ic-dropzone-icon { width: 48px; height: 48px; color: var(--color-neutral-400); }
.ic-dropzone-title { font-size: var(--text-base); font-weight: var(--font-weight-medium); color: var(--color-neutral-700); }
.ic-dropzone-hint { font-size: var(--text-xs); color: var(--color-neutral-400); }

.ic-params {
  background: var(--color-white); border: 1px solid var(--color-neutral-200);
  border-radius: 10px; padding: 20px; box-shadow: var(--shadow-sm); margin-bottom: 20px;
}
.ic-param { margin-bottom: 12px; }
.ic-param-label {
  display: block; font-size: var(--text-xs); font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500); margin-bottom: 6px;
}
.ic-param-row { display: flex; gap: 14px; flex-wrap: wrap; }
.ic-param-row .ic-param { flex: 1; min-width: 140px; }
.ic-actions { display: flex; gap: 10px; }

.ic-compare {
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
}
@media (max-width: 640px) { .ic-compare { grid-template-columns: 1fr; } }
.ic-compare-col {
  background: var(--color-white); border: 1px solid var(--color-neutral-200);
  border-radius: 10px; padding: 14px; text-align: center;
  box-shadow: var(--shadow-sm);
}
.ic-compare-label {
  font-size: var(--text-xs); font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-600); margin-bottom: 8px;
}
.ic-compare-img { width: 100%; max-height: 360px; object-fit: contain; border-radius: 6px; }
.ic-compare-size { font-size: var(--text-xs); color: var(--color-neutral-500); font-family: var(--font-mono); margin-top: 8px; }

.ic-preview {
  background: var(--color-white); border: 1px solid var(--color-neutral-200);
  border-radius: 10px; padding: 16px; text-align: center; box-shadow: var(--shadow-sm);
}
.ic-preview-img { max-width: 100%; max-height: 400px; border-radius: 6px; }
.ic-preview-size { font-size: var(--text-xs); color: var(--color-neutral-500); font-family: var(--font-mono); margin-top: 8px; }
</style>
