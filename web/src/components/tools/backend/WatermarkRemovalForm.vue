<script setup lang="ts">
/**
 * WatermarkRemovalForm — 图片去水印表单
 * 流程：选择图片 → canvas 标注水印区域 → 确认去水印
 */
import { ref, nextTick, computed } from 'vue'
import { NButton } from 'naive-ui'
import { formatFileSize } from '@/lib/file-utils'
import type { BackendJobToolDefinition } from '@/types/tool'

defineProps<{
  tool: BackendJobToolDefinition
  isBusy: boolean
}>()

const emit = defineEmits<{
  remove: [payload: { file: File; x: number; y: number; w: number; h: number }]
}>()

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp']

const selectedFile = ref<File | null>(null)
const fileError = ref<string | null>(null)
const isLoading = ref(false)
const imageLoaded = ref(false)
const canvasRef = ref<HTMLCanvasElement | null>(null)

let originalImage: HTMLImageElement | null = null
let displayW = 0
let displayH = 0
let naturalW = 0
let naturalH = 0

const selX = ref(0)
const selY = ref(0)
const selW = ref(0)
const selH = ref(0)
const isDrawing = ref(false)
const hasSelection = ref(false)

/** 选区面积占图像面积的比例（0-1） */
const selectionRatio = computed(() => {
  if (!naturalW || !naturalH || !selW.value || !selH.value) return 0
  const selArea = (selW.value * naturalW / displayW) * (selH.value * naturalH / displayH)
  const imgArea = naturalW * naturalH
  return Math.min(selArea / imgArea, 1)
})

const isSelectionTooLarge = computed(() => selectionRatio.value > 0.7)

function triggerFileInput() {
  (document.getElementById('wr-file-input') as HTMLInputElement)?.click()
}

function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) selectFile(file)
  input.value = ''
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (file) selectFile(file)
}

function handleDragOver(e: DragEvent) { e.preventDefault() }

function selectFile(file: File) {
  fileError.value = null
  if (!ALLOWED_TYPES.includes(file.type)) {
    fileError.value = '不支持的文件格式，请选择 PNG、JPEG、WebP 或 BMP 图片'
    return
  }
  selectedFile.value = file
  hasSelection.value = false
  selX.value = selY.value = selW.value = selH.value = 0
  imageLoaded.value = false
  isLoading.value = true

  const img = new Image()
  img.onload = async () => {
    originalImage = img
    naturalW = img.naturalWidth
    naturalH = img.naturalHeight
    imageLoaded.value = true
    isLoading.value = false

    await nextTick()
    const canvas = canvasRef.value
    if (!canvas) return
    displayW = naturalW
    displayH = naturalH
    canvas.width = displayW
    canvas.height = displayH
    const ctx = canvas.getContext('2d')
    if (ctx) { ctx.drawImage(img, 0, 0, displayW, displayH) }
  }
  img.onerror = () => {
    isLoading.value = false
    fileError.value = '图片加载失败'
  }
  img.src = URL.createObjectURL(file)
}

// ---- Canvas 鼠标交互 ----
function canvasPos(e: MouseEvent): { x: number; y: number } {
  const canvas = canvasRef.value!
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

let drawStartX = 0
let drawStartY = 0

function handleMouseDown(e: MouseEvent) {
  if (!imageLoaded.value) return
  const pos = canvasPos(e)
  drawStartX = pos.x
  drawStartY = pos.y
  isDrawing.value = true
  hasSelection.value = false
}

function handleMouseMove(e: MouseEvent) {
  if (!isDrawing.value) return
  const pos = canvasPos(e)
  selX.value = Math.min(drawStartX, pos.x)
  selY.value = Math.min(drawStartY, pos.y)
  selW.value = Math.abs(pos.x - drawStartX)
  selH.value = Math.abs(pos.y - drawStartY)
  drawRect()
}

function handleMouseUp() {
  if (!isDrawing.value) return
  isDrawing.value = false
  if (selW.value >= 5 && selH.value >= 5) {
    hasSelection.value = true
    drawRect()
  } else {
    selW.value = selH.value = 0
    drawRect()
  }
}

function drawRect() {
  const canvas = canvasRef.value
  if (!canvas || !originalImage) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(originalImage, 0, 0, displayW, displayH)

  if (selW.value > 0 && selH.value > 0) {
    ctx.strokeStyle = '#EF4444'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 3])
    ctx.strokeRect(selX.value, selY.value, selW.value, selH.value)
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)'
    ctx.fillRect(selX.value, selY.value, selW.value, selH.value)
  }
}

function handleRemove() {
  if (!selectedFile.value || selW.value < 5 || selH.value < 5) return
  const sx = naturalW / displayW
  const sy = naturalH / displayH
  emit('remove', {
    file: selectedFile.value,
    x: Math.round(selX.value * sx),
    y: Math.round(selY.value * sy),
    w: Math.round(selW.value * sx),
    h: Math.round(selH.value * sy),
  })
}

function clearSelection() {
  hasSelection.value = false
  isDrawing.value = false
  selX.value = selY.value = selW.value = selH.value = 0
  drawRect()
}

function reset() {
  selectedFile.value = null
  originalImage = null
  imageLoaded.value = false
  hasSelection.value = false
  isDrawing.value = false
  fileError.value = null
  selX.value = selY.value = selW.value = selH.value = 0
}
</script>

<template>
  <div class="wr-form">
    <!-- 未选择文件：上传区 -->
    <div
      v-if="!selectedFile"
      class="wr-dropzone"
      @click="triggerFileInput"
      @drop.prevent="handleDrop"
      @dragover.prevent="handleDragOver"
    >
      <span class="wr-dropzone-icon">🖼️</span>
      <p class="wr-dropzone-title">点击或拖拽选择图片</p>
      <p class="wr-dropzone-hint">支持 PNG / JPEG / WebP / BMP，最大 20MB</p>
    </div>

    <input id="wr-file-input" type="file" :accept="ALLOWED_TYPES.join(',')" class="hidden" @change="handleFileChange" />

    <p v-if="fileError" class="wr-error">{{ fileError }}</p>

    <!-- 加载中 -->
    <div v-if="isLoading" class="wr-loading">加载图片中...</div>

    <!-- 已选择文件：标注水印区域 -->
    <div v-if="selectedFile && !isLoading" class="wr-editor">
      <p class="wr-hint">🖱️ 在图片上拖拽框选水印区域</p>

      <div class="wr-canvas-border">
        <canvas
          ref="canvasRef"
          class="wr-canvas"
          @mousedown="handleMouseDown"
          @mousemove="handleMouseMove"
          @mouseup="handleMouseUp"
          @mouseleave="handleMouseUp"
        />
      </div>

      <p class="wr-meta">
        {{ selectedFile.name }} · {{ formatFileSize(selectedFile.size) }}
        <template v-if="hasSelection">
          · 选区 {{ Math.round(selW * naturalW / displayW) }}×{{ Math.round(selH * naturalH / displayH) }}px
          · 占比 {{ (selectionRatio * 100).toFixed(1) }}%
        </template>
      </p>

      <p v-if="hasSelection && isSelectionTooLarge" class="wr-warning">
        ⚠️ 框选区域过大（超过 70%），请只框选需要去除的水印区域
      </p>

      <div class="wr-btns">
        <NButton type="error" :disabled="!hasSelection || isBusy || isSelectionTooLarge" @click="handleRemove">去水印</NButton>
        <NButton :disabled="isBusy || !hasSelection" @click="clearSelection">重新框选</NButton>
        <NButton :disabled="isBusy" @click="reset">换图片</NButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.wr-form { width: 100%; }

.wr-dropzone {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; min-height: 160px;
  border: 2px dashed var(--color-neutral-300); border-radius: 12px;
  cursor: pointer; background: var(--color-white);
  transition: all .15s;
}
.wr-dropzone:hover { border-color: var(--color-primary-400); background: var(--color-primary-50); }
.wr-dropzone-icon { font-size: 40px; }
.wr-dropzone-title { font-size: var(--text-base); font-weight: var(--font-weight-medium); color: var(--color-neutral-700); }
.wr-dropzone-hint { font-size: var(--text-xs); color: var(--color-neutral-400); }

.wr-error { color: var(--color-danger); font-size: var(--text-sm); margin-top: 8px; }
.wr-loading { text-align: center; color: var(--color-neutral-400); padding: 40px; font-size: var(--text-sm); }

.wr-editor { margin-top: 12px; }
.wr-hint { font-size: var(--text-sm); color: var(--color-neutral-500); margin-bottom: 10px; }

.wr-canvas-border {
  border: 1px solid var(--color-neutral-200); border-radius: 8px;
  overflow: hidden; background: repeating-conic-gradient(var(--color-neutral-50) 0% 25%, transparent 0% 50%) 50% / 16px 16px;
}
.wr-canvas { display: block; cursor: crosshair; max-width: 100%; }

.wr-meta {
  margin-top: 8px; font-size: var(--text-xs); color: var(--color-neutral-400); font-family: var(--font-mono);
}
.wr-warning {
  margin-top: 8px; font-size: var(--text-xs); color: var(--color-warning);
}
.wr-btns { display: flex; gap: 10px; margin-top: 14px; }
</style>
