# bfe-tools — 后端

Python + FastAPI，纯 pip 依赖，零系统依赖。

## 快速开始

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 安装依赖
uv pip install -r requirements.txt
# 或: pip install -r requirements.txt

# 启动服务
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# 或开发模式（热重载）
python -m uvicorn app.main:app --reload
```

服务启动后访问：
- API 文档：http://localhost:8000/docs
- ReDoc：http://localhost:8000/redoc

## 启动预热

启动时自动在后台线程预热 OCR 和 STT 模型（不阻塞服务）：

- **OCR**: easyocr 引擎，~300MB，首次加载后常驻内存
- **STT**: faster-whisper base 模型，~145MB，HF 镜像加速下载

模型下载一次后会缓存到本地：
- HuggingFace：`~/.cache/huggingface/`
- 预热失败不影响服务启动，模型在首次请求时自动加载

> **国内环境**：STT 引擎已内置 `HF_ENDPOINT=https://hf-mirror.com`，无需手动设置。

## 目录结构

```
server/
├── app/
│   ├── main.py                       # FastAPI 应用入口 + 生命周期
│   ├── engine/                       # 处理引擎
│   │   ├── __init__.py               # 引擎接口 + 注册中心
│   │   ├── ocr_engine.py             # 图片文字识别（easyocr）
│   │   ├── tts_engine.py             # 文字转语音（edge-tts）
│   │   ├── stt_engine.py             # 语音转文字（faster-whisper）
│   │   └── transcode_engine.py       # 媒体格式转换（PyAV）
│   ├── api/
│   │   └── v1/
│   │       ├── upload.py             # 文件上传 API（分片上传）
│   │       └── jobs.py               # 任务管理 API（创建/查询/SSE/下载）
│   ├── services/
│   │   ├── upload.py                 # 上传服务（分片、SHA256 校验）
│   │   └── job.py                    # 任务服务（状态机、SSE 广播、TTL）
│   ├── schemas/
│   │   ├── common.py                 # API 统一响应格式
│   │   └── job.py                    # 任务/上传 Schema（Pydantic）
│   └── core/
│       ├── config.py                 # 全局配置
│       └── security.py               # 安全校验（文件类型、大小）
├── requirements.txt                  # Python 依赖
└── README.md
```

## API 概览

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/uploads` | 创建上传任务 |
| PUT | `/api/v1/uploads/{id}/chunks/{n}` | 上传分片 |
| POST | `/api/v1/uploads/{id}/complete` | 完成上传（合并 + 校验） |
| POST | `/api/v1/jobs` | 创建处理任务（异步） |
| GET | `/api/v1/jobs/{id}` | 查询任务状态 |
| GET | `/api/v1/jobs/{id}/events` | SSE 进度事件流 |
| POST | `/api/v1/jobs/{id}/cancel` | 取消任务 |
| GET | `/api/v1/jobs/{id}/result` | 下载结果文件 |

## 引擎参数

### 文字转语音 (edge-tts)

```json
{
  "text": "要转换的文字",
  "voiceId": "zh-CN-XiaoxiaoNeural",
  "speed": "1.0",         // 0.5 ~ 2.0
  "pitch": "0",           // -6 ~ +6
  "format": "mp3"         // mp3 / wav
}
```

支持 20 种声音：中文（8 种）、英语（10 种）、日语、韩语。

### 语音转文字 (faster-whisper)

```json
{
  "model_size": "base",   // tiny / base / small / medium / large
  "language": "zh"        // 语言代码
}
```

### 图片识别 (easyocr)

```json
{
  "languages": ["ch_sim", "en"]
}
```

### 媒体转换 (PyAV)

```json
{
  "target_format": "mp4",   // mp4 / webm / mp3 / wav / ogg
  "video_codec": "libx264",
  "audio_codec": "aac",
  "quality": "medium"       // fast / medium / slow
}
```

## 数据约定

- Schema 使用 `BaseSchema`（snake_case → camelCase 自动映射）
- 前端发送 camelCase，后端内部 snake_case，API 响应 camelCase
- 结果文件通过 `/api/v1/jobs/{id}/result` 下载
- 任务超时后自动过期清理（TTL 由 `RESULT_TTL_SECONDS` 配置）

## 运行测试

```bash
uv run pytest
# 或: pytest
```

## 依赖说明

所有引擎均为纯 Python pip 包，**无需安装任何系统级依赖**：

| 包 | 用途 | 备注 |
|-----|------|------|
| `fastapi` + `uvicorn` | Web 框架 | |
| `edge-tts` | TTS | 纯 Python，调用微软 Edge 接口 |
| `easyocr` + `torch` | OCR | CPU 推理 |
| `faster-whisper` + `ctranslate2` | STT | 首次运行自动下载模型 |
| `av` | 转码 | 内置 FFmpeg C 库 |
| `pydantic` | 数据校验 | snake_case/camelCase 自动映射 |
| `pytest` | 测试 | |
