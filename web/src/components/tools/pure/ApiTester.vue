<script setup lang="ts">
/**
 * ApiTester — HTTP 请求测试器（Bun 后端代理，绕过 CORS）
 * URL 输入框粘贴 curl 命令时自动解析填充所有字段
 */
import { ref } from 'vue'
import { NButton, NInput, NSelect, NSpace } from 'naive-ui'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import CopyButton from '@/components/tools/shared/CopyButton.vue'
import { resolveBunUrl } from '@/lib/runtime'
import type { ClientOnlyToolDefinition } from '@/types/tool'

defineProps<{ tool: ClientOnlyToolDefinition }>()

interface HeaderRow { name: string; value: string }

const method = ref('GET')
const url = ref('')
const headers = ref<HeaderRow[]>([{ name: 'Content-Type', value: 'application/json' }])
const requestBody = ref('')
const response = ref<{
  status?: number; statusText?: string; body?: string
  headers?: Record<string, string>; elapsedMs?: number; bodySize?: number
} | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const curlToast = ref('')

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']

function addHeader() { headers.value.push({ name: '', value: '' }) }
function removeHeader(idx: number) { if (headers.value.length > 1) headers.value.splice(idx, 1) }

function showToast(msg: string) {
  curlToast.value = msg
  setTimeout(() => { curlToast.value = '' }, 3000)
}

/** URL 输入框粘贴事件——检测 curl 命令并自动解析 */
function handleUrlPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text')?.trim() || ''
  if (!text.startsWith('curl ')) return

  e.preventDefault()

  let parsedUrl = ''
  let parsedMethod = ''
  const parsedHeaders: HeaderRow[] = []
  const parsedBodies: string[] = []

  // 去掉 curl 前缀 + 续行符
  let cleaned = text
    .replace(/^curl\s+/i, '')
    .replace(/\\\n/g, ' ')
    .replace(/--data-raw\b/g, '--data')
    .replace(/--data-binary\b/g, '--data')

  // tokenizer
  const tokens: string[] = []
  let i = 0
  while (i < cleaned.length) {
    if (cleaned[i] === ' ' || cleaned[i] === '\t') { i++; continue }
    if (cleaned[i] === "'" || cleaned[i] === '"') {
      const q = cleaned[i]; i++
      let v = ''
      while (i < cleaned.length && cleaned[i] !== q) {
        if (cleaned[i] === '\\') { v += cleaned[i]; i++ }
        v += cleaned[i] || ''; i++
      }
      tokens.push(v); i++
    } else {
      let v = ''
      while (i < cleaned.length && cleaned[i] !== ' ' && cleaned[i] !== '\t') { v += cleaned[i]; i++ }
      tokens.push(v)
    }
  }

  // parse
  for (let j = 0; j < tokens.length; j++) {
    const t = tokens[j]
    if (t === '-X' || t === '--request') parsedMethod = tokens[++j]?.toUpperCase() || ''
    else if (t === '-H' || t === '--header') {
      const h = tokens[++j] || ''; const ci = h.indexOf(':')
      if (ci > 0) parsedHeaders.push({ name: h.slice(0, ci).trim(), value: h.slice(ci + 1).trim() })
    }
    else if (t === '-d' || t === '--data') parsedBodies.push(tokens[++j] || '')
    else if (!t.startsWith('-') && !parsedUrl && (t.startsWith('http://') || t.startsWith('https://'))) {
      parsedUrl = t
    }
  }

  if (!parsedUrl) { curlToast.value = ''; url.value = text; return }

  // 填充表单
  url.value = parsedUrl
  method.value = parsedMethod || (parsedBodies.length > 0 ? 'POST' : 'GET')
  if (parsedHeaders.length > 0) headers.value = parsedHeaders
  if (parsedBodies.length > 0) {
    if (parsedBodies.length === 1) {
      try { const obj = JSON.parse(parsedBodies[0]); requestBody.value = JSON.stringify(obj, null, 2) }
      catch { requestBody.value = parsedBodies[0] }
    } else if (parsedBodies.every(b => b.includes('=') && !b.trimStart().startsWith('{'))) {
      const obj: Record<string, string> = {}
      for (const b of parsedBodies) { const eq = b.indexOf('='); if (eq > 0) obj[b.slice(0, eq)] = b.slice(eq + 1) }
      requestBody.value = JSON.stringify(obj, null, 2)
    } else {
      requestBody.value = parsedBodies.join('&')
    }
  }

  showToast(`已识别 curl → ${parsedMethod || 'GET'} ${parsedUrl.slice(0, 60)}...`)
}

async function handleSend() {
  if (!url.value.trim() || loading.value) return
  loading.value = true; error.value = null; response.value = null

  try {
    const res = await fetch(resolveBunUrl('/api/bun/api-tester/request'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: url.value.trim(),
        method: method.value,
        headers: headers.value.filter(h => h.name.trim()),
        requestBody: requestBody.value || undefined,
      }),
    })

    let json: any
    try {
      json = await res.json()
    } catch {
      if (res.status === 404) {
        error.value = `Vite 代理未生效。请重启前端：pnpm kill:web && pnpm dev:web`
      } else {
        error.value = `${res.status} ${res.statusText} — Bun 服务可能未启动（cd bun-server && bun dev）`
      }
      loading.value = false
      return
    }

    if (json.success) response.value = json.data
    else error.value = json.error || '请求失败'
  } catch (e) {
    if (e instanceof TypeError && e.message.includes('fetch')) {
      error.value = 'Bun 服务未启动。请运行：cd bun-server && bun dev'
    } else {
      error.value = e instanceof Error ? e.message : '请求失败'
    }
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="at-form">
    <ToolHeader :tool="tool" />

    <!-- curl 识别提示 -->
    <div v-if="curlToast" class="at-toast">{{ curlToast }}</div>

    <!-- 请求栏 -->
    <div class="at-request-card">
      <div class="at-request-row">
        <NSelect v-model:value="method" :options="METHODS.map(m => ({ label: m, value: m }))"
          size="small" style="width:110px" />
        <NInput
          v-model:value="url"
          placeholder="https://api.example.com/endpoint  |  直接粘贴 curl 命令自动识别"
          class="at-url-input"
          @paste="handleUrlPaste"
        />
        <NButton type="primary" :loading="loading" @click="handleSend">发送</NButton>
      </div>

      <!-- Headers -->
      <div class="at-section">
        <div class="at-section-header">
          <span class="at-section-label">Headers</span>
          <NButton text size="tiny" @click="addHeader">+ 添加</NButton>
        </div>
        <div v-for="(h, idx) in headers" :key="idx" class="at-header-row">
          <NInput v-model:value="h.name" placeholder="名称" size="tiny" style="width:200px" />
          <NInput v-model:value="h.value" placeholder="值" size="tiny" style="flex:1" />
          <NButton v-if="headers.length > 1" text size="tiny" @click="removeHeader(idx)">✕</NButton>
        </div>
      </div>

      <!-- Body -->
      <div v-if="method !== 'GET' && method !== 'HEAD'" class="at-section">
        <div class="at-section-header">
          <span class="at-section-label">Body</span>
        </div>
        <NInput v-model:value="requestBody" type="textarea" :rows="7"
          placeholder='{"key": "value"}' class="at-code-input" />
      </div>
    </div>

    <!-- 响应 -->
    <div v-if="response" class="at-response-card">
      <div class="at-response-header">
        <NSpace :size="8" align="center">
          <span class="at-status" :class="response.status && response.status < 400 ? 'at-status-ok' : 'at-status-err'">
            {{ response.status }} {{ response.statusText }}
          </span>
          <span class="at-elapsed">{{ response.elapsedMs }}ms</span>
          <span class="at-size">{{ response.bodySize?.toLocaleString() }} B</span>
        </NSpace>
        <CopyButton :content="response.body || ''" />
      </div>
      <NInput v-model:value="response.body" type="textarea" :rows="14" readonly class="at-code-input" />
    </div>

    <p v-if="error" class="at-error">{{ error }}</p>
  </section>
</template>

<style scoped>
.at-form { max-width: var(--max-content-width); }

.at-toast {
  background: var(--color-success-light);
  color: #065f46;
  padding: 8px 14px;
  border-radius: 8px;
  font-size: var(--text-xs);
  margin-bottom: 12px;
  animation: at-toast-in .3s ease;
}
@keyframes at-toast-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

.at-request-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}
.at-request-row { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; }
.at-url-input { flex: 1; }

.at-section { margin-bottom: 14px; }
.at-section:last-child { margin-bottom: 0; }
.at-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.at-section-label {
  font-size: var(--text-xs); font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-500); text-transform: uppercase; letter-spacing: .5px;
}

.at-header-row { display: flex; gap: 6px; align-items: center; margin-bottom: 4px; }
.at-code-input { font-family: var(--font-mono); font-size: 13px; }

.at-response-card {
  background: var(--color-white); border: 1px solid var(--color-neutral-200);
  border-radius: 10px; padding: 20px; box-shadow: var(--shadow-sm);
}
.at-response-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.at-status {
  font-size: var(--text-sm); font-weight: var(--font-weight-semibold);
  padding: 2px 10px; border-radius: 6px;
}
.at-status-ok { background: var(--color-success-light); color: #065f46; }
.at-status-err { background: var(--color-danger-light); color: #991b1b; }
.at-elapsed { font-size: var(--text-xs); color: var(--color-neutral-400); font-family: var(--font-mono); }
.at-size { font-size: var(--text-xs); color: var(--color-neutral-400); }

.at-error { font-size: var(--text-xs); color: var(--color-danger); margin: 6px 0 0; }
</style>
