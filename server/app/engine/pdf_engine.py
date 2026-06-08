"""
PDF 工具箱引擎 — 基于 PyMuPDF（fitz）

支持操作：
- split: 按页码范围提取页面为独立 PDF
- merge: 合并多个 PDF（输入为 zip）
- compress: 压缩 PDF
- extract_text: 提取 PDF 文字内容
- extract_images: 提取嵌入图片
"""

import asyncio
import logging
import tempfile
from pathlib import Path

from app.core.config import settings
from app.engine import EngineResult, PdfEngine
from app.lib.zip_utils import create_zip, safe_unzip

logger = logging.getLogger(__name__)

try:
    import fitz

    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    fitz = None  # type: ignore[assignment]


def _parse_page_range(page_spec: str, total_pages: int) -> list[int]:
    """
    解析页码范围字符串，如 "1-5,7,9" → [0,1,2,3,4,6,8]（0-based）

    Args:
        page_spec: 页码范围，如 "1-5,7,9"（1-based）
        total_pages: 总页数

    Returns:
        0-based 页码列表
    """
    pages: set[int] = set()
    for part in page_spec.split(","):
        part = part.strip()
        if "-" in part:
            start_str, end_str = part.split("-", 1)
            start = int(start_str.strip()) - 1
            end = int(end_str.strip()) - 1
            for p in range(max(0, start), min(end + 1, total_pages)):
                pages.add(p)
        else:
            p = int(part) - 1
            if 0 <= p < total_pages:
                pages.add(p)
    return sorted(pages)


class PdfEngineImpl(PdfEngine):
    """PDF 工具箱引擎 — PyMuPDF"""

    @property
    def engine_name(self) -> str:
        return "pdf-toolkit"

    async def execute(self, input_path: str | None, params: dict) -> EngineResult:
        if not PYMUPDF_AVAILABLE:
            return EngineResult(success=False, error="PyMuPDF (fitz) 未安装，请运行: pip install pymupdf")

        action = params.get("action", "merge")

        if action == "split":
            return await self._split(input_path, params)
        elif action == "merge":
            return await self._merge(input_path)
        elif action == "compress":
            return await self._compress(input_path)
        elif action == "extract_text":
            return await self._extract_text(input_path)
        elif action == "extract_images":
            return await self._extract_images(input_path)
        else:
            return EngineResult(
                success=False,
                error=f"不支持的操作: {action}，支持: split / merge / compress / extract_text / extract_images",
            )

    async def _split(self, input_path: str | None, params: dict) -> EngineResult:
        """按页码范围拆分 PDF"""
        if not input_path:
            return EngineResult(success=False, error="请提供 PDF 文件")
        input_file = Path(input_path)
        if not input_file.exists():
            return EngineResult(success=False, error=f"文件不存在: {input_path}")

        page_spec = params.get("pages", "")
        if not page_spec:
            return EngineResult(success=False, error="请指定页码范围，如 pages=1-5,7,9")

        try:
            doc = await asyncio.get_running_loop().run_in_executor(None, fitz.open, str(input_file))
            total_pages = doc.page_count
            pages = _parse_page_range(page_spec, total_pages)

            if not pages:
                doc.close()
                return EngineResult(success=False, error=f"页码范围无匹配页: {page_spec}（总页数: {total_pages}）")

            settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
            output_files: list[Path] = []

            for _idx, page_num in enumerate(pages):
                out_doc = fitz.open()
                out_doc.insert_pdf(doc, from_page=page_num, to_page=page_num)
                out_name = f"{input_file.stem}_p{page_num + 1}.pdf"
                out_path = settings.RESULTS_DIR / out_name
                await asyncio.get_running_loop().run_in_executor(None, out_doc.save, str(out_path))
                out_doc.close()
                output_files.append(out_path)

            doc.close()

            # 打包为 zip
            zip_path = settings.RESULTS_DIR / f"{input_file.stem}_split.zip"
            await asyncio.get_running_loop().run_in_executor(
                None, create_zip, [str(p) for p in output_files], str(zip_path)
            )

            logger.info(f"PDF 拆分完成: {len(pages)} 页 → {zip_path}")
            return EngineResult(
                success=True,
                data={"action": "split", "total_pages": total_pages, "extracted_pages": len(pages)},
                output_files=[str(zip_path)],
                metadata={"pages": [p + 1 for p in pages], "total_pages": total_pages},
            )
        except Exception as e:
            logger.exception("PDF 拆分失败")
            return EngineResult(success=False, error=f"PDF 拆分失败: {e}")

    async def _merge(self, input_path: str | None) -> EngineResult:
        """合并多个 PDF（输入为 zip）"""
        if not input_path:
            return EngineResult(success=False, error="请提供包含 PDF 文件的 zip 包")
        input_file = Path(input_path)
        if not input_file.exists():
            return EngineResult(success=False, error=f"文件不存在: {input_path}")

        if input_file.suffix.lower() != ".zip":
            return EngineResult(success=False, error="merge 操作需要上传 zip 文件（内含多个 PDF）")

        tmpdir = None
        try:
            tmpdir = tempfile.mkdtemp(prefix="pdf_merge_")
            extracted = safe_unzip(input_file, tmpdir)

            # 筛选 .pdf 文件并按文件名排序
            pdf_files = sorted(
                [p for p in extracted if p.suffix.lower() == ".pdf"],
                key=lambda p: p.name,
            )
            if not pdf_files:
                return EngineResult(success=False, error="zip 中未找到 PDF 文件")

            if len(pdf_files) < 2:
                return EngineResult(success=False, error="至少需要 2 个 PDF 文件才能合并")

            # 合并
            merged_doc = fitz.open()
            for pdf_file in pdf_files:
                sub_doc = await asyncio.get_running_loop().run_in_executor(None, fitz.open, str(pdf_file))
                merged_doc.insert_pdf(sub_doc)
                sub_doc.close()

            settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
            out_path = settings.RESULTS_DIR / "merged.pdf"
            await asyncio.get_running_loop().run_in_executor(None, merged_doc.save, str(out_path))
            total_pages = merged_doc.page_count
            merged_doc.close()

            logger.info(f"PDF 合并完成: {len(pdf_files)} 文件 → {out_path}")
            return EngineResult(
                success=True,
                data={"action": "merge", "file_count": len(pdf_files), "total_pages": total_pages},
                output_files=[str(out_path)],
                metadata={"source_files": [p.name for p in pdf_files], "total_pages": total_pages},
            )
        except Exception as e:
            logger.exception("PDF 合并失败")
            return EngineResult(success=False, error=f"PDF 合并失败: {e}")
        finally:
            if tmpdir:
                import shutil
                shutil.rmtree(tmpdir, ignore_errors=True)

    async def _compress(self, input_path: str | None) -> EngineResult:
        """压缩 PDF"""
        if not input_path:
            return EngineResult(success=False, error="请提供 PDF 文件")
        input_file = Path(input_path)
        if not input_file.exists():
            return EngineResult(success=False, error=f"文件不存在: {input_path}")

        try:
            doc = await asyncio.get_running_loop().run_in_executor(None, fitz.open, str(input_file))
            settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
            out_path = settings.RESULTS_DIR / f"{input_file.stem}_compressed.pdf"

            # PyMuPDF 压缩：garbage=4（最大压缩）+ deflate=True
            await asyncio.get_running_loop().run_in_executor(
                None,
                lambda: doc.save(str(out_path), garbage=4, deflate=True),
            )
            original_size = input_file.stat().st_size
            compressed_size = out_path.stat().st_size
            doc.close()

            ratio = (1 - compressed_size / original_size) * 100 if original_size > 0 else 0
            logger.info(f"PDF 压缩完成: {original_size} → {compressed_size} bytes ({ratio:.1f}% 减少)")
            return EngineResult(
                success=True,
                data={"action": "compress", "original_size": original_size, "compressed_size": compressed_size, "ratio": round(ratio, 1)},
                output_files=[str(out_path)],
            )
        except Exception as e:
            logger.exception("PDF 压缩失败")
            return EngineResult(success=False, error=f"PDF 压缩失败: {e}")

    async def _extract_text(self, input_path: str | None) -> EngineResult:
        """提取 PDF 文字内容"""
        if not input_path:
            return EngineResult(success=False, error="请提供 PDF 文件")
        input_file = Path(input_path)
        if not input_file.exists():
            return EngineResult(success=False, error=f"文件不存在: {input_path}")

        try:
            doc = await asyncio.get_running_loop().run_in_executor(None, fitz.open, str(input_file))
            total_pages = doc.page_count
            pages_info: list[dict] = []
            all_text_parts: list[str] = []

            for i in range(total_pages):
                page = doc[i]
                text = page.get_text()
                pages_info.append({"page": i + 1, "char_count": len(text)})
                all_text_parts.append(text)

            doc.close()

            full_text = "\n\n".join(all_text_parts)
            logger.info(f"PDF 文字提取完成: {total_pages} 页, {len(full_text)} 字符")
            return EngineResult(
                success=True,
                data={"text": full_text, "action": "extract_text", "total_chars": len(full_text)},
                metadata={"pages": pages_info, "total_pages": total_pages},
            )
        except Exception as e:
            logger.exception("PDF 文字提取失败")
            return EngineResult(success=False, error=f"PDF 文字提取失败: {e}")

    async def _extract_images(self, input_path: str | None) -> EngineResult:
        """提取 PDF 中嵌入的图片"""
        if not input_path:
            return EngineResult(success=False, error="请提供 PDF 文件")
        input_file = Path(input_path)
        if not input_file.exists():
            return EngineResult(success=False, error=f"文件不存在: {input_path}")

        try:
            doc = await asyncio.get_running_loop().run_in_executor(None, fitz.open, str(input_file))
            settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
            image_paths: list[Path] = []
            img_count = 0

            for page_num in range(doc.page_count):
                page = doc[page_num]
                image_list = page.get_images(full=True)
                for img_idx, img_info in enumerate(image_list):
                    xref = img_info[0]
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    ext = base_image["ext"]
                    img_name = f"{input_file.stem}_p{page_num + 1}_img{img_idx + 1}.{ext}"
                    img_path = settings.RESULTS_DIR / img_name
                    await asyncio.get_running_loop().run_in_executor(
                        None, lambda p=img_path, b=image_bytes: p.write_bytes(b)
                    )
                    image_paths.append(img_path)
                    img_count += 1

            doc.close()

            if not image_paths:
                return EngineResult(success=False, error="PDF 中未找到嵌入图片")

            zip_path = settings.RESULTS_DIR / f"{input_file.stem}_images.zip"
            await asyncio.get_running_loop().run_in_executor(
                None, create_zip, [str(p) for p in image_paths], str(zip_path)
            )

            logger.info(f"PDF 图片提取完成: {img_count} 张 → {zip_path}")
            return EngineResult(
                success=True,
                data={"action": "extract_images", "image_count": img_count},
                output_files=[str(zip_path)],
                metadata={"image_count": img_count, "files": [p.name for p in image_paths]},
            )
        except Exception as e:
            logger.exception("PDF 图片提取失败")
            return EngineResult(success=False, error=f"PDF 图片提取失败: {e}")
