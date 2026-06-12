"""
多分辨率截图引擎 — 基于 Playwright BrowserManager

对指定 URL 进行多分辨率截图，生成响应式图片 srcset 代码。
"""

import asyncio
import logging
from pathlib import Path

from app.core.config import settings
from app.engine import EngineResult, ResponsiveScreenshotEngine
from app.lib.browser_manager import browser_manager
from app.lib.zip_utils import create_zip

logger = logging.getLogger(__name__)


class ScreenshotEngine(ResponsiveScreenshotEngine):
    """多分辨率截图引擎"""

    @property
    def engine_name(self) -> str:
        return "responsive-screenshot"

    async def execute(self, input_path: str | None, params: dict) -> EngineResult:
        if not browser_manager.is_available:
            return EngineResult(
                success=False,
                error="playwright 未安装，请运行: pip install playwright && "
                "playwright install chromium",
            )

        url = params.get("url", "").strip()
        if not url:
            return EngineResult(success=False, error="请提供目标 URL（params.url）")

        widths_str = params.get("widths", "320,768,1024,1440,1920")
        full_page = params.get("full_page", "true").lower() == "true"
        output_format = params.get("format", "png")

        try:
            widths = [int(w.strip()) for w in widths_str.split(",") if w.strip()]
        except ValueError:
            return EngineResult(
                success=False,
                error=f"widths 格式错误，应为逗号分隔的整数: {widths_str}",
            )

        if not widths:
            return EngineResult(success=False, error="widths 不能为空")

        valid_formats = ("png", "jpeg")
        if output_format not in valid_formats:
            return EngineResult(
                success=False,
                error=f"不支持的格式: {output_format}，支持: {valid_formats}",
            )

        settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
        screenshot_paths: list[Path] = []

        try:
            for width in widths:
                out_name = f"screenshot_{width}.{output_format}"
                out_path = settings.RESULTS_DIR / out_name

                height = 900 if width > 768 else int(width * 16 / 9)
                screenshot_bytes = await browser_manager.screenshot(
                    url=url,
                    width=width,
                    height=height,
                    full_page=full_page,
                    output_format=output_format,
                )
                await asyncio.get_running_loop().run_in_executor(
                    None, out_path.write_bytes, screenshot_bytes
                )
                screenshot_paths.append(out_path)
                logger.info(f"截图完成: {width}px ({len(screenshot_bytes)} bytes)")

            # 单分辨率：直接返回图片；多分辨率：打包 zip
            if len(screenshot_paths) == 1:
                output_path = screenshot_paths[0]
            else:
                output_path = settings.RESULTS_DIR / "screenshots.zip"
                await asyncio.get_running_loop().run_in_executor(
                    None, create_zip, [str(p) for p in screenshot_paths], str(output_path)
                )

            logger.info(f"截图完成: {len(widths)} 分辨率 → {output_path}")
            return EngineResult(
                success=True,
                data={"action": "responsive-screenshot", "format": output_format},
                output_files=[str(output_path)],
                metadata={
                    "widths": widths,
                    "url": url,
                    "full_page": full_page,
                    "files": [{"file_name": output_path.name, "width": widths[0]}],
                },
            )
        except ValueError as e:
            return EngineResult(success=False, error=str(e))
        except RuntimeError as e:
            msg = str(e)
            if "繁忙" in msg or "导航失败" in msg:
                return EngineResult(
                    success=False,
                    error=f"{msg}。建议：选择较低分辨率、"
                    "检查目标网站是否可访问，或稍后重试",
                )
            return EngineResult(success=False, error=msg)
        except Exception as e:
            logger.exception("多分辨率截图失败")
            return EngineResult(success=False, error=f"截图失败: {e}")
