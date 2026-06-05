<script setup lang="ts">
/**
 * TaskStatus — 任务状态展示组件
 */
import { computed } from 'vue'
import type { TaskStatus as TaskStatusType } from '@/types/tool'

const props = defineProps<{
  /** 任务当前状态 */
  status: TaskStatusType['status']
  /** 进度 0-100 */
  progress?: number
  /** 错误消息 */
  errorMessage?: string
  /** 结果描述 */
  resultSummary?: string
}>()

/** 状态配置 */
const statusConfig = computed<{
  label: string
  textClass: string
  bgClass: string
  barClass: string
  icon: string
}>(() => {
  const configs: Record<string, { label: string; textClass: string; bgClass: string; barClass: string; icon: string }> = {
    uploading: {
      label: '上传中',
      textClass: 'text-primary-600',
      bgClass: 'bg-white border-primary-100',
      barClass: 'bg-primary-500',
      icon: '↑',
    },
    pending: {
      label: '等待处理',
      textClass: 'text-neutral-500',
      bgClass: 'bg-white border-neutral-200',
      barClass: 'bg-neutral-300',
      icon: '○',
    },
    running: {
      label: '处理中',
      textClass: 'text-primary-600',
      bgClass: 'bg-white border-primary-100',
      barClass: 'bg-primary-500',
      icon: '◉',
    },
    succeeded: {
      label: '处理完成',
      textClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50/60 border-emerald-200',
      barClass: 'bg-emerald-500',
      icon: '✓',
    },
    failed: {
      label: '处理失败',
      textClass: 'text-red-600',
      bgClass: 'bg-red-50/60 border-red-200',
      barClass: 'bg-red-500',
      icon: '✗',
    },
    canceled: {
      label: '已取消',
      textClass: 'text-neutral-500',
      bgClass: 'bg-white border-neutral-200',
      barClass: 'bg-neutral-300',
      icon: '⊘',
    },
  }
  return configs[props.status] || configs.pending
})
</script>

<template>
  <div class="task-status rounded-2 border p-4" :class="statusConfig.bgClass">
    <div class="flex items-center gap-3">
      <!-- 状态图标 -->
      <span class="icon-ring" :class="statusConfig.textClass">
        {{ statusConfig.icon }}
      </span>

      <!-- 状态文字 -->
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold" :class="statusConfig.textClass">
          {{ statusConfig.label }}
        </p>
        <p
          v-if="(status === 'uploading' || status === 'running') && progress !== undefined"
          class="text-xs text-neutral-500 mt-0.5"
        >
          进度 {{ Math.round(progress) }}%
        </p>
        <p
          v-if="status === 'failed' && errorMessage"
          class="text-xs text-red-600 mt-0.5 break-words"
        >
          {{ errorMessage }}
        </p>
        <p
          v-if="status === 'succeeded' && resultSummary"
          class="text-xs text-emerald-600 mt-0.5"
        >
          {{ resultSummary }}
        </p>
      </div>

      <!-- 进度环 -->
      <svg
        v-if="status === 'uploading' || status === 'running'"
        class="flex-shrink-0 w-6 h-6"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" class="text-neutral-150" />
        <circle
          cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"
          stroke-dasharray="62.83"
          :stroke-dashoffset="62.83 - (62.83 * (progress || 0)) / 100"
          stroke-linecap="round"
          class="text-primary-500 transition-all duration-500"
        />
      </svg>
    </div>

    <!-- 进度条 -->
    <div v-if="status === 'uploading' || status === 'running'" class="mt-3">
      <div class="h-2 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
        <div
          class="h-full rounded-full transition-all duration-500"
          :class="statusConfig.barClass"
          :style="{ width: `${progress || 0}%` }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
  background-color: currentColor;
  color: #fff;
  opacity: 0.12;
}

.icon-ring span {
  color: currentColor;
}
</style>
