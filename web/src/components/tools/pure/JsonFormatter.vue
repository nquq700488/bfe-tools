<script setup lang="ts">
/**
 * JsonFormatter — JSON 格式化/校验工具
 * 功能：格式化（2空格缩进）、压缩、语法校验、树形视图、复制结果
 */
import { ref, computed, watch, shallowRef } from 'vue'
import { NButton, NAlert, NInput, NSpace } from 'naive-ui'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import CopyButton from '@/components/tools/shared/CopyButton.vue'
import { useClientToolState } from '@/hooks/useClientToolState'
import type { ClientOnlyToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: ClientOnlyToolDefinition
}>()

const { input, output, error, setInput, setError, reset } = useClientToolState()

const indent = ref(2)
const treeExpanded = ref<Set<string>>(new Set())
const treeData = shallowRef<JsonNode | null>(null)

interface JsonNode {
  key: string
  path: string
  value: unknown
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null'
  children?: JsonNode[]
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const MAX_JSON_SIZE = 5 * 1024 * 1024 // 5MB 硬限制
const MAX_JSON_DEPTH = 100
const MAX_TREE_NODES = 5000
const LARGE_JSON_SIZE = 1 * 1024 * 1024 // 1MB 警告

const treeTruncated = ref(false)

const isOverSize = computed(() => input.value.length > MAX_JSON_SIZE)
const isLarge = computed(() => input.value.length > LARGE_JSON_SIZE && input.value.length <= MAX_JSON_SIZE)

/** 检测 JSON 嵌套深度 */
function computeDepth(data: unknown): number {
  if (data === null || typeof data !== 'object') return 0
  let maxChild = 0
  if (Array.isArray(data)) {
    for (const item of data) {
      maxChild = Math.max(maxChild, computeDepth(item))
    }
  } else {
    for (const v of Object.values(data as Record<string, unknown>)) {
      maxChild = Math.max(maxChild, computeDepth(v))
    }
  }
  return 1 + maxChild
}

function debouncedValidate(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (!input.value.trim()) {
      error.value = null
      treeData.value = null
      output.value = ''
      return
    }
    try {
      JSON.parse(input.value)
      error.value = null
    } catch (e) {
      if (e instanceof SyntaxError) {
        const match = e.message.match(/position (\d+)/)
        const pos = match ? Number(match[1]) : 0
        const lines = input.value.slice(0, pos).split('\n')
        error.value = `JSON 语法错误：第 ${lines.length} 行, 第 ${lines[lines.length - 1].length + 1} 列 — ${e.message}`
      } else {
        error.value = '未知解析错误'
      }
      treeData.value = null
    }
  }, 300)
}

watch(() => input.value, debouncedValidate)

function formatJson(): void {
  if (!input.value.trim()) return
  if (input.value.length > MAX_JSON_SIZE) { setError(`输入超过 ${MAX_JSON_SIZE / 1024 / 1024}MB 限制，无法处理`); return }
  try {
    const parsed = JSON.parse(input.value)
    if (computeDepth(parsed) > MAX_JSON_DEPTH) { setError(`JSON 嵌套深度超过 ${MAX_JSON_DEPTH} 层限制`); return }
    const formatted = JSON.stringify(parsed, null, indent.value)
    output.value = formatted
    input.value = formatted
    error.value = null
    treeTruncated.value = false
    const context = { count: 0, truncated: false }
    treeData.value = buildTree(parsed, 'root', '$', context)
    treeTruncated.value = context.truncated
  } catch (e) {
    setError(e instanceof SyntaxError ? `格式化失败：${e.message}` : '格式化失败')
    treeData.value = null
  }
}

function compressJson(): void {
  if (!input.value.trim()) return
  if (input.value.length > MAX_JSON_SIZE) { setError(`输入超过 ${MAX_JSON_SIZE / 1024 / 1024}MB 限制，无法处理`); return }
  try {
    const parsed = JSON.parse(input.value)
    if (computeDepth(parsed) > MAX_JSON_DEPTH) { setError(`JSON 嵌套深度超过 ${MAX_JSON_DEPTH} 层限制`); return }
    output.value = JSON.stringify(parsed)
    input.value = output.value
    error.value = null
    treeTruncated.value = false
    const context = { count: 0, truncated: false }
    treeData.value = buildTree(parsed, 'root', '$', context)
    treeTruncated.value = context.truncated
  } catch (e) {
    setError(e instanceof SyntaxError ? `压缩失败：${e.message}` : '压缩失败')
    treeData.value = null
  }
}

/** 树构建上下文：节点计数 + 截断标记 */
interface TreeContext { count: number; truncated: boolean }

function buildTree(data: unknown, key = 'root', path = '$', ctx: TreeContext = { count: 0, truncated: false }): JsonNode {
  ctx.count++
  if (ctx.count > MAX_TREE_NODES) {
    ctx.truncated = true
    return { key, path, value: '... (已达 5000 节点上限，已截断)', type: 'string' }
  }
  if (data === null) return { key, path, value: null, type: 'null' }
  if (Array.isArray(data)) {
    const children: JsonNode[] = []
    for (let i = 0; i < data.length && ctx.count < MAX_TREE_NODES; i++) {
      children.push(buildTree(data[i], String(i), `${path}[${i}]`, ctx))
    }
    if (children.length < data.length) {
      ctx.truncated = true
      children.push({ key: '...', path: `${path}[...]`, value: `+${data.length - children.length} 项已截断`, type: 'string' })
    }
    return { key, path, value: `Array[${data.length}]`, type: 'array', children }
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>)
    const children: JsonNode[] = []
    for (let i = 0; i < entries.length && ctx.count < MAX_TREE_NODES; i++) {
      children.push(buildTree(entries[i][1], entries[i][0], `${path}.${entries[i][0]}`, ctx))
    }
    if (children.length < entries.length) {
      ctx.truncated = true
      children.push({ key: '...', path: `${path}.<truncated>`, value: `+${entries.length - children.length} 项已截断`, type: 'string' })
    }
    return { key, path, value: `Object{${entries.length}}`, type: 'object', children }
  }
  return { key, path, value: data, type: typeof data as JsonNode['type'] }
}

function handleBuildTree(): void {
  if (input.value.length > MAX_JSON_SIZE) { setError(`输入超过 ${MAX_JSON_SIZE / 1024 / 1024}MB 限制`); return }
  treeTruncated.value = false
  try {
    const parsed = JSON.parse(input.value)
    if (computeDepth(parsed) > MAX_JSON_DEPTH) { setError(`JSON 嵌套深度超过 ${MAX_JSON_DEPTH} 层限制`); return }
    const context = { count: 0, truncated: false }
    treeData.value = buildTree(parsed, 'root', '$', context)
    treeTruncated.value = context.truncated
  } catch {
    treeData.value = null
  }
}

function toggleExpand(path: string): void {
  const next = new Set(treeExpanded.value)
  if (next.has(path)) next.delete(path)
  else next.add(path)
  treeExpanded.value = next
}

function expandAll(paths: string[]): void {
  treeExpanded.value = new Set(paths)
}

function collapseAll(): void {
  treeExpanded.value = new Set()
}

function collectPaths(node: JsonNode, limit = MAX_TREE_NODES): string[] {
  const paths: string[] = []
  if (node.children && paths.length < limit) {
    paths.push(node.path)
    for (const child of node.children) {
      paths.push(...collectPaths(child, limit - paths.length))
      if (paths.length >= limit) break
    }
  }
  return paths
}

function handleExpandAll(): void {
  if (!treeData.value) return
  expandAll(collectPaths(treeData.value))
}

function formatValue(val: unknown): string {
  if (val === null) return 'null'
  if (typeof val === 'string') return `"${val}"`
  return String(val)
}

function valueClass(type: JsonNode['type']): string {
  switch (type) {
    case 'string': return 'json-string'
    case 'number': return 'json-number'
    case 'boolean': return 'json-boolean'
    case 'null': return 'json-null'
    default: return ''
  }
}
</script>

<template>
  <section class="json-formatter">
    <ToolHeader :tool="props.tool" />

    <!-- 超大输入阻断（>5MB 硬限制） -->
    <NAlert v-if="isOverSize" type="error" :bordered="false" class="mb-4">
      JSON 数据过大（>5MB），无法处理。请使用更小的数据集。
    </NAlert>

    <!-- 大文件警告 -->
    <NAlert v-if="isLarge" type="warning" :bordered="false" class="mb-4">
      JSON 数据较大（>1MB），可能导致浏览器响应变慢。建议使用轻量数据。
    </NAlert>

    <!-- 操作按钮 -->
    <NSpace class="mb-4">
      <NButton type="primary" size="small" @click="formatJson" :disabled="!input.trim()">
        ✨ 格式化
      </NButton>
      <NButton size="small" @click="compressJson" :disabled="!input.trim()">
        🗜️ 压缩
      </NButton>
      <NButton size="small" @click="handleBuildTree" :disabled="!input.trim()">
        🌲 树形视图
      </NButton>
      <NButton size="small" @click="reset">清空</NButton>
    </NSpace>

    <!-- 输入区 -->
    <label class="jf-label">输入 JSON</label>
    <NInput
      :value="input"
      type="textarea"
      :rows="12"
      placeholder='{"key": "value"}'
      class="jf-textarea mb-2"
      @update:value="setInput"
    />

    <!-- 错误提示 -->
    <NAlert v-if="error" type="error" :bordered="false" class="mb-4">
      {{ error }}
    </NAlert>

    <!-- 输出区 -->
    <div v-if="output" class="jf-output-section">
      <div class="jf-output-header">
        <span class="jf-output-label">输出</span>
        <CopyButton :content="output" />
      </div>
      <pre class="jf-output">{{ output }}</pre>
    </div>

    <!-- 树形视图 -->
    <div v-if="treeData" class="jf-tree-section">
      <div class="jf-tree-header">
        <span class="jf-tree-label">树形视图</span>
        <NButton text size="tiny" type="primary" @click="handleExpandAll">展开全部</NButton>
        <NButton text size="tiny" @click="collapseAll">折叠全部</NButton>
      </div>
      <NAlert v-if="treeTruncated" type="warning" :bordered="false" class="ma-3">
        节点数已达 5000 上限，树形视图已截断。部分数据未展示。
      </NAlert>
      <div class="jf-tree-content">
        <div
          v-for="node in treeData.children"
          :key="node.path"
          class="jf-tree-root"
        >
          <div
            class="jf-tree-node"
            :style="{ paddingLeft: '0' }"
          >
            <span
              v-if="node.children"
              class="jf-tree-toggle"
              @click="toggleExpand(node.path)"
            >{{ treeExpanded.has(node.path) ? '▾' : '▸' }}</span>
            <span v-else class="jf-tree-toggle-placeholder" />
            <span class="jf-tree-key">{{ node.key }}: </span>
            <span class="jf-tree-badge">{{ node.value }}</span>
          </div>
          <template v-if="node.children && treeExpanded.has(node.path)">
            <div
              v-for="child in node.children"
              :key="child.path"
              class="jf-tree-node"
              :style="{ paddingLeft: '24px' }"
            >
              <span
                v-if="child.children"
                class="jf-tree-toggle"
                @click="toggleExpand(child.path)"
              >{{ treeExpanded.has(child.path) ? '▾' : '▸' }}</span>
              <span v-else class="jf-tree-toggle-placeholder" />
              <span class="jf-tree-key">{{ child.key }}</span>
              <span v-if="!child.children" class="jf-tree-colon">:&nbsp;</span>
              <span
                v-if="!child.children"
                class="jf-tree-value"
                :class="valueClass(child.type)"
              >{{ formatValue(child.value) }}</span>
              <span v-else class="jf-tree-badge">{{ child.value }}</span>
            </div>
            <template v-for="child in node.children" :key="'deep-' + child.path">
              <template v-if="child.children && treeExpanded.has(child.path)">
                <div
                  v-for="grandchild in child.children"
                  :key="grandchild.path"
                  class="jf-tree-node"
                  :style="{ paddingLeft: '48px' }"
                >
                  <span
                    v-if="grandchild.children"
                    class="jf-tree-toggle"
                    @click="toggleExpand(grandchild.path)"
                  >{{ treeExpanded.has(grandchild.path) ? '▾' : '▸' }}</span>
                  <span v-else class="jf-tree-toggle-placeholder" />
                  <span class="jf-tree-key">{{ grandchild.key }}</span>
                  <span v-if="!grandchild.children" class="jf-tree-colon">:&nbsp;</span>
                  <span
                    v-if="!grandchild.children"
                    class="jf-tree-value"
                    :class="valueClass(grandchild.type)"
                  >{{ formatValue(grandchild.value) }}</span>
                  <span v-else class="jf-tree-badge">{{ grandchild.value }}</span>
                </div>
              </template>
            </template>
          </template>
        </div>
      </div>
    </div>

    <!-- 空态 -->
    <div v-if="!input.trim() && !output" class="jf-empty">
      <p class="jf-empty-text">在此粘贴或输入 JSON 数据</p>
    </div>
  </section>
</template>

<style scoped>
.json-formatter {
}

.jf-label {
  display: block;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500);
  margin-bottom: 6px;
}

.jf-textarea {
  --n-font-size: var(--text-sm);
  font-family: var(--font-mono);
}

.jf-output-section {
  margin-bottom: 20px;
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  overflow: hidden;
}

.jf-output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-100);
}

.jf-output-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.jf-output {
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

/* 树形视图 */
.jf-tree-section {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  overflow: hidden;
}

.jf-tree-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-100);
}

.jf-tree-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-600);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-right: auto;
}

.jf-tree-content {
  padding: 8px 16px 16px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.8;
  max-height: 520px;
  overflow-y: auto;
}

.jf-tree-node {
  display: flex;
  align-items: baseline;
  white-space: nowrap;
}

.jf-tree-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  cursor: pointer;
  color: var(--color-neutral-400);
  flex-shrink: 0;
  user-select: none;
  transition: color var(--duration-fast);
}
.jf-tree-toggle:hover { color: var(--color-primary-600); }

.jf-tree-toggle-placeholder {
  width: 18px;
  flex-shrink: 0;
}

.jf-tree-key {
  color: var(--color-primary-700);
  font-weight: var(--font-weight-medium);
}

.jf-tree-colon {
  color: var(--color-neutral-500);
}

.jf-tree-badge {
  color: var(--color-neutral-400);
  font-style: italic;
}

.jf-tree-value {
  overflow: hidden;
  text-overflow: ellipsis;
}

.json-string { color: var(--color-syntax-string); }
.json-number { color: var(--color-syntax-number); }
.json-boolean { color: var(--color-syntax-boolean); }
.json-null { color: var(--color-syntax-null); }

.jf-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  background: var(--color-white);
  border: 1px dashed var(--color-neutral-200);
  border-radius: 8px;
}

.jf-empty-text {
  font-size: var(--text-sm);
  color: var(--color-neutral-400);
}
</style>
