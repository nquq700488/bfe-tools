"""
语音转文字引擎 — 基于 faster-whisper

faster-whisper 是 Whisper 的 C++/CUDA 实现，CPU 速度比 openai-whisper 快 2-4 倍。
默认使用 base 模型（145MB），兼顾速度和中文准确度。
"""

import asyncio
import logging
import os
import threading
from pathlib import Path

# 国内环境使用 HF 镜像加速模型下载
if "HF_ENDPOINT" not in os.environ:
    os.environ["HF_ENDPOINT"] = "https://hf-mirror.com"

from app.core.config import settings
from app.engine import BaseEngine, EngineResult

logger = logging.getLogger(__name__)

_global_model = None
_initialized_model_size: str | None = None
_model_lock = threading.Lock()
_model_ready = threading.Event()


def _load_model_sync(model_size: str):
    """同步加载模型（在后台线程中调用）"""
    global _global_model, _initialized_model_size
    from faster_whisper import WhisperModel

    logger.info(f"加载 faster-whisper 模型: {model_size}")
    model = WhisperModel(model_size, device="cpu", compute_type="int8")
    with _model_lock:
        _global_model = model
        _initialized_model_size = model_size
    _model_ready.set()
    logger.info(f"faster-whisper 模型加载完成: {model_size}")


def _get_model(model_size: str):
    """获取模型实例（阻塞直到加载完成）"""
    _model_ready.wait()
    with _model_lock:
        if _initialized_model_size != model_size:
            _load_model_sync(model_size)
        return _global_model


def preload_stt_model():
    """预热 STT 模型 — 后台线程加载，不阻塞服务启动"""
    model_size = "base"
    logger.info(f"后台线程预热 faster-whisper 模型: {model_size}")
    t = threading.Thread(target=_load_model_sync, args=(model_size,), daemon=True)
    t.start()


class SpeechToTextEngine(BaseEngine):
    """语音转文字引擎 — faster-whisper"""

    @property
    def engine_name(self) -> str:
        return "speech-to-text"

    async def execute(self, input_path: str, params: dict) -> EngineResult:
        """
        将音频文件转为文字

        params:
            model_size: tiny/base/small/medium/large（默认 tiny，75MB）
            language: 语言代码（默认 zh）
        """
        input_file = Path(input_path)
        if not input_file.exists():
            return EngineResult(success=False, error=f"输入文件不存在: {input_path}")

        model_size = params.get("model_size", "base")
        language = params.get("language", "zh")

        loop = asyncio.get_running_loop()
        model = await loop.run_in_executor(None, _get_model, model_size)

        last_error = None
        for attempt in range(3):
            try:
                logger.info(f"STT 开始: {input_file.name}, model={model_size}, lang={language}")
                segments, info = await loop.run_in_executor(
                    None,
                    lambda: model.transcribe(
                        str(input_file),
                        language=language,
                        beam_size=5,
                        vad_filter=True,
                        initial_prompt="以下是普通话的句子。请用简体中文输出。",
                    ),
                )

                segment_list = []
                text_parts = []
                for seg in segments:
                    segment_list.append({
                        "start": round(seg.start, 2),
                        "end": round(seg.end, 2),
                        "text": seg.text.strip(),
                    })
                    text_parts.append(seg.text.strip())

                full_text = " ".join(text_parts)

                settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
                output_path = settings.RESULTS_DIR / f"{input_file.stem}_stt.txt"
                output_path.write_text(full_text, encoding="utf-8")

                logger.info(f"STT 完成: {input_file.name} — {len(segment_list)} 段文字")

                return EngineResult(
                    success=True,
                    data={
                        "text": full_text,
                        "segments": segment_list,
                        "language": info.language,
                        "language_probability": round(info.language_probability, 2),
                    },
                    output_files=[str(output_path)],
                )

            except Exception as e:
                last_error = e
                if attempt < 2:
                    wait_time = 2 ** attempt
                    logger.warning(f"STT 第 {attempt + 1} 次重试，{wait_time}s 后重试: {e}")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"STT 3次重试均失败: {e}")
                    return EngineResult(success=False, error=f"STT 失败: {e}")

        return EngineResult(success=False, error=f"STT 失败: {last_error}")
