<script setup lang="ts">
/**
 * ColorPicker — 通用颜色选择器
 * 原生 input[type=color] + 文本输入框联动
 */
import { computed } from 'vue'
import { NInput } from 'naive-ui'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** 校验是否为有效 hex 颜色 */
function isValidHex(value: string): boolean {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value)
}

/** 规范化用户输入的 hex 值 */
function normalizeHex(raw: string): string {
  let val = raw.trim()
  if (!val.startsWith('#')) val = '#' + val
  // 简写 #RGB → #RRGGBB
  if (val.length === 4 && /^#[0-9A-Fa-f]{3}$/.test(val)) {
    val = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3]
  }
  return val.toUpperCase()
}

const displayColor = computed(() =>
  isValidHex(props.modelValue) ? props.modelValue : '#000000'
)

function handleNativeInput(e: Event) {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function handleTextInput(value: string) {
  const normalized = normalizeHex(value)
  if (isValidHex(normalized)) {
    emit('update:modelValue', normalized)
  }
}
</script>

<template>
  <div class="color-picker">
    <div class="color-picker-row">
      <label class="color-picker-swatch">
        <input
          type="color"
          :value="displayColor"
          class="color-picker-native"
          @input="handleNativeInput"
        />
        <span
          class="color-picker-block"
          :style="{ backgroundColor: displayColor }"
        />
      </label>
      <NInput
        :value="modelValue"
        size="small"
        placeholder="#FF5733"
        class="color-picker-input"
        @update:value="handleTextInput"
      />
    </div>
  </div>
</template>

<style scoped>
.color-picker-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-picker-swatch {
  position: relative;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.color-picker-native {
  position: absolute;
  opacity: 0;
  width: 36px;
  height: 36px;
  cursor: pointer;
}

.color-picker-block {
  display: block;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 2px solid var(--color-neutral-300);
  transition: border-color var(--duration-fast);
}

.color-picker-swatch:hover .color-picker-block {
  border-color: var(--color-primary-400);
}

.color-picker-input {
  flex: 1;
  font-family: var(--font-mono);
  --n-height: 36px;
}
</style>
