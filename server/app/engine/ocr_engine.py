"""
OCR 引擎 — 基于 easyocr（纯 Python，无需系统依赖）

easyocr 支持 80+ 语言，中文识别效果好，pip 安装即可使用。
首次运行会自动下载模型文件到 ~/.EasyOCR/model/。
"""

import logging
from pathlib import Path

from app.core.config import settings
from app.engine import BaseEngine, EngineResult

logger = logging.getLogger(__name__)

# 全局单例 Reader（预热后复用）
_reader = None
_initialized_languages: list[str] | None = None


def _get_reader(languages: list[str]):
    """获取或创建 easyocr Reader 实例（懒加载 + 全局复用）"""
    global _reader, _initialized_languages

    if _reader is None or _initialized_languages != languages:
        import easyocr

        logger.info(f"初始化 EasyOCR Reader，语言: {languages}")
        _reader = easyocr.Reader(languages, gpu=False)
        _initialized_languages = languages
    return _reader


def preload_ocr_reader():
    """预热 OCR Reader — 应用启动时调用，确保首次请求不卡"""
    global _reader, _initialized_languages
    import easyocr

    languages = ["ch_sim", "en"]
    logger.info(f"预热 EasyOCR Reader，语言: {languages}")
    _reader = easyocr.Reader(languages, gpu=False)
    _initialized_languages = languages
    logger.info("EasyOCR Reader 预热完成")


class OcrEngine(BaseEngine):
    """图片文字识别引擎 — easyocr"""

    @property
    def engine_name(self) -> str:
        return "image-ocr"

    async def execute(self, input_path: str, params: dict) -> EngineResult:
        """
        执行 OCR 识别

        Args:
            input_path: 输入图片路径（支持 png/jpg/webp 等）
            params: 可选参数
                - languages: 语言列表，默认 ['ch_sim', 'en']（中文简体 + 英文）

        Returns:
            EngineResult — 包含 recognized_text、segments 或 error
        """
        input_file = Path(input_path)
        if not input_file.exists():
            return EngineResult(success=False, error=f"输入文件不存在: {input_path}")

        languages = params.get("languages", ["ch_sim", "en"])
        try:
            reader = _get_reader(languages)
            results = reader.readtext(
                str(input_file),
                detail=1,
                text_threshold=params.get("text_threshold", 0.4),
                low_text=params.get("low_text", 0.2),
                contrast_ths=params.get("contrast_ths", 0.3),
                width_ths=params.get("width_ths", 0.3),
                min_size=params.get("min_size", 10),
                mag_ratio=params.get("mag_ratio", 2.0),
            )

            segments = []
            full_text_parts = []
            for bbox, text, confidence in results:
                bbox_native = [[float(x), float(y)] for x, y in bbox]
                segments.append({
                    "text": text,
                    "bbox": bbox_native,
                    "confidence": float(confidence),
                })
                full_text_parts.append(text)

            recognized_text = "\n".join(full_text_parts)

            settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)
            output_path = settings.RESULTS_DIR / f"{input_file.stem}_ocr.txt"
            output_path.write_text(recognized_text, encoding="utf-8")

            logger.info(f"OCR 完成: {input_file.name} — {len(segments)} 段文字")

            return EngineResult(
                success=True,
                data={"text": recognized_text, "segments": segments},
                output_files=[str(output_path)],
            )

        except Exception as e:
            logger.exception(f"OCR 处理异常: {input_path}")
            return EngineResult(success=False, error=f"OCR 处理异常: {e}")
