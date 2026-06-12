"""
SQLite 数据库连接管理与初始化

使用 aiosqlite 实现异步 SQLite 访问，启动时自动建表和 seed 初始数据。
"""

import asyncio
import json
import logging
from pathlib import Path

import aiosqlite

from app.core.config import settings

logger = logging.getLogger(__name__)

_db: aiosqlite.Connection | None = None
_db_path: Path | None = None
_lock = asyncio.Lock()


async def get_db() -> aiosqlite.Connection:
    """获取数据库连接（模块级单例，延迟初始化，协程安全）"""
    global _db, _db_path

    if _db is not None:
        return _db

    async with _lock:
        # 双重检查：锁内再次确认未被其他协程初始化
        if _db is not None:
            return _db

        # 数据库文件放在 data/ 下，和 uploads/results 同级
        data_dir = settings.UPLOAD_DIR.parent  # UPLOAD_DIR = data/uploads
        _db_path = data_dir / "bfe.db"
        logger.info(f"📦 打开 SQLite 数据库: {_db_path}")
        _db = await aiosqlite.connect(str(_db_path))
        _db.row_factory = aiosqlite.Row
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA foreign_keys=ON")

    return _db


async def close_db() -> None:
    """关闭数据库连接"""
    global _db
    if _db is not None:
        await _db.close()
        _db = None
        logger.info("📦 数据库连接已关闭")


async def init_db() -> None:
    """初始化数据库：建表 + seed 初始数据（幂等，多次调用安全）"""
    db = await get_db()

    await db.execute(
        """
        CREATE TABLE IF NOT EXISTS categories (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            sort_order  INTEGER DEFAULT 0,
            created_at  TEXT DEFAULT (datetime('now')),
            updated_at  TEXT DEFAULT (datetime('now'))
        )
        """
    )

    await db.execute(
        """
        CREATE TABLE IF NOT EXISTS tools (
            id              TEXT PRIMARY KEY,
            name            TEXT NOT NULL,
            description     TEXT NOT NULL,
            icon            TEXT DEFAULT '',
            route           TEXT NOT NULL,
            category_id     TEXT NOT NULL REFERENCES categories(id),
            implementation  TEXT DEFAULT '',
            mode            TEXT NOT NULL CHECK(mode IN ('backend-job', 'client-only')),
            input_type      TEXT DEFAULT '',
            accept          TEXT DEFAULT '',
            max_size        INTEGER DEFAULT 0,
            options         TEXT DEFAULT '{}',
            sort_order      INTEGER DEFAULT 0,
            created_at      TEXT DEFAULT (datetime('now')),
            updated_at      TEXT DEFAULT (datetime('now'))
        )
        """
    )

    await db.execute(
        """
        CREATE TABLE IF NOT EXISTS tts_voices (
            id          TEXT NOT NULL,
            tool_id     TEXT NOT NULL REFERENCES tools(id),
            name        TEXT NOT NULL,
            gender      TEXT NOT NULL CHECK(gender IN ('male', 'female')),
            language    TEXT NOT NULL,
            sort_order  INTEGER DEFAULT 0,
            created_at  TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (tool_id, id)
        )
        """
    )

    await db.execute(
        """
        CREATE TABLE IF NOT EXISTS convert_formats (
            value       TEXT NOT NULL,
            tool_id     TEXT NOT NULL REFERENCES tools(id),
            label       TEXT NOT NULL,
            category    TEXT NOT NULL CHECK(category IN ('image', 'video', 'audio')),
            sort_order  INTEGER DEFAULT 0,
            created_at  TEXT DEFAULT (datetime('now')),
            PRIMARY KEY (tool_id, value)
        )
        """
    )

    await _seed_categories(db)
    await _seed_tools(db)
    await _seed_tts_voices(db)
    await _seed_convert_formats(db)

    await db.commit()
    logger.info("📦 数据库初始化完成")


async def _seed_categories(db: aiosqlite.Connection) -> None:
    """插入默认分类（INSERT OR IGNORE，幂等）"""
    categories = [
        ("audio", "音频", 1),
        ("image", "图片", 2),
        ("video", "视频", 3),
        ("text", "文本", 4),
        ("ui", "UI 工具", 5),
        ("general", "通用", 6),
        ("pdf", "PDF", 7),
        ("browser", "浏览器", 8),
    ]

    await db.executemany(
        "INSERT OR IGNORE INTO categories (id, name, sort_order) VALUES (?, ?, ?)",
        categories,
    )


async def _seed_tools(db: aiosqlite.Connection) -> None:
    """插入默认工具列表（INSERT OR IGNORE，幂等）"""

    mb = 1024 * 1024
    gb = 1024 * 1024 * 1024

    # -- 工具级默认选项（标量值，列表数据在 _seed_tts_voices / _seed_convert_formats） --
    tts_options = json.dumps(
        {
            "defaultVoice": "zh-CN-XiaoxiaoNeural",
            "defaultSpeed": 1.0,
            "defaultPitch": 0,
            "defaultFormat": "mp3",
        },
        ensure_ascii=False,
    )
    convert_options = json.dumps({"defaultFormat": "mp4"}, ensure_ascii=False)

    tools = [
        # === audio ===
        (
            "speech-to-text",
            "语音转文字",
            "上传音频文件，识别并转为文本内容",
            "🎙️",
            "/tools/speech-to-text",
            "audio",
            "Python：[FunASR](https://github.com/modelscope/FunASR) Paraformer 模型",
            "backend-job",
            "file",
            "audio/mpeg,audio/wav,audio/mp4,audio/ogg,audio/flac,audio/aac,.mp3,.wav,.m4a,.ogg,.flac,.aac",
            500 * mb,
            "{}",
        ),
        # === text ===
        (
            "text-to-speech",
            "文字转语音",
            "输入文本或上传 txt 文件，生成语音文件。支持多种声音、语速和语调调节",
            "🔊",
            "/tools/text-to-speech",
            "text",
            "Python：[edge-tts](https://github.com/rany2/edge-tts) 微软语音合成",
            "backend-job",
            "text",
            "text/plain,.txt",
            10 * mb,
            tts_options,
        ),
        # === image ===
        (
            "image-ocr",
            "图片信息识别",
            "上传图片，提取文字或图像信息",
            "🖼️",
            "/tools/image-ocr",
            "image",
            "Python：[PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) 光学字符识别",
            "backend-job",
            "file",
            "image/png,image/jpeg,image/webp,image/gif,image/bmp,.png,.jpg,.jpeg,.webp,.gif,.bmp",
            20 * mb,
            "{}",
        ),
        (
            "watermark-removal",
            "图片去水印",
            "上传图片并框选水印区域，AI 智能填充去除水印",
            "🧹",
            "/tools/watermark-removal",
            "image",
            "Python：[OpenCV](https://docs.opencv.org/4.x/df/d3d/"
            "tutorial_py_inpainting.html) cv2.inpaint() Navier-Stokes "
            "算法 + LAB 色彩空间修复 + 颜色直方图匹配",
            "backend-job",
            "file",
            "image/png,image/jpeg,image/webp,image/bmp,.png,.jpg,.jpeg,.webp,.bmp",
            20 * mb,
            "{}",
        ),
        (
            "image-batch",
            "图片批量处理",
            "批量调整尺寸、转换格式、生成多倍图，输出 srcset 代码",
            "🖼️",
            "/tools/image-batch",
            "image",
            "Python：[Pillow](https://python-pillow.org) 图像处理库",
            "backend-job",
            "file",
            "application/zip,image/png,image/jpeg,image/webp,image/gif,image/bmp,"
            ".zip,.png,.jpg,.jpeg,.webp,.gif,.bmp",
            500 * mb,
            "{}",
        ),
        # === video ===
        (
            "media-convert",
            "媒体格式转换",
            "将图片、视频、音频转为目标格式，支持 HEIC 预处理",
            "🎬",
            "/tools/media-convert",
            "video",
            "Python：[FFmpeg](https://ffmpeg.org) / [PyAV](https://pyav.org) 封装",
            "backend-job",
            "file",
            "image/*,video/*,audio/*,.png,.jpg,.jpeg,.webp,.gif,.bmp,"
            ".heic,.heif,.mp4,.webm,.avi,.mov,.mkv,.mp3,.wav,.ogg,.m4a,.flac,.aac",
            2 * gb,
            convert_options,
        ),
        (
            "video-keyframe",
            "视频取帧",
            "从视频中按时间间隔或指定时间点提取关键帧，导出 PNG/WebP",
            "🎞️",
            "/tools/video-keyframe",
            "video",
            "Python：[PyAV](https://pyav.org) FFmpeg Python 绑定",
            "backend-job",
            "file",
            "video/mp4,video/webm,video/x-msvideo,video/quicktime,video/x-matroska,"
            ".mp4,.webm,.avi,.mov,.mkv",
            2 * gb,
            "{}",
        ),
        # === pdf ===
        (
            "pdf-toolkit",
            "PDF 工具箱",
            "拆分、合并、压缩 PDF，提取文字和图片",
            "📄",
            "/tools/pdf-toolkit",
            "pdf",
            "Python：[PyMuPDF](https://pymupdf.readthedocs.io/) PDF 处理库",
            "backend-job",
            "file",
            "application/pdf,application/zip,.pdf,.zip",
            200 * mb,
            "{}",
        ),
        # === browser ===
        (
            "responsive-screenshot",
            "多分辨率截图",
            "输入 URL，自动截取多种分辨率的页面截图并并排对比",
            "📸",
            "/tools/responsive-screenshot",
            "browser",
            "Python：[Playwright](https://playwright.dev) 无头浏览器截图",
            "backend-job",
            "text",
            "",
            0,
            "{}",
        ),
        (
            "url-to-pdf",
            "网页转 PDF",
            "输入 URL，将网页渲染并导出为高质量 PDF 文件",
            "📑",
            "/tools/url-to-pdf",
            "browser",
            "Python：[Playwright](https://playwright.dev) 无头浏览器 `page.pdf()`",
            "backend-job",
            "text",
            "",
            0,
            "{}",
        ),
        (
            "perf-snapshot",
            "性能快照",
            "采集页面 Core Web Vitals、资源加载、网络耗时等性能指标",
            "⚡",
            "/tools/perf-snapshot",
            "browser",
            "Python：[Playwright](https://playwright.dev) + Web Performance API",
            "backend-job",
            "text",
            "",
            0,
            "{}",
        ),
        # === ui ===
        (
            "html-to-image",
            "HTML 渲染截图",
            "粘贴 HTML/CSS 代码，无头浏览器渲染并导出高清截图",
            "🖥️",
            "/tools/html-to-image",
            "ui",
            "Python：[Playwright](https://playwright.dev) 无头浏览器渲染",
            "backend-job",
            "text",
            "",
            0,
            "{}",
        ),
        (
            "html-css-tool",
            "HTML/CSS 工具",
            "HTML/CSS 代码压缩与格式化，CSS 样式统计分析",
            "🧹",
            "/tools/html-css-tool",
            "ui",
            "Bun：[Elysia](https://elysiajs.com) 后端服务 — 压缩 / 格式化 / CSS 分析",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        (
            "anime-lab",
            "动画实验室",
            "使用 Anime.js 探索和创作 Web 动画效果，支持实时参数调节",
            "✨",
            "/tools/anime-lab",
            "ui",
            "浏览器端：[Anime.js](https://animejs.com) v4 动画引擎",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        (
            "color-converter",
            "颜色转换器",
            "在 HEX、RGB、HSL、OKLCH 等颜色空间之间实时转换",
            "🎨",
            "/tools/color-converter",
            "ui",
            "浏览器端：[culori](https://culorijs.org) 颜色解析库",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        (
            "svg-editor",
            "SVG 编辑器",
            "在线查看和编辑 SVG 源码，实时预览渲染效果",
            "✏️",
            "/tools/svg-editor",
            "ui",
            "浏览器端：原生 DOM + sandbox iframe 安全渲染",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        # === image (client-only) ===
        (
            "image-compression",
            "图片压缩",
            "在浏览器端压缩图片，支持调整尺寸、质量和输出格式",
            "🗜️",
            "/tools/image-compression",
            "image",
            "浏览器端：[browser-image-compression](https://github.com/Donaldcwl/browser-image-compression)",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        (
            "qrcode-generator",
            "二维码生成",
            "输入文本或链接，生成可定制的二维码，支持颜色和 Logo",
            "📱",
            "/tools/qrcode-generator",
            "image",
            "浏览器端：[node-qrcode](https://github.com/soldair/node-qrcode) Canvas 渲染",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        # === general ===
        (
            "api-tester",
            "API 请求测试",
            "发送 HTTP 请求，查看响应状态、Headers、Body 和耗时",
            "🔌",
            "/tools/api-tester",
            "general",
            "Bun：[Elysia](https://elysiajs.com) HTTP 代理 — 绕过浏览器 CORS 限制",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        (
            "ws-tester",
            "WebSocket 测试",
            "连接 WebSocket 服务，发送消息并实时查看收发包日志",
            "🔗",
            "/tools/ws-tester",
            "general",
            "Bun：[Elysia](https://elysiajs.com) WebSocket 代理 — 原生 ws 转发",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        (
            "cron-parser",
            "Cron 表达式解析",
            "解析 Cron 表达式为人类可读的描述，计算未来执行时间",
            "⏰",
            "/tools/cron-parser",
            "general",
            "浏览器端：纯算法实现，无外部依赖",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        (
            "csv-to-json",
            "CSV 转 JSON",
            "将 CSV 文件转换为 JSON 格式，支持自动编码检测和表格预览",
            "📊",
            "/tools/csv-to-json",
            "general",
            "浏览器端：[PapaParse](https://www.papaparse.com) CSV 解析器",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        (
            "file-preview",
            "文件预览",
            "拖拽文件即可预览：图片（支持缩放）、视频、音频、PDF、"
            "代码（语法高亮+行号）、ZIP 文件列表",
            "👁️",
            "/tools/file-preview",
            "general",
            "浏览器端：原生 FileReader + URL.createObjectURL + [JSZip](https://stuk.github.io/jszip/)",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        (
            "html-entity-codec",
            "HTML 实体编解码",
            "在 HTML 实体和原始字符之间双向转换",
            "🔤",
            "/tools/html-entity-codec",
            "general",
            "浏览器端：DOM `textarea` 安全解码，无外部依赖",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        (
            "json-formatter",
            "JSON 格式化/校验",
            "格式化、压缩和校验 JSON 数据，支持语法错误定位和树形浏览",
            "📋",
            "/tools/json-formatter",
            "general",
            "浏览器端：原生 `JSON.parse` / `JSON.stringify`，无外部依赖",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
        (
            "url-codec",
            "URL 编解码",
            "对 URL 进行编码和解码，支持组件级参数解析",
            "🔗",
            "/tools/url-codec",
            "general",
            "浏览器端：原生 `encodeURIComponent` / `URL` API，无外部依赖",
            "client-only",
            "",
            "",
            0,
            "{}",
        ),
    ]

    await db.executemany(
        """
        INSERT OR IGNORE INTO tools
            (id, name, description, icon, route, category_id, implementation,
             mode, input_type, accept, max_size, options)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        tools,
    )


async def _seed_tts_voices(db: aiosqlite.Connection) -> None:
    """插入默认 TTS 声音列表（INSERT OR IGNORE，幂等）"""
    voices = [
        ("zh-CN-XiaoxiaoNeural", "text-to-speech", "晓晓 — 温柔", "female", "中文", 0),
        ("zh-CN-XiaoyiNeural", "text-to-speech", "晓艺 — 活泼", "female", "中文", 1),
        ("zh-CN-liaoning-XiaobeiNeural", "text-to-speech", "小北 — 东北话", "female", "方言", 2),
        ("zh-CN-shaanxi-XiaoniNeural", "text-to-speech", "小妮 — 陕西话", "female", "方言", 3),
        ("zh-CN-YunxiNeural", "text-to-speech", "云希 — 沉稳", "male", "中文", 4),
        ("zh-CN-YunjianNeural", "text-to-speech", "云健 — 阳光", "male", "中文", 5),
        ("zh-CN-YunyangNeural", "text-to-speech", "云扬 — 新闻腔", "male", "中文", 6),
        ("zh-CN-YunxiaNeural", "text-to-speech", "云夏 — 青年", "male", "中文", 7),
        ("zh-HK-HiuMaanNeural", "text-to-speech", "曉曼 — 粵語女声", "female", "方言", 8),
        ("zh-TW-HsiaoChenNeural", "text-to-speech", "曉臻 — 台湾女声", "female", "方言", 9),
        ("zh-TW-YunJheNeural", "text-to-speech", "雲哲 — 台湾男声", "male", "方言", 10),
        ("en-US-JennyNeural", "text-to-speech", "Jenny — 美式女声", "female", "English", 11),
        ("en-US-AriaNeural", "text-to-speech", "Aria — 美式女声", "female", "English", 12),
        ("en-US-GuyNeural", "text-to-speech", "Guy — 美式男声", "male", "English", 13),
        ("en-US-AndrewNeural", "text-to-speech", "Andrew — 美式男声", "male", "English", 14),
        ("en-GB-SoniaNeural", "text-to-speech", "Sonia — 英式女声", "female", "English", 15),
        ("en-GB-MaisieNeural", "text-to-speech", "Maisie — 英式女声", "female", "English", 16),
        ("en-GB-RyanNeural", "text-to-speech", "Ryan — 英式男声", "male", "English", 17),
        ("en-GB-ThomasNeural", "text-to-speech", "Thomas — 英式男声", "male", "English", 18),
        ("en-AU-NatashaNeural", "text-to-speech", "Natasha — 澳洲女声", "female", "English", 19),
        ("en-AU-WilliamNeural", "text-to-speech", "William — 澳洲男声", "male", "English", 20),
        ("ja-JP-NanamiNeural", "text-to-speech", "Nanami — 日语女声", "female", "日本語", 21),
        ("ja-JP-KeitaNeural", "text-to-speech", "Keita — 日语男声", "male", "日本語", 22),
        ("ko-KR-SunHiNeural", "text-to-speech", "SunHi — 韩语女声", "female", "한국어", 23),
    ]
    await db.executemany(
        "INSERT OR IGNORE INTO tts_voices (id, tool_id, name, gender, language, sort_order) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        voices,
    )


async def _seed_convert_formats(db: aiosqlite.Connection) -> None:
    """插入默认格式转换列表（INSERT OR IGNORE，幂等）"""
    formats = [
        ("png", "media-convert", "PNG", "image", 0),
        ("jpg", "media-convert", "JPEG", "image", 1),
        ("webp", "media-convert", "WebP", "image", 2),
        ("gif", "media-convert", "GIF", "image", 3),
        ("bmp", "media-convert", "BMP", "image", 4),
        ("mp4", "media-convert", "MP4", "video", 5),
        ("webm", "media-convert", "WebM", "video", 6),
        ("mp3", "media-convert", "MP3", "audio", 7),
        ("wav", "media-convert", "WAV", "audio", 8),
        ("ogg", "media-convert", "OGG", "audio", 9),
    ]
    await db.executemany(
        "INSERT OR IGNORE INTO convert_formats (value, tool_id, label, category, sort_order) "
        "VALUES (?, ?, ?, ?, ?)",
        formats,
    )
