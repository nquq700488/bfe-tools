"""
网页转 PDF 引擎 — 基于 Playwright BrowserManager
"""

import asyncio
import logging
from pathlib import Path

from app.core.config import settings
from app.engine import BaseEngine, EngineResult
from app.lib.browser_manager import browser_manager

logger = logging.getLogger(__name__)


class UrlToPdfEngine(BaseEngine):
    """网页转 PDF 引擎"""

    @property
    def engine_name(self) -> str:
        return "url-to-pdf"

    async def execute(self, input_path: str | None, params: dict) -> EngineResult:
        if not browser_manager.is_available:
            return EngineResult(
                success=False,
                error="playwright 未安装，请运行: pip install playwright && playwright install chromium",
            )

        url = params.get("url", "").strip()
        if not url:
            return EngineResult(success=False, error="请提供目标 URL（params.url）")

        page_format = params.get("format", "A4")
        landscape = params.get("landscape", "false").lower() == "true"
        print_background = params.get("print_background", "true").lower() != "false"

        valid_formats = ("A4", "Letter", "Legal", "Tabloid", "A3", "A5")
        if page_format not in valid_formats:
            return EngineResult(
                success=False,
                error=f"不支持的页面格式: {page_format}，支持: {valid_formats}",
            )

        try:
            settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)

            pdf_bytes = await browser_manager.to_pdf(
                url=url,
                output_format=page_format,
                landscape=landscape,
                print_background=print_background,
            )

            # 从 URL 生成安全文件名
            safe_name = url.replace("https://", "").replace("http://", "").replace("/", "_")[:60]
            out_name = f"{safe_name}.pdf"
            out_path = settings.RESULTS_DIR / out_name
            await asyncio.get_running_loop().run_in_executor(
                None, out_path.write_bytes, pdf_bytes
            )

            logger.info(f"PDF 生成完成: {url} → {out_name} ({len(pdf_bytes)} bytes)")
            return EngineResult(
                success=True,
                data={
                    "action": "url-to-pdf",
                    "format": page_format,
                    "landscape": landscape,
                    "url": url,
                },
                output_files=[str(out_path)],
                metadata={
                    "url": url,
                    "format": page_format,
                    "landscape": landscape,
                    "file_size": len(pdf_bytes),
                },
            )
        except ValueError as e:
            return EngineResult(success=False, error=str(e))
        except RuntimeError as e:
            msg = str(e)
            if "繁忙" in msg or "导航失败" in msg:
                return EngineResult(
                    success=False,
                    error=f"{msg}。建议：检查目标网站是否可访问，或稍后重试",
                )
            return EngineResult(success=False, error=msg)
        except Exception as e:
            logger.exception("PDF 生成失败")
            return EngineResult(success=False, error=f"PDF 生成失败: {e}")
