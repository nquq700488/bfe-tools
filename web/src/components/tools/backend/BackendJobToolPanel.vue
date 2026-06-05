<script setup lang="ts">
/**
 * BackendJobToolPanel — 后端任务工具面板
 * 提取自 ToolPage.vue，处理 file → upload → job → poll 流程。
 * 原有业务逻辑未修改，仅从 ToolPage.vue 搬家至此。
 */
import { computed, ref, watch } from 'vue'
import {
  NButton, NAlert, NDivider, NSpace, NImage,
} from 'naive-ui'
import FileUpload from '@/components/ui/FileUpload.vue'
import MediaConvertForm from './MediaConvertForm.vue'
import WatermarkRemovalForm from './WatermarkRemovalForm.vue'
import TtsForm from './TtsForm.vue'
import ResultDownload from '@/components/ui/ResultDownload.vue'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useTaskPolling } from '@/hooks/useTaskPolling'
import { to } from '@/lib/to'
import { apiClient } from '@/lib/api'
import { resolveBackendUrl } from '@/lib/runtime'
import { INPUT_CATEGORY_MAP } from '@/lib/constants'
import type { BackendJobToolDefinition } from '@/types/tool'
import type { JobCreateResponse, OcrSegment } from '@/types/api'

const props = defineProps<{
  tool: BackendJobToolDefinition
}>()

const toolId = computed(() => props.tool.id)

/** 将 markdown 链接 [text](url) 渲染为安全的 HTML <a> 标签 */
function renderLinks(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="th-link">$1</a>')
}
const implHtml = computed(() => renderLinks(props.tool.implementation))

const { uploadStates, uploadFile, cancelAll } = useFileUpload()

const {
  status: jobStatus,
  errorMessage: jobError,
  resultUrl: jobResultUrl,
  resultFileName: jobResultFileName,
  resultText: jobResultText,
  ocrSegments: jobOcrSegments,
  start: startPolling,
  stop: stopPolling,
} = useTaskPolling()

type PagePhase = 'idle' | 'uploading' | 'processing' | 'done' | 'error'
const phase = ref<PagePhase>('idle')
const showResult = ref(false)

/** 下载文件名 — 优先后端返回的文件名，降级上传文件名，最后用原值 */
const downloadFileName = computed(() =>
  jobResultFileName.value || resultFileNameLocal.value || 'output'
)

/** 本地文件名（上传/输入时的原始文件名，后端返回不同名时作为 fallback） */
const resultFileNameLocal = ref('')

/** 当前 jobId，用于构建下载 URL */
const currentJobId = ref<string | null>(null)
/** 下载 URL 始终走 /api/v1/jobs/{jobId}/result */
const resultDownloadUrl = computed(() =>
  currentJobId.value ? resolveBackendUrl(`/api/v1/jobs/${currentJobId.value}/result`) : ''
)

/** OCR 识别结果文字 */
const ocrText = ref<string | null>(null)

/** OCR 段落（带位置信息） */
const ocrSegments = ref<OcrSegment[] | null>(null)

/** 原始图片的 Object URL（用于 OCR 叠加展示） */
const ocrImageUrl = ref<string | null>(null)

/** watermark-removal 原始图片 URL（用于前后对比） */
const watermarkOriginalUrl = ref<string | null>(null)

/** 按 y 坐标排序的 OCR 段落 */
const sortedOcrSegments = computed(() => {
  if (!ocrSegments.value) return null
  return [...ocrSegments.value].sort((a, b) => a.bbox[1] - b.bbox[1])
})

const isTextTool = computed(() => props.tool.inputType === 'text')
const isOcrTool = computed(() => props.tool.id === 'image-ocr')
const isSttTool = computed(() => props.tool.id === 'speech-to-text')
const isConvertTool = computed(() => props.tool.id === 'media-convert')
const isWatermarkTool = computed(() => props.tool.id === 'watermark-removal')

/** 转换结果的输出类别（用于选择预览方式：图片/音频/视频） */
const convertOutputCategory = computed<'image' | 'video' | 'audio' | null>(() => {
  const ext = downloadFileName.value.split('.').pop()?.toLowerCase() || ''
  return INPUT_CATEGORY_MAP[ext] || null
})
const isBusy = computed(() => phase.value === 'uploading' || phase.value === 'processing')

/** TTS 提交中标志（防止错误闪现） */
const ttsSubmitting = ref(false)

function resetState() {
  cancelAll()
  uploadStates.value = []
  stopPolling()
  phase.value = 'idle'
  showResult.value = false
  resultFileNameLocal.value = ''
  currentJobId.value = null
  ocrText.value = null
  ocrSegments.value = null
  ocrImageUrl.value = null
  watermarkOriginalUrl.value = null
  ttsSubmitting.value = false
}

watch(() => props.tool.id, resetState)

async function handleFilesSelected(files: File[]) {
  if (!files[0]) return
  showResult.value = false
  currentJobId.value = null
  resultFileNameLocal.value = files[0].name
  // OCR 工具保存图片 URL 用于叠加展示
  if (props.tool.id === 'image-ocr') {
    ocrImageUrl.value = URL.createObjectURL(files[0])
  }
  phase.value = 'uploading'
  const uploadId = await uploadFile(files[0])
  if (!uploadId) { phase.value = 'error'; return }
  phase.value = 'processing'
  await createAndPollJob({ toolId: toolId.value, uploadId })
}

/** media-convert 两步流程：用户选择格式后确认 → 上传 + 创建任务 */
async function handleMediaConvert(payload: { file: File; targetFormat: string }) {
  showResult.value = false
  currentJobId.value = null
  resultFileNameLocal.value = payload.file.name
  phase.value = 'uploading'
  const uploadId = await uploadFile(payload.file)
  if (!uploadId) { phase.value = 'error'; return }
  phase.value = 'processing'
  await createAndPollJob({
    toolId: toolId.value,
    uploadId,
    params: { target_format: payload.targetFormat },
  })
}

/** watermark-removal 两步流程：选择文件 → 标注水印区域 → 上传 + 创建任务 */
async function handleWatermarkRemove(payload: {
  file: File
  x: number
  y: number
  w: number
  h: number
}) {
  showResult.value = false
  currentJobId.value = null
  resultFileNameLocal.value = payload.file.name
  watermarkOriginalUrl.value = URL.createObjectURL(payload.file)
  phase.value = 'uploading'
  const uploadId = await uploadFile(payload.file)
  if (!uploadId) { phase.value = 'error'; return }
  phase.value = 'processing'
  await createAndPollJob({
    toolId: toolId.value,
    uploadId,
    params: {
      x: String(payload.x),
      y: String(payload.y),
      w: String(payload.w),
      h: String(payload.h),
    },
  })
}

/** TTS 表单提交：上传 txt 文件 + 创建语音生成任务 */
async function handleTtsSubmit(payload: {
  text: string
  voiceId: string
  speed: string
  pitch: string
  format: string
  ttsFile: File | null
}) {
  showResult.value = false
  currentJobId.value = null
  ttsSubmitting.value = true
  try {
    phase.value = 'uploading'

    let uploadId: string | null = null
    if (payload.ttsFile) {
      resultFileNameLocal.value = payload.ttsFile.name
      uploadId = await uploadFile(payload.ttsFile)
      if (!uploadId) { phase.value = 'error'; return }
    }

    phase.value = 'processing'
    await createAndPollJob({
      toolId: toolId.value,
      uploadId: uploadId || '',
      params: {
        text: payload.text.slice(0, 2000),
        voiceId: payload.voiceId,
        speed: payload.speed,
        pitch: payload.pitch,
        format: payload.format,
      },
    })
  } finally {
    ttsSubmitting.value = false
  }
}

async function createAndPollJob(payload: { toolId: string; uploadId: string; params?: Record<string, string> }) {
  const [createResult, createErr] = await to(
    apiClient.post<JobCreateResponse>('/api/v1/jobs', payload)
  )
  if (createErr || !createResult?.data) {
    phase.value = 'error'
    return
  }

  startPolling(createResult.data.jobId)
  currentJobId.value = createResult.data.jobId

  const stopWatch = watch([jobStatus, jobResultUrl, jobResultText, jobOcrSegments], ([status, url, text, segments]) => {
    if (status === 'succeeded' && url) { phase.value = 'done'; showResult.value = true; ocrText.value = text || null; ocrSegments.value = segments || null; stopWatch() }
    else if (status === 'failed') { phase.value = 'error'; stopWatch() }
    else if (status === 'canceled') { phase.value = 'idle'; stopWatch() }
  })
}

function handleCancelUpload(_fileId: string) { phase.value = 'idle' }
function handleRetry() { stopPolling(); phase.value = 'idle'; showResult.value = false; currentJobId.value = null; ocrText.value = null; ocrSegments.value = null; ocrImageUrl.value = null; ttsSubmitting.value = false }

/** 格式化秒数为 mm:ss */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** STT 段落类型（后端返回 start/end 而非 bbox） */
interface SttSegment {
  text: string
  start: number
  end: number
}

/** 将 segments 转为 STT 格式（兼容 OCR/STT 混合字段） */
const sttSegments = computed<SttSegment[] | null>(() => {
  if (!ocrSegments.value) return null
  return (ocrSegments.value as unknown as SttSegment[]).map((s) => ({
    text: s.text,
    start: s.start || 0,
    end: s.end || 0,
  }))
})

/** 复制文字到剪贴板 */
async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

</script>

<template>
  <section class="tool-page">
    <!-- 标题区 -->
    <div class="mb-8">
      <div class="flex items-center gap-3 mb-3">
        <span class="flex h-10 w-10 items-center justify-center rounded-2 bg-primary-50 text-xl ring-1 ring-primary-100">
          {{ props.tool.icon }}
        </span>
        <div>
          <h1 class="text-2xl font-bold text-neutral-900">{{ props.tool.name }}</h1>
          <p class="text-sm text-neutral-500 mt-0.5">{{ props.tool.description }}</p>
          <p class="text-sm text-neutral-500 mt-1" v-html="implHtml" />
        </div>
      </div>
      <NDivider />
    </div>

    <NSpace vertical :size="20">
      <!-- ================================================ -->
      <!-- TTS 工具 -->
      <template v-if="isTextTool">
        <TtsForm :tool="props.tool" :is-busy="isBusy" @submit="handleTtsSubmit" />

        <!-- 生成进度 -->
        <div v-if="isBusy" class="loading-bar">
          <span class="loading-bar-spinner" />
          <span class="loading-bar-text">{{ phase === 'uploading' ? '正在上传...' : '正在生成语音，请稍候...' }}</span>
        </div>

        <!-- 错误 -->
        <NAlert v-if="!ttsSubmitting && phase === 'error'" type="error" :bordered="false">
          {{ jobError || '处理失败，请重试' }}
        </NAlert>

        <!-- 音频播放器 -->
        <div v-if="showResult && resultDownloadUrl" class="audio-player-card">
          <span class="text-xs text-neutral-500 mb-2 block">预览</span>
          <audio :src="resultDownloadUrl" controls class="audio-player" preload="auto" />
        </div>

        <!-- 结果下载 -->
        <ResultDownload
          v-if="showResult && resultDownloadUrl"
          :download-url="resultDownloadUrl"
          :file-name="downloadFileName || 'audio.mp3'"
        />
      </template>

      <!-- ================================================ -->
      <!-- 文件工具：上传区始终可见，进度叠加，结果下方        -->
      <!-- ================================================ -->
      <template v-if="!isTextTool">
        <!-- media-convert: 两步流程（选择文件→检测类别→选择格式→确认转换） -->
        <template v-if="isConvertTool">
          <MediaConvertForm
            :tool="props.tool"
            :is-busy="isBusy"
            @convert="handleMediaConvert"
          />
        </template>

        <!-- watermark-removal: 选择文件→框选水印区域→确认去除 -->
        <template v-else-if="isWatermarkTool">
          <WatermarkRemovalForm
            :tool="props.tool"
            :is-busy="isBusy"
            @remove="handleWatermarkRemove"
          />
        </template>

        <!-- 其他文件工具：普通上传流程 -->
        <template v-else>
          <div :class="{ 'opacity-50 pointer-events-none': isBusy }">
            <FileUpload
              :accept="props.tool.accept"
              :max-size="props.tool.maxSize"
              :upload-states="uploadStates"
              @select="handleFilesSelected"
              @cancel="handleCancelUpload"
            />
          </div>
        </template>

        <!-- 加载提示 -->
        <div v-if="isBusy" class="loading-bar">
          <span class="loading-bar-spinner" />
          <span class="loading-bar-text">{{ phase === 'uploading' ? '正在上传...' : isConvertTool ? '正在转换格式，请稍候...' : isWatermarkTool ? '正在去除水印，请稍候...' : '正在识别中，请稍候...' }}</span>
        </div>

        <!-- 错误 -->
        <NAlert v-if="phase === 'error'" type="error" :bordered="false">
          {{ jobError || '文件处理失败，请重试' }}
        </NAlert>
        <NButton v-if="phase === 'error'" size="small" @click="handleRetry">重试</NButton>

        <!-- OCR 结果：有位置信息时显示图文叠加布局，否则降级纯文本 -->
        <div v-if="showResult && isOcrTool && (ocrText || sortedOcrSegments)" class="ocr-result-card">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-neutral-700">识别结果</span>
            <NButton text size="tiny" type="primary" @click="() => copyToClipboard(ocrText || '')">
              复制全部
            </NButton>
          </div>

          <!-- 有段落 + 图片：图文布局 -->
          <div v-if="sortedOcrSegments && ocrImageUrl" class="ocr-layout">
            <!-- 左边：缩略图 -->
            <div class="ocr-thumbnail">
              <NImage :src="ocrImageUrl" alt="上传的图片" class="ocr-image-preview" />
              <span class="ocr-image-label">原图</span>
            </div>
            <!-- 右边：文字列表（按 y 排序） -->
            <div class="ocr-segments-list">
              <div
                v-for="(seg, idx) in sortedOcrSegments"
                :key="idx"
                class="ocr-segment-item"
              >
                <span class="ocr-segment-index">{{ idx + 1 }}</span>
                <span class="ocr-segment-text">{{ seg.text }}</span>
                <span
                  v-if="seg.confidence < 1"
                  class="ocr-segment-conf"
                  :class="seg.confidence >= 0.8 ? 'text-success' : 'text-warning'"
                >
                  {{ Math.round(seg.confidence * 100) }}%
                </span>
              </div>
            </div>
          </div>

          <!-- 无段落信息：纯文本降级 -->
          <pre v-else-if="ocrText" class="ocr-text">{{ ocrText }}</pre>
        </div>

        <!-- STT 结果：识别文字 + 时间戳段落 -->
        <div v-if="showResult && isSttTool && (ocrText || sttSegments)" class="stt-result-card">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-neutral-700">识别结果</span>
            <NButton text size="tiny" type="primary" @click="() => copyToClipboard(ocrText || '')">
              复制全部
            </NButton>
          </div>

          <!-- 完整文本 -->
          <div v-if="ocrText" class="stt-full-text">
            {{ ocrText }}
          </div>

          <!-- 带时间戳的段落列表 -->
          <div v-if="sttSegments && sttSegments.length > 0" class="stt-segments-list">
            <p class="text-xs text-neutral-500 mb-2">时间轴</p>
            <div
              v-for="(seg, idx) in sttSegments"
              :key="idx"
              class="stt-segment-item"
            >
              <span class="stt-segment-time">
                {{ formatTime(seg.start) }} → {{ formatTime(seg.end) }}
              </span>
              <span class="stt-segment-text">{{ seg.text }}</span>
            </div>
          </div>
        </div>

        <!-- 转换结果预览（图片/音频/视频） -->
        <div v-if="showResult && isConvertTool && resultDownloadUrl" class="convert-preview-card">
          <span class="text-xs text-neutral-500 mb-2 block">预览</span>
          <img
            v-if="convertOutputCategory === 'image'"
            :src="resultDownloadUrl"
            :alt="downloadFileName"
            class="convert-preview-image"
          />
          <audio
            v-else-if="convertOutputCategory === 'audio'"
            :src="resultDownloadUrl"
            controls
            class="convert-preview-audio"
            preload="auto"
          />
          <video
            v-else-if="convertOutputCategory === 'video'"
            :src="resultDownloadUrl"
            controls
            class="convert-preview-video"
            preload="metadata"
          />
        </div>

        <!-- 去水印结果预览（原图 vs 结果） -->
        <div v-if="showResult && isWatermarkTool && resultDownloadUrl" class="convert-preview-card">
          <div class="wr-compare">
            <div class="wr-compare-col">
              <span class="text-xs text-neutral-500 mb-2 block">原图</span>
              <img v-if="watermarkOriginalUrl" :src="watermarkOriginalUrl" class="convert-preview-image" alt="原图" />
            </div>
            <div class="wr-compare-col">
              <span class="text-xs text-neutral-500 mb-2 block">去水印结果</span>
              <img :src="resultDownloadUrl" class="convert-preview-image" alt="去水印结果" />
            </div>
          </div>
        </div>

        <!-- 结果 -->
        <ResultDownload
          v-if="showResult && resultDownloadUrl"
          :download-url="resultDownloadUrl"
          :file-name="downloadFileName || 'result'"
        />
      </template>
    </NSpace>
  </section>
</template>

<style scoped>
.tool-page {
  padding: 32px 40px;
  max-width: var(--max-content-width);
}
.th-link {
  color: var(--color-primary-600);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.th-link:hover {
  color: var(--color-primary-700);
}
.ocr-result-card {
  background-color: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}

/* 图文布局：左边缩略图 + 右边文字列表 */
.ocr-layout {
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 20px;
  align-items: start;
}

.ocr-thumbnail {
  position: sticky;
  top: 72px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.ocr-image-preview {
  width: 100%;
  border-radius: 6px;
  cursor: pointer;
}

.ocr-image-preview :deep(img) {
  border-radius: 6px;
  border: 1px solid var(--color-neutral-200);
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-fast);
}

.ocr-image-preview:hover :deep(img) {
  transform: scale(1.02);
}

.ocr-image-label {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}

/* 文字段落列表 */
.ocr-segments-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ocr-segment-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background-color: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-100);
  transition: background-color var(--duration-fast);
}

.ocr-segment-item:hover {
  background-color: var(--color-primary-50);
}

.ocr-segment-index {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  color: var(--color-neutral-400);
  background-color: var(--color-neutral-200);
  border-radius: 4px;
}

.ocr-segment-text {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-neutral-800);
  line-height: var(--leading-relaxed);
}

.ocr-segment-conf {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: var(--font-weight-medium);
  font-family: var(--font-mono);
}

/* 纯文本降级 */
.ocr-text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-neutral-800);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 320px;
  overflow-y: auto;
  margin: 0;
  user-select: text;
}

@media (max-width: 640px) {
  .ocr-layout {
    grid-template-columns: 1fr;
  }

  .ocr-thumbnail {
    position: static;
  }

  .ocr-image-preview {
    max-width: 100%;
    max-height: 240px;
  }
}

/* ===== 转换结果预览 ===== */
.convert-preview-card {
  background-color: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.convert-preview-image {
  width: 100%;
  max-height: 480px;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid var(--color-neutral-100);
}

.convert-preview-audio {
  width: 100%;
  height: 40px;
}

.convert-preview-video {
  width: 100%;
  max-height: 480px;
  border-radius: 6px;
}

/* watermark 前后对比 */
.wr-compare {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
}
@media (max-width: 640px) { .wr-compare { grid-template-columns: 1fr; } }
.wr-compare-col {
  text-align: center;
}
.wr-compare-col img {
  max-height: 360px;
}

/* 加载提示条 */
.loading-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--color-primary-50);
  border: 1px solid var(--color-primary-200);
  border-radius: 8px;
}

.loading-bar-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-primary-200);
  border-top-color: var(--color-primary-600);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  flex-shrink: 0;
}

.loading-bar-text {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-primary-700);
}

/* ===== 音频播放器 ===== */
.audio-player-card {
  background-color: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.audio-player {
  width: 100%;
  height: 40px;
}

/* ===== STT 结果卡片 ===== */
.stt-result-card {
  background-color: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--shadow-card);
}

.stt-full-text {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-neutral-800);
  padding: 14px 16px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  margin-bottom: 16px;
  white-space: pre-wrap;
  word-break: break-word;
}

.stt-segments-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stt-segment-item {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--color-neutral-100);
  transition: background-color var(--duration-fast);
}

.stt-segment-item:hover {
  background-color: var(--color-primary-50);
}

.stt-segment-time {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  font-family: var(--font-mono);
  color: var(--color-primary-600);
  background: var(--color-primary-50);
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

.stt-segment-text {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-neutral-700);
  line-height: var(--leading-relaxed);
}
</style>
