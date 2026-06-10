<script setup lang="ts">
/**
 * HtmlToImageForm — HTML/CSS 渲染截图表单
 * 输入代码 + 视口参数 → Playwright 渲染 → PNG
 */
import { ref } from 'vue'
import { NInputNumber, NSelect, NSwitch } from 'naive-ui'
import type { BackendJobToolDefinition } from '@/types/tool'

defineProps<{
  tool: BackendJobToolDefinition
  isBusy: boolean
}>()

const emit = defineEmits<{
  submit: [payload: {
    html: string
    css: string
    width: number
    fullPage: boolean
    format: string
  }]
}>()

const html = ref('')
const css = ref('')
const width = ref(1200)
const fullPage = ref(true)
const format = ref('png')
const htmlError = ref<string | null>(null)

const MAX_HTML = 2 * 1024 * 1024

const TEMPLATES = [
  {
    label: '卡片',
    html: `<div class="card">
  <h2>Hello World</h2>
  <p>这是一张卡片示例，说明文字与标题配合呈现</p>
  <button>点击我</button>
</div>`,
    css: `.card {
  max-width: 360px; margin: 48px auto; padding: 32px;
  background: #fff; border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,.08);
  font-family: system-ui, sans-serif; text-align: center;
}
h2 { margin: 0 0 8px; font-size: 24px; color: #1a1a2e; }
p { margin: 0 0 20px; color: #6b7280; line-height: 1.6; }
button { padding: 10px 28px; background: #4f46e5; color: #fff;
  border: none; border-radius: 8px; cursor: pointer; font-size: 14px;
  font-weight: 500; }`,
  },
  {
    label: '渐变页',
    html: `<div class="hero">
  <h1>Build Something Great</h1>
  <p>Modern tools for modern developers.</p>
</div>`,
    css: `.hero {
  min-height: 400px; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: system-ui, sans-serif; color: #fff; text-align: center;
  padding: 48px;
}
h1 { font-size: clamp(28px, 5vw, 56px); margin: 0 0 16px; font-weight: 800; }
p { font-size: clamp(14px, 2vw, 20px); margin: 0; opacity: .92; }`,
  },
]

function loadTemplate({ html: h, css: c }: { html: string; css: string }) {
  html.value = h
  css.value = c
}

function handleSubmit() {
  htmlError.value = null
  if (!html.value.trim()) { htmlError.value = '请输入 HTML 代码'; return }
  if (new Blob([html.value]).size > MAX_HTML) {
    htmlError.value = `HTML 内容过大（${(new Blob([html.value]).size / 1024).toFixed(0)}KB），最大 2MB`
    return
  }
  emit('submit', {
    html: html.value,
    css: css.value,
    width: width.value,
    fullPage: fullPage.value,
    format: format.value,
  })
}
</script>

<template>
  <div class="hti-form">
    <!-- 代码编辑卡片 -->
    <div class="hti-card">
      <div class="hti-card-header">
        <p class="hti-card-title">HTML / CSS 代码</p>
        <div class="hti-template-row">
          <button
            v-for="tpl in TEMPLATES"
            :key="tpl.label"
            class="hti-template-btn"
            @click="loadTemplate(tpl)"
          >
            {{ tpl.label }}
          </button>
          <button class="hti-template-btn hti-tpl-clear" @click="html = ''; css = ''">清空</button>
        </div>
      </div>

      <div class="hti-code-grid">
        <div class="hti-code-col">
          <span class="hti-code-label">HTML</span>
          <textarea
            v-model="html"
            class="hti-code-input"
            :disabled="isBusy"
            placeholder="<div class=&quot;container&quot;>&#10;  <h1>Hello World</h1>&#10;</div>"
            rows="12"
            spellcheck="false"
          />
        </div>
        <div class="hti-code-col">
          <span class="hti-code-label">CSS（可选）</span>
          <textarea
            v-model="css"
            class="hti-code-input"
            :disabled="isBusy"
            placeholder=".container { max-width: 600px; margin: 0 auto; font-family: system-ui, sans-serif; }"
            rows="12"
            spellcheck="false"
          />
        </div>
      </div>

      <p v-if="htmlError" class="hti-error">{{ htmlError }}</p>
    </div>

    <!-- 选项卡片 -->
    <div class="hti-card">
      <p class="hti-card-title">输出选项</p>
      <div class="hti-options-row">
        <div class="hti-option">
          <span class="hti-option-label">视口宽度</span>
          <NInputNumber v-model:value="width" :min="320" :max="7680" :step="10"
            :disabled="isBusy" size="small" class="hti-option-input" />
          <span class="hti-option-unit">px</span>
        </div>
        <div class="hti-option">
          <span class="hti-option-label">全页截图</span>
          <NSwitch v-model:value="fullPage" :disabled="isBusy" />
        </div>
        <div class="hti-option">
          <span class="hti-option-label">格式</span>
          <NSelect v-model:value="format"
            :options="[{ label: 'PNG', value: 'png' }, { label: 'JPEG', value: 'jpeg' }]"
            :disabled="isBusy" size="small" class="hti-format-select" />
        </div>
      </div>
    </div>

    <!-- 提交 -->
    <button class="hti-submit-btn" :disabled="!html.trim() || isBusy" @click="handleSubmit">
      <span v-if="!isBusy">🖼️ 生成截图</span>
      <span v-else>渲染中…</span>
    </button>
  </div>
</template>

<style scoped>
.hti-form { max-width: var(--max-content-width); }

.hti-card {
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
  margin-bottom: 16px;
}
.hti-card-title {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-800);
  margin: 0;
}
.hti-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}

/* 模板按钮 */
.hti-template-row { display: flex; gap: 4px; flex-wrap: wrap; }
.hti-template-btn {
  padding: 4px 10px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 6px;
  background: var(--color-white);
  font-size: var(--text-xs);
  color: var(--color-neutral-600);
  cursor: pointer;
  transition: all var(--duration-fast);
}
.hti-template-btn:hover { border-color: var(--color-primary-400); background: var(--color-primary-50); }
.hti-tpl-clear { color: var(--color-neutral-400); }
.hti-tpl-clear:hover { color: var(--color-danger); border-color: var(--color-danger); background: var(--color-danger-light); }

/* 代码网格 */
.hti-code-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 720px) { .hti-code-grid { grid-template-columns: 1fr; } }

.hti-code-col { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.hti-code-label {
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-400);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.hti-code-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  background: var(--color-neutral-50);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.5;
  color: var(--color-neutral-800);
  resize: vertical;
  outline: none;
  tab-size: 2;
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
}
.hti-code-input:focus {
  border-color: var(--color-primary-400);
  box-shadow: 0 0 0 3px var(--color-primary-50);
  background: var(--color-white);
}
.hti-code-input:disabled { opacity: .5; }
.hti-code-input::placeholder { color: var(--color-neutral-300); }

/* 选项行 */
.hti-options-row { display: flex; gap: 32px; flex-wrap: wrap; align-items: center; }
.hti-option {
  display: flex;
  align-items: center;
  gap: 10px;
}
.hti-option-label { font-size: var(--text-sm); color: var(--color-neutral-600); }
.hti-option-input { width: 100px; }
.hti-option-unit { font-size: var(--text-xs); color: var(--color-neutral-400); }
.hti-format-select { width: 100px; }

.hti-error { font-size: var(--text-xs); color: var(--color-danger); margin: 12px 0 0; }

.hti-submit-btn {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500));
  color: #fff;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-in-out);
}
.hti-submit-btn:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); }
.hti-submit-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
.hti-submit-btn:active:not(:disabled) { transform: translateY(0); }
</style>
