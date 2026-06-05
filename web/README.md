# bfe-tools — 前端

Vue 3 + Vite + TypeScript + Naive UI + UnoCSS

## 快速开始

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm typecheck    # TypeScript 类型检查
pnpm build        # 生产构建
```

## 目录结构

```
src/
├── pages/              # 页面组件
│   ├── HomePage.vue    # 首页（工具导航）
│   ├── ToolPage.vue    # 工具详情页（统一处理所有工具）
│   └── NotFoundPage.vue
├── components/
│   └── ui/             # 通用 UI 组件
│       ├── FileUpload.vue      # 文件上传（分片 + 进度）
│       └── ResultDownload.vue  # 结果下载按钮
├── hooks/              # 组合式函数
│   ├── useFileUpload.ts        # 文件上传状态管理
│   └── useTaskPolling.ts       # 任务轮询 / SSE 监听
├── lib/                # 工具库
│   ├── api.ts                  # HTTP 客户端（fetch 封装）
│   ├── constants.ts            # 全局常量
│   └── to.ts                   # 错误处理（to pattern）
├── tools/              # 工具注册中心
│   └── registry.ts             # 工具元数据定义
├── types/              # TypeScript 类型定义
│   ├── tool.ts
│   └── api.ts
├── styles/             # 全局样式
│   ├── global.css
│   └── tokens.css
├── router/             # 路由配置
├── App.vue
└── main.ts
```

## 工具列表

| ID | 名称 | 输入方式 | 引擎 |
|----|------|---------|------|
| `speech-to-text` | 🎙️ 语音转文字 | 文件上传（音频） | faster-whisper |
| `text-to-speech` | 🔊 文字转语音 | 文本输入 / txt 文件 | edge-tts |
| `image-ocr` | 🖼️ 图片信息识别 | 文件上传（图片） | easyocr |
| `media-convert` | 🎬 媒体格式转换 | 文件上传（音视频） | PyAV |

## 技术栈

| 依赖 | 版本 | 用途 |
|------|------|------|
| Vue | ^3.5 | 前端框架 |
| Vite | ^6.0 | 构建工具 |
| TypeScript | ~5.6 | 类型系统 |
| Naive UI | ^2.44 | UI 组件库 |
| UnoCSS | ^0.65 | 原子化 CSS |
| vue-router | ^4.5 | 路由 |
| @vueuse/core | ^14.3 | 组合式工具集 |

## 开发约定

- 组件使用 `<script setup lang="ts">` + Composition API
- 组件 PascalCase，文件按功能组织
- 类型禁止 `any`（第三方库除外）
- API 请求走 `lib/api.ts` 统一 HTTP 客户端
- 使用 `lib/to.ts` 的 `[data, error]` 模式处理异步错误
