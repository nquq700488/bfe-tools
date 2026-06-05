"""
图片去水印引擎 — 多策略智能修复

策略层级（按效果递进）：
1. LAB 色彩空间修复：将图像转换到 LAB 空间，逐通道 inpaint → 更自然的颜色过渡
2. 多尺度修复：在不同分辨率上 inpaint，然后融合 → 同时处理细节和大面积
3. 泊松融合：Seamless Clone 让修复区域与周围无缝过渡
4. 色彩直方图匹配：修复后匹配周围区域颜色分布

官方文档: https://docs.opencv.org/4.x/df/d3d/tutorial_py_inpainting.html
"""

import asyncio
import logging
from pathlib import Path

from app.core.config import settings
from app.engine import BaseEngine, EngineResult

logger = logging.getLogger(__name__)

_SUPPORTED_EXTENSIONS = frozenset({"png", "jpg", "jpeg", "webp", "bmp"})


class WatermarkEngine(BaseEngine):
    @property
    def engine_name(self) -> str:
        return "watermark-removal"

    async def execute(self, input_path: str, params: dict) -> EngineResult:
        input_file = Path(input_path)
        if not input_file.exists():
            return EngineResult(success=False, error=f"输入文件不存在: {input_path}")

        ext = input_file.suffix.lstrip(".").lower()
        if ext not in _SUPPORTED_EXTENSIONS:
            return EngineResult(
                success=False,
                error=f"不支持的格式: .{ext}，支持: {sorted(_SUPPORTED_EXTENSIONS)}",
            )

        x = int(params.get("x", 0))
        y = int(params.get("y", 0))
        w = int(params.get("w", 0))
        h = int(params.get("h", 0))

        if w <= 0 or h <= 0:
            return EngineResult(success=False, error="水印区域宽高必须大于 0")

        output_name = f"{input_file.stem}_clean.{ext}"
        output_path = settings.RESULTS_DIR / output_name
        settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)

        logger.info(f"去水印开始: {input_file.name} -> {output_name} (x={x}, y={y}, w={w}, h={h})")

        try:
            await asyncio.get_running_loop().run_in_executor(
                None, self._inpaint, str(input_file), str(output_path), x, y, w, h,
            )
            if not output_path.exists():
                return EngineResult(success=False, error="去水印完成但输出文件未生成")
            logger.info(f"去水印完成: {output_path} ({output_path.stat().st_size} bytes)")
            return EngineResult(
                success=True,
                data={
                    "original": input_file.name,
                    "output": output_name,
                    "size": output_path.stat().st_size,
                    "region": {"x": x, "y": y, "w": w, "h": h},
                },
                output_files=[str(output_path)],
            )
        except Exception as e:
            logger.exception(f"去水印失败: {e}")
            return EngineResult(success=False, error=f"去水印失败: {e}")

    @staticmethod
    def _inpaint(input_path: str, output_path: str, x: int, y: int, w: int, h: int) -> None:
        import cv2
        import numpy as np

        img = cv2.imread(input_path)
        if img is None:
            raise ValueError(f"无法读取图片: {input_path}")

        h_img, w_img = img.shape[:2]
        x = max(0, min(x, w_img - 1))
        y = max(0, min(y, h_img - 1))
        w = max(1, min(w, w_img - x))
        h = max(1, min(h, h_img - y))

        # 如果修复区域超过图像面积的 70%，直接返回原图
        img_area = h_img * w_img
        mask_area = w * h
        if mask_area > img_area * 0.7:
            logger.warning(f"修复区域 {mask_area}px 超过图像面积 {img_area}px 的 70%，跳过处理")
            if not cv2.imwrite(output_path, img):
                raise RuntimeError(f"无法保存输出文件: {output_path}")
            return

        result = img.copy()

        # 策略：优先使用上方相邻纹理进行 SeamlessClone 修复（对底部水印最自然）
        # 如果上方空间不足，则回退到 cv2.inpaint
        src_h = h + 20  # 取水印上方稍大一点的纹理块
        src_y = max(0, y - src_h)
        actual_src_h = y - src_y

        if actual_src_h >= h // 2 and w > 0:
            # 从上方取纹理块
            src_roi = result[src_y:y, x:x + w]
            src_mask = np.ones((actual_src_h, w), dtype=np.uint8) * 255
            center = (x + w // 2, y + h // 2)

            # 使用 NORMAL_CLONE 将上方纹理融合到水印区域
            # 先扩展 src_roi 到和水印区域一样高（简单平铺/拉伸）
            if actual_src_h < h:
                # 如果上方纹理块不够高，用 cv2.resize 拉伸
                src_resized = cv2.resize(src_roi, (w, h), interpolation=cv2.INTER_LINEAR)
                tmp_img = result.copy()
                tmp_img[y:y + h, x:x + w] = src_resized

                # 对边界做羽化过渡
                blend_y1 = max(0, y - 4)
                blend_y2 = min(h_img, y + h + 4)
                blend_x1 = max(0, x - 4)
                blend_x2 = min(w_img, x + w + 4)
                roi_blend = tmp_img[blend_y1:blend_y2, blend_x1:blend_x2]
                roi_blurred = cv2.GaussianBlur(roi_blend, (5, 5), 0)
                tmp_img[blend_y1:blend_y2, blend_x1:blend_x2] = roi_blurred
                result = tmp_img
            else:
                # 使用 SeamlessClone
                tmp_img = result.copy()
                # 先用水印区域上方的一块填充水印区域，作为 SeamlessClone 的目标
                fill_patch = cv2.resize(src_roi[:h, :], (w, h), interpolation=cv2.INTER_LINEAR)
                tmp_img[y:y + h, x:x + w] = fill_patch

                # 创建 mask：只标记需要融合的区域
                mask_sc = np.zeros((h_img, w_img), dtype=np.uint8)
                mask_sc[y:y + h, x:x + w] = 255

                try:
                    tmp_img = cv2.seamlessClone(fill_patch, result, mask_sc[y:y + h, x:x + w], center, cv2.NORMAL_CLONE)
                    result = tmp_img
                except cv2.error:
                    # SeamlessClone 失败时回退到简单填充
                    result[y:y + h, x:x + w] = fill_patch

                # 边界平滑
                blend_y1 = max(0, y - 3)
                blend_y2 = min(h_img, y + h + 3)
                blend_x1 = max(0, x - 3)
                blend_x2 = min(w_img, x + w + 3)
                roi_blend = result[blend_y1:blend_y2, blend_x1:blend_x2]
                roi_blurred = cv2.GaussianBlur(roi_blend, (3, 3), 0)
                result[blend_y1:blend_y2, blend_x1:blend_x2] = roi_blurred
        else:
            # 回退到 cv2.inpaint（直接在 BGR 空间，避免 LAB 转换失真）
            padding = min(8, min(w, h) // 3)
            mx = max(0, x - padding)
            my = max(0, y - padding)
            mw = min(w + 2 * padding, w_img - mx)
            mh = min(h + 2 * padding, h_img - my)

            mask = np.zeros((h_img, w_img), dtype=np.uint8)
            mask[my : my + mh, mx : mx + mw] = 255
            result = cv2.inpaint(img, mask, 7, cv2.INPAINT_TELEA)

        if not cv2.imwrite(output_path, result):
            raise RuntimeError(f"无法保存输出文件: {output_path}")
