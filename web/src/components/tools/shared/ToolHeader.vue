<script setup lang="ts">
/**
 * ToolHeader — 工具页通用标题区
 * 渲染工具图标 badge、名称 h1、描述 p、实现说明（含文档链接），与现有 ToolPage 样式一致
 */
import { computed } from 'vue'
import { NDivider } from 'naive-ui'
import type { BaseToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: BaseToolDefinition
}>()

/** 将 markdown 链接 [text](url) 渲染为安全的 HTML <a> 标签 */
function renderLinks(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="th-link">$1</a>')
}

const implHtml = computed(() => renderLinks(props.tool.implementation))
</script>

<template>
  <div class="mb-8">
    <div class="flex items-center gap-3 mb-3">
      <span class="flex h-10 w-10 items-center justify-center rounded-2 bg-primary-50 text-xl ring-1 ring-primary-100">
        {{ tool.icon }}
      </span>
      <div>
        <h1 class="text-2xl font-bold text-neutral-900">{{ tool.name }}</h1>
        <p class="text-sm text-neutral-500 mt-0.5">{{ tool.description }}</p>
        <p class="text-sm text-neutral-500 mt-1" v-html="implHtml" />
      </div>
    </div>
    <NDivider />
  </div>
</template>

<style scoped>
.th-link {
  color: var(--color-primary-600);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.th-link:hover {
  color: var(--color-primary-700);
}
</style>

<style>
/* v-html 生成的内容不受 scoped 样式影响，需全局样式 */
.tool-header a.th-link,
.th-link {
  color: var(--color-primary-600);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.th-link:hover {
  color: var(--color-primary-700);
}
</style>
