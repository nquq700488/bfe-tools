<script setup lang="ts">
/**
 * HtmlEntityCodec — HTML 实体编解码工具
 * 功能：编码/解码、实时预览、XSS 检测警告、复制结果
 * 安全：解码结果用 textContent 回显，禁止 v-html
 */
import { ref, computed } from 'vue'
import { NButton, NAlert, NInput, NSpace } from 'naive-ui'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import CopyButton from '@/components/tools/shared/CopyButton.vue'
import { encodeHtmlEntities, decodeHtmlEntities } from '@/lib/parsers/htmlEntities'
import type { ClientOnlyToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: ClientOnlyToolDefinition
}>()

const input = ref('')
const output = ref('')
const mode = ref<'encode' | 'decode' | null>(null)
const opError = ref<string | null>(null)
const xssWarning = ref(false)

/** XSS 检测模式 */
const XSS_PATTERNS = [
  /<script\b/i,
  /\bon\w+\s*=/i,
  /javascript:/i,
  /<iframe\b/i,
  /<embed\b/i,
  /<object\b/i,
]

const isXssDangerous = computed(() => xssWarning.value)

function detectXss(text: string): boolean {
  return XSS_PATTERNS.some((pattern) => pattern.test(text))
}

function handleEncode(): void {
  if (!input.value.trim()) return
  opError.value = null
  xssWarning.value = false

  try {
    output.value = encodeHtmlEntities(input.value)
    mode.value = 'encode'
  } catch (e) {
    opError.value = `编码失败：${e instanceof Error ? e.message : '未知错误'}`
  }
}

function handleDecode(): void {
  if (!input.value.trim()) return
  opError.value = null
  xssWarning.value = false

  try {
    const decoded = decodeHtmlEntities(input.value)
    output.value = decoded
    mode.value = 'decode'

    // 检测解码后的 XSS 风险
    if (detectXss(decoded)) {
      xssWarning.value = true
    }
  } catch (e) {
    opError.value = `解码失败：${e instanceof Error ? e.message : '未知错误'}`
  }
}

function handleClear(): void {
  input.value = ''
  output.value = ''
  mode.value = null
  opError.value = null
  xssWarning.value = false
}

/** 安全预览模式标识 */
const isDecodeMode = computed(() => mode.value === 'decode')
</script>

<template>
  <section class="html-entity-codec">
    <ToolHeader :tool="props.tool" />

    <!-- 模式切换按钮 -->
    <NSpace class="mb-4">
      <NButton type="primary" size="small" @click="handleEncode" :disabled="!input.trim()">
        🔒 编码 → 实体
      </NButton>
      <NButton size="small" @click="handleDecode" :disabled="!input.trim()">
        🔓 实体 → 字符
      </NButton>
      <NButton size="small" @click="handleClear">清空</NButton>
    </NSpace>

    <!-- 输入区 -->
    <div class="hec-grid">
      <div>
        <label class="hec-label">输入</label>
        <NInput
          v-model:value="input"
          type="textarea"
          :rows="10"
          placeholder="在此输入 HTML 或文本..."
          class="hec-textarea"
        />
      </div>

      <!-- 输出区（用 textContent 安全回显，禁止 v-html） -->
      <div>
        <label class="hec-label">
          输出
          <span class="hec-label-badge">{{ isDecodeMode ? 'textContent 安全渲染' : '' }}</span>
        </label>
        <div class="hec-output-wrapper">
          <div class="hec-output" :class="{ 'hec-output-empty': !output }">
            <template v-if="output">{{ output }}</template>
            <span v-else class="hec-output-placeholder">结果将显示在此处</span>
          </div>
          <CopyButton v-if="output" :content="output" />
        </div>
      </div>
    </div>

    <!-- XSS 检测警告 -->
    <NAlert v-if="isXssDangerous" type="error" :bordered="false" class="mt-4">
      ⚠️ 检测到潜在 XSS 风险（script/on*/javascript:/iframe/embed/object）。
      解码结果已禁用 HTML 渲染，使用安全纯文本模式显示。
    </NAlert>

    <!-- 一般错误 -->
    <NAlert v-if="opError" type="error" :bordered="false" class="mt-4">
      {{ opError }}
    </NAlert>
  </section>
</template>

<style scoped>
.html-entity-codec {
}

.hec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 640px) {
  .hec-grid {
    grid-template-columns: 1fr;
  }
}

.hec-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500);
  margin-bottom: 6px;
}

.hec-label-badge {
  font-size: 10px;
  font-weight: var(--font-weight-normal);
  color: var(--color-primary-600);
  background: var(--color-primary-50);
  padding: 2px 6px;
  border-radius: 4px;
}

.hec-textarea {
  --n-font-size: var(--text-sm);
  font-family: var(--font-mono);
}

.hec-output-wrapper {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  min-height: 220px;
  padding: 0;
  position: relative;
}

.hec-output {
  padding: 16px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-neutral-800);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 280px;
  overflow-y: auto;
  user-select: text;
}

.hec-output-empty {
  color: var(--color-neutral-400);
}

.hec-output-placeholder {
  color: var(--color-neutral-300);
}

.hec-output-wrapper .n-button {
  position: absolute;
  top: 8px;
  right: 8px;
}
</style>
