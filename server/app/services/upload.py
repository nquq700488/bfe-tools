"""
上传服务 — 创建上传、接收分片、合并文件、SHA256 校验

管理分片暂存、文件合并、完整性校验的完整流程。
"""

import hashlib
import logging
import uuid
from pathlib import Path

from app.core.config import settings
from app.core.security import is_allowed_extension, safe_path_join, sanitize_filename
from app.schemas.common import Result

logger = logging.getLogger(__name__)


class UploadService:
    """
    文件上传服务

    负责上传生命周期的完整管理：
    1. 创建上传任务 — 生成 uploadId，分配临时目录
    2. 接收分片 — 将分片按序写入临时目录
    3. 完成上传 — 合并分片、SHA256 校验、生成最终文件
    """

    def __init__(self) -> None:
        """初始化，维护活跃上传任务的元数据"""
        # 内存中的上传任务状态（后续可迁移至 Redis）
        self._uploads: dict[str, dict] = {}

    async def create_upload(
        self,
        file_name: str,
        file_size: int,
        mime_type: str,
        total_chunks: int,
    ) -> Result[dict]:
        """
        创建上传任务

        Args:
            file_name: 原始文件名
            file_size: 文件大小（字节）
            mime_type: MIME 类型
            total_chunks: 预期分片总数

        Returns:
            Result[dict] — 包含 upload_id, file_name, file_size, total_chunks
        """
        # 校验文件扩展名
        if not is_allowed_extension(file_name):
            return Result.failure(f"不支持的文件格式: {file_name}")

        # 校验文件大小
        if file_size > settings.UPLOAD_MAX_SIZE:
            return Result.failure(
                f"文件大小超出限制（最大 {settings.UPLOAD_MAX_SIZE // (1024 * 1024)}MB）"
            )

        upload_id = uuid.uuid4().hex
        safe_name = sanitize_filename(file_name)

        # 创建临时分片目录
        chunk_dir = settings.TEMP_DIR / upload_id
        chunk_dir.mkdir(parents=True, exist_ok=True)

        self._uploads[upload_id] = {
            "upload_id": upload_id,
            "file_name": safe_name,
            "original_name": file_name,
            "file_size": file_size,
            "mime_type": mime_type,
            "total_chunks": total_chunks,
            "received_chunks": 0,
            "chunk_dir": chunk_dir,
        }

        logger.info(f"创建上传任务: {upload_id}, 文件: {file_name}, 分片: {total_chunks}")

        return Result.success(
            {
                "upload_id": upload_id,
                "file_name": safe_name,
                "file_size": file_size,
                "total_chunks": total_chunks,
            }
        )

    async def save_chunk(
        self,
        upload_id: str,
        chunk_index: int,
        chunk_data: bytes,
    ) -> Result[dict]:
        """
        保存单个分片，带范围校验和去重

        Args:
            upload_id: 上传任务 ID
            chunk_index: 分片序号（从 0 开始）
            chunk_data: 分片二进制数据

        Returns:
            Result[dict]
        """
        upload = self._uploads.get(upload_id)
        if upload is None:
            return Result.failure(f"上传任务不存在: {upload_id}")

        # 范围校验
        total_chunks: int = upload["total_chunks"]
        if chunk_index < 0 or chunk_index >= total_chunks:
            return Result.failure(f"分片序号 {chunk_index} 超出范围 0-{total_chunks - 1}")

        chunk_dir: Path = upload["chunk_dir"]
        chunk_path = chunk_dir / f"chunk_{chunk_index:05d}"

        # 拒绝重复分片（仅计数一次）
        if chunk_path.exists():
            return Result.failure(f"分片 {chunk_index} 已存在，不允许重复上传")

        try:
            chunk_path.write_bytes(chunk_data)
        except OSError as e:
            logger.error(f"写入分片失败: {chunk_path}, 错误: {e}")
            return Result.failure(f"分片写入失败: {e}")

        upload["received_chunks"] = upload.get("received_chunks", 0) + 1

        logger.debug(f"分片 {chunk_index} 已保存: {upload_id}")

        return Result.success({"chunk_index": chunk_index, "saved": True})

    async def complete_upload(self, upload_id: str) -> Result[dict]:
        """
        完成上传 — 合并分片并校验

        1. 检查所有分片是否已接收
        2. 按序合并分片为完整文件
        3. 计算 SHA256 校验值
        4. 移至最终上传目录
        5. 清理临时分片

        Args:
            upload_id: 上传任务 ID

        Returns:
            Result[dict] — 包含 file_id, file_size, sha256
        """
        upload = self._uploads.get(upload_id)
        if upload is None:
            return Result.failure(f"上传任务不存在: {upload_id}")

        total_chunks: int = upload["total_chunks"]
        if upload.get("received_chunks", 0) != total_chunks:
            return Result.failure(
                f"分片未齐（已接收 {upload.get('received_chunks', 0)}/{total_chunks}）"
            )

        chunk_dir: Path = upload["chunk_dir"]
        safe_name: str = upload["file_name"]

        # 确保上传目录存在
        settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        # 合并分片
        final_path = safe_path_join(settings.UPLOAD_DIR, safe_name)
        sha256_hash = hashlib.sha256()

        try:
            with open(final_path, "wb") as out_f:
                for i in range(total_chunks):
                    chunk_path = chunk_dir / f"chunk_{i:05d}"
                    if not chunk_path.exists():
                        return Result.failure(f"分片 {i} 丢失")

                    chunk_data = chunk_path.read_bytes()
                    out_f.write(chunk_data)
                    sha256_hash.update(chunk_data)

        except OSError as e:
            logger.error(f"合并文件失败: {e}")
            return Result.failure(f"文件合并失败: {e}")

        # 清理临时分片
        try:
            for f in chunk_dir.iterdir():
                f.unlink()
            chunk_dir.rmdir()
        except OSError:
            logger.warning(f"清理临时目录失败: {chunk_dir}")

        file_id = safe_name.replace(".", "_")  # 方便后续引用
        sha256_value = sha256_hash.hexdigest()

        logger.info(f"上传完成: {upload_id} -> {safe_name}, SHA256: {sha256_value[:16]}...")

        return Result.success(
            {
                "file_id": file_id,
                "file_size": final_path.stat().st_size,
                "sha256": sha256_value,
                "file_path": str(final_path),
            }
        )

    def get_file_path(self, upload_id: str) -> Result[str]:
        """
        获取已完成上传文件的完整路径

        Args:
            upload_id: 上传任务 ID

        Returns:
            Result[str] — 文件完整路径
        """
        upload = self._uploads.get(upload_id)
        if upload is None:
            return Result.failure(f"上传任务不存在: {upload_id}")

        safe_name: str = upload["file_name"]
        file_path = settings.UPLOAD_DIR / safe_name

        if not file_path.exists():
            return Result.failure(f"文件不存在: {file_path}")

        return Result.success(str(file_path))


# 全局单例
upload_service = UploadService()
