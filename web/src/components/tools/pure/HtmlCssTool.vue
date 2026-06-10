<script setup lang="ts">
/**
 * HtmlCssTool — HTML/CSS 压缩格式化（Bun 后端）
 */
import { computed, ref } from 'vue'
import { NButton, NInput, NSelect, NSpace } from 'naive-ui'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import CopyButton from '@/components/tools/shared/CopyButton.vue'
import { resolveBunUrl } from '@/lib/runtime'
import type { ClientOnlyToolDefinition } from '@/types/tool'

defineProps<{ tool: ClientOnlyToolDefinition }>()

type Lang = 'html' | 'css'
type Action = 'compress' | 'format'

const lang = ref<Lang>('html')
const action = ref<Action>('compress')
const input = ref('')
const output = ref('')
const stats = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const LANG_OPTIONS = [
  { label: 'HTML', value: 'html' },
  { label: 'CSS', value: 'css' },
]

const ACTIONS: { label: string; value: Action }[] = [
  { label: '压缩', value: 'compress' },
  { label: '格式化', value: 'format' },
]

const SAMPLES: Record<Lang, string> = {
  html: `<!-- 示例 HTML -->
<div class="container">
  <h1>Hello World</h1>
  <p>这是一段示例文本，用来演示 HTML 压缩和格式化效果。</p>
  <ul>
    <li>项目一</li>
    <li>项目二</li>
  </ul>
</div>`,
  css: `/* 示例 CSS */
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
h1 {
  font-size: 24px;
  color: #1a1a2e;
}
p {
  line-height: 1.6;
  color: #6b7280;
}`,
}

function loadSample() { input.value = SAMPLES[lang.value] }

const inputSize = computed(() => new TextEncoder().encode(input.value).length)

async function handleSubmit() {
  if (!input.value.trim() || loading.value) return
  loading.value = true
  error.value = null
  stats.value = null

  try {
    const endpoint = resolveBunUrl(
      action.value === 'compress'
        ? `/api/bun/html-css/compress-${lang.value}`
        : `/api/bun/html-css/format-${lang.value}`,
    )

    const bodyKey = lang.value
    const payload: Record<string, unknown> = { [bodyKey]: input.value }
    if (action.value === 'compress') {
      payload.originalSize = inputSize.value
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    let json: Record<string, unknown>
    try { json = await res.json() } catch {
      error.value = 'Bun 服务未启动（端口 3999）。请运行：cd bun-server && bun dev'; loading.value = false; return
    }

    if (json.success) {
      output.value = json.data.result
      if (json.data.saved) {
        const kb = json.data.saved / 1024
        stats.value = `减少 ${kb > 1 ? kb.toFixed(1) + ' KB' : json.data.saved + ' B'}（${json.data.savedPercent}%）`
      } else {
        stats.value = null
      }
    } else {
      error.value = json.error || '请求失败'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : '请求失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="hct-form">
    <ToolHeader :tool="tool" />

    <!-- 选项行 -->
    <div class="hct-toolbar">
      <div class="hct-toolbar-group">
        <span class="hct-toolbar-label">语言</span>
        <NSelect v-model:value="lang" :options="LANG_OPTIONS" size="small" style="width:100px" />
      </div>
      <div class="hct-toolbar-group">
        <span class="hct-toolbar-label">操作</span>
        <NSelect v-model:value="action" :options="ACTIONS" size="small" style="width:120px" />
      </div>
      <NButton size="small" @click="loadSample">示例</NButton>
      <div class="hct-toolbar-spacer" />
      <NButton type="primary" :loading="loading" @click="handleSubmit">
        {{ action === 'compress' ? '压缩' : '格式化' }}
      </NButton>
    </div>

    <!-- 输入 -->
    <div class="hct-editor-col">
      <div class="hct-editor-header">
        <span class="hct-editor-label">输入</span>
        <span class="hct-editor-size">{{ inputSize.toLocaleString() }} B</span>
      </div>
      <NInput
        v-model:value="input"
        type="textarea"
        :rows="14"
        :placeholder="`输入 ${lang.toUpperCase()} 代码...`"
        class="hct-code-input"
      />
    </div>

    <!-- 输出 -->
    <div class="hct-editor-col">
      <div class="hct-editor-header">
        <span class="hct-editor-label">
          输出
          <span v-if="stats" class="hct-stats">{{ stats }}</span>
        </span>
        <NSpace :size="4">
          <CopyButton :content="output" />
        </NSpace>
      </div>
      <NInput
        v-model:value="output"
        type="textarea"
        :rows="14"
        placeholder="等待处理..."
        readonly
        class="hct-code-input"
      />
      <p v-if="error" class="hct-error">{{ error }}</p>
    </div>
  </section>
</template>

<style scoped>
.hct-form { max-width: var(--max-content-width); }

.hct-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}
.hct-toolbar-group {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hct-toolbar-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-500);
  white-space: nowrap;
}
.hct-toolbar-spacer { flex: 1; }

.hct-editor-col { margin-bottom: 16px; }
.hct-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.hct-editor-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: .5px;
}
.hct-editor-size { font-size: 11px; color: var(--color-neutral-400); font-family: var(--font-mono); }
.hct-stats {
  margin-left: 8px;
  font-size: 11px;
  color: var(--color-success);
  font-weight: var(--font-weight-medium);
}
.hct-code-input {
  font-family: var(--font-mono);
  font-size: 13px;
}
.hct-error { font-size: var(--text-xs); color: var(--color-danger); margin: 6px 0 0; }
</style>
