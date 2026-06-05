<script setup lang="ts">
/**
 * ResultDownload — 结果下载+预览组件
 * 下载逻辑委托给 useDownload composable
 */
import { useDownload } from '@/hooks/useDownload'

const props = defineProps<{
  downloadUrl: string
  fileName: string
  fileSize?: number
  previewable?: boolean
}>()

const emit = defineEmits<{
  preview: []
}>()

const { downloading, progress, download } = useDownload()

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function handleDownload(): void {
  download(props.downloadUrl, props.fileName)
}

function handlePreview(): void {
  emit('preview')
}
</script>

<template>
  <div class="result-panel">
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <span class="file-icon-box">
          <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <div class="min-w-0">
          <p class="text-sm font-semibold text-neutral-800 truncate">{{ fileName }}</p>
          <p class="text-xs text-neutral-500" v-if="fileSize && !downloading">
            {{ formatSize(fileSize) }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 flex-shrink-0">
        <button
          v-if="previewable"
          class="btn btn-secondary h-9 px-4 text-sm shadow-sm"
          @click="handlePreview"
        >
          预览
        </button>
        <button
          class="btn btn-primary h-9 px-4 text-sm shadow-sm"
          :disabled="downloading"
          @click="handleDownload"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {{ downloading ? `${progress}%` : '下载' }}
        </button>
      </div>
    </div>

    <!-- 进度条 -->
    <div v-if="downloading" class="mt-3 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
      <div
        class="h-full bg-primary-500 rounded-full transition-all duration-200"
        :style="{ width: progress + '%' }"
      />
    </div>

    <slot name="preview" />
  </div>
</template>

<style scoped>
.result-panel {
  border-radius: 8px;
  border: 1px solid var(--color-success);
  background-color: var(--color-success-light);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.file-icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: var(--color-white);
  box-shadow: 0 0 0 1px var(--color-success);
  flex-shrink: 0;
}
</style>
