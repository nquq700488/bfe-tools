<script setup lang="ts">
/**
 * ToolPage — 工具详情页（路由外壳）
 * 根据 tool.mode 分流到后端任务面板或纯前端工具面板。
 * 工具详情（含 voices/formats）从 GET /tools/{id} 获取。
 */
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchToolDetail } from '@/tools/registry'
import BackendJobToolPanel from '@/components/tools/backend/BackendJobToolPanel.vue'
import ClientToolPanel from '@/components/tools/pure/ClientToolPanel.vue'
import type { ToolDefinition } from '@/types/tool'

const route = useRoute()
const tool = ref<ToolDefinition | null>(null)
const detailLoading = ref(false)

watch(
  () => route.params.toolId as string,
  async (toolId) => {
    if (!toolId) return
    detailLoading.value = true
    try {
      tool.value = await fetchToolDetail(toolId)
    } catch {
      tool.value = null
    } finally {
      detailLoading.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <BackendJobToolPanel v-if="tool?.mode === 'backend-job'" :tool="tool" />
  <ClientToolPanel v-else-if="tool?.mode === 'client-only'" :tool="tool" />
  <section v-else class="tool-page py-16 text-center">
    <div v-if="detailLoading" class="spinner text-primary-600 text-2xl mx-auto mb-3" />
    <p v-else class="text-neutral-500">工具不存在</p>
  </section>
</template>

<style scoped>
.tool-page {
  padding: 32px 40px;
}
</style>
