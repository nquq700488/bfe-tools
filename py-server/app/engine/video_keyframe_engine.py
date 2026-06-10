"""
视频关键帧提取引擎 — 基于 PyAV

支持按时间间隔或指定时间点提取关键帧。
"""

import asyncio
import logging
import math
from pathlib import Path

import av
from PIL import Image as PILImage

from app.core.config import settings
from app.engine import EngineResult, VideoKeyframeEngine
from app.lib.zip_utils import create_zip

logger = logging.getLogger(__name__)


class VideoKeyframeEngineImpl(VideoKeyframeEngine):
    """视频关键帧提取引擎"""

    @property
    def engine_name(self) -> str:
        return "video-keyframe"

    async def execute(self, input_path: str | None, params: dict) -> EngineResult:
        if not input_path:
            return EngineResult(success=False, error="请提供视频文件")
        input_file = Path(input_path)
        if not input_file.exists():
            return EngineResult(success=False, error=f"文件不存在: {input_path}")

        mode = params.get("mode", "interval")
        output_format = params.get("format", "png")
        width = params.get("width")  # 可选
        max_frames = int(params.get("max_frames", 200))

        valid_formats = ("png", "webp")
        if output_format not in valid_formats:
            return EngineResult(success=False, error=f"不支持的输出格式: {output_format}，支持: {valid_formats}")

        try:
            container = await asyncio.get_running_loop().run_in_executor(
                None, av.open, str(input_file)
            )
            video_stream = container.streams.video[0] if container.streams.video else None
            if video_stream is None:
                container.close()
                return EngineResult(success=False, error="视频文件中未找到视频流")

            duration = float(video_stream.duration * video_stream.time_base) if video_stream.duration else 0
            fps = float(video_stream.average_rate) if video_stream.average_rate else 0
            width_orig = video_stream.width
            height_orig = video_stream.height

            if duration <= 0:
                container.close()
                return EngineResult(success=False, error="无法获取视频时长")

            # 确定要提取的时间点
            if mode == "timestamps":
                timestamps_str = params.get("timestamps", "")
                try:
                    timestamps = sorted(set(float(t.strip()) for t in timestamps_str.split(",") if t.strip()))
                except ValueError:
                    container.close()
                    return EngineResult(success=False, error=f"timestamps 格式错误: {timestamps_str}")

                timestamps = [t for t in timestamps if 0 <= t <= duration]
                if not timestamps:
                    container.close()
                    return EngineResult(success=False, error="timestamps 为空或全部超出视频时长范围")
            else:
                # interval 模式
                interval = float(params.get("interval", 5))
                if interval <= 0:
                    container.close()
                    return EngineResult(success=False, error="interval 必须大于 0")

                # 生成时间点列表
                timestamps = []
                t = 0.0
                while t <= duration:
                    timestamps.append(t)
                    t += interval

                # 限制最大帧数：均匀抽取
                if len(timestamps) > max_frames:
                    step = len(timestamps) / max_frames
                    timestamps = [timestamps[math.floor(i * step)] for i in range(max_frames)]

            # 目标宽度
            target_width = int(width) if width else None
            if target_width and target_width <= 0:
                container.close()
                return EngineResult(success=False, error="width 必须大于 0")

            # seek 到每个时间点提取帧
            settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
            frame_paths: list[Path] = []
            actual_timestamps: list[float] = []

            loop = asyncio.get_running_loop()
            ext = f".{output_format}"

            for i, ts in enumerate(timestamps):
                out_name = f"{input_file.stem}_frame_{i:04d}_{ts:.1f}s{ext}"
                out_path = settings.RESULTS_DIR / out_name

                try:
                    # seek 到指定时间点
                    seek_offset = int(ts / float(video_stream.time_base)) if video_stream.time_base else 0
                    container.seek(seek_offset, stream=video_stream)

                    frame_saved = False
                    for packet in container.demux(video_stream):
                        for frame in packet.decode():
                            # 到达目标时间后取第一个有效帧
                            frame_ts = float(frame.pts * video_stream.time_base) if frame.pts and video_stream.time_base else ts
                            if frame_ts >= ts - 0.5:  # 允许 0.5s 容差
                                img = frame.to_image()
                                if target_width and target_width < img.width:
                                    ratio = target_width / img.width
                                    new_h = int(img.height * ratio)
                                    img = img.resize((target_width, new_h), PILImage.LANCZOS)

                                await loop.run_in_executor(None, img.save, str(out_path))
                                frame_paths.append(out_path)
                                actual_timestamps.append(frame_ts)
                                frame_saved = True
                                break
                        if frame_saved:
                            break

                    if not frame_saved:
                        logger.warning(f"未能在 {ts}s 处提取帧，跳过")
                except Exception as e:
                    logger.warning(f"提取帧失败 ({ts}s): {e}")
                    continue

            container.close()

            if not frame_paths:
                return EngineResult(success=False, error="未能提取任何帧")

            # 打包为 zip
            zip_path = settings.RESULTS_DIR / f"{input_file.stem}_keyframes.zip"
            await asyncio.get_running_loop().run_in_executor(
                None, create_zip, [str(p) for p in frame_paths], str(zip_path)
            )

            # 输出文件：zip 在前（主下载），帧图片在后（供预览用 ?file=）
            output_paths = [str(zip_path)] + [str(p) for p in frame_paths]

            logger.info(f"关键帧提取完成: {len(frame_paths)} 帧 → {zip_path}")
            return EngineResult(
                success=True,
                data={
                    "action": "video-keyframe",
                    "mode": mode,
                    "duration": round(duration, 2),
                    "fps": round(fps, 2),
                    "original_resolution": f"{width_orig}x{height_orig}",
                },
                output_files=output_paths,
                metadata={
                    "frame_count": len(frame_paths),
                    "timestamps": [round(t, 2) for t in actual_timestamps],
                    "duration": round(duration, 2),
                    "format": output_format,
                    "frame_files": [{"file_name": p.name, "timestamp": round(t, 2)} for p, t in zip(frame_paths, actual_timestamps)],
                },
            )
        except Exception as e:
            logger.exception("关键帧提取失败")
            return EngineResult(success=False, error=f"关键帧提取失败: {e}")
