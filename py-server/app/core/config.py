"""
应用配置 — 基于 pydantic-settings 的类型安全配置管理

所有配置项通过环境变量或 .env 文件注入，禁止硬编码。
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """应用全局配置"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # === 应用信息 ===
    APP_NAME: str = "bfe-tools-server"
    DEBUG: bool = True

    # === CORS ===
    CORS_ORIGINS: str = "http://localhost:5173"

    def model_post_init(self, __context):
        """桌面模式：用 BFE_DATA_DIR 覆盖所有数据目录"""
        if self.BFE_DESKTOP and self.BFE_DATA_DIR:
            data = Path(self.BFE_DATA_DIR)
            self.UPLOAD_DIR = data / "uploads"
            self.TEMP_DIR = data / "temp"
            self.RESULTS_DIR = data / "results"

    @property
    def cors_origins_list(self) -> list[str]:
        """将逗号分隔的 CORS_ORIGINS 转为列表（桌面模式会额外拼接 BFE_ALLOWED_ORIGINS）"""
        origins = self.CORS_ORIGINS
        if self.BFE_DESKTOP and self.BFE_ALLOWED_ORIGINS:
            origins = f"{origins},{self.BFE_ALLOWED_ORIGINS}"
        return [origin.strip() for origin in origins.split(",") if origin.strip()]

    # === 上传配置 ===
    UPLOAD_MAX_SIZE: int = 2 * 1024 * 1024 * 1024  # 默认 2GB
    """单文件上传大小上限（字节）"""

    UPLOAD_DIR: Path = Path("./data/uploads")
    """上传文件存储目录（桌面模式覆盖为 BFE_DATA_DIR/uploads）"""

    TEMP_DIR: Path = Path("./data/temp")
    """临时文件目录（桌面模式覆盖为 BFE_DATA_DIR/temp）"""

    RESULTS_DIR: Path = Path("./data/results")
    """任务结果文件存储目录（桌面模式覆盖为 BFE_DATA_DIR/results）"""

    # === 任务配置 ===
    RESULT_TTL_SECONDS: int = 86400  # 默认 24 小时
    """任务结果有效期（秒），过期自动清理"""

    MAX_CONCURRENT_JOBS: int = 3
    """最大并发处理任务数"""

    # === 安全配置 ===
    ALLOWED_EXTENSIONS: set[str] = {
        # 音频
        "mp3",
        "wav",
        "m4a",
        "ogg",
        "flac",
        "aac",
        # 图片
        "png",
        "jpg",
        "jpeg",
        "webp",
        "gif",
        "bmp",
        "heic",
        "heif",
        # 视频
        "mp4",
        "webm",
        "avi",
        "mov",
        "mkv",
    }
    """允许的文件扩展名白名单"""

    # === 桌面端配置 ===
    BFE_DESKTOP: bool = False
    """是否桌面端模式（Tauri 启动时由 Rust 注入 BFE_DESKTOP=1）"""

    BFE_PORT: int = 0
    """桌面端动态端口（由 Rust 端发现并注入）"""

    BFE_DATA_DIR: str = ""
    """桌面端数据目录（由 Rust 端注入，覆盖 UPLOAD_DIR/TEMP_DIR/RESULTS_DIR）"""

    BFE_DESKTOP_TOKEN: str = ""
    """桌面端安全 token（256-bit hex，仅存内存）"""

    BFE_ALLOWED_ORIGINS: str = "http://localhost:5173"
    """CORS 允许的 origins（桌面模式增加 tauri://localhost 和动态端口）"""

    # === 引擎配置 ===
    FFMPEG_PATH: str = "ffmpeg"
    """FFmpeg 可执行文件路径 — 后续媒体转换工具使用"""

    # === Playwright 浏览器配置 ===
    PLAYWRIGHT_CONCURRENCY: int = 2
    """Playwright 最大并发截图任务数"""

    PLAYWRIGHT_NAVIGATION_TIMEOUT: int = 15
    """Playwright 页面导航超时（秒）。分层降级：networkidle(15s) → load(10s) → domcontentloaded(8s)"""

    PLAYWRIGHT_OPERATION_TIMEOUT: int = 45
    """Playwright 单次操作总超时（秒），包含导航 + 渲染留白 + 截图/PDF 生成"""

    PLAYWRIGHT_QUEUE_TIMEOUT: int = 60
    """Playwright 信号量排队等待超时（秒），超时后返回"服务器繁忙"错误"""

    PLAYWRIGHT_RENDER_GRACE_MS: int = 2000
    """Playwright 导航成功后渲染留白时间（ms），替代硬编码的 3000/8000ms"""

    PLAYWRIGHT_MAX_PAGE_HEIGHT: int = 20000
    """Playwright 截图最大页面高度（px）"""

    # === zip 安全配置 ===
    ZIP_MAX_EXTRACT_SIZE: int = 500 * 1024 * 1024  # 500MB
    """zip 解压总大小上限（字节）"""

    ZIP_MAX_FILE_COUNT: int = 1000
    """zip 内最大文件数量"""

    ZIP_MAX_DEPTH: int = 1
    """zip 嵌套深度上限（1 = 不允许嵌套 zip）"""


settings = Settings()
