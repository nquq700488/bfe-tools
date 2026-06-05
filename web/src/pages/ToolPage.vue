<script setup lang="ts">
/**
 * ToolPage — 工具详情页（路由外壳）
 * 根据 tool.mode 分流到后端任务面板或纯前端工具面板。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getTool } from '@/tools/registry'
import BackendJobToolPanel from '@/components/tools/backend/BackendJobToolPanel.vue'
import ClientToolPanel from '@/components/tools/pure/ClientToolPanel.vue'

const route = useRoute()
const toolId = computed<string>(() => route.params.toolId as string)
const tool = computed(() => getTool(toolId.value))
</script>

<template>
  <BackendJobToolPanel v-if="tool?.mode === 'backend-job'" :tool="tool" />
  <ClientToolPanel v-else-if="tool?.mode === 'client-only'" :tool="tool" />
  <section v-else class="tool-page py-16 text-center">
    <p class="text-neutral-500">工具不存在</p>
  </section>
</template>

<style scoped>
.tool-page {
  padding: 32px 40px;
}
</style>
