/**
 * Tool Registry — 工具注册中心
 *
 * 从后端 SQLite 数据库获取工具和分类数据，提供响应式访问。
 * 首次调用 initToolRegistry() 后，数据缓存于 ref 中，不再重复请求。
 */
import { ref, type Ref } from 'vue'
import type { ToolCategory, ToolDefinition } from '@/types/tool'
import { fetchTools, fetchCategories, fetchToolDetail, type CategoryInfo } from './api'

export { fetchToolDetail }

/** 响应式工具列表（从后端获取） */
export const tools: Ref<ToolDefinition[]> = ref([])

/** 响应式分类列表（从后端获取） */
export const categories: Ref<CategoryInfo[]> = ref([])

/** 是否正在加载 */
export const loading = ref(false)

/** 加载错误信息 */
export const error = ref<string | null>(null)

let initialized = false

/**
 * 初始化工具注册中心：从后端拉取工具和分类数据。
 * 幂等：多次调用仅首次生效。
 */
export async function initToolRegistry(): Promise<void> {
  if (initialized) return
  loading.value = true
  error.value = null
  try {
    const [toolList, categoryList] = await Promise.all([
      fetchTools(),
      fetchCategories(),
    ])
    tools.value = toolList
    categories.value = categoryList
    initialized = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : '获取工具数据失败'
  } finally {
    loading.value = false
  }
}

/**
 * 按 ID 查找工具
 * @param toolId 工具 ID
 */
export function getTool(toolId: string): ToolDefinition | undefined {
  return tools.value.find((t) => t.id === toolId)
}

/**
 * 按分类筛选工具
 * @param category 工具分类
 */
export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return tools.value.filter((t) => t.category === category)
}

/**
 * 获取所有工具列表
 */
export function getAllTools(): ToolDefinition[] {
  return [...tools.value]
}
