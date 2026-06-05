"""
媒体格式转换引擎 — 基于 PyAV（FFmpeg Python 绑定）

PyAV 是 FFmpeg C 库的 Python 绑定，无需系统安装 FFmpeg。
支持图片/视频/音频格式转换、编码器选择、质量控制。
"""

import asyncio
import logging
import subprocess
import tempfile
from pathlib import Path

import av

from app.core.config import settings
from app.engine import BaseEngine, EngineResult

logger = logging.getLogger(__name__)

# 图片编码器映射（单帧图片→目标格式）
_IMAGE_CODEC_MAP = {
    "png": "png",
    "jpg": "mjpeg",
    "jpeg": "mjpeg",
    "webp": "libwebp",
    "gif": "gif",
    "bmp": "bmp",
}

# 视频编码器映射（视频编码器, 音频编码器）
_VIDEO_CODEC_MAP = {
    "mp4": ("libx264", "aac"),
    "webm": ("libvpx", "libopus"),
}

# 音频编码器映射（视频编码器=None, 音频编码器）
_AUDIO_CODEC_MAP = {
    "mp3": (None, "libmp3lame"),
    "ogg": (None, "libvorbis"),
    "wav": (None, "pcm_s16le"),
}

# 所有支持的输出格式（合并三类 codec map 的 key）
_ALL_SUPPORTED_FORMATS = frozenset(
    list(_IMAGE_CODEC_MAP.keys())
    + list(_VIDEO_CODEC_MAP.keys())
    + list(_AUDIO_CODEC_MAP.keys())
)

# 文件扩展名 → 媒体类别映射
_EXT_TO_CATEGORY = {
    # 图片
    "png": "image",
    "jpg": "image",
    "jpeg": "image",
    "webp": "image",
    "gif": "image",
    "bmp": "image",
    "heic": "image",
    "heif": "image",
    # 视频
    "mp4": "video",
    "webm": "video",
    "avi": "video",
    "mov": "video",
    "mkv": "video",
    # 音频
    "mp3": "audio",
    "wav": "audio",
    "ogg": "audio",
    "m4a": "audio",
    "flac": "audio",
    "aac": "audio",
}

_QUALITY_PRESETS = {
    "fast": "fast",
    "medium": "medium",
    "slow": "slow",
}

# HEIC→中间格式输出文件名模式
_HEIC_INTERMEDIATE_SUFFIX = "_heic_intermediate.png"


class TranscodeEngine(BaseEngine):
    """媒体格式转换引擎 — PyAV（图片/视频/音频）"""

    @property
    def engine_name(self) -> str:
        return "media-convert"

    async def execute(self, input_path: str, params: dict) -> EngineResult:
        """
        将媒体文件转换为目标格式

        params:
            target_format: 目标格式，默认 mp4
            video_codec: 视频编码器（可选，自动根据格式选择）
            audio_codec: 音频编码器（可选，自动根据格式选择）
            quality: 质量 preset（fast/medium/slow），默认 medium
        """
        input_file = Path(input_path)
        if not input_file.exists():
            return EngineResult(success=False, error=f"输入文件不存在: {input_path}")

        target_format = params.get("target_format", "mp4")
        video_codec = params.get("video_codec")
        audio_codec = params.get("audio_codec")
        quality = params.get("quality", "medium")

        if target_format not in _ALL_SUPPORTED_FORMATS:
            return EngineResult(
                success=False,
                error=f"不支持的目标格式: {target_format}，支持: {sorted(_ALL_SUPPORTED_FORMATS)}",
            )

        # 根据输入/输出格式判断媒体类别
        input_ext = input_file.suffix.lstrip(".").lower()
        input_category = _EXT_TO_CATEGORY.get(input_ext)
        if input_category is None:
            return EngineResult(
                success=False,
                error=f"无法识别的输入格式: .{input_ext}，支持的输入扩展名: {sorted(_EXT_TO_CATEGORY.keys())}",
            )

        if target_format in _IMAGE_CODEC_MAP:
            target_category = "image"
        elif target_format in _VIDEO_CODEC_MAP:
            target_category = "video"
        else:
            target_category = "audio"

        # 禁止跨类别转换（如 image→mp3, audio→mp4）
        if input_category != target_category:
            return EngineResult(
                success=False,
                error=f"不支持跨类别转换: [{input_ext}] → [{target_format}]（{input_category} → {target_category}），请选择同类别输出格式",
            )

        # HEIC/HEIF 预处理：先转为中间 PNG
        working_path = str(input_file)
        work_dir: str | None = None
        if input_ext in ("heic", "heif"):
            import tempfile
            work_dir = tempfile.mkdtemp(prefix="heic_convert_")
            intermediate_path = str(Path(work_dir) / _HEIC_INTERMEDIATE_SUFFIX)
            success = await asyncio.get_running_loop().run_in_executor(
                None, self._heic_to_intermediate, str(input_file), intermediate_path,
            )
            if not success:
                return EngineResult(success=False, error="HEIC/HEIF 预处理失败")
            working_path = intermediate_path
            input_ext = "png"

        output_name = f"{input_file.stem}_converted.{target_format}"
        output_path = settings.RESULTS_DIR / output_name
        settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)

        logger.info(f"转码开始: {input_file.name} -> {output_name} (类别={input_category})")

        last_error = None
        try:
            for attempt in range(3):
                try:
                    # 根据类别路由到不同的转码方法
                    if target_format in _IMAGE_CODEC_MAP and input_category == "image":
                        await asyncio.get_running_loop().run_in_executor(
                            None,
                            self._transcode_image,
                            working_path,
                            str(output_path),
                            target_format,
                        )
                    else:
                        # 视频/音频走原有流程
                        fmt_codecs = _VIDEO_CODEC_MAP.get(target_format) or _AUDIO_CODEC_MAP.get(target_format)
                        if fmt_codecs is None:
                            return EngineResult(
                                success=False,
                                error=f"输入类别 [{input_category}] 不支持转换为 [{target_format}]",
                            )
                        default_vcodec, default_acodec = fmt_codecs
                        video_codec = video_codec or default_vcodec
                        audio_codec = audio_codec or default_acodec

                        await asyncio.get_running_loop().run_in_executor(
                            None,
                            self._transcode,
                            working_path,
                            str(output_path),
                            video_codec,
                            audio_codec,
                            quality,
                        )

                    if not output_path.exists():
                        return EngineResult(success=False, error="转码成功但输出文件未生成")

                    logger.info(f"转码完成: {output_path} ({output_path.stat().st_size} bytes)")

                    return EngineResult(
                        success=True,
                        data={
                            "original": input_file.name,
                            "output": output_name,
                            "format": target_format,
                            "size": output_path.stat().st_size,
                        },
                        output_files=[str(output_path)],
                    )

                except Exception as e:
                    last_error = e
                    if attempt < 2:
                        wait_time = 2 ** attempt
                        logger.warning(f"转码第 {attempt + 1} 次重试，{wait_time}s 后重试: {e}")
                        await asyncio.sleep(wait_time)
                    else:
                        logger.error(f"转码 3 次重试均失败: {e}")
                        return EngineResult(success=False, error=f"转码失败: {e}")

            return EngineResult(success=False, error=f"转码失败: {last_error}")
        finally:
            # 清理 HEIC 临时目录（无论成功或失败）
            if work_dir:
                import shutil
                shutil.rmtree(work_dir, ignore_errors=True)

    def _heic_to_intermediate(self, input_path: str, output_path: str) -> bool:
        """
        使用 macOS sips 将 HEIC/HEIF 转为中间 PNG

        返回 True 表示成功，False 表示失败
        """
        try:
            result = subprocess.run(
                ["sips", "-s", "format", "png", input_path, "--out", output_path],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode != 0:
                logger.error(f"sips HEIC 转换失败: {result.stderr.strip()}")
                return False
            logger.info(f"HEIC 预处理完成: {input_path} -> {output_path}")
            return True
        except FileNotFoundError:
            logger.error("sips 命令不可用（仅 macOS 支持 HEIC 预处理）")
            return False
        except subprocess.TimeoutExpired:
            logger.error("sips HEIC 转换超时")
            return False

    def _transcode_image(self, input_path: str, output_path: str, target_format: str, codec_name: str | None = None) -> None:
        """
        单帧图片转码（同步，在 executor 中调用）

        使用 Pillow 处理静态图片转换（PNG/JPEG/WebP/BMP/GIF），
        PyAV 构建的图片编码器支持不完整（png/bmp/gif 的 avcodec_open2 失败）。

        参数:
            input_path: 输入文件路径
            output_path: 输出文件路径
            target_format: 目标格式（png/jpg/webp/gif/bmp）
            codec_name: 已废弃（改用 Pillow，保留参数兼容）
        """
        from PIL import Image

        pil_format = {
            "png": "PNG",
            "jpg": "JPEG",
            "jpeg": "JPEG",
            "webp": "WEBP",
            "bmp": "BMP",
            "gif": "GIF",
        }.get(target_format)

        if pil_format is None:
            raise ValueError(f"不支持的图片目标格式: {target_format}")

        with Image.open(input_path) as img:
            logger.info(f"图片转码 (Pillow): {img.size[0]}x{img.size[1]} -> {target_format}")

            # JPEG 不支持透明通道，转 RGB
            if pil_format == "JPEG" and img.mode in ("RGBA", "P", "LA"):
                background = Image.new("RGB", img.size, (255, 255, 255))
                if img.mode == "P":
                    img = img.convert("RGBA")
                background.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
                img = background
            elif img.mode in ("RGBA", "P", "LA"):
                img = img.convert("RGBA")

            img.save(output_path, pil_format)

    def _transcode(self, input_path: str, output_path: str, video_codec: str | None, audio_codec: str | None, quality: str) -> None:
        """
        执行视频/音频转码（同步，在 executor 中调用）
        """
        # 从输出文件扩展名推导容器格式（mp4/webm/mp3/wav/ogg）
        container_format = Path(output_path).suffix.lstrip(".")

        with av.open(input_path) as input_container:
            video_stream = input_container.streams.video[0] if input_container.streams.video else None
            audio_stream = input_container.streams.audio[0] if input_container.streams.audio else None

            with av.open(output_path, "w", format=container_format) as output_container:
                out_video = None
                out_audio = None

                if video_stream and video_codec:
                    out_video = output_container.add_stream(video_codec, rate=30)
                    out_video.width = video_stream.width
                    out_video.height = video_stream.height
                    out_video.pix_fmt = "yuv420p"
                    logger.info(f"视频流: {video_stream.width}x{video_stream.height} -> {video_codec}")

                if audio_stream and audio_codec:
                    out_audio = output_container.add_stream(audio_codec, rate=audio_stream.rate)
                    logger.info(f"音频流: {audio_stream.rate}Hz -> {audio_codec}")

                for packet in input_container.demux(video_stream if video_stream else audio_stream):
                    if packet.dts is None:
                        continue

                    if video_stream and video_codec and packet.stream == video_stream:
                        for frame in packet.decode():
                            if out_video:
                                for encoded in out_video.encode(frame):
                                    output_container.mux(encoded)
                    elif audio_stream and audio_codec and packet.stream == audio_stream:
                        for frame in packet.decode():
                            if out_audio:
                                for encoded in out_audio.encode(frame):
                                    output_container.mux(encoded)

                if out_video:
                    for encoded in out_video.encode():
                        output_container.mux(encoded)
                if out_audio:
                    for encoded in out_audio.encode():
                        output_container.mux(encoded)
