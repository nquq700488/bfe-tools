<script setup lang="ts">
/**
 * ProgressBar — 进度条组件
 * 支持确定进度和不确定（indeterminate）两种模式
 */
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 当前进度百分比 0-100，不传则为不确定模式 */
    percent?: number
    /** 进度条高度（px） */
    height?: number
    /** 状态色（覆盖默认语义色） */
    status?: 'primary' | 'success' | 'warning' | 'danger'
    /** 是否显示百分比文字 */
    showLabel?: boolean
    /** 是否带条纹动画 */
    striped?: boolean
  }>(),
  {
    percent: undefined,
    height: 8,
    status: 'primary',
    showLabel: false,
    striped: false,
  }
)

/** 是否不确定模式（未传 percent 或 percent < 0） */
const isIndeterminate = computed<boolean>(() => {
  return props.percent === undefined || props.percent < 0
})

/** 安全裁剪后的进度值 */
const clampedPercent = computed<number>(() => {
  if (props.percent === undefined) return 0
  return Math.max(0, Math.min(100, props.percent))
})

/** 状态对应的背景色类 */
const barColorClass = computed<string>(() => {
  const map: Record<string, string> = {
    primary: 'bg-primary-600',
    success: 'bg-success',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }
  return map[props.status] || map.primary
})
</script>

<template>
  <div class="progress-bar-wrapper">
    <!-- 百分比标签 -->
    <div v-if="showLabel && !isIndeterminate" class="flex justify-between mb-1">
      <span class="text-xs text-neutral-500">进度</span>
      <span class="text-xs font-medium text-neutral-700">{{ Math.round(clampedPercent) }}%</span>
    </div>

    <!-- 进度条本体 -->
    <div
      class="progress-bar-track"
      :style="{ height: `${height}px` }"
      role="progressbar"
      :aria-valuenow="isIndeterminate ? undefined : clampedPercent"
      :aria-valuemin="0"
      :aria-valuemax="100"
      :aria-label="isIndeterminate ? '处理中...' : `进度 ${Math.round(clampedPercent)}%`"
    >
      <div
        v-if="!isIndeterminate"
        class="progress-bar-fill"
        :class="[barColorClass, { striped: striped }]"
        :style="{ width: `${clampedPercent}%` }"
      />
      <div
        v-else
        class="progress-bar-indeterminate"
        :class="barColorClass"
      />
    </div>
  </div>
</template>

<style scoped>
.progress-bar-wrapper {
  width: 100%;
}

.progress-bar-track {
  width: 100%;
  background-color: var(--color-neutral-200);
  border-radius: var(--radius-full);
  overflow: hidden;
  position: relative;
}

.progress-bar-fill {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--duration-normal) var(--ease-in-out);
}

.progress-bar-fill.striped {
  background-image: linear-gradient(
    45deg,
    rgb(255 255 255 / 0.15) 25%,
    transparent 25%,
    transparent 50%,
    rgb(255 255 255 / 0.15) 50%,
    rgb(255 255 255 / 0.15) 75%,
    transparent 75%,
    transparent
  );
  background-size: 1rem 1rem;
  animation: progress-stripe 1s linear infinite;
}

.progress-bar-indeterminate {
  height: 100%;
  width: 40%;
  border-radius: var(--radius-full);
  animation: progress-slide 1.5s var(--ease-in-out) infinite;
}

@keyframes progress-stripe {
  0% {
    background-position: 1rem 0;
  }
  100% {
    background-position: 0 0;
  }
}

@keyframes progress-slide {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(350%);
  }
}
</style>
