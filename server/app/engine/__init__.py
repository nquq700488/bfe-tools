"""
引擎适配层 — 抽象接口定义与注册中心

为每种工具定义标准引擎接口（抽象基类），
具体实现（如 Whisper、TTS 引擎）通过 EngineRegistry 注册。

当前为骨架层，具体引擎实现将在后续工具开发时补充。
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from app.schemas.common import Result

logger = logging.getLogger(__name__)


# === 引擎结果类型 ===


@dataclass
class EngineResult:
    """引擎处理结果"""

    success: bool
    data: dict | None = None
    error: str | None = None
    output_files: list[str] = field(default_factory=list)


# === 抽象引擎接口 ===


class BaseEngine(ABC):
    """
    引擎抽象基类

    所有工具引擎必须继承此类并实现 execute 方法。
    """

    @property
    @abstractmethod
    def engine_name(self) -> str:
        """引擎名称（唯一标识）"""
        ...

    @abstractmethod
    async def execute(self, input_path: str, params: dict) -> EngineResult:
        """
        执行引擎处理

        Args:
            input_path: 输入文件路径
            params: 处理参数

        Returns:
            EngineResult — 处理结果
        """
        ...

    async def validate_input(self, input_path: str) -> Result[bool]:
        """
        校验输入文件（子类可覆盖）

        Args:
            input_path: 输入文件路径

        Returns:
            Result[bool]
        """
        import os

        if not os.path.isfile(input_path):
            return Result.failure(f"输入文件不存在: {input_path}")
        return Result.success(True)


class SpeechToTextEngine(BaseEngine):
    """语音转文字引擎抽象"""

    @property
    def engine_name(self) -> str:
        return "speech-to-text"

    @abstractmethod
    async def execute(self, input_path: str, params: dict) -> EngineResult:
        """将音频文件转为文字"""
        ...


class TextToSpeechEngine(BaseEngine):
    """文字转语音引擎抽象"""

    @property
    def engine_name(self) -> str:
        return "text-to-speech"

    @abstractmethod
    async def execute(self, input_path: str, params: dict) -> EngineResult:
        """将文本转为语音"""
        ...


class OcrEngine(BaseEngine):
    """图片 OCR 引擎抽象"""

    @property
    def engine_name(self) -> str:
        return "image-ocr"

    @abstractmethod
    async def execute(self, input_path: str, params: dict) -> EngineResult:
        """从图片中提取文字"""
        ...


class TranscodeEngine(BaseEngine):
    """媒体转码引擎抽象"""

    @property
    def engine_name(self) -> str:
        return "media-convert"

    @abstractmethod
    async def execute(self, input_path: str, params: dict) -> EngineResult:
        """将媒体文件转换为目标格式"""
        ...


# === 引擎注册中心 ===


class EngineRegistry:
    """
    引擎注册中心

    管理所有引擎实例的注册与查找。
    后续各工具实现完成后在此注册。

    Usage:
        registry = EngineRegistry()
        registry.register(MyWhisperEngine())
        engine = registry.get("speech-to-text")
    """

    def __init__(self) -> None:
        self._engines: dict[str, BaseEngine] = {}

    def register(self, engine: BaseEngine) -> None:
        """
        注册引擎

        Args:
            engine: 引擎实例
        """
        if engine.engine_name in self._engines:
            logger.warning(f"引擎已注册，将覆盖: {engine.engine_name}")
        self._engines[engine.engine_name] = engine
        logger.info(f"引擎已注册: {engine.engine_name}")

    def get(self, engine_name: str) -> BaseEngine | None:
        """
        获取引擎实例

        Args:
            engine_name: 引擎名称

        Returns:
            引擎实例，找不到返回 None
        """
        return self._engines.get(engine_name)

    def list_engines(self) -> list[str]:
        """列出所有已注册引擎名称"""
        return list(self._engines.keys())


# 全局注册中心单例
engine_registry = EngineRegistry()

# 注册内置引擎
from app.engine.ocr_engine import OcrEngine
from app.engine.tts_engine import TtsEngine
from app.engine.stt_engine import SpeechToTextEngine
from app.engine.transcode_engine import TranscodeEngine
from app.engine.watermark_engine import WatermarkEngine

engine_registry.register(OcrEngine())
engine_registry.register(TtsEngine())
engine_registry.register(SpeechToTextEngine())
engine_registry.register(TranscodeEngine())
engine_registry.register(WatermarkEngine())
