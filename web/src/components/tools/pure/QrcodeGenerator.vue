<script setup lang="ts">
/**
 * QrcodeGenerator — 二维码生成器
 * 功能：文本/URL 转二维码、前景/背景颜色、纠错级别、
 *       vCard/WiFi 表单、中心 Logo 叠加、PNG/SVG 导出
 */
import { ref, watch, computed, nextTick, onUnmounted } from 'vue'
import { NButton, NInput, NSelect, NRadioGroup, NRadio, NSpace, NSlider } from 'naive-ui'
import QRCode from 'qrcode'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import ColorPicker from '@/components/tools/shared/ColorPicker.vue'
import CopyButton from '@/components/tools/shared/CopyButton.vue'
import type { ClientOnlyToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: ClientOnlyToolDefinition
}>()

// ---- 内容模式 ----
type ContentMode = 'text' | 'vcard' | 'wifi'
const contentMode = ref<ContentMode>('text')
const textInput = ref('https://example.com')
const qrData = computed(() => {
  switch (contentMode.value) {
    case 'vcard': return buildVCard()
    case 'wifi': return buildWifiString()
    default: return textInput.value
  }
})

// ---- 颜色 ----
const fgColor = ref('#000000')
const bgColor = ref('#FFFFFF')

// ---- 纠错级别 ----
const errorLevel = ref<'L' | 'M' | 'Q' | 'H'>('M')
const errorLevelOptions = [
  { label: 'L — 7% 纠错', value: 'L' },
  { label: 'M — 15% 纠错（推荐）', value: 'M' },
  { label: 'Q — 25% 纠错', value: 'Q' },
  { label: 'H — 30% 纠错', value: 'H' },
]

// ---- Logo ----
const logoUrl = ref<string | null>(null)
const logoSize = ref(20) // 百分比 10-30
const logoFileRef = ref<HTMLInputElement | null>(null)

function triggerLogoInput(): void { logoFileRef.value?.click() }

function handleLogoChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    qrError.value = 'Logo 仅支持 PNG/JPEG/WebP 格式'
    return
  }
  // 释放旧 URL
  if (logoUrl.value) URL.revokeObjectURL(logoUrl.value)
  logoUrl.value = URL.createObjectURL(file)
  input.value = ''
  // Logo 启用时建议 H 纠错级别
  if (errorLevel.value !== 'H') {
    qrError.value = '已启用 Logo，建议使用 H 纠错级别以增加容错空间'
  }
}

function removeLogo(): void {
  if (logoUrl.value) { URL.revokeObjectURL(logoUrl.value); logoUrl.value = null }
  qrError.value = null
}

// 通过 canvas 手动绘制 Logo 的叠加函数（用于 qrcode 原生渲染 + Logo 手动叠加）
function drawLogoOnCanvas(canvas: HTMLCanvasElement, logoSrc: string, sizePercent: number): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(); return }
      const logoW = canvas.width * sizePercent / 100
      const logoH = canvas.height * sizePercent / 100
      const x = (canvas.width - logoW) / 2
      const y = (canvas.height - logoH) / 2
      // 白色背景圆角矩形
      const radius = 8
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + logoW - radius, y)
      ctx.arcTo(x + logoW, y, x + logoW, y + radius, radius)
      ctx.lineTo(x + logoW, y + logoH - radius)
      ctx.arcTo(x + logoW, y + logoH, x + logoW - radius, y + logoH, radius)
      ctx.lineTo(x + radius, y + logoH)
      ctx.arcTo(x, y + logoH, x, y + logoH - radius, radius)
      ctx.lineTo(x, y + radius)
      ctx.arcTo(x, y, x + radius, y, radius)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      // 绘制 Logo 图片
      ctx.drawImage(img, x + 2, y + 2, logoW - 4, logoH - 4)
      resolve()
    }
    img.onerror = () => resolve()
    img.src = logoSrc
  })
}

// ---- Canvas 渲染 ----
const canvasRef = ref<HTMLCanvasElement | null>(null)
const qrError = ref<string | null>(null)

async function renderQr(): Promise<void> {
  qrError.value = null
  if (!canvasRef.value || !qrData.value.trim()) return

  await nextTick()
  try {
    const canvas = canvasRef.value
    // 清除画布
    const ctx = canvas.getContext('2d')
    if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height) }

    // 标准 QRCode 渲染
    await QRCode.toCanvas(canvas, qrData.value, {
      width: 320,
      margin: 2,
      color: { dark: fgColor.value, light: bgColor.value },
      errorCorrectionLevel: errorLevel.value,
    })

    // 手动叠加 Logo（大小由 logoSize 完全控制）
    if (logoUrl.value) {
      await drawLogoOnCanvas(canvas, logoUrl.value, logoSize.value)
    }
  } catch (e) {
    qrError.value = e instanceof Error ? e.message : '生成二维码失败'
  }
}

watch([qrData, fgColor, bgColor, errorLevel, logoUrl, logoSize], renderQr, { immediate: true })

// ---- 导出 ----
function exportPng(): void {
  if (!canvasRef.value) return
  const url = canvasRef.value.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = 'qrcode.png'
  a.click()
}

async function exportSvg(): Promise<void> {
  // SVG 暂不支持 Logo 叠加，使用 canvas PNG 降级
  if (logoUrl.value) {
    exportPng()
    return
  }
  QRCode.toString(qrData.value, {
    type: 'svg',
    margin: 2,
    color: { dark: fgColor.value, light: bgColor.value },
    errorCorrectionLevel: errorLevel.value,
  }).then((svg) => {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'qrcode.svg'
    a.click()
    URL.revokeObjectURL(url)
  })
}

function exportSvgLabel(): string {
  return logoUrl.value ? '📥 导出 PNG' : '📥 导出 SVG'
}

// ---- vCard 表单 ----
const vcardName = ref('')
const vcardPhone = ref('')
const vcardEmail = ref('')
const vcardOrg = ref('')

function buildVCard(): string {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0']
  if (vcardName.value) lines.push(`FN:${vcardName.value}`)
  if (vcardPhone.value) lines.push(`TEL:${vcardPhone.value}`)
  if (vcardEmail.value) lines.push(`EMAIL:${vcardEmail.value}`)
  if (vcardOrg.value) lines.push(`ORG:${vcardOrg.value}`)
  lines.push('END:VCARD')
  return lines.join('\n')
}

// ---- WiFi 表单 ----
const wifiSsid = ref('')
const wifiPassword = ref('')
const wifiEncryption = ref<'WPA' | 'WEP' | 'nopass'>('WPA')

function buildWifiString(): string {
  return `WIFI:T:${wifiEncryption.value};S:${wifiSsid.value};P:${wifiPassword.value};;`
}

onUnmounted(() => {
  if (logoUrl.value) URL.revokeObjectURL(logoUrl.value)
})
</script>

<template>
  <section class="qrcode-generator">
    <ToolHeader :tool="props.tool" />

    <div class="qr-layout">
      <!-- 左：输入区 -->
      <div class="qr-controls">
        <!-- 模式切换 -->
        <NRadioGroup v-model:value="contentMode" class="mb-4">
          <NRadio value="text">文本/URL</NRadio>
          <NRadio value="vcard">vCard 名片</NRadio>
          <NRadio value="wifi">WiFi 信息</NRadio>
        </NRadioGroup>

        <!-- 文本模式 -->
        <div v-if="contentMode === 'text'" class="mb-4">
          <NInput
            v-model:value="textInput"
            type="textarea"
            :rows="3"
            placeholder="输入文本或 URL..."
            class="qr-textarea"
          />
        </div>

        <!-- vCard 表单 -->
        <template v-if="contentMode === 'vcard'">
          <NInput v-model:value="vcardName" placeholder="姓名" class="mb-2" size="small" />
          <NInput v-model:value="vcardPhone" placeholder="电话" class="mb-2" size="small" />
          <NInput v-model:value="vcardEmail" placeholder="邮箱" class="mb-2" size="small" />
          <NInput v-model:value="vcardOrg" placeholder="公司" class="mb-4" size="small" />
        </template>

        <!-- WiFi 表单 -->
        <template v-if="contentMode === 'wifi'">
          <NInput v-model:value="wifiSsid" placeholder="SSID（WiFi 名称）" class="mb-2" size="small" />
          <NInput v-model:value="wifiPassword" placeholder="密码" class="mb-2" size="small" />
          <NRadioGroup v-model:value="wifiEncryption" class="mb-4">
            <NRadio value="WPA">WPA/WPA2</NRadio>
            <NRadio value="WEP">WEP</NRadio>
            <NRadio value="nopass">无密码</NRadio>
          </NRadioGroup>
        </template>

        <!-- Logo 区 -->
        <div class="qr-logo-section mb-4">
          <label class="qr-label block mb-1">中心 Logo</label>
          <div v-if="!logoUrl" class="qr-logo-dropzone" role="button" tabindex="0" @click="triggerLogoInput" @keydown.enter="triggerLogoInput">
            <span class="qr-logo-dropzone-icon">🖼️</span>
            <span class="qr-logo-dropzone-text">点击上传 Logo</span>
          </div>
          <div v-else class="qr-logo-preview">
            <img :src="logoUrl" alt="Logo 预览" class="qr-logo-img" />
            <div class="qr-logo-info">
              <NButton size="tiny" @click="removeLogo">✕ 移除</NButton>
            </div>
          </div>
          <input ref="logoFileRef" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="handleLogoChange" />

          <!-- Logo 大小滑块 -->
          <div v-if="logoUrl" class="mt-2">
            <label class="qr-label">Logo 大小 {{ logoSize }}%</label>
            <NSlider v-model:value="logoSize" :min="10" :max="30" :step="1" />
          </div>
        </div>

        <!-- 颜色设置 -->
        <div class="qr-colors mb-4">
          <div class="qr-color-item">
            <label class="qr-label">前景色</label>
            <ColorPicker v-model="fgColor" />
          </div>
          <div class="qr-color-item">
            <label class="qr-label">背景色</label>
            <ColorPicker v-model="bgColor" />
          </div>
        </div>

        <!-- 纠错级别 -->
        <div class="mb-4">
          <label class="qr-label block mb-1">纠错级别</label>
          <NSelect
            v-model:value="errorLevel"
            :options="errorLevelOptions"
            size="small"
          />
        </div>

        <!-- 导出 -->
        <NSpace class="mb-3">
          <NButton size="small" @click="exportPng">📥 导出 PNG</NButton>
          <NButton size="small" @click="exportSvg">{{ exportSvgLabel() }}</NButton>
        </NSpace>

        <p v-if="qrError" class="qr-error">{{ qrError }}</p>
      </div>

      <!-- 右：二维码预览 -->
      <div class="qr-preview">
        <div class="qr-canvas-wrapper" :style="{ backgroundColor: bgColor }">
          <canvas ref="canvasRef" width="320" height="320" />
        </div>
        <CopyButton v-if="qrData" :content="qrData" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.qrcode-generator {
}

.qr-layout {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 32px;
  align-items: start;
}

@media (max-width: 768px) {
  .qr-layout {
    grid-template-columns: 1fr;
    gap: 24px;
  }
  .qr-preview {
    order: -1;
  }
}

.qr-controls {
  min-width: 0;
}

.qr-textarea {
  --n-font-size: var(--text-sm);
  font-family: var(--font-mono);
}

/* Logo */
.qr-logo-section { }
.qr-logo-dropzone {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px;
  border: 1.5px dashed var(--color-neutral-300); border-radius: 8px;
  cursor: pointer; transition: all var(--duration-fast);
}
.qr-logo-dropzone:hover { border-color: var(--color-primary-400); background: var(--color-primary-50); }
.qr-logo-dropzone-icon { font-size: 20px; }
.qr-logo-dropzone-text { font-size: var(--text-sm); color: var(--color-neutral-500); }
.qr-logo-preview { display: flex; align-items: center; gap: 12px; }
.qr-logo-img { width: 48px; height: 48px; object-fit: contain; border-radius: 8px; border: 1px solid var(--color-neutral-200); background: #fff; }
.qr-logo-info { display: flex; flex-direction: column; gap: 4px; }

.qr-colors {
  display: flex;
  gap: 16px;
}

.qr-color-item {
  flex: 1;
}

.qr-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.qr-label.block {
  display: block;
}

.qr-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.qr-canvas-wrapper {
  width: 320px;
  height: 320px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.qr-canvas-wrapper canvas {
  display: block;
  width: 320px;
  height: 320px;
}

.qr-error {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-danger);
}
</style>
