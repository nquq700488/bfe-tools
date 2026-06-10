<script setup lang="ts">
/**
 * WsTester — WebSocket 测试器（Bun 后端代理）
 */
import { nextTick, ref } from 'vue'
import { NButton, NInput } from 'naive-ui'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import { BUN_API_BASE } from '@/lib/runtime'
import type { ClientOnlyToolDefinition } from '@/types/tool'

defineProps<{ tool: ClientOnlyToolDefinition }>()

interface LogEntry {
  type: 'info' | 'in' | 'out' | 'error' | 'system'
  text: string
  timestamp: number
}

const wsUrl = ref('wss://echo.websocket.org')
const messageInput = ref('')
const connected = ref(false)
const logs = ref<LogEntry[]>([])
const logContainer = ref<HTMLElement | null>(null)

let ws: WebSocket | null = null

function addLog(type: LogEntry['type'], text: string) {
  logs.value.push({ type, text, timestamp: Date.now() })
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

function clearLogs() {
  logs.value = []
  addLog('system', '日志已清空')
}

function connect() {
  if (!wsUrl.value.trim()) return

  // Close existing
  if (ws) { ws.close(); ws = null }

  const bunWsUrl = `${BUN_API_BASE.replace('http', 'ws')}/api/bun/ws-tester/proxy`
  ws = new WebSocket(bunWsUrl)

  ws.addEventListener('open', () => {
    addLog('system', `已连接到代理服务`)
    // Tell proxy to connect to target
    ws!.send(JSON.stringify({ type: 'connect', url: wsUrl.value.trim() }))
  })

  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data)
      switch (data.type) {
        case 'connected':
          addLog('system', data.message)
          break
        case 'proxy-connected':
          addLog('system', data.message)
          connected.value = true
          break
        case 'message':
          addLog(data.direction === 'in' ? 'in' : 'out', data.data)
          break
        case 'closed':
          addLog('system', data.message || '连接已关闭')
          connected.value = false
          break
        case 'error':
          addLog('error', data.message)
          break
        default:
          addLog('info', event.data)
      }
    } catch {
      addLog('info', event.data)
    }
  })

  ws.addEventListener('error', () => {
    addLog('error', 'WebSocket 连接错误')
  })

  ws.addEventListener('close', () => {
    connected.value = false
    addLog('system', '连接已断开')
  })
}

function disconnect() {
  if (ws) {
    ws.send(JSON.stringify({ type: 'disconnect' }))
    ws.close()
    ws = null
  }
  connected.value = false
}

function sendMessage() {
  if (!ws || !messageInput.value.trim() || !connected.value) return
  ws.send(JSON.stringify({ type: 'send', data: messageInput.value }))
  messageInput.value = ''
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false })
}
</script>

<template>
  <section class="wst-form">
    <ToolHeader :tool="tool" />

    <!-- 连接栏 -->
    <div class="wst-conn-card">
      <div class="wst-conn-row">
        <NInput v-model:value="wsUrl" placeholder="wss://echo.websocket.org" class="wst-url-input"
          :disabled="connected" />
        <NButton v-if="!connected" type="primary" @click="connect">连接</NButton>
        <NButton v-else type="error" @click="disconnect">断开</NButton>
      </div>
    </div>

    <!-- 消息日志 -->
    <div class="wst-log-card">
      <div class="wst-log-header">
        <span class="wst-log-title">消息日志</span>
        <NButton text size="tiny" @click="clearLogs">清空</NButton>
      </div>
      <div ref="logContainer" class="wst-log-body">
        <div v-if="logs.length === 0" class="wst-log-empty">等待连接...</div>
        <div v-for="(log, idx) in logs" :key="idx" class="wst-log-entry" :class="`wst-log-${log.type}`">
          <span class="wst-log-ts">{{ formatTime(log.timestamp) }}</span>
          <span class="wst-log-dir">
            <template v-if="log.type === 'in'">◀</template>
            <template v-else-if="log.type === 'out'">▶</template>
            <template v-else-if="log.type === 'error'">⚠</template>
            <template v-else>·</template>
          </span>
          <span class="wst-log-text">{{ log.text }}</span>
        </div>
      </div>
    </div>

    <!-- 发送栏 -->
    <div class="wst-send-card" v-if="connected">
      <div class="wst-send-row">
        <NInput v-model:value="messageInput" placeholder="输入消息..." class="wst-send-input"
          @keyup.enter="sendMessage" />
        <NButton @click="sendMessage" :disabled="!messageInput.trim()">发送</NButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.wst-form { max-width: var(--max-content-width); }

.wst-conn-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 16px 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}
.wst-conn-row { display: flex; gap: 10px; align-items: center; }
.wst-url-input { flex: 1; }

.wst-log-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
  overflow: hidden;
}
.wst-log-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--color-neutral-50);
  border-bottom: 1px solid var(--color-neutral-100);
}
.wst-log-title {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: .5px;
}
.wst-log-body {
  padding: 12px 16px;
  max-height: 360px;
  overflow-y: auto;
  min-height: 120px;
}
.wst-log-empty {
  text-align: center;
  color: var(--color-neutral-300);
  font-size: var(--text-sm);
  padding: 40px 0;
}
.wst-log-entry {
  display: flex;
  gap: 8px;
  align-items: baseline;
  padding: 3px 0;
}
.wst-log-ts {
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--color-neutral-400);
  flex-shrink: 0;
  width: 72px;
}
.wst-log-dir {
  font-size: 11px;
  flex-shrink: 0;
  width: 16px;
  text-align: center;
}
.wst-log-in .wst-log-dir { color: var(--color-success); }
.wst-log-out .wst-log-dir { color: var(--color-primary-500); }
.wst-log-out .wst-log-text { color: var(--color-neutral-500); }
.wst-log-error .wst-log-dir { color: var(--color-danger); }
.wst-log-error .wst-log-text { color: var(--color-danger); }
.wst-log-system .wst-log-dir { color: var(--color-neutral-400); }
.wst-log-system .wst-log-text { color: var(--color-neutral-400); font-style: italic; }
.wst-log-text {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-neutral-700);
  word-break: break-all;
  white-space: pre-wrap;
}

.wst-send-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 14px 20px;
  box-shadow: var(--shadow-sm);
}
.wst-send-row { display: flex; gap: 10px; align-items: center; }
.wst-send-input { flex: 1; }
</style>
