"""
zip 安全工具 — 路径遍历防护、大小/数量限制、临时目录隔离

安全策略：
- 拒绝路径遍历（../ 和绝对路径）
- 限制总解压大小（默认 500MB）
- 限制文件数量（默认 1000）
- 拒绝嵌套 zip
- 校验每个文件的扩展名白名单
- 解压到隔离的临时目录
"""

import logging
import shutil
import zipfile
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger(__name__)

# 允许解压的文件扩展名（对齐 ALLOWED_EXTENSIONS）
_ALLOWED_EXTRACT_EXTENSIONS: set[str] = {
    # 音频
    ".mp3",
    ".wav",
    ".m4a",
    ".ogg",
    ".flac",
    ".aac",
    # 图片
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".bmp",
    ".heic",
    ".heif",
    ".svg",
    ".ico",
    # 视频
    ".mp4",
    ".webm",
    ".avi",
    ".mov",
    ".mkv",
    # 文档
    ".pdf",
    ".txt",
    ".csv",
    ".json",
    ".xml",
    ".html",
    ".css",
    ".js",
    ".md",
}


def _is_ext_allowed(filename: str) -> bool:
    """检查文件扩展名是否在白名单内"""
    ext = Path(filename).suffix.lower()
    if not ext:
        # 无扩展名的文件视为可疑，拒绝
        return False
    return ext in _ALLOWED_EXTRACT_EXTENSIONS


def safe_unzip(zip_path: str | Path, extract_dir: str | Path) -> list[Path]:
    """
    安全解压 zip 文件

    - 拒绝路径遍历（../ 和绝对路径）
    - 限制总解压大小（配置项 ZIP_MAX_EXTRACT_SIZE，默认 500MB）
    - 限制文件数量（配置项 ZIP_MAX_FILE_COUNT，默认 1000）
    - 拒绝嵌套 zip
    - 校验每个文件的扩展名白名单

    Args:
        zip_path: zip 文件路径
        extract_dir: 解压目标目录（应为隔离的临时目录）

    Returns:
        解压后的文件路径列表

    Raises:
        ValueError: 安全校验失败
        zipfile.BadZipFile: zip 文件损坏
    """
    zip_path = Path(zip_path)
    extract_dir = Path(extract_dir)

    if not zip_path.is_file():
        raise FileNotFoundError(f"zip 文件不存在: {zip_path}")

    extract_dir.mkdir(parents=True, exist_ok=True)
    # 确保解压目录在隔离区域内（防止符号链接绕过）
    extract_dir = extract_dir.resolve()

    max_size = settings.ZIP_MAX_EXTRACT_SIZE
    max_count = settings.ZIP_MAX_FILE_COUNT
    extracted_files: list[Path] = []
    total_size = 0

    try:
        with zipfile.ZipFile(zip_path, "r") as zf:
            for entry in zf.infolist():
                # 跳过目录条目
                if entry.is_dir():
                    continue

                filename = entry.filename

                # 校验 1：拒绝路径遍历（../ 和绝对路径）
                if filename.startswith("/") or ".." in filename.split("/"):
                    raise ValueError(
                        f"路径遍历攻击检测: '{filename}' — "
                        f"文件名包含 ../ 或是以 / 开头的绝对路径"
                    )

                # 校验 2：禁止嵌套 zip
                if filename.lower().endswith(".zip"):
                    raise ValueError(
                        f"嵌套 zip 检测: '{filename}' — 不允许 zip 内包含 zip"
                    )

                # 校验 3：扩展名白名单
                if not _is_ext_allowed(filename):
                    raise ValueError(
                        f"文件类型不允许: '{filename}' — 扩展名不在白名单中"
                    )

                # 校验 4：文件数量上限
                if len(extracted_files) >= max_count:
                    raise ValueError(
                        f"文件数量超限: 已达 {max_count} 上限"
                    )

                # 校验 5：总大小上限（解压后）
                file_size = entry.file_size
                if total_size + file_size > max_size:
                    raise ValueError(
                        f"解压总大小超限: 已达 {max_size / 1024 / 1024:.0f}MB 上限"
                    )

                # 解压文件到隔离目录
                # 使用 zf.extract 会自动处理目录创建，但要确保不逃逸
                target_path = (extract_dir / filename).resolve()

                # 二次确认：解压目标必必须在 extract_dir 下
                if not str(target_path).startswith(str(extract_dir)):
                    raise ValueError(
                        f"路径逃逸检测: '{filename}' → '{target_path}'"
                    )

                # 确保父目录存在
                target_path.parent.mkdir(parents=True, exist_ok=True)

                # 读取并写入（手动提取以获得更细粒度的控制）
                with zf.open(entry) as src, open(target_path, "wb") as dst:
                    # 分块读取，避免大文件撑爆内存
                    chunk_size = 1024 * 1024  # 1MB
                    while True:
                        chunk = src.read(chunk_size)
                        if not chunk:
                            break
                        dst.write(chunk)

                extracted_files.append(target_path)
                total_size += file_size

    except zipfile.BadZipFile:
        logger.error(f"zip 文件损坏: {zip_path}")
        raise

    logger.info(
        f"安全解压完成: {zip_path.name} → {extract_dir} "
        f"({len(extracted_files)} 文件, {total_size / 1024:.0f}KB)"
    )
    return extracted_files


def create_zip(file_paths: list[str | Path], output_path: str | Path) -> Path:
    """
    将多个文件打包为 zip

    Args:
        file_paths: 源文件路径列表
        output_path: 输出 zip 文件路径

    Returns:
        生成的 zip 文件 Path
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for fp in file_paths:
            p = Path(fp)
            if not p.is_file():
                logger.warning(f"跳过不存在的文件: {p}")
                continue
            # 只存文件名，不存完整路径（防信息泄露）
            zf.write(p, arcname=p.name)

    logger.info(f"zip 创建完成: {output_path} ({output_path.stat().st_size} bytes, {len(file_paths)} 文件)")
    return output_path


def cleanup_temp_dir(dir_path: str | Path) -> None:
    """
    安全清理临时目录

    确保要删除的目录在 TEMP_DIR 或项目数据目录下，
    防止误删系统目录。

    Args:
        dir_path: 要清理的目录路径
    """
    target = Path(dir_path).resolve()

    # 安全检查：只允许清理明确标记的临时目录
    allowed_parents = [
        settings.TEMP_DIR.resolve(),
        settings.UPLOAD_DIR.resolve(),
        settings.RESULTS_DIR.resolve(),
    ]

    is_safe = any(
        str(target).startswith(str(parent)) for parent in allowed_parents
    )
    if not is_safe:
        logger.warning(f"拒绝清理非临时目录: {target}")
        return

    if target.exists() and target.is_dir():
        shutil.rmtree(target, ignore_errors=True)
        logger.info(f"临时目录已清理: {target}")
    elif target.exists():
        target.unlink(missing_ok=True)
        logger.info(f"临时文件已清理: {target}")
