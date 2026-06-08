"""
图片批量处理引擎 — 基于 Pillow

支持批量 resize/格式转换，生成响应式 srcset 代码。
"""

import asyncio
import logging
import tempfile
from pathlib import Path

from PIL import Image

from app.core.config import settings
from app.engine import EngineResult, ImageBatchEngine
from app.lib.zip_utils import create_zip, safe_unzip

logger = logging.getLogger(__name__)

_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
_FORMAT_EXTS = {
    "webp": ".webp",
    "png": ".png",
    "jpg": ".jpg",
    "jpeg": ".jpg",
    "avif": ".avif",
}

# 检查 AVIF 支持
def _is_avif_supported() -> bool:
    """检测 Pillow 是否支持 AVIF 格式"""
    try:
        return "AVIF" in getattr(Image, "SAVE", {}).get("AVIF", []) or "AVIF" in Image.registered_extensions().values()
    except Exception:
        pass
    return False


class ImageBatchEngineImpl(ImageBatchEngine):
    """图片批量处理引擎"""

    @property
    def engine_name(self) -> str:
        return "image-batch"

    async def execute(self, input_path: str | None, params: dict) -> EngineResult:
        widths_str = params.get("widths", "1920,2880,3840")
        target_format = params.get("format", "webp").lower()
        quality = int(params.get("quality", 85))
        suffix_rule = params.get("suffix_rule", "@1x")

        # 校验格式
        valid_formats = ("webp", "png", "jpg", "jpeg")
        if _is_avif_supported():
            valid_formats = (*valid_formats, "avif")

        if target_format not in valid_formats:
            return EngineResult(
                success=False,
                error=f"不支持的输出格式: {target_format}，支持: {valid_formats}",
            )

        try:
            widths = [int(w.strip()) for w in widths_str.split(",") if w.strip()]
        except ValueError:
            return EngineResult(success=False, error=f"widths 格式错误: {widths_str}")

        if not widths:
            return EngineResult(success=False, error="widths 不能为空")

        if quality < 1 or quality > 100:
            return EngineResult(success=False, error="quality 必须在 1-100 之间")

        # 收集输入文件
        tmpdir = None
        try:
            if input_path:
                input_file = Path(input_path)
                if not input_file.exists():
                    return EngineResult(success=False, error=f"文件不存在: {input_path}")

                if input_file.suffix.lower() == ".zip":
                    tmpdir = tempfile.mkdtemp(prefix="img_batch_")
                    image_files = safe_unzip(input_file, tmpdir)
                else:
                    image_files = [input_file]
            else:
                return EngineResult(success=False, error="请提供图片文件或 zip 包")

            # 只处理图片文件
            image_files = [p for p in image_files if p.suffix.lower() in _IMAGE_EXTENSIONS]
            if not image_files:
                return EngineResult(success=False, error="未找到支持的图片文件")

            settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
            output_paths: list[Path] = []
            srcset_lines: list[str] = []
            all_files_info: list[dict] = []

            ext = _FORMAT_EXTS.get(target_format, f".{target_format}")

            for img_file in image_files:
                stem = img_file.stem
                loop = asyncio.get_running_loop()

                for width in widths:
                    # 根据 suffix_rule 生成文件名
                    if suffix_rule == "w":
                        out_name = f"{stem}-{width}w{ext}"
                    elif suffix_rule == "_1x":
                        scale_label = f"_{width}" if width > 0 else ""
                        out_name = f"{stem}{scale_label}{ext}"
                    else:  # @1x 等
                        px_ratio = width / 1920 if widths[-1] and widths[-1] > 0 else 1
                        label = f"@{round(px_ratio, 1)}x".rstrip(".0x").replace("@1x", "") or ""
                        out_name = f"{stem}{label}{ext}" if len(widths) == 1 else f"{stem}_{width}{ext}"

                    out_path = settings.RESULTS_DIR / out_name

                    def _resize_and_save(src=img_file, dst=str(out_path), w=width, fmt=target_format, q=quality):
                        with Image.open(src) as img:
                            if img.mode in ("RGBA", "P", "LA") and fmt in ("jpg", "jpeg"):
                                bg = Image.new("RGB", img.size, (255, 255, 255))
                                if img.mode == "P":
                                    img = img.convert("RGBA")
                                bg.paste(img, mask=img.split()[-1] if img.mode == "RGBA" else None)
                                img = bg

                            ratio = w / img.width
                            if ratio < 1.0:
                                new_h = int(img.height * ratio)
                                img = img.resize((w, new_h), Image.LANCZOS)

                            save_kwargs = {}
                            if fmt in ("jpg", "jpeg"):
                                save_kwargs["quality"] = q
                                save_kwargs["optimize"] = True
                            elif fmt == "webp":
                                save_kwargs["quality"] = q
                            elif fmt == "png":
                                save_kwargs["optimize"] = True
                            img.save(dst, format=fmt.upper() if fmt != "jpg" else "JPEG", **save_kwargs)

                    await loop.run_in_executor(None, _resize_and_save)
                    output_paths.append(out_path)
                    file_size = out_path.stat().st_size
                    all_files_info.append({
                        "source": img_file.name,
                        "output": out_name,
                        "width": width,
                        "file_size": file_size,
                    })
                    srcset_lines.append(f"{out_name} {width}w")

            # 打包为 zip
            zip_path = settings.RESULTS_DIR / "images.zip"
            await asyncio.get_running_loop().run_in_executor(
                None, create_zip, [str(p) for p in output_paths], str(zip_path)
            )

            srcset = ",\n".join(srcset_lines)
            logger.info(f"图片批处理完成: {len(image_files)} 图片 × {len(widths)} 尺寸 → {zip_path}")
            return EngineResult(
                success=True,
                data={"action": "image-batch", "format": target_format, "total_outputs": len(output_paths)},
                output_files=[str(zip_path)],
                metadata={
                    "srcset": srcset,
                    "format": target_format,
                    "files": all_files_info,
                    "widths": widths,
                },
            )
        except Exception as e:
            logger.exception("图片批处理失败")
            return EngineResult(success=False, error=f"图片批处理失败: {e}")
        finally:
            if tmpdir:
                import shutil
                shutil.rmtree(tmpdir, ignore_errors=True)
