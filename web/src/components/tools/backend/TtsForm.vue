<script setup lang="ts">
/**
 * TtsForm — TTS 输入表单（输入区 + 声音设置 + 语速语调 + 生成按钮）
 */
import { computed, ref, watch } from 'vue'
import { NButton, NInput, NSelect, NSlider } from 'naive-ui'
import { formatFileSize } from '@/lib/file-utils'
import type { BackendJobToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: BackendJobToolDefinition
  isBusy: boolean
}>()

const emit = defineEmits<{
  submit: [payload: {
    text: string
    voiceId: string
    speed: string
    pitch: string
    format: string
    ttsFile: File | null
  }]
}>()

const ttsText = ref(`春天的脚步近了，大地从沉睡中苏醒。嫩绿的草芽悄悄钻出泥土，好奇地打量着这个崭新的世界。山间的溪流唱起了欢快的歌谣，一路奔向远方。桃花、杏花竞相开放，把山坡染成了粉色的海洋。小鸟在枝头跳跃，用清脆的歌声赞美这美好的季节。人们脱下厚重的冬衣，走进田野，感受着温暖的阳光和轻柔的微风。`)
const ttsVoice = ref('')
const ttsSpeed = ref(1.0)
const ttsPitch = ref(0)
const ttsFormat = ref<'mp3' | 'wav'>('mp3')
const ttsFile = ref<File | null>(null)
const inputMode = ref<'text' | 'file'>('text')

const txtInputRef = ref<HTMLInputElement | null>(null)

const voiceOptions = computed(() => {
  const voices = props.tool.ttsOptions?.voices || []
  const groups = new Map<string, { label: string; value: string }[]>()
  for (const v of voices) {
    const lang = v.language || '其他'
    if (!groups.has(lang)) groups.set(lang, [])
    groups.get(lang)!.push({
      label: `${v.gender === 'female' ? '👩' : '👨'} ${v.name}`,
      value: v.id,
    })
  }
  return [...groups.entries()].map(([label, children]) => ({
    type: 'group' as const,
    label,
    key: label,
    children,
  }))
})

watch(() => props.tool.ttsOptions, (opts) => {
  if (opts) {
    ttsVoice.value = opts.defaultVoice
    ttsSpeed.value = opts.defaultSpeed
    ttsPitch.value = opts.defaultPitch
    ttsFormat.value = opts.defaultFormat
  }
}, { immediate: true })

function triggerTxtUpload() { txtInputRef.value?.click() }

function handleTxtFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) ttsFile.value = input.files[0]
  input.value = ''
}

function clearTtsFile() { ttsFile.value = null }

function handleSubmit() {
  if (!ttsText.value.trim() && !ttsFile.value) return
  emit('submit', {
    text: ttsText.value,
    voiceId: ttsVoice.value,
    speed: String(ttsSpeed.value),
    pitch: String(ttsPitch.value),
    format: ttsFormat.value,
    ttsFile: ttsFile.value,
  })
}
</script>

<template>
  <div>
    <!-- ====== 输入区 ====== -->
    <div class="tts-card" :class="{ 'is-loading': isBusy }">
      <div class="tts-tabs">
        <button class="tts-tab-btn" :class="{ active: inputMode === 'text' }" @click="inputMode = 'text'">
          ✏️ 输入文本
        </button>
        <button class="tts-tab-btn" :class="{ active: inputMode === 'file' }" @click="inputMode = 'file'">
          📄 上传文件
        </button>
      </div>

      <div v-if="inputMode === 'text'" class="tts-input-area">
        <NInput
          v-model:value="ttsText"
          type="textarea"
          :rows="5"
          :maxlength="5000"
          placeholder="在此输入要转换为语音的文字…"
          show-count
        />
      </div>

      <div v-else class="tts-file-area">
        <div
          v-if="!ttsFile"
          class="tts-dropzone"
          @click="triggerTxtUpload"
          role="button"
          tabindex="0"
          @keydown.enter="triggerTxtUpload"
        >
          <svg class="tts-dropzone-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p class="tts-dropzone-title">点击选择 txt 文件</p>
          <p class="tts-dropzone-hint">支持 .txt 纯文本文件，最大 10KB</p>
        </div>
        <div v-else class="tts-file-chip">
          <div class="tts-file-chip-info">
            <svg class="tts-file-chip-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <p class="tts-file-chip-name">{{ ttsFile.name }}</p>
              <p class="tts-file-chip-size">{{ formatFileSize(ttsFile.size) }}</p>
            </div>
          </div>
          <button class="tts-file-chip-remove" @click="clearTtsFile" aria-label="移除文件">✕</button>
        </div>
      </div>

      <input ref="txtInputRef" type="file" accept=".txt,text/plain" class="hidden" @change="handleTxtFileChange" />
    </div>

    <!-- ====== 声音设置 ====== -->
    <div class="tts-card">
      <p class="tts-card-title">声音设置</p>
      <div class="tts-settings-grid">
        <div class="tts-setting-group">
          <label class="tts-setting-label">声音</label>
          <NSelect
            v-model:value="ttsVoice"
            :options="voiceOptions"
            placeholder="选择声音"
            class="tts-select"
          />
        </div>
        <div class="tts-setting-group">
          <label class="tts-setting-label">输出格式</label>
          <div class="tts-format-toggle">
            <button
              class="tts-format-btn"
              :class="{ active: ttsFormat === 'mp3' }"
              @click="ttsFormat = 'mp3'"
            >
              MP3
            </button>
            <button
              class="tts-format-btn"
              :class="{ active: ttsFormat === 'wav' }"
              @click="ttsFormat = 'wav'"
            >
              WAV
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== 语速 + 语调 ====== -->
    <div class="tts-card">
      <div class="tts-settings-grid tts-settings-grid--sliders">
        <div class="tts-setting-group">
          <div class="tts-setting-row">
            <label class="tts-setting-label">语速</label>
            <span class="tts-setting-value">{{ ttsSpeed.toFixed(1) }}x</span>
          </div>
          <NSlider
            v-model:value="ttsSpeed"
            :min="0.5" :max="2.0" :step="0.1"
            :marks="{ 0.5: '0.5', 1.0: '1.0', 1.5: '1.5', 2.0: '2.0' }"
            class="tts-slider"
          />
        </div>

        <div class="tts-setting-group">
          <div class="tts-setting-row">
            <label class="tts-setting-label">语调</label>
            <span class="tts-setting-value">{{ ttsPitch > 0 ? '+' : '' }}{{ ttsPitch }} st</span>
          </div>
          <NSlider
            v-model:value="ttsPitch"
            :min="-6" :max="6" :step="1"
            :marks="{ '-6': '-6', '0': '0', '6': '+6' }"
            class="tts-slider"
          />
        </div>
      </div>
    </div>

    <!-- ====== 生成按钮 ====== -->
    <NButton
      type="primary"
      size="large"
      block
      :loading="isBusy"
      :disabled="(!ttsText.trim() && !ttsFile) || isBusy"
      @click="handleSubmit"
      class="tts-submit-btn"
    >
      <span v-if="!isBusy">🔊 生成语音</span>
      <span v-else>生成中…</span>
    </NButton>
  </div>
</template>

<style scoped>
/* ===== TTS 卡片 ===== */
.tts-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  transition: opacity var(--duration-fast), border-color var(--duration-fast);
  margin-bottom: 16px;
}

.tts-card.is-loading {
  opacity: 0.5;
  pointer-events: none;
}

.tts-card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin-bottom: 14px;
}

/* ===== 文本/文件切换 ===== */
.tts-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  background: var(--color-neutral-100);
  border-radius: 8px;
  padding: 3px;
}

.tts-tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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

.tts-tab-btn.active {
  background: var(--color-white);
  color: var(--color-neutral-800);
  box-shadow: var(--shadow-sm);
}

/* ===== 文件上传区 ===== */
.tts-file-area {
  min-height: 100px;
}

.tts-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100px;
  border: 1.5px dashed var(--color-neutral-300);
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--duration-fast);
}

.tts-dropzone:hover {
  border-color: var(--color-primary-400);
  background: var(--color-primary-50);
}

.tts-dropzone-icon {
  width: 28px;
  height: 28px;
  color: var(--color-neutral-400);
}

.tts-dropzone-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-600);
}

.tts-dropzone-hint {
  font-size: var(--text-xs);
  color: var(--color-neutral-400);
}

/* ===== 已选文件标签 ===== */
.tts-file-chip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--color-primary-50);
  border: 1px solid var(--color-primary-200);
  border-radius: 8px;
}

.tts-file-chip-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tts-file-chip-icon {
  width: 24px;
  height: 24px;
  color: var(--color-primary-600);
  flex-shrink: 0;
}

.tts-file-chip-name {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-800);
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tts-file-chip-size {
  font-size: var(--text-xs);
  color: var(--color-neutral-500);
}

.tts-file-chip-remove {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-neutral-400);
  cursor: pointer;
  font-size: var(--text-sm);
  transition: all var(--duration-fast);
  flex-shrink: 0;
}

.tts-file-chip-remove:hover {
  background: var(--color-danger-light);
  color: var(--color-danger);
}

/* ===== 设置网格 ===== */
.tts-settings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.tts-settings-grid--sliders {
  gap: 20px;
}

.tts-setting-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tts-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tts-setting-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.tts-setting-value {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-600);
  font-family: var(--font-mono);
  background: var(--color-primary-50);
  padding: 2px 8px;
  border-radius: 4px;
}

.tts-select {
  --n-height: 40px;
}

.tts-slider {
  margin-top: 4px;
}

/* ===== 格式切换按钮组 ===== */
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

.tts-format-btn:hover:not(.active) {
  color: var(--color-neutral-700);
}

/* ===== 生成按钮 ===== */
.tts-submit-btn {
  --n-height: 48px;
  --n-font-size: 15px;
}

@media (max-width: 640px) {
  .tts-settings-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .tts-file-chip-name {
    max-width: 160px;
  }
}
</style>
