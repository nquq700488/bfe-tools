<script setup lang="ts">
/**
 * UrlCodec — URL 编解码工具
 * 功能：编码/解码、查询参数表格、undo 历史、编码字符高亮、危险协议警告
 */
import { ref, computed } from 'vue'
import { NButton, NAlert, NInput, NSpace, NTable } from 'naive-ui'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import CopyButton from '@/components/tools/shared/CopyButton.vue'
import { useUndoHistory } from '@/hooks/useUndoHistory'
import { encodeUrl, decodeUrl, parseQueryParams, type QueryParam } from '@/lib/parsers/urlCodec'
import { isDangerousProtocol } from '@/lib/security/safeUrl'
import type { ClientOnlyToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: ClientOnlyToolDefinition
}>()

const { state: text, push: pushHistory, undo, canUndo } = useUndoHistory('')

const result = ref('')
const operation = ref<'encode' | 'decode' | null>(null)
const opError = ref<string | null>(null)
const dangerProtocol = ref(false)
const params = ref<QueryParam[]>([])

const showParams = computed(() => params.value.length > 0)

/** 编码结果拆分为 token 数组（替代 v-html），%XX 标记为高亮 */
interface HighlightToken {
  text: string
  isEncoded: boolean
}

const highlightTokens = computed<HighlightToken[]>(() => {
  if (operation.value !== 'encode' || !result.value) return []
  const parts = result.value.split(/(%[0-9A-Fa-f]{2})/g)
  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      isEncoded: /^%[0-9A-Fa-f]{2}$/.test(part),
    }))
})

function handleEncode(): void {
  if (!text.value.trim()) return
  opError.value = null
  dangerProtocol.value = false

  try {
    pushHistory(text.value)
    result.value = encodeUrl(text.value)
    operation.value = 'encode'
    params.value = parseQueryParams(text.value)
    dangerProtocol.value = isDangerousProtocol(text.value)
  } catch (e) {
    opError.value = `编码失败：${e instanceof Error ? e.message : '未知错误'}`
  }
}

function handleDecode(): void {
  if (!text.value.trim()) return
  opError.value = null
  dangerProtocol.value = false

  try {
    pushHistory(text.value)
    result.value = decodeUrl(text.value)
    operation.value = 'decode'
    // 解码结果也可能包含查询参数
    params.value = parseQueryParams(result.value)
  } catch (e) {
    opError.value = `解码失败：${e instanceof Error ? e.message : '未知错误'}`
  }
}

function handleUndo(): void {
  undo()
  result.value = ''
  operation.value = null
  opError.value = null
  params.value = []
}

function handleClear(): void {
  text.value = ''
  result.value = ''
  operation.value = null
  opError.value = null
  params.value = []
  dangerProtocol.value = false
}

const paramColumns = [
  { title: '参数名', key: 'key', width: 160 },
  { title: '原始值', key: 'value', ellipsis: { tooltip: true } },
  { title: '编码值', key: 'encoded' },
]

interface ParamRow {
  key: string
  value: string
  encoded: string
}

const paramRows = computed<ParamRow[]>(() =>
  params.value.map((p) => ({
    key: p.key,
    value: p.value,
    encoded: encodeURIComponent(p.value),
  }))
)
</script>

<template>
  <section class="url-codec">
    <ToolHeader :tool="props.tool" />

    <!-- 操作按钮 -->
    <NSpace class="mb-4">
      <NButton type="primary" size="small" @click="handleEncode" :disabled="!text.trim()">
        🔒 编码
      </NButton>
      <NButton size="small" @click="handleDecode" :disabled="!text.trim()">
        🔓 解码
      </NButton>
      <NButton size="small" @click="handleUndo" :disabled="!canUndo">
        ↩ 撤销
      </NButton>
      <NButton size="small" @click="handleClear">清空</NButton>
    </NSpace>

    <!-- 输入区 -->
    <label class="uc-label">输入</label>
    <NInput
      :value="text"
      type="textarea"
      :rows="6"
      placeholder="在此输入 URL 或编码文本..."
      class="uc-textarea mb-4"
      @update:value="(v: string) => { text = v; opError = null; dangerProtocol = false }"
    />

    <!-- 危险协议警告 -->
    <NAlert v-if="dangerProtocol" type="warning" :bordered="false" class="mb-4">
      ⚠️ 检测到危险协议（javascript:/data:），可能导致安全问题
    </NAlert>

    <!-- 错误提示 -->
    <NAlert v-if="opError" type="error" :bordered="false" class="mb-4">
      {{ opError }}
    </NAlert>

    <!-- 结果区 -->
    <div v-if="result" class="uc-result-section">
      <div class="uc-result-header">
        <span class="uc-result-label">
          {{ operation === 'encode' ? '编码结果' : '解码结果' }}
        </span>
        <CopyButton :content="result" />
      </div>
      <!-- 编码字符高亮（v-for token 安全渲染，无 v-html） -->
      <div v-if="highlightTokens.length > 0" class="uc-result-highlight">
        <span
          v-for="(token, i) in highlightTokens"
          :key="i"
          :class="token.isEncoded ? 'uc-hl-mark' : ''"
        >{{ token.text }}</span>
      </div>
      <pre v-else class="uc-result">{{ result }}</pre>
    </div>

    <!-- 查询参数表格 -->
    <div v-if="showParams" class="uc-params-section">
      <h3 class="uc-params-title">查询参数 ({{ params.length }})</h3>
      <NTable
        :columns="paramColumns"
        :data="paramRows"
        :bordered="false"
        :single-line="false"
        size="small"
        class="uc-params-table"
      />
    </div>
  </section>
</template>

<style scoped>
.url-codec {
}

.uc-label {
  display: block;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500);
  margin-bottom: 6px;
}

.uc-textarea {
  --n-font-size: var(--text-sm);
  font-family: var(--font-mono);
}

.uc-result-section {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 20px;
}

.uc-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-100);
}

.uc-result-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.uc-result {
  padding: 16px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-neutral-800);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 480px;
  overflow-y: auto;
  user-select: text;
}

.uc-result-highlight {
  padding: 16px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-neutral-800);
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 480px;
  overflow-y: auto;
  user-select: text;
}

.uc-hl-mark {
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  border-radius: 2px;
  padding: 0 1px;
}

.uc-params-section {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  overflow: hidden;
}

.uc-params-title {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 12px 16px;
  margin: 0;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-100);
}

.uc-params-table {
  --n-font-size: var(--text-sm);
}
</style>
