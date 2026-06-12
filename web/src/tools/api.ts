/**
 * 工具/分类 API — 从后端 SQLite 获取数据并映射为前端类型
 *
 * 架构：
 * - GET /tools          → 工具列表（基础信息，无声音/格式）
 * - GET /tools/{id}     → 工具详情（含 voices[] + formats[]）
 */
import { apiClient } from '@/lib/api'
import type {
  BackendJobToolDefinition,
  ClientOnlyToolDefinition,
  ToolCategory,
  ToolDefinition,
  ToolMode,
} from '@/types/tool'

/** 后端返回的基础工具字段（列表用） */
interface BackendToolRaw {
  id: string
  name: string
  description: string
  icon: string
  route: string
  category_id: string
  category_name: string
  implementation: string
  mode: string
  input_type: string
  accept: string
  max_size: number
  options: string
  sort_order: number
  created_at: string
  updated_at: string
}

/** 后端返回的工具详情（列表字段 + voices/formats） */
interface BackendToolDetail extends BackendToolRaw {
  voices?: BackendVoiceRaw[]
  formats?: BackendFormatRaw[]
}

/** 后端返回的 TTS 声音 */
interface BackendVoiceRaw {
  id: string
  name: string
  gender: string
  language: string
  sort_order: number
}

/** 后端返回的转换格式 */
interface BackendFormatRaw {
  value: string
  label: string
  category: string
  sort_order: number
}

/** 后端返回的分类 */
interface BackendCategoryRaw {
  id: string
  name: string
  sort_order: number
  tool_count: number
  created_at: string
  updated_at: string
}

/** 前端分类类型 */
export interface CategoryInfo {
  key: ToolCategory
  label: string
}

/**
 * 将后端 tool 数据映射为前端 ToolDefinition（基础信息，不含配置详情）
 */
function mapBackendTool(raw: BackendToolRaw): ToolDefinition {
  const category = raw.category_id as ToolCategory
  const mode = raw.mode as ToolMode

  if (mode === 'backend-job') {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      icon: raw.icon,
      route: raw.route,
      category,
      implementation: raw.implementation,
      mode: 'backend-job' as const,
      inputType: raw.input_type as 'file' | 'text' | 'file+text',
      accept: raw.accept,
      maxSize: raw.max_size,
    } as BackendJobToolDefinition
  }

  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    icon: raw.icon,
    route: raw.route,
    category,
    implementation: raw.implementation,
    mode: 'client-only' as const,
  } as ClientOnlyToolDefinition
}

/**
 * 将后端 tool 详情映射为前端 ToolDefinition（含 voices/formats）
 */
function mapBackendToolDetail(raw: BackendToolDetail): ToolDefinition {
  const base = mapBackendTool(raw)

  if (base.mode === 'backend-job') {
    const jobDef = { ...base } as BackendJobToolDefinition

    // TTS 配置：声音列表 + 默认值
    if (raw.voices && raw.voices.length > 0) {
      const opts = JSON.parse(raw.options || '{}') as Record<string, unknown>
      jobDef.ttsOptions = {
        voices: raw.voices.map((v) => ({
          id: v.id,
          name: v.name,
          gender: v.gender as 'male' | 'female',
          language: v.language,
        })),
        defaultVoice: opts.defaultVoice as string || raw.voices[0].id,
        defaultSpeed: opts.defaultSpeed as number || 1.0,
        defaultPitch: opts.defaultPitch as number || 0,
        defaultFormat: opts.defaultFormat as 'mp3' | 'wav' || 'mp3',
      }
    }

    // 转换格式配置
    if (raw.formats && raw.formats.length > 0) {
      const opts = JSON.parse(raw.options || '{}') as Record<string, unknown>
      jobDef.convertOptions = {
        formats: raw.formats.map((f) => ({
          value: f.value,
          label: f.label,
          category: f.category as 'image' | 'video' | 'audio',
        })),
        defaultFormat: opts.defaultFormat as string || raw.formats[0].value,
      }
    }

    return jobDef
  }

  return base
}

/**
 * 将后端分类映射为前端 CategoryInfo
 */
function mapBackendCategory(raw: BackendCategoryRaw): CategoryInfo {
  return { key: raw.id as ToolCategory, label: raw.name }
}

/**
 * 从后端获取所有工具列表（基础信息，无 voices/formats）
 */
export async function fetchTools(): Promise<ToolDefinition[]> {
  const resp = await apiClient.get<BackendToolRaw[]>('/api/v1/tools')
  if (!resp.success || !resp.data) {
    throw new Error(resp.error || '获取工具列表失败')
  }
  return resp.data.map(mapBackendTool)
}

/**
 * 从后端获取单个工具详情（含 voices/formats）
 */
export async function fetchToolDetail(toolId: string): Promise<ToolDefinition> {
  const resp = await apiClient.get<BackendToolDetail>(`/api/v1/tools/${toolId}`)
  if (!resp.success || !resp.data) {
    throw new Error(resp.error || '获取工具详情失败')
  }
  return mapBackendToolDetail(resp.data)
}

/**
 * 从后端获取所有分类列表
 */
export async function fetchCategories(): Promise<CategoryInfo[]> {
  const resp = await apiClient.get<BackendCategoryRaw[]>('/api/v1/categories')
  if (!resp.success || !resp.data) {
    throw new Error(resp.error || '获取分类列表失败')
  }
  return resp.data.map(mapBackendCategory)
}
