<script setup lang="ts">
/**
 * CopyButton — 一键复制按钮
 * 点击复制到剪贴板，成功后显示"已复制"反馈 2s
 */
import { ref } from 'vue'

const props = defineProps<{
  content: string
}>()

const copied = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

async function handleCopy(): Promise<void> {
  try {
    await navigator.clipboard.writeText(props.content)
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea')
    textarea.value = props.content
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }

  copied.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    copied.value = false
    timer = null
  }, 2000)
}
</script>

<template>
  <button class="copy-btn" :class="{ copied }" @click="handleCopy">
    {{ copied ? '已复制 ✓' : '复制' }}
  </button>
</template>

<style scoped>
.copy-btn {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-neutral-200);
  background: var(--color-white);
  color: var(--color-primary-600);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-in-out);
}
.copy-btn:hover {
  border-color: var(--color-primary-400);
  background: var(--color-primary-50);
}
.copy-btn.copied {
  border-color: var(--color-success);
  color: var(--color-success);
  background: var(--color-success-light);
}
</style>
