<script setup lang="ts">
/**
 * FilePreview — 文件预览工具
 *
 * 支持两种输入方式：
 * - 本地文件：拖拽/点击上传
 * - 远程链接：输入 URL，通过 Bun 代理获取文件
 *
 * 支持的文件类型：
 * - 图片 (PNG/JPG/WebP/GIF/SVG/BMP/ICO) — 缩放查看
 * - 视频 (MP4/WebM/MOV/AVI/MKV) — 原生播放器
 * - 音频 (MP3/WAV/OGG/FLAC/AAC/M4A) — 播放器卡片
 * - PDF — iframe 内嵌预览
 * - Office 文档 (.docx/.xlsx/.pptx) — 浏览器端渲染
 * - 文本/代码 (50+ 种格式) — 行号 + 深色主题
 * - ZIP — 文件列表
 */
import { ref, computed, onUnmounted } from 'vue'
import { NButton, NTag, NAlert, NSpin, NInput, NTabs, NTabPane } from 'naive-ui'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import { resolveBunUrl } from '@/lib/runtime'
import type { ClientOnlyToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: ClientOnlyToolDefinition
}>()

// ====== 输入模式 ======
const inputMode = ref<'file' | 'url'>('file')

// ====== 本地文件状态 ======
const file = ref<File | null>(null)
const objectUrl = ref<string | null>(null)
const error = ref<string | null>(null)
const loading = ref(false)
const fileTypeLabel = ref('')

// ====== URL 模式状态 ======
const urlInput = ref('')
const urlLoading = ref(false)

// ====== 图片缩放 ======
const zoomLevel = ref(100)
const MIN_ZOOM = 10
const MAX_ZOOM = 400

// ====== 代码/文本 ======
const codeLines = ref<string[]>([])
const codeContent = ref('')

// ====== ZIP 文件列表 ======
const zipEntries = ref<ZipEntry[]>([])

// ====== Office 文档渲染结果 ======
const officeHtml = ref('')
const xlsxSheets = ref<{ name: string; html: string }[]>([])
const xlsxActiveSheet = ref(0)
const pptxSlides = ref<{ index: number; text: string; imageCount: number }[]>([])

// ====== Types ======
type PreviewCategory =
  | 'image' | 'video' | 'audio' | 'pdf'
  | 'docx' | 'xlsx' | 'pptx'
  | 'code' | 'zip' | 'unsupported' | null

const fileCategory = ref<PreviewCategory>(null)

interface ZipEntry {
  name: string
  size: number
  compressedSize: number
  isDirectory: boolean
}

// ====== 扩展名映射 ======
const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'])
const VIDEO_EXTS = new Set(['mp4', 'webm', 'mov', 'avi', 'mkv'])
const AUDIO_EXTS = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'])
const CODE_EXTS = new Set([
  'txt', 'md', 'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'cfg', 'env', 'csv', 'log',
  'js', 'ts', 'jsx', 'tsx', 'css', 'scss', 'less', 'html', 'htm', 'vue', 'svelte',
  'py', 'sh', 'bash', 'zsh', 'sql', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'hpp',
  'rb', 'php', 'swift', 'kt', 'dart', 'lua', 'r', 'pl', 'groovy', 'scala',
  'makefile', 'dockerfile', 'gitignore', 'editorconfig',
])
const ZIP_EXTS = new Set(['zip'])

function detectCategory(fileName: string, mimeType: string): PreviewCategory {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const mime = mimeType.toLowerCase()

  // Office 文档
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || ext === 'docx') return 'docx'
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || ext === 'xlsx') return 'xlsx'
  if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || ext === 'pptx') return 'pptx'
  // 旧格式 doc/xls/ppt 不支持

  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'
  if (mime.startsWith('image/') || IMAGE_EXTS.has(ext)) return 'image'
  if (mime.startsWith('video/') || VIDEO_EXTS.has(ext)) return 'video'
  if (mime.startsWith('audio/') || AUDIO_EXTS.has(ext)) return 'audio'
  if (mime === 'application/zip' || ZIP_EXTS.has(ext)) return 'zip'
  if (CODE_EXTS.has(ext)) return 'code'
  if (mime.startsWith('text/')) return 'code'

  return 'unsupported'
}

function detectLanguage(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    js: 'javascript', ts: 'typescript', jsx: 'jsx', tsx: 'tsx',
    css: 'css', scss: 'scss', less: 'less',
    html: 'html', htm: 'html', vue: 'html', svelte: 'html',
    json: 'json', xml: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'toml',
    py: 'python', sh: 'bash', bash: 'bash', zsh: 'bash', sql: 'sql',
    java: 'java', go: 'go', rs: 'rust', c: 'c', cpp: 'cpp', h: 'c', hpp: 'cpp',
    rb: 'ruby', php: 'php', swift: 'swift', kt: 'kotlin',
    dart: 'dart', lua: 'lua', r: 'r', scala: 'scala',
    md: 'markdown', txt: 'plaintext', log: 'plaintext',
  }
  return map[ext] ?? 'plaintext'
}

// ====== FileReader 辅助 ======
function readFileAsText(f: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(f)
  })
}

function readFileAsArrayBuffer(f: File | Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsArrayBuffer(f)
  })
}

// ====== 清理 ======
function cleanup() {
  if (objectUrl.value) {
    URL.revokeObjectURL(objectUrl.value)
    objectUrl.value = null
  }
  file.value = null
  fileCategory.value = null
  codeContent.value = ''
  codeLines.value = []
  zipEntries.value = []
  officeHtml.value = ''
  xlsxSheets.value = []
  xlsxActiveSheet.value = 0
  pptxSlides.value = []
  error.value = null
  zoomLevel.value = 100
  fileTypeLabel.value = ''
  urlInput.value = ''
}

onUnmounted(() => {
  if (objectUrl.value) URL.revokeObjectURL(objectUrl.value)
})

// ====== 文件信息 ======
const fileSizeFormatted = computed(() => {
  if (!file.value) return ''
  const b = file.value.size
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`
})

const CATEGORY_LABELS: Record<string, string> = {
  image: '图片', video: '视频', audio: '音频',
  pdf: 'PDF', docx: 'Word 文档', xlsx: 'Excel 表格',
  pptx: 'PPT 演示文稿', code: '文本/代码', zip: 'ZIP 压缩包',
}

const CATEGORY_ICONS: Record<string, string> = {
  image: '🖼️', video: '🎬', audio: '🎵',
  pdf: '📄', docx: '📝', xlsx: '📊',
  pptx: '📽️', code: '📋', zip: '📦',
}

// ====== 本地文件上传处理 ======
const fileInput = ref<HTMLInputElement | null>(null)

async function handleFile(f: File) {
  error.value = null
  loading.value = true
  cleanup()
  file.value = f
  fileTypeLabel.value = f.name

  const category = detectCategory(f.name, f.type)
  fileCategory.value = category

  if (category === 'unsupported') {
    error.value = `不支持的文件类型。支持：图片、视频、音频、PDF、Word/Excel/PPT、文本/代码、ZIP`
    loading.value = false
    return
  }

  // 图片/视频/音频/PDF — object URL
  if (['image', 'video', 'audio', 'pdf'].includes(category)) {
    objectUrl.value = URL.createObjectURL(f)
  }

  // 文本/代码
  if (category === 'code') {
    try {
      const text = await readFileAsText(f)
      codeContent.value = text
      codeLines.value = text.split('\n')
    } catch (e) {
      error.value = `文件读取失败：${e instanceof Error ? e.message : '未知错误'}`
    }
  }

  // ZIP
  if (category === 'zip') await loadZip(f)

  // Office
  if (category === 'docx') await renderDocx(f)
  if (category === 'xlsx') await renderXlsx(f)
  if (category === 'pptx') await renderPptx(f)

  loading.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  const f = e.dataTransfer?.files?.[0]
  if (f) handleFile(f)
}
function handleDragOver(e: DragEvent) { e.preventDefault() }
function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (f) handleFile(f)
  input.value = ''
}

// ====== URL 模式 ======
const BUN_PROXY = resolveBunUrl('/api/bun/file-proxy/fetch')

async function handleFetchUrl() {
  const url = urlInput.value.trim()
  if (!url) return

  error.value = null
  urlLoading.value = true
  cleanup()

  try {
    const res = await fetch(BUN_PROXY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, timeout: 60_000, maxSize: 200 * 1024 * 1024 }),
    })

    // 代理返回 JSON 错误
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await res.json() as { success?: boolean; error?: string }
      error.value = body.error ?? '获取文件失败'
      urlLoading.value = false
      return
    }

    // 成功 — 获取 blob
    const blob = await res.blob()
    const proxyContentType = res.headers.get('content-type') || 'application/octet-stream'
    const proxiedFrom = res.headers.get('x-proxied-from') || url

    // 从 URL 提取文件名
    let fileName = 'unknown'
    try {
      const urlObj = new URL(proxiedFrom)
      fileName = urlObj.pathname.split('/').pop() || 'unknown'
      if (!fileName.includes('.')) fileName = 'unknown'
    } catch { /* ignore */ }

    fileTypeLabel.value = url

    // 伪装成 File 对象给 handleFile
    const fakeFile = new File([blob], fileName, { type: proxyContentType })
    await handleFile(fakeFile)
  } catch (e) {
    error.value = `请求失败：${e instanceof Error ? e.message : '未知错误'}`
  }

  urlLoading.value = false
}

// ====== ZIP 解析 ======
async function loadZip(f: File | Blob) {
  try {
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(f)
    const entries: ZipEntry[] = []
    zip.forEach((relativePath, fileEntry) => {
      entries.push({
        name: relativePath,
        size: (fileEntry._data as any)?.uncompressedSize ?? 0,
        compressedSize: (fileEntry._data as any)?.compressedSize ?? 0,
        isDirectory: fileEntry.dir,
      })
    })
    entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    zipEntries.value = entries
  } catch (e) {
    error.value = `ZIP 解析失败：${e instanceof Error ? e.message : '未知错误'}`
  }
}

// ====== DOCX 渲染 (mammoth) ======
async function renderDocx(f: File | Blob) {
  try {
    const mammoth = (await import('mammoth')).default
    const arrayBuffer = await readFileAsArrayBuffer(f)
    const result = await mammoth.convertToHtml({ arrayBuffer })
    if (result.messages.length > 0) {
      console.warn('mammoth warnings:', result.messages)
    }
    officeHtml.value = result.value
  } catch (e) {
    error.value = `Word 文档解析失败：${e instanceof Error ? e.message : '未知错误'}`
  }
}

// ====== XLSX 渲染 (SheetJS) ======
async function renderXlsx(f: File | Blob) {
  try {
    const XLSX = await import('xlsx')
    const arrayBuffer = await readFileAsArrayBuffer(f)
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })

    xlsxSheets.value = workbook.SheetNames.map((name: string) => {
      const sheet = workbook.Sheets[name]
      const html = XLSX.utils.sheet_to_html(sheet, { id: '', editable: false })
      return { name, html }
    })
    xlsxActiveSheet.value = 0
  } catch (e) {
    error.value = `Excel 文件解析失败：${e instanceof Error ? e.message : '未知错误'}`
  }
}

// ====== PPTX 渲染 (提取 slide 文本) ======
async function renderPptx(f: File | Blob) {
  try {
    const JSZip = (await import('jszip')).default
    const arrayBuffer = await readFileAsArrayBuffer(f)
    const zip = await JSZip.loadAsync(arrayBuffer)

    // 找所有 slide XML 文件
    const slideFiles = Object.keys(zip.files)
      .filter(name => name.match(/^ppt\/slides\/slide(\d+)\.xml$/))
      .sort()

    const slides: typeof pptxSlides.value = []

    for (const slidePath of slideFiles) {
      const slideIndex = parseInt(slidePath.match(/slide(\d+)/)?.[1] ?? '0', 10)
      const fileEntry = zip.files[slidePath]
      const xml = await fileEntry.async('text')

      // 提取文本内容
      const textParts: string[] = []
      const textRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g
      let match: RegExpExecArray | null
      while ((match = textRegex.exec(xml)) !== null) {
        const t = match[1].trim()
        if (t) textParts.push(t)
      }

      // 统计图片
      const imageCount = (xml.match(/<a:blip\b/g) || []).length

      slides.push({
        index: slideIndex,
        text: textParts.join('\n'),
        imageCount,
      })
    }

    pptxSlides.value = slides
  } catch (e) {
    error.value = `PPT 文件解析失败：${e instanceof Error ? e.message : '未知错误'}`
  }
}

// ====== 图片缩放 ======
function zoomIn() { zoomLevel.value = Math.min(zoomLevel.value + 25, MAX_ZOOM) }
function zoomOut() { zoomLevel.value = Math.max(zoomLevel.value - 25, MIN_ZOOM) }
function zoomReset() { zoomLevel.value = 100 }

// ====== 工具函数 ======
function formatZipSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <section class="file-preview" :class="`fp-cat-${fileCategory}`">
    <ToolHeader :tool="props.tool" />

    <!-- ====== 输入模式切换 ====== -->
    <div v-if="!file" class="fp-input-section">
      <NTabs v-model:value="inputMode" type="segment" class="fp-tabs">
        <NTabPane name="file" tab="📁 本地文件" />
        <NTabPane name="url" tab="🔗 远程链接" />
      </NTabs>

      <!-- 本地文件上传 -->
      <div
        v-if="inputMode === 'file'"
        class="fp-upload-zone"
        @drop="handleDrop"
        @dragover="handleDragOver"
        @click="() => fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          class="hidden"
          accept="image/*,video/*,audio/*,.pdf,.docx,.xlsx,.pptx,.zip,.txt,.md,.json,.xml,.yaml,.yml,.toml,.ini,.cfg,.env,.csv,.log,.js,.ts,.jsx,.tsx,.css,.scss,.less,.html,.htm,.vue,.svelte,.py,.sh,.bash,.zsh,.sql,.java,.go,.rs,.c,.cpp,.h,.hpp,.rb,.php,.swift,.kt,.dart,.lua,.r,.pl"
          @change="handleFileChange"
        />
        <div class="fp-upload-icon">📂</div>
        <p class="fp-upload-title">拖拽文件到此处，或点击选择文件</p>
        <p class="fp-upload-hint">图片 · 视频 · 音频 · PDF · Word · Excel · PPT · 代码 · ZIP</p>
      </div>

      <!-- URL 输入 -->
      <div v-if="inputMode === 'url'" class="fp-url-section">
        <div class="fp-url-row">
          <NInput
            v-model:value="urlInput"
            placeholder="粘贴文件链接，如 https://example.com/document.pdf"
            clearable
            size="large"
            class="fp-url-input"
            @keyup.enter="handleFetchUrl"
          />
          <NButton
            type="primary"
            size="large"
            :loading="urlLoading"
            @click="handleFetchUrl"
          >
            预览
          </NButton>
        </div>
        <p class="fp-url-hint">通过 Bun 代理获取文件（支持跨域）。支持的文件类型与本地文件相同</p>
      </div>
    </div>

    <!-- ====== 加载 ====== -->
    <div v-if="loading || urlLoading" class="fp-loading">
      <NSpin size="large" />
      <p class="fp-loading-text">加载中...</p>
    </div>

    <!-- ====== 错误 ====== -->
    <NAlert v-if="error" type="error" :bordered="false" class="mb-4">
      {{ error }}
    </NAlert>

    <!-- ====== 文件信息栏 ====== -->
    <div v-if="file && !loading && !urlLoading" class="fp-file-info">
      <div class="fp-file-meta">
        <span class="fp-file-icon">{{ CATEGORY_ICONS[fileCategory ?? ''] ?? '📁' }}</span>
        <div class="fp-file-details">
          <span class="fp-file-name">{{ file.name }}</span>
          <span v-if="!inputMode || inputMode === 'file'" class="fp-file-stats">
            {{ fileSizeFormatted }} · {{ file.type || '未知类型' }}
          </span>
          <span v-else class="fp-file-stats">远程文件</span>
        </div>
        <NTag :type="fileCategory === 'unsupported' ? 'error' : 'info'" size="small">
          {{ CATEGORY_LABELS[fileCategory ?? ''] ?? fileCategory }}
        </NTag>
      </div>
      <NButton size="small" quaternary @click="cleanup">✕ 关闭</NButton>
    </div>

    <!-- ====== 预览区 ====== -->
    <div v-if="file && !loading && !urlLoading && !error" class="fp-preview">
      <!-- 图片 -->
      <template v-if="fileCategory === 'image'">
        <div class="fp-image-toolbar">
          <NButton size="small" @click="zoomOut" :disabled="zoomLevel <= MIN_ZOOM">−</NButton>
          <span class="fp-zoom-label">{{ zoomLevel }}%</span>
          <NButton size="small" @click="zoomIn" :disabled="zoomLevel >= MAX_ZOOM">+</NButton>
          <NButton size="small" @click="zoomReset">重置</NButton>
        </div>
        <div class="fp-image-container">
          <img
            v-if="objectUrl"
            :src="objectUrl"
            :alt="file.name"
            :style="{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }"
            class="fp-image"
          />
        </div>
      </template>

      <!-- 视频 -->
      <template v-if="fileCategory === 'video'">
        <video v-if="objectUrl" :src="objectUrl" controls class="fp-video" preload="metadata">
          您的浏览器不支持视频播放
        </video>
      </template>

      <!-- 音频 -->
      <template v-if="fileCategory === 'audio'">
        <div class="fp-audio-card">
          <div class="fp-audio-visual"><span class="fp-audio-icon">🎵</span></div>
          <audio v-if="objectUrl" :src="objectUrl" controls class="fp-audio" preload="metadata">
            您的浏览器不支持音频播放
          </audio>
        </div>
      </template>

      <!-- PDF -->
      <template v-if="fileCategory === 'pdf'">
        <iframe v-if="objectUrl" :src="objectUrl" class="fp-pdf" title="PDF 预览" />
      </template>

      <!-- Word 文档 -->
      <template v-if="fileCategory === 'docx'">
        <div class="fp-office-card">
          <div class="fp-office-label">📝 Word 文档预览</div>
          <div class="fp-office-content" v-html="officeHtml" />
        </div>
      </template>

      <!-- Excel 表格 -->
      <template v-if="fileCategory === 'xlsx'">
        <template v-if="xlsxSheets.length === 1">
          <div class="fp-office-card">
            <div class="fp-office-label">📊 {{ xlsxSheets[0].name }}</div>
            <div class="fp-xlsx-content" v-html="xlsxSheets[0].html" />
          </div>
        </template>
        <template v-else>
          <div class="fp-xlsx-tabs">
            <button
              v-for="(sheet, i) in xlsxSheets"
              :key="i"
              class="fp-xlsx-tab"
              :class="{ active: xlsxActiveSheet === i }"
              @click="xlsxActiveSheet = i"
            >
              {{ sheet.name }}
            </button>
          </div>
          <div class="fp-office-card">
            <div class="fp-office-label">📊 {{ xlsxSheets[xlsxActiveSheet]?.name }}</div>
            <div class="fp-xlsx-content" v-html="xlsxSheets[xlsxActiveSheet]?.html" />
          </div>
        </template>
      </template>

      <!-- PPT -->
      <template v-if="fileCategory === 'pptx'">
        <div class="fp-pptx-grid">
          <div
            v-for="slide in pptxSlides"
            :key="slide.index"
            class="fp-pptx-slide"
          >
            <div class="fp-pptx-slide-header">
              <span class="fp-pptx-slide-num">幻灯片 {{ slide.index }}</span>
              <span v-if="slide.imageCount" class="fp-pptx-slide-imgs">{{ slide.imageCount }} 张图</span>
            </div>
            <pre class="fp-pptx-text">{{ slide.text || '(无文本内容)' }}</pre>
          </div>
        </div>
        <p v-if="pptxSlides.length === 0" class="fp-pptx-empty">无法解析幻灯片内容</p>
      </template>

      <!-- 代码/文本 -->
      <template v-if="fileCategory === 'code'">
        <div class="fp-code-header">
          <NTag size="small" :bordered="false">{{ detectLanguage(file.name) }}</NTag>
          <span class="fp-code-stats">{{ codeLines.length }} 行</span>
        </div>
        <div class="fp-code-container">
          <table class="fp-code-table">
            <tbody>
              <tr v-for="(line, i) in codeLines" :key="i" class="fp-code-row">
                <td class="fp-code-ln">{{ i + 1 }}</td>
                <td class="fp-code-cell"><pre class="fp-code-line">{{ line }}</pre></td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- ZIP -->
      <template v-if="fileCategory === 'zip'">
        <div class="fp-zip-header">
          <span class="fp-zip-stats">共 {{ zipEntries.length }} 个条目</span>
        </div>
        <div class="fp-zip-table-wrap">
          <table class="fp-zip-table">
            <thead>
              <tr>
                <th>文件名</th>
                <th class="fp-zip-col-size">大小</th>
                <th class="fp-zip-col-csize">压缩后</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(entry, i) in zipEntries" :key="i" :class="{ 'fp-zip-dir': entry.isDirectory }">
                <td>
                  <span class="fp-zip-entry-icon">{{ entry.isDirectory ? '📁' : '📄' }}</span>
                  {{ entry.name }}
                </td>
                <td class="fp-zip-col-size">{{ entry.isDirectory ? '—' : formatZipSize(entry.size) }}</td>
                <td class="fp-zip-col-csize">{{ entry.isDirectory ? '—' : formatZipSize(entry.compressedSize) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.file-preview {
  max-width: var(--max-content-width);
}

/* ====== 输入区域 ====== */
.fp-input-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.fp-tabs {
  --n-tab-font-size: var(--text-sm);
}

/* ====== 上传 ====== */
.fp-upload-zone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 24px;
  border: 2px dashed var(--color-neutral-300);
  border-radius: 16px;
  background: var(--color-neutral-50);
  cursor: pointer;
  transition: all var(--duration-fast);
}
.fp-upload-zone:hover {
  border-color: var(--color-primary-400);
  background: var(--color-primary-25, #f5f8ff);
}
.fp-upload-icon { font-size: 48px; opacity: 0.7; }
.fp-upload-title {
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
  margin: 0;
}
.fp-upload-hint {
  font-size: var(--text-sm);
  color: var(--color-neutral-400);
  margin: 0;
}

/* ====== URL ====== */
.fp-url-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fp-url-row {
  display: flex;
  gap: 12px;
}
.fp-url-input { flex: 1; }
.fp-url-hint {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
  margin: 0;
  line-height: 1.5;
}

/* ====== 加载 ====== */
.fp-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px;
}
.fp-loading-text {
  font-size: var(--text-sm);
  color: var(--color-neutral-400);
}

/* ====== 文件信息 ====== */
.fp-file-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  margin-bottom: 16px;
}
.fp-file-meta { display: flex; align-items: center; gap: 12px; }
.fp-file-icon { font-size: 28px; }
.fp-file-details { display: flex; flex-direction: column; gap: 2px; }
.fp-file-name {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fp-file-stats {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}

/* ====== 图片 ====== */
.fp-image-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px 10px 0 0;
  border-bottom: none;
}
.fp-zoom-label {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-600);
  min-width: 48px;
  text-align: center;
}
.fp-image-container {
  border: 1px solid var(--color-neutral-200);
  border-radius: 0 0 10px 10px;
  overflow: auto;
  max-height: 70vh;
  background: repeating-conic-gradient(var(--color-neutral-100) 0% 25%, transparent 0% 50%) 50% / 20px 20px;
}
.fp-image {
  display: block;
  max-width: 100%;
  transition: transform var(--duration-fast);
  image-rendering: auto;
}

/* ====== 视频/音频 ====== */
.fp-video {
  width: 100%;
  max-height: 70vh;
  border-radius: 10px;
  background: #000;
  outline: none;
}
.fp-audio-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 48px 24px;
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
}
.fp-audio-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-200));
}
.fp-audio-icon { font-size: 48px; }
.fp-audio { width: 100%; max-width: 480px; }

/* ====== PDF ====== */
.fp-pdf {
  width: 100%;
  height: 75vh;
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
}

/* ====== Office 文档通用 ====== */
.fp-office-card {
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  overflow: hidden;
}
.fp-office-label {
  padding: 10px 16px;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-600);
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-100);
}
.fp-office-content {
  padding: 24px;
  max-height: 70vh;
  overflow-y: auto;
  background: var(--color-white);
}

/* ====== Excel ====== */
.fp-xlsx-tabs {
  display: flex;
  gap: 0;
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px 10px 0 0;
  overflow: hidden;
  background: var(--color-neutral-50);
}
.fp-xlsx-tab {
  padding: 8px 20px;
  border: none;
  border-right: 1px solid var(--color-neutral-200);
  background: transparent;
  font-size: var(--text-sm);
  color: var(--color-neutral-500);
  cursor: pointer;
  transition: all var(--duration-fast);
}
.fp-xlsx-tab:last-child { border-right: none; }
.fp-xlsx-tab.active {
  background: var(--color-white);
  color: var(--color-primary-600);
  font-weight: var(--font-weight-semibold);
}
.fp-xlsx-tab:hover { color: var(--color-primary-500); }
.fp-xlsx-content {
  max-height: 70vh;
  overflow: auto;
  background: var(--color-white);
  padding: 0;
}
.fp-xlsx-content :deep(table) {
  border-collapse: collapse;
  font-size: var(--text-sm);
  width: auto;
}
.fp-xlsx-content :deep(th),
.fp-xlsx-content :deep(td) {
  border: 1px solid var(--color-neutral-200);
  padding: 6px 12px;
  text-align: left;
  white-space: nowrap;
}
.fp-xlsx-content :deep(th) {
  background: var(--color-neutral-50);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-700);
  position: sticky;
  top: 0;
}
.fp-xlsx-content :deep(tr:hover td) {
  background: var(--color-neutral-25, #fafbfc);
}

/* ====== PPT ====== */
.fp-pptx-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}
.fp-pptx-slide {
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-white);
}
.fp-pptx-slide-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-100);
  font-size: var(--text-sm);
}
.fp-pptx-slide-num {
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-700);
}
.fp-pptx-slide-imgs {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}
.fp-pptx-text {
  padding: 16px;
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.7;
  color: var(--color-neutral-700);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 240px;
  overflow-y: auto;
  font-family: inherit;
}
.fp-pptx-empty {
  text-align: center;
  color: var(--color-neutral-400);
  font-size: var(--text-sm);
  padding: 32px;
}

/* ====== 代码 ====== */
.fp-code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px 10px 0 0;
  border-bottom: none;
}
.fp-code-stats {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}
.fp-code-container {
  border: 1px solid var(--color-neutral-200);
  border-radius: 0 0 10px 10px;
  overflow: auto;
  max-height: 70vh;
  background: #1e1e2e;
}
.fp-code-table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--font-mono, 'SF Mono', 'Fira Code', 'Cascadia Code', monospace);
  font-size: 13px;
  line-height: 1.6;
}
.fp-code-row:hover { background: rgb(255 255 255 / .04); }
.fp-code-ln {
  width: 1%;
  min-width: 48px;
  padding: 0 12px;
  text-align: right;
  color: #6c7086;
  user-select: none;
  vertical-align: top;
  border-right: 1px solid #313244;
  white-space: nowrap;
}
.fp-code-cell { padding: 0; }
.fp-code-line {
  margin: 0;
  padding: 0 16px;
  color: #cdd6f4;
  white-space: pre;
  overflow: visible;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
}

/* ====== ZIP ====== */
.fp-zip-header {
  padding: 10px 16px;
  background: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px 10px 0 0;
  border-bottom: none;
}
.fp-zip-stats {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-600);
}
.fp-zip-table-wrap {
  border: 1px solid var(--color-neutral-200);
  border-radius: 0 0 10px 10px;
  overflow: auto;
  max-height: 60vh;
}
.fp-zip-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}
.fp-zip-table th {
  text-align: left;
  padding: 8px 16px;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-100);
  position: sticky;
  top: 0;
}
.fp-zip-table td {
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-neutral-50);
  color: var(--color-neutral-700);
}
.fp-zip-table tr:last-child td { border-bottom: none; }
.fp-zip-table tbody tr:hover { background: var(--color-neutral-50); }
.fp-zip-col-size, .fp-zip-col-csize {
  width: 100px;
  text-align: right;
  white-space: nowrap;
}
.fp-zip-dir td { font-weight: var(--font-weight-medium); }
.fp-zip-entry-icon { margin-right: 6px; }
</style>

<!-- 全局样式 -->
<style>
.client-tool-panel:has(.fp-cat-code),
.client-tool-panel:has(.fp-cat-docx),
.client-tool-panel:has(.fp-cat-xlsx),
.client-tool-panel:has(.fp-cat-pptx) {
  max-width: 900px;
}
</style>
