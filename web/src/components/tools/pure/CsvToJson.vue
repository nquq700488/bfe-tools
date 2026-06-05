<script setup lang="ts">
/**
 * CsvToJson — CSV ↔ JSON 双向转换
 * 功能：粘贴/拖拽上传 CSV、编码选择、分隔符、前3行预览、双向转换、复制结果
 */
import { ref, computed } from 'vue'
import { NButton, NInput, NSelect, NAlert, NSpace, NTable } from 'naive-ui'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import CopyButton from '@/components/tools/shared/CopyButton.vue'
import { parseCsv, csvToJson, jsonToCsv } from '@/lib/parsers/csv'
import type { ClientOnlyToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: ClientOnlyToolDefinition
}>()

// ---- 模式 ----
type Direction = 'csv-to-json' | 'json-to-csv'
const direction = ref<Direction>('csv-to-json')

// ---- 输入 ----
const csvInput = ref('')
const jsonInput = ref('')
const delimiter = ref<string>(',')
const encoding = ref('UTF-8')
const opError = ref<string | null>(null)

const delimiterOptions = [
  { label: '逗号 ( , )', value: ',' },
  { label: '分号 ( ; )', value: ';' },
  { label: 'Tab ( \\t )', value: '\t' },
]

const encodingOptions = [
  { label: 'UTF-8', value: 'UTF-8' },
  { label: 'GBK', value: 'GBK' },
]

// ---- 解析结果 ----
const previewRows = ref<string[][]>([])
const previewColumns = ref<string[]>([])
const output = ref('')

const hasPreview = computed(() => previewRows.value.length > 0)

/** 从 File 读取文本 */
function readFileAsText(file: File, enc: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, enc)
  })
}

/** CSV → JSON 转换 */
async function handleCsvToJson(): Promise<void> {
  opError.value = null
  if (!csvInput.value.trim()) return

  try {
    const text = csvInput.value
    const parsed = parseCsv(text, undefined, delimiter.value)
    if (parsed.errors.length > 0) {
      opError.value = parsed.errors.map((e) => `第 ${e.row + 1} 行: ${e.message}`).join('; ')
    }

    // 预览前3行
    previewRows.value = parsed.data.slice(0, 3)
    previewColumns.value = parsed.data[0]?.map((_, i) => `col_${i}`) ?? []

    // 转 JSON
    const json = csvToJson(text, delimiter.value)
    output.value = JSON.stringify(json, null, 2)
  } catch (e) {
    opError.value = `CSV 解析失败：${e instanceof Error ? e.message : '未知错误'}`
  }
}

/** JSON → CSV 转换 */
function handleJsonToCsv(): void {
  opError.value = null
  if (!jsonInput.value.trim()) return

  try {
    const parsed = JSON.parse(jsonInput.value)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      opError.value = 'JSON 必须为非空对象数组'
      return
    }
    output.value = jsonToCsv(parsed as Record<string, string | number>[], delimiter.value)
    previewRows.value = []
    previewColumns.value = []
  } catch (e) {
    opError.value = `JSON 解析失败：${e instanceof SyntaxError ? e.message : '未知错误'}`
  }
}

/** 拖拽文件上传 */
function handleDrop(e: DragEvent): void {
  e.preventDefault()
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  loadFile(file)
}

function handleDragOver(e: DragEvent): void {
  e.preventDefault()
}

async function loadFile(file: File): Promise<void> {
  opError.value = null
  try {
    const text = await readFileAsText(file, encoding.value)
    csvInput.value = text
    if (direction.value === 'csv-to-json') {
      await handleCsvToJson()
    }
  } catch (e) {
    opError.value = `文件读取失败：${e instanceof Error ? e.message : '未知错误'}`
  }
}

function handleFileChange(e: Event): void {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  loadFile(file)
  input.value = ''
}

function handleClear(): void {
  csvInput.value = ''
  jsonInput.value = ''
  output.value = ''
  previewRows.value = []
  previewColumns.value = []
  opError.value = null
}

/** 表格列定义 */
const tableColumns = computed(() =>
  previewColumns.value.map((col, i) => ({
    title: col,
    key: `col_${i}`,
    ellipsis: { tooltip: true },
  }))
)

const tableData = computed(() =>
  previewRows.value.map((row) => {
    const obj: Record<string, string> = {}
    row.forEach((cell, i) => {
      obj[`col_${i}`] = cell
    })
    return obj
  })
)
</script>

<template>
  <section class="csv-to-json">
    <ToolHeader :tool="props.tool" />

    <!-- 方向切换 -->
    <NSpace class="mb-4">
      <NButton
        :type="direction === 'csv-to-json' ? 'primary' : 'default'"
        size="small"
        @click="direction = 'csv-to-json'"
      >
        📊 CSV → JSON
      </NButton>
      <NButton
        :type="direction === 'json-to-csv' ? 'primary' : 'default'"
        size="small"
        @click="direction = 'json-to-csv'"
      >
        📋 JSON → CSV
      </NButton>
      <NButton size="small" @click="handleClear">清空</NButton>
    </NSpace>

    <!-- CSV → JSON 模式 -->
    <template v-if="direction === 'csv-to-json'">
      <div class="cj-controls mb-4">
        <span class="cj-label">分隔符</span>
        <NSelect v-model:value="delimiter" :options="delimiterOptions" size="small" class="cj-select" />
        <span class="cj-label">编码</span>
        <NSelect v-model:value="encoding" :options="encodingOptions" size="small" class="cj-select" />
        <label class="cj-file-btn">
          📁 上传文件
          <input type="file" accept=".csv,.tsv,.txt" class="hidden" @change="handleFileChange" />
        </label>
      </div>

      <label class="cj-textarea-label">CSV 输入（拖拽文件到输入框）</label>
      <NInput
        v-model:value="csvInput"
        type="textarea"
        :rows="6"
        placeholder="name,age,city&#10;张三,28,北京&#10;李四,32,上海"
        class="cj-textarea mb-4"
        @drop="handleDrop"
        @dragover="handleDragOver"
      />

      <NButton type="primary" size="small" @click="handleCsvToJson" :disabled="!csvInput.trim()" class="mb-4">
        转换
      </NButton>

      <!-- 前3行预览 -->
      <div v-if="hasPreview" class="cj-preview-section">
        <h3 class="cj-section-title">数据预览（前3行）</h3>
        <NTable
          :columns="tableColumns"
          :data="tableData"
          :bordered="false"
          size="small"
          class="cj-table"
        />
      </div>
    </template>

    <!-- JSON → CSV 模式 -->
    <template v-else>
      <label class="cj-textarea-label">JSON 输入</label>
      <NInput
        v-model:value="jsonInput"
        type="textarea"
        :rows="6"
        placeholder='[{"name":"张三","age":"28"},{"name":"李四","age":"32"}]'
        class="cj-textarea mb-4"
      />

      <NButton type="primary" size="small" @click="handleJsonToCsv" :disabled="!jsonInput.trim()" class="mb-4">
        转换
      </NButton>
    </template>

    <!-- 错误提示 -->
    <NAlert v-if="opError" type="error" :bordered="false" class="mb-4">
      {{ opError }}
    </NAlert>

    <!-- 输出区 -->
    <div v-if="output" class="cj-output-section">
      <div class="cj-output-header">
        <span class="cj-output-label">结果</span>
        <CopyButton :content="output" />
      </div>
      <pre class="cj-output">{{ output }}</pre>
    </div>
  </section>
</template>

<style scoped>
.csv-to-json {
}

.cj-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.cj-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500);
}

.cj-select {
  width: 130px;
}

.cj-file-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid var(--color-neutral-300);
  border-radius: 6px;
  font-size: var(--text-xs);
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all var(--duration-fast);
}
.cj-file-btn:hover {
  border-color: var(--color-primary-400);
  color: var(--color-primary-600);
}

.cj-textarea-label {
  display: block;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500);
  margin-bottom: 6px;
}

.cj-textarea {
  --n-font-size: var(--text-sm);
  font-family: var(--font-mono);
}

.cj-preview-section {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 16px;
}

.cj-section-title {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 10px 16px;
  margin: 0;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-100);
}

.cj-table {
  --n-font-size: var(--text-sm);
}

.cj-output-section {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  overflow: hidden;
}

.cj-output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-100);
}

.cj-output-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.cj-output {
  padding: 16px;
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-neutral-800);
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 480px;
  overflow-y: auto;
  user-select: text;
}
</style>
