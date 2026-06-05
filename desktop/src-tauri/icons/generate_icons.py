#!/usr/bin/env python3
"""生成 bfe-tools 桌面端应用图标。

基于品牌设计：蓝紫渐变圆角方块 + 代码括号 </>
输出所有 Tauri 需要的格式。
"""

import math
import os
import struct
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

# ============ 配置 ============
OUTPUT_DIR = Path(__file__).resolve().parent

# 品牌色（与 favicon.svg 保持一致）
GRADIENT_START = (59, 130, 246)   # #3b82f6
GRADIENT_END = (99, 102, 241)     # #6366f1
BRACKET_COLOR = (255, 255, 255)
SLASH_COLOR = (255, 255, 255, 179)  # 70% opacity

# 输出规格 [(文件名, 尺寸), ...]
OUTPUTS = [
    ("icon.png", 1024),       # 源图标（推荐 >= 1024）
    ("32x32.png", 32),
    ("128x128.png", 128),
    ("128x128@2x.png", 256),
]


def lerp_color(c1, c2, t):
    """线性插值颜色"""
    return tuple(int(a + (b - a) * t) for a, b in zip(c1, c2))


def draw_rounded_rect(draw, xy, radius, fill):
    """用 PIL 画圆角矩形"""
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def draw_code_brackets(draw, size, color):
    """用矢量方式画 < / > 代码符号"""
    w, h = size, size

    # 括号路径坐标（相对于 1024x1024 画布）
    scale = size / 1024.0

    # 左括号 <
    left_points = [
        (420, 300),   # 起点：左侧偏上
        (280, 512),   # 拐点：中间
        (420, 724),   # 终点：左侧偏下
    ]
    left_points = [(int(x * scale), int(y * scale)) for x, y in left_points]

    # 右括号 >
    right_points = [
        (604, 300),
        (744, 512),
        (604, 724),
    ]
    right_points = [(int(x * scale), int(y * scale)) for x, y in right_points]

    stroke = max(2, int(56 * scale))

    # 画左括号
    draw.line(left_points, fill=color, width=stroke, joint="round")
    # 画右括号
    draw.line(right_points, fill=color, width=stroke, joint="round")

    # 中间斜线 /
    slash_points = [
        (560, 724),
        (464, 300),
    ]
    slash_points = [(int(x * scale), int(y * scale)) for x, y in slash_points]
    slash_stroke = max(2, int(42 * scale))
    slash_rgba = (255, 255, 255, 204)
    draw.line(slash_points, fill=slash_rgba, width=slash_stroke, joint="round")


def _is_inside_rounded_rect(x: int, y: int, rect: tuple[int, int, int, int], radius: int) -> bool:
    """判断像素 (x, y) 是否在圆角矩形内部"""
    rx1, ry1, rx2, ry2 = rect

    if x < rx1 or x > rx2 or y < ry1 or y > ry2:
        return False

    # 检查四个角
    r = radius
    # 左上角
    if x < rx1 + r and y < ry1 + r:
        cx, cy = rx1 + r, ry1 + r
        return (x - cx) ** 2 + (y - cy) ** 2 <= r**2
    # 右上角
    if x > rx2 - r and y < ry1 + r:
        cx, cy = rx2 - r, ry1 + r
        return (x - cx) ** 2 + (y - cy) ** 2 <= r**2
    # 左下角
    if x < rx1 + r and y > ry2 - r:
        cx, cy = rx1 + r, ry2 - r
        return (x - cx) ** 2 + (y - cy) ** 2 <= r**2
    # 右下角
    if x > rx2 - r and y > ry2 - r:
        cx, cy = rx2 - r, ry2 - r
        return (x - cx) ** 2 + (y - cy) ** 2 <= r**2

    return True


def generate_icon(size: int) -> Image.Image:
    """生成指定尺寸的图标"""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # --- 圆角渐变背景 ---
    radius = int(size * 0.224)
    margin = int(size * 0.04)
    bg_rect = (margin, margin, size - margin - 1, size - margin - 1)

    # 逐像素填充渐变 + 圆角裁剪
    pixels = img.load()
    inner_top = margin
    inner_bottom = size - margin
    inner_height = inner_bottom - inner_top

    for y in range(inner_top, inner_bottom):
        t = (y - inner_top) / max(1, inner_height - 1)
        r, g, b = lerp_color(GRADIENT_START, GRADIENT_END, t)
        for x in range(margin, size - margin):
            if _is_inside_rounded_rect(x, y, bg_rect, radius):
                pixels[x, y] = (r, g, b, 255)

    # --- 顶部高光 ---
    hl_height = int(inner_height * 0.45)
    for y_offset in range(hl_height):
        y = margin + y_offset
        alpha = int(40 * (1 - y_offset / max(1, hl_height - 1)))
        for x in range(margin + radius, size - margin - radius):
            if _is_inside_rounded_rect(x, y, bg_rect, radius):
                r, g, b, a = pixels[x, y]
                # 叠加白色高光
                new_a = a
                new_r = min(255, r + int(255 * alpha / 255 * (255 - r) / 255 * 255) // 255)
                # 简化：混色
                blend = alpha / 255.0
                new_r = int(r + (255 - r) * blend)
                new_g = int(g + (255 - g) * blend)
                new_b = int(b + (255 - b) * blend)
                pixels[x, y] = (new_r, new_g, new_b, a)

    # --- 细边框 ---
    border_alpha = 60
    border_width = max(1, int(size * 0.004))
    for bw in range(border_width):
        alpha = border_alpha - bw * (border_alpha // max(1, border_width))
        rect = (
            margin + bw,
            margin + bw,
            size - margin - 1 - bw,
            size - margin - 1 - bw,
        )
        r_inner = max(1, radius - bw)
        for y in range(rect[1], rect[3] + 1):
            for x in range(rect[0], rect[2] + 1):
                if _is_inside_rounded_rect(x, y, rect, r_inner) and not _is_inside_rounded_rect(
                    x, y, (rect[0] + 1, rect[1] + 1, rect[2] - 1, rect[3] - 1), max(1, r_inner - 1)
                ):
                    r, g, b, a = pixels[x, y]
                    pixels[x, y] = (
                        min(255, r + int(255 * alpha / 255 * (255 - r) / 255 * 255) // 255),
                        min(255, g + int(255 * alpha / 255 * (255 - g) / 255 * 255) // 255),
                        min(255, b + int(255 * alpha / 255 * (255 - b) / 255 * 255) // 255),
                        a,
                    )

    # --- 代码符号 < / > ---
    draw = ImageDraw.Draw(img)
    draw_code_brackets(draw, size, (255, 255, 255, 255))

    return img


def save_pngs():
    """生成所有 PNG 图标"""
    for filename, size in OUTPUTS:
        print(f"  生成 {filename} ({size}x{size})...")
        img = generate_icon(size)
        path = OUTPUT_DIR / filename
        img.save(path, "PNG", optimize=True)
        file_size = os.path.getsize(path)
        print(f"    ✓ 已保存 ({file_size} bytes)")


def png_to_icns(png_1024: Path, output: Path):
    """从 1024 PNG 生成 macOS .icns（包含多尺寸）"""
    # 打开源图
    src = Image.open(png_1024)

    sizes = {
        "ic07": 128,
        "ic08": 256,
        "ic09": 512,
        "ic10": 1024,
        "ic11": 32,
        "ic12": 64,
        "ic13": 256,
        "ic14": 512,
    }

    # 生成各尺寸 PNG 数据
    png_data: dict[str, bytes] = {}
    for code, sz in sizes.items():
        if sz == 1024:
            img = src
        else:
            img = src.resize((sz, sz), Image.LANCZOS)
        buf = bytearray()
        # 用临时路径保存
        tmp = OUTPUT_DIR / f"_tmp_{code}.png"
        img.save(tmp, "PNG")
        png_data[code] = tmp.read_bytes()
        tmp.unlink()

    # 构建 ICNS
    # ICNS 格式:  'icns' + total_size(4B) + entries...
    entries = []
    for code, data in png_data.items():
        # 每个条目: type(4B) + size(4B, 包含头部) + data
        entry_size = 8 + len(data)
        entries.append((code, entry_size, data))

    total_size = 8 + sum(es for _, es, _ in entries)  # icns header + all entries

    with open(output, "wb") as f:
        f.write(b"icns")
        f.write(struct.pack(">I", total_size))
        for code, esize, data in entries:
            f.write(code.encode("ascii"))
            f.write(struct.pack(">I", esize))
            f.write(data)

    print(f"    ✓ {output.name} ({total_size} bytes)")


def generate_ico(png_paths: list[tuple[int, Path]], output: Path):
    """从多个 PNG 生成 Windows .ico"""
    # 打开 PNG 并获取原始数据
    entries = []
    for size, path in png_paths:
        data = path.read_bytes()
        entries.append((size, size, data))

    # 按尺寸从大到小排序
    entries.sort(key=lambda x: -x[0])

    # ICO 头部
    num_images = len(entries)
    # 头部: reserved(2) + type(2=1 for ICO) + count(2)
    header = struct.pack("<HHH", 0, 1, num_images)

    # 计算数据偏移
    icon_dir_size = 6 + num_images * 16  # 每个条目 16 字节
    data_offset = icon_dir_size

    dir_entries = []
    image_datas = []
    for size, _, data in entries:
        # 条目: w, h, colors, reserved, planes, bpp, size, offset
        h = size if size < 256 else 0
        w = size if size < 256 else 0
        dir_entries.append(struct.pack(
            "<BBBBHHIH",
            w, h, 0, 0, 1, 32, len(data), data_offset
        ))
        image_datas.append(data)
        data_offset += len(data)

    with open(output, "wb") as f:
        f.write(header)
        for entry in dir_entries:
            f.write(entry)
        for data in image_datas:
            f.write(data)

    print(f"    ✓ {output.name} ({os.path.getsize(output)} bytes)")


def main():
    print("🎨 生成 bfe-tools 应用图标\n")

    # Step 1: 生成 PNG
    print("📐 Step 1: 生成各尺寸 PNG...")
    save_pngs()

    # Step 2: 生成 ICNS
    print("\n🍎 Step 2: 生成 macOS .icns...")
    png_to_icns(OUTPUT_DIR / "icon.png", OUTPUT_DIR / "icon.icns")

    # Step 3: 生成 ICO
    print("\n🪟 Step 3: 生成 Windows .ico...")
    ico_inputs = [
        (32, OUTPUT_DIR / "32x32.png"),
        (128, OUTPUT_DIR / "128x128.png"),
        (256, OUTPUT_DIR / "128x128@2x.png"),
    ]
    generate_ico(ico_inputs, OUTPUT_DIR / "icon.ico")

    # 清理临时文件
    for f in OUTPUT_DIR.glob("_tmp_*.png"):
        f.unlink()

    print("\n✅ 所有图标生成完毕！")
    print(f"   输出目录: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
