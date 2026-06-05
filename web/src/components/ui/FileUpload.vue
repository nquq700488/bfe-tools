<script setup lang="ts">
/**
 * FileUpload — 拖拽+点击上传组件
 * 支持多文件、格式校验、大小限制、进度展示
 */
import { ref, computed } from 'vue'
import type { UploadState } from '@/types/tool'
import { validateFile, formatFileSize } from '@/lib/file-utils'

const props = withDefaults(
  defineProps<{
    /** 允许的文件格式（MIME 类型或扩展名） */
    accept: string
    /** 最大文件大小（字节），默认 100MB */
    maxSize?: number
    /** 是否允许多文件上传 */
    multiple?: boolean
    /** 上传中的状态列表 */
    uploadStates?: UploadState[]
  }>(),
  {
    maxSize: 100 * 1024 * 1024,
    multiple: false,
    uploadStates: () => [],
  }
)

const emit = defineEmits<{
  select: [files: File[]]
  cancel: [fileId: string]
}>()

const isDragOver = ref(false)
let dragCounter = 0

const sizeError = ref<string | null>(null)
const formatErrors = ref<string[]>([])
const pendingFiles = ref<File[]>([])

function localValidate(file: File): string | null {
  return validateFile(file, props.accept, props.maxSize)
}

const hasErrors = computed<boolean>(() => {
  return sizeError.value !== null || formatErrors.value.length > 0
})

function handleFiles(files: FileList | File[]): void {
  sizeError.value = null
  formatErrors.value = []

  const fileArray = Array.from(files)
  const errors: string[] = []

  for (const file of fileArray) {
    const error = localValidate(file)
    if (error) errors.push(error)
  }

  if (errors.length > 0) formatErrors.value = errors

  pendingFiles.value = props.multiple ? fileArray : fileArray.slice(0, 1)
  const valid = fileArray.filter((f) => localValidate(f) === null)
  if (valid.length > 0) {
    emit('select', valid.slice(0, props.multiple ? undefined : 1))
  }
}

function handleDragEnter(e: DragEvent): void {
  e.preventDefault()
  dragCounter++
  isDragOver.value = true
}

function handleDragLeave(e: DragEvent): void {
  e.preventDefault()
  dragCounter--
  if (dragCounter <= 0) {
    isDragOver.value = false
    dragCounter = 0
  }
}

function handleDrop(e: DragEvent): void {
  e.preventDefault()
  isDragOver.value = false
  dragCounter = 0
  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    handleFiles(e.dataTransfer.files)
  }
}

function handleInputChange(e: Event): void {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    handleFiles(input.files)
  }
  input.value = ''
}

function handleClickTrigger(): void {
  const input = document.getElementById('file-upload-input') as HTMLInputElement
  input?.click()
}
</script>

<template>
  <div class="file-upload">
    <!-- 拖拽区域 -->
    <div
      class="drop-zone"
      :class="{ 'drag-over': isDragOver }"
      @dragenter="handleDragEnter"
      @dragover.prevent
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="handleClickTrigger"
      role="button"
      tabindex="0"
      aria-label="上传文件区域，点击选择文件或拖拽文件到此处"
      @keydown.enter="handleClickTrigger"
    >
      <input
        id="file-upload-input"
        type="file"
        :accept="accept"
        :multiple="multiple"
        class="sr-only"
        @change="handleInputChange"
      />

      <div class="flex flex-col items-center gap-3 pointer-events-none">
        <!-- 上传图标 -->
        <svg
          class="w-10 h-10 text-primary-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        <div>
          <p class="text-base font-semibold text-neutral-800">
            拖拽文件到此处，或<span class="text-primary-600">点击选择</span>
          </p>
          <p class="text-xs text-neutral-400 mt-1.5">
            支持格式：{{ accept }} · 最大 {{ formatFileSize(maxSize) }}
          </p>
        </div>
      </div>
    </div>

    <!-- 格式错误提示 -->
    <div v-if="hasErrors" class="mt-3 space-y-1">
      <p
        v-for="(err, idx) in formatErrors"
        :key="idx"
        class="text-xs text-danger flex items-center gap-1"
      >
        <span aria-hidden="true">⚠</span>
        {{ err }}
      </p>
    </div>

    <!-- 上传进度列表 -->
    <div v-if="uploadStates.length > 0" class="mt-4 space-y-3">
      <div
        v-for="state in uploadStates"
        :key="state.fileId"
        class="flex flex-col gap-2 p-3.5 bg-white rounded-2 border border-neutral-200 shadow-sm"
      >
        <div class="flex items-center gap-3">
          <span class="text-sm truncate flex-1 font-medium text-neutral-700">{{ state.fileName }}</span>
          <span class="text-xs text-neutral-400 flex-shrink-0">
            {{ formatFileSize(state.loaded) }} / {{ formatFileSize(state.total) }}
          </span>
          <span class="text-xs text-primary-600 font-semibold flex-shrink-0 w-10 text-right">
            {{ Math.round(state.progress) }}%
          </span>
          <button
            v-if="state.status === 'uploading'"
            class="text-xs text-neutral-400 hover:text-danger transition-colors flex-shrink-0"
            @click.stop="emit('cancel', state.fileId)"
          >
            取消
          </button>
        </div>
        <!-- 细进度条 -->
        <div class="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-primary-600 rounded-full transition-all duration-300"
            :style="{ width: `${state.progress}%` }"
          />
        </div>
      </div>
    </div>
  </div>
</template>
