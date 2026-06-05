<script setup lang="ts">
/**
 * ClientToolPanel — 纯前端工具面板
 * 根据 tool.id 动态加载对应的工具组件。
 */
import { computed } from 'vue'
import type { ClientOnlyToolDefinition, ClientToolId } from '@/types/tool'
import JsonFormatter from './JsonFormatter.vue'
import UrlCodec from './UrlCodec.vue'
import HtmlEntityCodec from './HtmlEntityCodec.vue'
import ColorConverter from './ColorConverter.vue'
import QrcodeGenerator from './QrcodeGenerator.vue'
import CsvToJson from './CsvToJson.vue'
import CronParser from './CronParser.vue'
import ImageCompression from './ImageCompression.vue'
import SvgEditor from './svg-editor/SvgEditor.vue'
import AnimeLab from './AnimeLab.vue'

const props = defineProps<{
  tool: ClientOnlyToolDefinition
}>()

/** 工具 ID → 组件映射 */
const toolComponent = computed(() => {
  const map: Partial<Record<ClientToolId, object>> = {
    'anime-lab': AnimeLab,
    'json-formatter': JsonFormatter,
    'url-codec': UrlCodec,
    'html-entity-codec': HtmlEntityCodec,
    'color-converter': ColorConverter,
    'qrcode-generator': QrcodeGenerator,
    'csv-to-json': CsvToJson,
    'cron-parser': CronParser,
    'image-compression': ImageCompression,
    'svg-editor': SvgEditor,
  }
  return map[props.tool.id as ClientToolId]
})
</script>

<template>
  <section class="client-tool-panel">
    <!-- 已实现的工具 -->
    <component
      v-if="toolComponent"
      :is="toolComponent"
      :tool="tool"
    />

    <!-- 占位提示（未实现的工具） -->
    <div v-else>
      <div class="mb-8">
        <div class="flex items-center gap-3 mb-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-2 bg-primary-50 text-xl ring-1 ring-primary-100">
            {{ tool.icon }}
          </span>
          <div>
            <h1 class="text-2xl font-bold text-neutral-900">{{ tool.name }}</h1>
            <p class="text-sm text-neutral-500 mt-0.5">{{ tool.description }}</p>
          </div>
        </div>
        <div class="divider" />
      </div>
      <div class="placeholder-card">
        <span class="placeholder-icon">🚧</span>
        <p class="placeholder-title">即将上线</p>
        <p class="placeholder-desc">该工具正在开发中，敬请期待</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.client-tool-panel {
  padding: 32px 40px;
  max-width: var(--max-content-width);
}

.divider {
  width: 100%;
  height: 1px;
  background: var(--color-neutral-100);
}

.placeholder-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 24px;
  background: var(--color-white);
  border: 1px solid var(--color-neutral-200);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.placeholder-icon {
  font-size: 48px;
}

.placeholder-title {
  font-size: var(--text-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-neutral-700);
}

.placeholder-desc {
  font-size: var(--text-sm);
  color: var(--color-neutral-400);
}
</style>

<!-- 非 scoped：AnimeLab 需要突破父容器宽度限制 -->
<style>
.client-tool-panel:has(.anime-lab) {
  max-width: none;
}
</style>
