/**
 * 工具/任务相关类型定义
 *
 * 使用 discriminated union：通过 `mode` 字段在编译期区分后端任务工具和纯前端工具。
 * - BackendJobToolDefinition：依赖后端 upload → job → poll 流程
 * - ClientOnlyToolDefinition：纯浏览器端计算，无后端依赖
 */

/** 工具运行模式（discriminant） */
export type ToolMode = 'backend-job' | 'client-only'

/** 工具分类 */
export type ToolCategory = 'audio' | 'image' | 'video' | 'text' | 'ui' | 'general' | 'pdf' | 'browser'

/** 格式类别 */
export type FormatCategory = 'image' | 'video' | 'audio'

/** 转换格式选项 */
export interface ConvertFormat {
  value: string
  label: string
  category: FormatCategory
}

/** 媒体转换配置选项 */
export interface ConvertOptions {
  formats: ConvertFormat[]
  defaultFormat: string
}

/** TTS 声音选项 */
export interface TtsVoice {
  id: string
  name: string
  gender: 'male' | 'female'
  language: string
}

/** TTS 配置选项 */
export interface TtsOptions {
  voices: TtsVoice[]
  defaultVoice: string
  defaultSpeed: number
  defaultPitch: number
  defaultFormat: 'mp3' | 'wav'
}

// ============================================================
// Discriminated Union：工具定义
// ============================================================

/** 工具定义基类（公共字段） */
export interface BaseToolDefinition {
  /** 唯一标识（kebab-case） */
  id: string
  /** 工具名称 */
  name: string
  /** 功能描述 */
  description: string
  /** 展示图标（emoji 或 SVG 名） */
  icon: string
  /** 路由路径 */
  route: string
  /** 分类标签 */
  category: ToolCategory
  /** 实现说明（用了什么包/技术，支持 markdown 链接语法） */
  implementation: string
  /** 运行模式（discriminant） */
  mode: ToolMode
}

/** 后端任务工具定义（依赖 upload → job → poll 流程） */
export interface BackendJobToolDefinition extends BaseToolDefinition {
  mode: 'backend-job'
  /** 输入类型 */
  inputType: 'file' | 'text' | 'file+text'
  /** 接受的 MIME 类型（逗号分隔） */
  accept: string
  /** 最大文件大小（字节） */
  maxSize: number
  /** TTS 专属配置（仅 text-to-speech 工具） */
  ttsOptions?: TtsOptions
  /** 媒体转换专属配置（仅 media-convert 工具） */
  convertOptions?: ConvertOptions
}

/** 纯前端工具定义（浏览器端计算，无后端依赖） */
export interface ClientOnlyToolDefinition extends BaseToolDefinition {
  mode: 'client-only'
}

/** 工具定义联合类型（通过 mode 字段窄化） */
export type ToolDefinition = BackendJobToolDefinition | ClientOnlyToolDefinition

/** 纯前端工具 ID */
export type ClientToolId =
  | 'anime-lab'
  | 'color-converter'
  | 'cron-parser'
  | 'csv-to-json'
  | 'html-entity-codec'
  | 'image-compression'
  | 'json-formatter'
  | 'qrcode-generator'
  | 'svg-editor'
  | 'url-codec'
  | 'html-css-tool'
  | 'api-tester'
  | 'ws-tester'

/** 后端任务工具 ID */
export type BackendToolId =
  | 'speech-to-text'
  | 'text-to-speech'
  | 'image-ocr'
  | 'media-convert'
  | 'watermark-removal'
  | 'pdf-toolkit'
  | 'responsive-screenshot'
  | 'image-batch'
  | 'video-keyframe'
  | 'html-to-image'
  | 'url-to-pdf'
  | 'perf-snapshot'

// ============================================================
// 任务/上传状态类型（不变）
// ============================================================

/** 任务状态枚举（包含上传中的 uploading 态） */
export type TaskStatusEnum = 'pending' | 'uploading' | 'running' | 'succeeded' | 'failed' | 'canceled'

/** 任务状态 */
export interface TaskStatus {
  /** 任务 ID */
  jobId: string
  /** 当前状态 */
  status: TaskStatusEnum
  /** 进度百分比 0-100 */
  progress: number
  /** 错误消息（仅在 failed 状态） */
  error?: string
  /** 结果文件 URL（仅在 succeeded 状态） */
  resultUrl?: string
  /** 结果文件名 */
  resultFileName?: string
  /** 创建时间 */
  createdAt: string
}

/** 文件上传状态 */
export interface UploadState {
  /** 文件唯一标识 */
  fileId: string
  /** 原始文件名 */
  fileName: string
  /** 上传状态 */
  status: TaskStatusEnum
  /** 进度百分比 0-100 */
  progress: number
  /** 已上传字节数 */
  loaded: number
  /** 总字节数 */
  total: number
  /** 服务端返回的 uploadId */
  uploadId?: string
  /** 错误消息 */
  error?: string
}
