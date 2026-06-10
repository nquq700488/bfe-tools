/**
 * Tool Registry — 工具注册中心
 * 定义所有可用工具的元数据，后续各工具在此注册
 */
import type { ToolDefinition } from '@/types/tool'
import { MAX_FILE_SIZES } from '@/lib/constants'

/** 工具注册表（Map<工具ID, 工具定义>） */
export const toolRegistry = new Map<string, ToolDefinition>([
  // ================================================================
  // 后端任务工具（依赖 upload → job → poll 流程）
  // ================================================================
  [
    'speech-to-text',
    {
      id: 'speech-to-text',
      name: '语音转文字',
      implementation: 'Python：[FunASR](https://github.com/modelscope/FunASR) Paraformer 模型',
      description: '上传音频文件，识别并转为文本内容',
      icon: '🎙️',
      inputType: 'file',
      accept: 'audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/flac,audio/aac,.mp3,.wav,.m4a,.ogg,.flac,.aac',
      maxSize: MAX_FILE_SIZES['speech-to-text'],
      route: '/tools/speech-to-text',
      category: 'audio',
      mode: 'backend-job',
    },
  ],
  [
    'text-to-speech',
    {
      id: 'text-to-speech',
      name: '文字转语音',
      implementation: 'Python：[edge-tts](https://github.com/rany2/edge-tts) 微软语音合成',
      description: '输入文本或上传 txt 文件，生成语音文件。支持多种声音、语速和语调调节',
      icon: '🔊',
      inputType: 'text',
      accept: 'text/plain,.txt',
      maxSize: MAX_FILE_SIZES['text-to-speech'] || 10 * 1024 * 1024,
      route: '/tools/text-to-speech',
      category: 'text',
      mode: 'backend-job',
      ttsOptions: {
        voices: [
          // 中文女声（edge-tts 实际支持）
          { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓 — 温柔', gender: 'female', language: '中文' },
          { id: 'zh-CN-XiaoyiNeural', name: '晓艺 — 活泼', gender: 'female', language: '中文' },
          { id: 'zh-CN-liaoning-XiaobeiNeural', name: '小北 — 东北话', gender: 'female', language: '方言' },
          { id: 'zh-CN-shaanxi-XiaoniNeural', name: '小妮 — 陕西话', gender: 'female', language: '方言' },
          // 中文男声（edge-tts 实际支持）
          { id: 'zh-CN-YunxiNeural', name: '云希 — 沉稳', gender: 'male', language: '中文' },
          { id: 'zh-CN-YunjianNeural', name: '云健 — 阳光', gender: 'male', language: '中文' },
          { id: 'zh-CN-YunyangNeural', name: '云扬 — 新闻腔', gender: 'male', language: '中文' },
          { id: 'zh-CN-YunxiaNeural', name: '云夏 — 青年', gender: 'male', language: '中文' },
          // 粤语 / 台湾
          { id: 'zh-HK-HiuMaanNeural', name: '曉曼 — 粵語女声', gender: 'female', language: '方言' },
          { id: 'zh-TW-HsiaoChenNeural', name: '曉臻 — 台湾女声', gender: 'female', language: '方言' },
          { id: 'zh-TW-YunJheNeural', name: '雲哲 — 台湾男声', gender: 'male', language: '方言' },
          // 美式英语
          { id: 'en-US-JennyNeural', name: 'Jenny — 美式女声', gender: 'female', language: 'English' },
          { id: 'en-US-AriaNeural', name: 'Aria — 美式女声', gender: 'female', language: 'English' },
          { id: 'en-US-GuyNeural', name: 'Guy — 美式男声', gender: 'male', language: 'English' },
          { id: 'en-US-AndrewNeural', name: 'Andrew — 美式男声', gender: 'male', language: 'English' },
          // 英式英语
          { id: 'en-GB-SoniaNeural', name: 'Sonia — 英式女声', gender: 'female', language: 'English' },
          { id: 'en-GB-MaisieNeural', name: 'Maisie — 英式女声', gender: 'female', language: 'English' },
          { id: 'en-GB-RyanNeural', name: 'Ryan — 英式男声', gender: 'male', language: 'English' },
          { id: 'en-GB-ThomasNeural', name: 'Thomas — 英式男声', gender: 'male', language: 'English' },
          // 澳洲英语
          { id: 'en-AU-NatashaNeural', name: 'Natasha — 澳洲女声', gender: 'female', language: 'English' },
          { id: 'en-AU-WilliamNeural', name: 'William — 澳洲男声', gender: 'male', language: 'English' },
          // 日韩
          { id: 'ja-JP-NanamiNeural', name: 'Nanami — 日语女声', gender: 'female', language: '日本語' },
          { id: 'ja-JP-KeitaNeural', name: 'Keita — 日语男声', gender: 'male', language: '日本語' },
          { id: 'ko-KR-SunHiNeural', name: 'SunHi — 韩语女声', gender: 'female', language: '한국어' },
        ],
        defaultVoice: 'zh-CN-XiaoxiaoNeural',
        defaultSpeed: 1.0,
        defaultPitch: 0,
        defaultFormat: 'mp3',
      },
    },
  ],
  [
    'image-ocr',
    {
      id: 'image-ocr',
      name: '图片信息识别',
      implementation: 'Python：[PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) 光学字符识别',
      description: '上传图片，提取文字或图像信息',
      icon: '🖼️',
      inputType: 'file',
      accept: 'image/png,image/jpeg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp',
      maxSize: MAX_FILE_SIZES['image-ocr'],
      route: '/tools/image-ocr',
      category: 'image',
      mode: 'backend-job',
    },
  ],
  [
    'media-convert',
    {
      id: 'media-convert',
      name: '媒体格式转换',
      implementation: 'Python：[FFmpeg](https://ffmpeg.org) / [PyAV](https://pyav.org) 封装',
      description: '将图片、视频、音频转为目标格式，支持 HEIC 预处理',
      icon: '🎬',
      inputType: 'file',
      accept: 'image/*,video/*,audio/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,.heic,.heif,.mp4,.webm,.avi,.mov,.mkv,.mp3,.wav,.ogg,.m4a,.flac,.aac',
      maxSize: MAX_FILE_SIZES['media-convert'],
      route: '/tools/media-convert',
      category: 'video',
      mode: 'backend-job',
      convertOptions: {
        formats: [
          // 图片格式
          { value: 'png', label: 'PNG', category: 'image' },
          { value: 'jpg', label: 'JPEG', category: 'image' },
          { value: 'webp', label: 'WebP', category: 'image' },
          { value: 'gif', label: 'GIF', category: 'image' },
          { value: 'bmp', label: 'BMP', category: 'image' },
          // 视频格式
          { value: 'mp4', label: 'MP4', category: 'video' },
          { value: 'webm', label: 'WebM', category: 'video' },
          // 音频格式
          { value: 'mp3', label: 'MP3', category: 'audio' },
          { value: 'wav', label: 'WAV', category: 'audio' },
          { value: 'ogg', label: 'OGG', category: 'audio' },
        ],
        defaultFormat: 'mp4',
      },
    },
  ],
  [
    'watermark-removal',
    {
      id: 'watermark-removal',
      name: '图片去水印',
      description: '上传图片并框选水印区域，AI 智能填充去除水印',
      implementation: 'Python：[OpenCV](https://docs.opencv.org/4.x/df/d3d/tutorial_py_inpainting.html) cv2.inpaint() Navier-Stokes 算法 + LAB 色彩空间修复 + 颜色直方图匹配',
      icon: '🧹',
      inputType: 'file',
      accept: 'image/png,image/jpeg,image/webp,image/bmp,.png,.jpg,.jpeg,.webp,.bmp',
      maxSize: MAX_FILE_SIZES['watermark-removal'],
      route: '/tools/watermark-removal',
      category: 'image',
      mode: 'backend-job',
    },
  ],
  [
    'pdf-toolkit',
    {
      id: 'pdf-toolkit',
      name: 'PDF 工具箱',
      implementation: 'Python：[PyMuPDF](https://pymupdf.readthedocs.io/) PDF 处理库',
      description: '拆分、合并、压缩 PDF，提取文字和图片',
      icon: '📄',
      inputType: 'file',
      accept: 'application/pdf,application/zip,.pdf,.zip',
      maxSize: MAX_FILE_SIZES['pdf-toolkit'],
      route: '/tools/pdf-toolkit',
      category: 'pdf',
      mode: 'backend-job',
    },
  ],
  [
    'responsive-screenshot',
    {
      id: 'responsive-screenshot',
      name: '多分辨率截图',
      implementation: 'Python：[Playwright](https://playwright.dev) 无头浏览器截图',
      description: '输入 URL，自动截取多种分辨率的页面截图并并排对比',
      icon: '📸',
      inputType: 'text',
      accept: '',
      maxSize: 0,
      route: '/tools/responsive-screenshot',
      category: 'browser',
      mode: 'backend-job',
    },
  ],
  [
    'image-batch',
    {
      id: 'image-batch',
      name: '图片批量处理',
      implementation: 'Python：[Pillow](https://python-pillow.org) 图像处理库',
      description: '批量调整尺寸、转换格式、生成多倍图，输出 srcset 代码',
      icon: '🖼️',
      inputType: 'file',
      accept: 'application/zip,image/png,image/jpeg,image/webp,image/gif,image/bmp,.zip,.png,.jpg,.jpeg,.webp,.gif,.bmp',
      maxSize: MAX_FILE_SIZES['image-batch'],
      route: '/tools/image-batch',
      category: 'image',
      mode: 'backend-job',
    },
  ],
  [
    'video-keyframe',
    {
      id: 'video-keyframe',
      name: '视频取帧',
      implementation: 'Python：[PyAV](https://pyav.org) FFmpeg Python 绑定',
      description: '从视频中按时间间隔或指定时间点提取关键帧，导出 PNG/WebP',
      icon: '🎞️',
      inputType: 'file',
      accept: 'video/mp4,video/webm,video/x-msvideo,video/quicktime,video/x-matroska,.mp4,.webm,.avi,.mov,.mkv',
      maxSize: MAX_FILE_SIZES['video-keyframe'],
      route: '/tools/video-keyframe',
      category: 'video',
      mode: 'backend-job',
    },
  ],
  [
    'html-to-image',
    {
      id: 'html-to-image',
      name: 'HTML 渲染截图',
      implementation: 'Python：[Playwright](https://playwright.dev) 无头浏览器渲染',
      description: '粘贴 HTML/CSS 代码，无头浏览器渲染并导出高清截图',
      icon: '🖥️',
      inputType: 'text',
      accept: '',
      maxSize: 0,
      route: '/tools/html-to-image',
      category: 'ui',
      mode: 'backend-job',
    },
  ],

  [
    'url-to-pdf',
    {
      id: 'url-to-pdf',
      name: '网页转 PDF',
      implementation: 'Python：[Playwright](https://playwright.dev) 无头浏览器 `page.pdf()`',
      description: '输入 URL，将网页渲染并导出为高质量 PDF 文件',
      icon: '📑',
      inputType: 'text',
      accept: '',
      maxSize: 0,
      route: '/tools/url-to-pdf',
      category: 'browser',
      mode: 'backend-job',
    },
  ],
  [
    'perf-snapshot',
    {
      id: 'perf-snapshot',
      name: '性能快照',
      implementation: 'Python：[Playwright](https://playwright.dev) + Web Performance API',
      description: '采集页面 Core Web Vitals、资源加载、网络耗时等性能指标',
      icon: '⚡',
      inputType: 'text',
      accept: '',
      maxSize: 0,
      route: '/tools/perf-snapshot',
      category: 'browser',
      mode: 'backend-job',
    },
  ],

  // ================================================================
  // 纯前端工具（浏览器端计算，无后端依赖 或 调 Bun 服务）
  // ================================================================
  [
    'html-css-tool',
    {
      id: 'html-css-tool',
      name: 'HTML/CSS 工具',
      implementation: 'Bun：[Elysia](https://elysiajs.com) 后端服务 — 压缩 / 格式化 / CSS 分析',
      description: 'HTML/CSS 代码压缩与格式化，CSS 样式统计分析',
      icon: '🧹',
      route: '/tools/html-css-tool',
      category: 'ui',
      mode: 'client-only',
    },
  ],
  [
    'api-tester',
    {
      id: 'api-tester',
      name: 'API 请求测试',
      implementation: 'Bun：[Elysia](https://elysiajs.com) HTTP 代理 — 绕过浏览器 CORS 限制',
      description: '发送 HTTP 请求，查看响应状态、Headers、Body 和耗时',
      icon: '🔌',
      route: '/tools/api-tester',
      category: 'general',
      mode: 'client-only',
    },
  ],
  [
    'ws-tester',
    {
      id: 'ws-tester',
      name: 'WebSocket 测试',
      implementation: 'Bun：[Elysia](https://elysiajs.com) WebSocket 代理 — 原生 ws 转发',
      description: '连接 WebSocket 服务，发送消息并实时查看收发包日志',
      icon: '🔗',
      route: '/tools/ws-tester',
      category: 'general',
      mode: 'client-only',
    },
  ],

  // ================================================================
  // 纯前端工具（浏览器端计算，无后端依赖）
  // ================================================================

  // ---- ui 分类 ----
  [
    'anime-lab',
    {
      id: 'anime-lab',
      name: '动画实验室',
      implementation: '浏览器端：[Anime.js](https://animejs.com) v4 动画引擎',
      description: '使用 Anime.js 探索和创作 Web 动画效果，支持实时参数调节',
      icon: '✨',
      route: '/tools/anime-lab',
      category: 'ui',
      mode: 'client-only',
    },
  ],
  [
    'color-converter',
    {
      id: 'color-converter',
      name: '颜色转换器',
      implementation: '浏览器端：[culori](https://culorijs.org) 颜色解析库',
      description: '在 HEX、RGB、HSL、OKLCH 等颜色空间之间实时转换',
      icon: '🎨',
      route: '/tools/color-converter',
      category: 'ui',
      mode: 'client-only',
    },
  ],
  [
    'svg-editor',
    {
      id: 'svg-editor',
      name: 'SVG 编辑器',
      implementation: '浏览器端：原生 DOM + sandbox iframe 安全渲染',
      description: '在线查看和编辑 SVG 源码，实时预览渲染效果',
      icon: '✏️',
      route: '/tools/svg-editor',
      category: 'ui',
      mode: 'client-only',
    },
  ],

  // ---- image 分类 ----
  [
    'image-compression',
    {
      id: 'image-compression',
      name: '图片压缩',
      implementation: '浏览器端：[browser-image-compression](https://github.com/Donaldcwl/browser-image-compression)',
      description: '在浏览器端压缩图片，支持调整尺寸、质量和输出格式',
      icon: '🗜️',
      route: '/tools/image-compression',
      category: 'image',
      mode: 'client-only',
    },
  ],
  [
    'qrcode-generator',
    {
      id: 'qrcode-generator',
      name: '二维码生成',
      implementation: '浏览器端：[node-qrcode](https://github.com/soldair/node-qrcode) Canvas 渲染',
      description: '输入文本或链接，生成可定制的二维码，支持颜色和 Logo',
      icon: '📱',
      route: '/tools/qrcode-generator',
      category: 'image',
      mode: 'client-only',
    },
  ],

  // ---- general 分类 ----
  [
    'cron-parser',
    {
      id: 'cron-parser',
      name: 'Cron 表达式解析',
      implementation: '浏览器端：纯算法实现，无外部依赖',
      description: '解析 Cron 表达式为人类可读的描述，计算未来执行时间',
      icon: '⏰',
      route: '/tools/cron-parser',
      category: 'general',
      mode: 'client-only',
    },
  ],
  [
    'csv-to-json',
    {
      id: 'csv-to-json',
      name: 'CSV 转 JSON',
      implementation: '浏览器端：[PapaParse](https://www.papaparse.com) CSV 解析器',
      description: '将 CSV 文件转换为 JSON 格式，支持自动编码检测和表格预览',
      icon: '📊',
      route: '/tools/csv-to-json',
      category: 'general',
      mode: 'client-only',
    },
  ],
  [
    'file-preview',
    {
      id: 'file-preview',
      name: '文件预览',
      implementation: '浏览器端：原生 FileReader + URL.createObjectURL + [JSZip](https://stuk.github.io/jszip/)',
      description: '拖拽文件即可预览：图片（支持缩放）、视频、音频、PDF、代码（语法高亮+行号）、ZIP 文件列表',
      icon: '👁️',
      route: '/tools/file-preview',
      category: 'general',
      mode: 'client-only',
    },
  ],
  [
    'html-entity-codec',
    {
      id: 'html-entity-codec',
      name: 'HTML 实体编解码',
      implementation: '浏览器端：DOM `textarea` 安全解码，无外部依赖',
      description: '在 HTML 实体和原始字符之间双向转换',
      icon: '🔤',
      route: '/tools/html-entity-codec',
      category: 'general',
      mode: 'client-only',
    },
  ],
  [
    'json-formatter',
    {
      id: 'json-formatter',
      name: 'JSON 格式化/校验',
      implementation: '浏览器端：原生 `JSON.parse` / `JSON.stringify`，无外部依赖',
      description: '格式化、压缩和校验 JSON 数据，支持语法错误定位和树形浏览',
      icon: '📋',
      route: '/tools/json-formatter',
      category: 'general',
      mode: 'client-only',
    },
  ],
  [
    'url-codec',
    {
      id: 'url-codec',
      name: 'URL 编解码',
      implementation: '浏览器端：原生 `encodeURIComponent` / `URL` API，无外部依赖',
      description: '对 URL 进行编码和解码，支持组件级参数解析',
      icon: '🔗',
      route: '/tools/url-codec',
      category: 'general',
      mode: 'client-only',
    },
  ],
])

/**
 * 按 ID 查找工具
 * @param toolId 工具 ID
 */
export function getTool(toolId: string): ToolDefinition | undefined {
  return toolRegistry.get(toolId)
}

/**
 * 按分类筛选工具
 * @param category 工具分类
 */
export function getToolsByCategory(category: ToolDefinition['category']): ToolDefinition[] {
  return [...toolRegistry.values()].filter((t) => t.category === category)
}

/**
 * 获取所有工具列表
 */
export function getAllTools(): ToolDefinition[] {
  return [...toolRegistry.values()]
}
