/**
 * API 请求/响应通用类型定义
 * 与后端 app/schemas/common.py 中的 APIResponse[T] 一一对应
 */

/** 通用 API 响应信封 */
export interface APIResponse<T = unknown> {
  success: boolean
  data: T | null
  error: string | null
  meta?: PageMeta | null
}

/** 分页元数据 */
export interface PageMeta {
  total: number
  page: number
  pageSize: number
}

/** 上传任务创建请求 */
export interface UploadCreateRequest {
  fileName: string
  fileSize: number
  mimeType: string
  totalChunks: number
}

/** 上传任务创建响应 */
export interface UploadCreateResponse {
  uploadId: string
  fileName: string
  fileSize: number
  totalChunks: number
}

/** 上传完成请求 */
export interface UploadCompleteRequest {
  uploadId: string
}

/** 任务创建请求（uploadId 可选 — 截图/HTML渲染等工具无需上传文件） */
export interface JobCreateRequest {
  toolId: string
  uploadId?: string
  params?: Record<string, string>
}

/** 任务创建响应 */
export interface JobCreateResponse {
  jobId: string
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'canceled'
  createdAt: string
}

/** OCR 识别段落（带位置信息） */
export interface OcrSegment {
  /** 识别文字 */
  text: string
  /** 置信度 0-1 */
  confidence: number
  /** 边界框 [x1, y1, x2, y2]，值为归一化坐标 0-1 */
  bbox: [number, number, number, number]
}

/** 输出文件描述 */
export interface OutputFile {
  fileName: string
  fileSize: number
  url: string
}

/** 任务状态查询响应 */
export interface JobStatusResponse {
  jobId: string
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'canceled'
  progress: number
  resultUrl: string | null
  resultFileName: string | null
  resultText: string | null
  ocrSegments: OcrSegment[] | null
  outputFiles: OutputFile[] | null
  resultMetadata: Record<string, unknown> | null
  error: string | null
  createdAt: string
}

/** 取消任务响应 */
export interface CancelJobResponse {
  jobId: string
  status: 'canceled'
}

/** SSE 事件中的进度数据 */
export interface SSEProgressEvent {
  jobId: string
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'canceled'
  progress: number
  resultUrl?: string
  error?: string
}
