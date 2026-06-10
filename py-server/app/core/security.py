"""
安全模块 — 文件安全校验、路径遍历防护、日志脱敏

所有文件上传必须经过此模块的安全校验。
使用 filetype 库进行魔数字节检测，不依赖系统 libmagic。
"""

import uuid
from pathlib import Path

import filetype

from app.core.config import settings


# === 文件名安全化 ===


def sanitize_filename(original_name: str) -> str:
    """
    将原始文件名转为安全的 UUID 文件名

    保留原始扩展名，文件名部分替换为 UUID，
    防止路径遍历和文件名注入攻击。

    Args:
        original_name: 用户上传的原始文件名

    Returns:
        安全的 UUID 文件名（如 a1b2c3d4.mp3）
    """
    ext = Path(original_name).suffix.lower()
    safe_ext = ext if ext and len(ext) <= 10 else ".bin"  # 限制扩展名长度
    return f"{uuid.uuid4().hex}{safe_ext}"


# === 路径遍历防护 ===


def safe_path_join(base_dir: Path, filename: str) -> Path:
    """
    安全拼接路径，防止路径遍历攻击

    确保最终路径位于 base_dir 内部，
    如果检测到路径遍历企图，抛出 ValueError。

    Args:
        base_dir: 基础目录
        filename: 用户提供的文件名

    Returns:
        安全的完整路径

    Raises:
        ValueError: 检测到路径遍历攻击
    """
    resolved = (base_dir / filename).resolve()
    base_resolved = base_dir.resolve()

    if not str(resolved).startswith(str(base_resolved)):
        raise ValueError(f"非法文件路径: {filename}")

    return resolved


# === 格式白名单校验 ===


def is_allowed_extension(filename: str) -> bool:
    """
    校验文件扩展名是否在允许的白名单中

    Args:
        filename: 要校验的文件名

    Returns:
        是否允许
    """
    ext = Path(filename).suffix.lower().lstrip(".")
    return ext in settings.ALLOWED_EXTENSIONS


# === 魔数字节检测 ===


def detect_file_type(file_path: Path) -> str | None:
    """
    通过魔数字节检测文件真实类型（使用 filetype 库）

    与扩展名不同，魔数字节检测更难伪造，提供更强的安全保障。

    Args:
        file_path: 文件路径

    Returns:
        检测到的 MIME 类型，检测不到返回 None
    """
    kind = filetype.guess(str(file_path))
    if kind is None:
        return None
    return kind.mime


# === 日志脱敏 ===


def mask_sensitive(data: str, keep_start: int = 3, keep_end: int = 4) -> str:
    """
    对敏感字符串进行脱敏处理

    保留开头和结尾各若干字符，中间用 *** 替换。

    Args:
        data: 需要脱敏的字符串
        keep_start: 保留开头字符数，默认 3
        keep_end: 保留结尾字符数，默认 4

    Returns:
        脱敏后的字符串

    Example:
        mask_sensitive("13812345678") -> "138****5678"
    """
    if len(data) <= keep_start + keep_end:
        return "*" * len(data)
    return f"{data[:keep_start]}{'*' * (len(data) - keep_start - keep_end)}{data[-keep_end:]}"
