<script setup lang="ts">
/**
 * CronParser — Cron 表达式解析器
 * 功能：校验/描述/预设/未来5次执行时间/字段错误定位
 */
import { ref, computed, watch } from 'vue'
import { NButton, NInput, NAlert, NTag } from 'naive-ui'
import ToolHeader from '@/components/tools/shared/ToolHeader.vue'
import CopyButton from '@/components/tools/shared/CopyButton.vue'
import { validateCron, describeCron, CRON_PRESETS, type CronFieldErrors } from '@/lib/parsers/cron'
import type { ClientOnlyToolDefinition } from '@/types/tool'

const props = defineProps<{
  tool: ClientOnlyToolDefinition
}>()

const cronExpr = ref('0 9 * * 1-5')
const result = ref<ReturnType<typeof validateCron> | null>(null)
const description = ref('')
const nextTimes = ref<string[]>([])

const fieldNames: Record<keyof CronFieldErrors, string> = {
  minute: '分钟',
  hour: '小时',
  dom: '日期',
  month: '月份',
  dow: '星期',
}

const tokens = computed(() => cronExpr.value.trim().split(/\s+/))

function analyze(): void {
  const res = validateCron(cronExpr.value)
  result.value = res

  if (res.valid) {
    description.value = describeCron(cronExpr.value)
    computeNextTimes()
  } else {
    description.value = ''
    nextTimes.value = []
  }
}

/** 计算未来5次执行时间（简化：基于规则推演而非真实调度器） */
function computeNextTimes(): void {
  const parts = cronExpr.value.trim().split(/\s+/)
  if (parts.length !== 5) return

  const [minStr, hourStr, domStr, monthStr, dowStr] = parts as [string, string, string, string, string]

  const now = new Date()
  const times: string[] = []
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0)

  // 最多尝试 366 天找到5次匹配
  let attempts = 0
  while (times.length < 5 && attempts < 366 * 24 * 60) {
    cursor = new Date(cursor.getTime() + 60000) // +1 分钟
    attempts++

    const m = cursor.getMinutes()
    const h = cursor.getHours()
    const d = cursor.getDate()
    const mo = cursor.getMonth() + 1
    const dow = cursor.getDay()

    if (!matchField(minStr, m)) continue
    if (!matchField(hourStr, h)) continue
    if (!matchField(domStr as string, d)) continue
    if (!matchField(monthStr as string, mo)) continue
    if (!matchField(dowStr as string, dow)) continue

    times.push(
      `${cursor.getFullYear()}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    )
  }

  nextTimes.value = times
}

function matchField(field: string, value: number): boolean {
  if (field === '*') return true

  // 步长 */N
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10)
    return value % step === 0
  }

  // 范围 1-5
  if (field.includes('-') && !field.includes(',')) {
    const [start, end] = field.split('-').map(Number)
    return value >= start && value <= end
  }

  // 列表 1,3,5
  if (field.includes(',')) {
    return field.split(',').map(Number).includes(value)
  }

  // 精确值
  return Number(field) === value
}

function applyPreset(expr: string): void {
  cronExpr.value = expr
}

function handleClear(): void {
  cronExpr.value = ''
  result.value = null
  description.value = ''
  nextTimes.value = []
}

// 初始化分析
analyze()
watch(cronExpr, analyze)
</script>

<template>
  <section class="cron-parser">
    <ToolHeader :tool="props.tool" />

    <!-- 预设按钮 -->
    <div class="cp-presets mb-4">
      <span class="cp-presets-label">预设</span>
      <div class="cp-presets-grid">
        <NTag
          v-for="preset in CRON_PRESETS"
          :key="preset.value"
          :type="cronExpr === preset.value ? 'primary' : 'default'"
          class="cp-preset-tag"
          size="small"
          :bordered="false"
          checkable
          :checked="cronExpr === preset.value"
          @click="applyPreset(preset.value)"
        >
          {{ preset.label }}
        </NTag>
      </div>
    </div>

    <!-- 输入 -->
    <div class="cp-input-row mb-4">
      <NInput
        v-model:value="cronExpr"
        placeholder="* * * * *"
        size="large"
        class="cp-input"
        @keyup.enter="analyze"
      />
      <CopyButton :content="cronExpr" />
      <NButton size="small" @click="handleClear">清空</NButton>
    </div>

    <!-- 字段提示 -->
    <p class="cp-fields-hint">
      <span v-for="(t, i) in tokens" :key="i" class="cp-field-token">
        {{ t }}
        <span class="cp-field-name">{{ ['分', '时', '日', '月', '周'][i] || '' }}</span>
      </span>
    </p>

    <!-- 字段错误 -->
    <div v-if="result?.fieldErrors" class="cp-errors mb-4">
      <NAlert
        v-for="(msg, field) in result.fieldErrors"
        :key="field"
        type="warning"
        :bordered="false"
        :title="fieldNames[field]"
        class="mb-2"
      >
        {{ msg }}
      </NAlert>
    </div>

    <!-- 全局错误 -->
    <NAlert v-if="result && !result.valid && !result.fieldErrors" type="error" :bordered="false" class="mb-4">
      {{ result.error }}
    </NAlert>

    <!-- 人类可读描述 -->
    <div v-if="description" class="cp-description-card">
      <span class="cp-description-icon">📝</span>
      <div>
        <p class="cp-description-label">含义</p>
        <p class="cp-description-text">{{ description }}</p>
      </div>
    </div>

    <!-- 未来执行时间 -->
    <div v-if="nextTimes.length > 0" class="cp-times-section">
      <h3 class="cp-times-title">未来 5 次执行时间</h3>
      <div class="cp-times-list">
        <div v-for="(time, i) in nextTimes" :key="i" class="cp-time-item">
          <span class="cp-time-index">{{ i + 1 }}</span>
          <span class="cp-time-value">{{ time }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cron-parser {
}

.cp-presets {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 14px 16px;
  box-shadow: var(--shadow-sm);
}

.cp-presets-label {
  display: block;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.cp-presets-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cp-preset-tag {
  cursor: pointer;
}

.cp-input-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cp-input {
  flex: 1;
  font-family: var(--font-mono);
  font-size: 20px;
  letter-spacing: 4px;
  --n-height: 48px;
}

.cp-fields-hint {
  display: flex;
  gap: 16px;
  margin: 8px 0 16px;
  padding: 0 4px;
}

.cp-field-token {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-700);
}

.cp-field-name {
  font-size: 10px;
  font-weight: var(--font-weight-normal);
  color: var(--color-neutral-400);
}

.cp-errors {
  margin-bottom: 16px;
}

/* 描述卡片 */
.cp-description-card {
  display: flex;
  gap: 14px;
  padding: 20px;
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 20px;
}

.cp-description-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.cp-description-label {
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-400);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 4px;
}

.cp-description-text {
  font-size: var(--text-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0;
  line-height: 1.5;
}

/* 执行时间 */
.cp-times-section {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.cp-times-title {
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

.cp-times-list {
  padding: 8px 0;
}

.cp-time-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  transition: background-color var(--duration-fast);
}

.cp-time-item:hover {
  background-color: var(--color-primary-50);
}

.cp-time-index {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  color: var(--color-neutral-400);
  background: var(--color-neutral-100);
  border-radius: 6px;
  flex-shrink: 0;
}

.cp-time-value {
  font-size: var(--text-sm);
  font-family: var(--font-mono);
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-800);
}

</style>
