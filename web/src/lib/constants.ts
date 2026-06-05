/**
 * 常量定义 — 支持的文件格式、大小限制、工具分类等
 */

import type { BackendToolId, ClientToolId } from '@/types/tool'

/** 后端工具标识类型 */
export type { BackendToolId, ClientToolId }

/** 工具标识类型（后端 + 纯前端） */
export type AllowedTool = BackendToolId | ClientToolId

/**
 * 各后端工具支持的文件格式配置
 */
export const ALLOWED_FILE_TYPES: Record<
  BackendToolId,
  { extensions: string[]; mimeTypes: string[] }
> = {
  'speech-to-text': {
    extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac'],
    mimeTypes: [
      'audio/mpeg',
      'audio/wav',
      'audio/mp4',
      'audio/ogg',
      'audio/flac',
      'audio/aac',
    ],
  },
  'text-to-speech': {
    extensions: [],
    mimeTypes: [],
  },
  'image-ocr': {
    extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'],
    mimeTypes: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/bmp',
    ],
  },
  'media-convert': {
    extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'heic', 'heif', 'mp4', 'webm', 'avi', 'mov', 'mkv', 'mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'],
    mimeTypes: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif',
      'image/bmp',
      'image/heic',
      'image/heif',
      'video/mp4',
      'video/webm',
      'video/x-msvideo',
      'video/quicktime',
      'video/x-matroska',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/mp4',
      'audio/flac',
      'audio/aac',
    ],
  },
  'watermark-removal': {
    extensions: ['png', 'jpg', 'jpeg', 'webp', 'bmp'],
    mimeTypes: [
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/bmp',
    ],
  },
}

/**
 * 各后端工具的文件大小上限（字节）
 */
export const MAX_FILE_SIZES: Record<BackendToolId, number> = {
  'speech-to-text': 500 * 1024 * 1024, // 500MB
  'text-to-speech': 0,                 // 无文件上传（纯文本输入）
  'image-ocr': 20 * 1024 * 1024,       // 20MB
  'media-convert': 2 * 1024 * 1024 * 1024, // 2GB
  'watermark-removal': 20 * 1024 * 1024, // 20MB
}

/**
 * 各纯前端工具的输入大小上限（字节）
 * 0 表示无限制或不需要文件输入
 */
export const CLIENT_TOOL_MAX_INPUT_SIZES: Record<ClientToolId, number> = {
  'anime-lab': 0,
  'color-converter': 0,
  'cron-parser': 0,
  'csv-to-json': 10 * 1024 * 1024,       // 10MB
  'html-entity-codec': 1 * 1024 * 1024,  // 1MB
  'image-compression': 50 * 1024 * 1024, // 50MB
  'json-formatter': 10 * 1024 * 1024,    // 10MB
  'qrcode-generator': 0,
  'svg-editor': 2 * 1024 * 1024,         // 2MB
  'url-codec': 1 * 1024 * 1024,          // 1MB
}

/** 默认上传大小上限 */
export const DEFAULT_MAX_UPLOAD_SIZE = 100 * 1024 * 1024 // 100MB

/** 分片大小 */
export const UPLOAD_CHUNK_SIZE = 5 * 1024 * 1024 // 5MB

/** 任务轮询间隔（ms） */
export const POLL_INTERVAL = 2000

/** 请求超时时间（ms） */
export const REQUEST_TIMEOUT = 30000

/**
 * 输入文件扩展名 → 媒体类别映射
 * 用于 media-convert 工具智能过滤输出格式
 */
export const INPUT_CATEGORY_MAP: Record<string, 'image' | 'video' | 'audio'> = {
  // 图片
  png: 'image',
  jpg: 'image',
  jpeg: 'image',
  webp: 'image',
  gif: 'image',
  bmp: 'image',
  heic: 'image',
  heif: 'image',
  // 视频
  mp4: 'video',
  webm: 'video',
  avi: 'video',
  mov: 'video',
  mkv: 'video',
  // 音频
  mp3: 'audio',
  wav: 'audio',
  ogg: 'audio',
  m4a: 'audio',
  flac: 'audio',
  aac: 'audio',
}
