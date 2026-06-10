"""
TTS 引擎 — 基于 edge-tts（微软 Edge 免费 TTS，纯 Python）

支持 100+ 声音，中文质量好，可调语速/语调，输出 mp3/wav。
无需 API Key，无需系统依赖，pip install 即可。

缓存策略：
- 用 文本+声音+语速+语调+格式 的 hash 作为文件名
- 生成前先检查磁盘是否存在 → 已存在则直接返回，跳过生成
"""

import asyncio
import hashlib
import logging
from pathlib import Path

import edge_tts
from edge_tts.exceptions import NoAudioReceived

from app.core.config import settings
from app.engine import BaseEngine, EngineResult

logger = logging.getLogger(__name__)

_FALLBACK_VOICES = [
    "zh-CN-XiaoxiaoNeural",
    "zh-CN-YunxiNeural",
    "zh-CN-XiaoyiNeural",
    "zh-CN-YunjianNeural",
    "zh-CN-YunyangNeural",
    "zh-CN-YunxiaNeural",
]


def _speed_to_rate(speed: float) -> str:
    if speed >= 1.0:
        return f"+{int((speed - 1) * 100)}%"
    return f"{int((speed - 1) * 100)}%"


def _pitch_to_hz(pitch: float) -> str:
    hz = int(pitch * 5)
    return f"{hz:+d}Hz"


def _cache_key(text: str, voice: str, rate: str, pitch_hz: str, output_fmt: str) -> str:
    """用文本+参数的 hash 生成缓存 key，相同文本+参数 → 相同文件 → 命中缓存"""
    raw = f"{text}|{voice}|{rate}|{pitch_hz}|{output_fmt}"
    return hashlib.md5(raw.encode()).hexdigest()[:16]


class TtsEngine(BaseEngine):
    """文字转语音引擎 — edge-tts（带磁盘缓存）"""

    @property
    def engine_name(self) -> str:
        return "text-to-speech"

    async def execute(self, input_path: str, params: dict) -> EngineResult:
        """
        将文本转为语音文件，磁盘有缓存则直接返回

        params:
            text: 要转换的文本
            voiceId: 声音 ID（默认 zh-CN-XiaoxiaoNeural）
            speed: 语速 0.5-2.0（默认 1.0）
            pitch: 语调 -6~+6（默认 0）
            format: 输出格式 mp3/wav（默认 mp3）
        """
        text = params.get("text", "").strip()
        if not text and input_path:
            p = Path(input_path)
            if p.exists():
                text = p.read_text(encoding="utf-8").strip()

        if not text:
            return EngineResult(success=False, error="没有可转换的文本内容")

        voice = params.get("voiceId", "zh-CN-XiaoxiaoNeural")
        speed = float(params.get("speed", 1.0))
        pitch = float(params.get("pitch", 0))
        output_fmt = params.get("format", "mp3")

        speed = max(0.5, min(2.0, speed))
        pitch = max(-6, min(6, pitch))
        rate = _speed_to_rate(speed)
        pitch_hz = _pitch_to_hz(pitch)

        logger.info(f"TTS: voice={voice}, speed={speed}, pitch={pitch}, text={len(text)} chars")

        settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)

        # 缓存 key = 文本+参数 hash
        cache_id = _cache_key(text, voice, rate, pitch_hz, output_fmt)
        out_name = f"tts_{cache_id}.{output_fmt}"
        out_path = settings.RESULTS_DIR / out_name

        # 磁盘有缓存 → 直接返回
        if out_path.exists() and out_path.stat().st_size > 0:
            logger.info(f"TTS 命中缓存: {out_path} ({out_path.stat().st_size} bytes)")
            return EngineResult(
                success=True,
                data={"voice": voice, "format": output_fmt, "text_length": len(text), "cached": True},
                output_files=[str(out_path)],
            )

        # 生成
        last_error = None
        max_attempts = 1 + len(_FALLBACK_VOICES)
        for attempt in range(max_attempts):
            current_voice = voice if attempt == 0 else _FALLBACK_VOICES[attempt - 1]
            try:
                communicate = edge_tts.Communicate(text, current_voice, rate=rate, pitch=pitch_hz)
                await communicate.save(str(out_path))

                logger.info(f"TTS 完成: {out_path} ({out_path.stat().st_size} bytes)")
                return EngineResult(
                    success=True,
                    data={"voice": current_voice, "format": output_fmt, "text_length": len(text)},
                    output_files=[str(out_path)],
                )

            except NoAudioReceived as e:
                last_error = e
                if attempt < max_attempts - 1:
                    wait_time = 2 ** attempt
                    next_voice = _FALLBACK_VOICES[attempt]
                    logger.warning(f"TTS NoAudioReceived，第 {attempt + 1} 次重试，{wait_time}s 后换 voice={next_voice} 重试")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"TTS {max_attempts}次重试均失败: {e}")
                    return EngineResult(success=False, error=f"TTS 失败（网络不稳定）: {e}")

            except Exception as e:
                logger.exception("TTS 处理异常")
                return EngineResult(success=False, error=f"TTS 处理异常: {e}")

        return EngineResult(success=False, error=f"TTS 失败: {last_error}")
