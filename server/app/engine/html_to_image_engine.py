"""
HTML/CSS 渲染截图引擎 — 基于 Playwright BrowserManager

将 HTML/CSS 源码渲染为图片。
"""

import asyncio
import logging

from app.core.config import settings
from app.engine import EngineResult, HtmlToImageEngine
from app.lib.browser_manager import browser_manager

logger = logging.getLogger(__name__)

_MAX_HTML_SIZE = 2 * 1024 * 1024  # 2MB


class HtmlToImageEngineImpl(HtmlToImageEngine):
    """HTML 渲染截图引擎"""

    @property
    def engine_name(self) -> str:
        return "html-to-image"

    async def execute(self, input_path: str | None, params: dict) -> EngineResult:
        if not browser_manager.is_available:
            return EngineResult(
                success=False,
                error="playwright 未安装，请运行: pip install playwright && playwright install chromium",
            )

        html = params.get("html", "").strip()
        if not html:
            return EngineResult(success=False, error="请提供 HTML 内容（params.html）")

        if len(html.encode("utf-8")) > _MAX_HTML_SIZE:
            return EngineResult(
                success=False,
                error=f"HTML 内容过大（{len(html.encode('utf-8')) / 1024:.0f}KB），最大允许 2MB",
            )

        css = params.get("css", "")
        width = int(params.get("width", 1200))
        full_page = params.get("full_page", "true").lower() == "true"
        output_format = params.get("format", "png")

        valid_formats = ("png", "jpeg")
        if output_format not in valid_formats:
            return EngineResult(success=False, error=f"不支持的格式: {output_format}，支持: {valid_formats}")

        if width < 320 or width > 5120:
            return EngineResult(success=False, error=f"width 必须在 320-5120 之间，当前: {width}")

        try:
            settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)

            screenshot_bytes = await browser_manager.render_html(
                html=html,
                css=css,
                width=width,
                full_page=full_page,
                output_format=output_format,
            )

            out_name = f"render_{abs(hash(html)) % (10 ** 10)}.{output_format}"
            out_path = settings.RESULTS_DIR / out_name
            await asyncio.get_running_loop().run_in_executor(
                None, out_path.write_bytes, screenshot_bytes
            )

            logger.info(f"HTML 渲染完成: {len(html)} chars → {out_path} ({len(screenshot_bytes)} bytes)")
            return EngineResult(
                success=True,
                data={"action": "html-to-image", "format": output_format, "width": width, "full_page": full_page},
                output_files=[str(out_path)],
                metadata={
                    "html_length": len(html),
                    "width": width,
                    "full_page": full_page,
                    "format": output_format,
                    "file_size": len(screenshot_bytes),
                },
            )
        except ValueError as e:
            return EngineResult(success=False, error=str(e))
        except RuntimeError as e:
            return EngineResult(success=False, error=str(e))
        except Exception as e:
            logger.exception("HTML 渲染截图失败")
            return EngineResult(success=False, error=f"HTML 渲染失败: {e}")
