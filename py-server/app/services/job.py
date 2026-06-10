"""
任务服务 — 任务状态机、进度更新、SSE 事件广播

管理异步处理任务的完整生命周期：
- 状态机: pending → running → succeeded / failed / canceled
- 超时任务自动标记为 expired
- 通过 asyncio.Queue 实现 SSE 事件广播
"""

import asyncio
import logging
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path

from app.core.config import settings
from app.engine import EngineResult, engine_registry
from app.schemas.common import Result

logger = logging.getLogger(__name__)


class JobService:
    """
    任务管理服务

    维护任务状态机、进度追踪、SSE 事件广播。
    当前使用内存存储（后续可迁移至 Redis + Pub/Sub）。
    """

    def __init__(self) -> None:
        # 任务存储: job_id -> job_dict
        self._jobs: dict[str, dict] = {}
        # SSE 订阅者: job_id -> set[asyncio.Queue]
        self._subscribers: dict[str, set[asyncio.Queue]] = {}

    async def create_job(
        self,
        tool_id: str,
        upload_id: str,
        params: dict,
        file_path: str | None = None,
    ) -> Result[dict]:
        """
        创建异步处理任务

        Args:
            tool_id: 工具标识
            upload_id: 关联的上传 ID
            params: 工具特定参数
            file_path: 文件完整路径（可选）

        Returns:
            Result[dict] — 包含 job_id, created_at
        """
        job_id = uuid.uuid4().hex
        now = datetime.now(UTC).isoformat()

        job = {
            "job_id": job_id,
            "tool_id": tool_id,
            "upload_id": upload_id,
            "file_path": file_path,
            "params": params,
            "status": "pending",
            "progress": 0.0,
            "result_url": None,
            "result_file_name": None,
            "error": None,
            "cancelled": False,
            "created_at": now,
            "updated_at": now,
        }

        self._jobs[job_id] = job
        logger.info(f"创建任务: {job_id}, 工具: {tool_id}")

        asyncio.create_task(self._process_job(job_id))

        return Result.success({"job_id": job_id, "created_at": now})

    def get_job(self, job_id: str) -> Result[dict]:
        """
        获取任务状态

        Args:
            job_id: 任务 ID

        Returns:
            Result[dict] — 任务完整信息
        """
        job = self._jobs.get(job_id)
        if job is None:
            return Result.failure(f"任务不存在: {job_id}")
        return Result.success(job)

    async def update_progress(self, job_id: str, progress: float) -> Result[dict]:
        """
        更新任务进度

        Args:
            job_id: 任务 ID
            progress: 进度百分比（0-100）
        """
        job = self._jobs.get(job_id)
        if job is None:
            return Result.failure(f"任务不存在: {job_id}")

        job["progress"] = min(progress, 100.0)
        job["status"] = "running"
        job["updated_at"] = datetime.now(UTC).isoformat()

        await self._broadcast(job_id, "progress", {
            "job_id": job_id,
            "status": job["status"],
            "progress": job["progress"],
        })

        return Result.success(job)

    async def set_succeeded(
        self,
        job_id: str,
        result_path: str,
        result_file_name: str,
        result_text: str | None = None,
        ocr_segments: list | None = None,
        output_files: list[dict] | None = None,
        metadata: dict | None = None,
        all_output_paths: list[str] | None = None,
    ) -> Result[dict]:
        """
        标记任务成功

        Args:
            job_id: 任务 ID
            result_path: 结果文件实际路径（第一个输出文件，向后兼容）
            result_file_name: 结果文件名
            result_text: 引擎返回的文本内容（如 OCR 识别文字）
            ocr_segments: OCR 段落详情列表
            output_files: 多输出文件列表（每项 {file_name, file_size, url}）
            metadata: 结构化元数据（如 img srcset、PDF 提取文字等）
        """
        job = self._jobs.get(job_id)
        if job is None:
            return Result.failure(f"任务不存在: {job_id}")

        job["status"] = "succeeded"
        job["progress"] = 100.0
        job["result_url"] = f"/api/v1/jobs/{job_id}/result"
        job["result_path"] = result_path
        job["result_file_name"] = result_file_name
        job["result_text"] = result_text
        job["ocr_segments"] = ocr_segments
        job["output_files"] = output_files or []
        job["result_metadata"] = metadata
        job["all_output_paths"] = all_output_paths or []
        job["updated_at"] = datetime.now(UTC).isoformat()

        await self._broadcast(job_id, "complete", {
            "job_id": job_id,
            "status": "succeeded",
            "result_url": f"/api/v1/jobs/{job_id}/result",
            "result_text": job.get("result_text"),
            "ocr_segments": job.get("ocr_segments"),
        })

        logger.info(f"任务完成: {job_id}")
        return Result.success(job)

    async def set_failed(self, job_id: str, error: str) -> Result[dict]:
        """
        标记任务失败

        Args:
            job_id: 任务 ID
            error: 错误描述
        """
        job = self._jobs.get(job_id)
        if job is None:
            return Result.failure(f"任务不存在: {job_id}")

        job["status"] = "failed"
        job["error"] = error
        job["updated_at"] = datetime.now(UTC).isoformat()

        await self._broadcast(job_id, "error", {
            "job_id": job_id,
            "status": "failed",
            "error": error,
        })

        logger.error(f"任务失败: {job_id}, 原因: {error}")
        return Result.success(job)

    async def cancel_job(self, job_id: str) -> Result[dict]:
        """
        取消任务

        Args:
            job_id: 任务 ID
        """
        job = self._jobs.get(job_id)
        if job is None:
            return Result.failure(f"任务不存在: {job_id}")

        if job["status"] in ("succeeded", "failed", "canceled"):
            return Result.failure(f"任务已处于终态，无法取消: {job['status']}")

        job["status"] = "canceled"
        job["cancelled"] = True
        job["updated_at"] = datetime.now(UTC).isoformat()

        await self._broadcast(job_id, "complete", {
            "job_id": job_id,
            "status": "canceled",
        })

        logger.info(f"任务已取消: {job_id}")
        return Result.success(job)

    def get_result_path(self, job_id: str) -> Result[tuple[str, str]]:
        """
        获取任务结果文件路径

        Args:
            job_id: 任务 ID

        Returns:
            Result[tuple[str, str]] — (文件路径, 文件名)
        """
        job = self._jobs.get(job_id)
        if job is None:
            return Result.failure(f"任务不存在: {job_id}")

        if job["status"] != "succeeded":
            return Result.failure(f"任务未完成，当前状态: {job['status']}")

        if not job.get("result_path"):
            return Result.failure("结果文件不存在")

        return Result.success((job["result_path"], job.get("result_file_name", "result")))

    def get_output_file_by_name(self, job_id: str, file_name: str) -> Result[tuple[str, str]]:
        """
        根据文件名获取输出文件路径

        Args:
            job_id: 任务 ID
            file_name: 输出文件名

        Returns:
            Result[tuple[str, str]] — (完整路径, 文件名)
        """
        job = self._jobs.get(job_id)
        if job is None:
            return Result.failure(f"任务不存在: {job_id}")

        if job["status"] != "succeeded":
            return Result.failure(f"任务未完成，当前状态: {job['status']}")

        all_paths = job.get("all_output_paths", [])
        for p_str in all_paths:
            pp = Path(p_str)
            if pp.name == file_name and pp.exists():
                return Result.success((p_str, pp.name))

        return Result.failure(f"文件不存在: {file_name}")

    def get_output_files(self, job_id: str) -> Result[list[dict]]:
        """
        获取任务的所有输出文件列表

        Args:
            job_id: 任务 ID

        Returns:
            Result[list[dict]] — 输出文件列表，每项 {file_name, file_size, url}
        """
        job = self._jobs.get(job_id)
        if job is None:
            return Result.failure(f"任务不存在: {job_id}")

        if job["status"] != "succeeded":
            return Result.failure(f"任务未完成，当前状态: {job['status']}")

        output_files = job.get("output_files", [])
        if not output_files:
            return Result.failure("无输出文件")

        return Result.success(output_files)

    async def _process_job(self, job_id: str) -> None:
        """
        异步处理任务 — 路由到对应引擎并更新状态

        Args:
            job_id: 任务 ID
        """
        job = self._jobs.get(job_id)
        if job is None:
            logger.error(f"任务不存在: {job_id}")
            return

        if job["cancelled"]:
            logger.info(f"任务已取消，跳过处理: {job_id}")
            return

        tool_id = job["tool_id"]
        engine = engine_registry.get(tool_id)

        if engine is None:
            await self.set_failed(job_id, f"未找到引擎: {tool_id}")
            return

        file_path = job.get("file_path")
        params = job.get("params", {})

        # 校验输入：至少需要 file_path / text / url / html 之一
        if not file_path and not params.get("text") and not params.get("url") and not params.get("html"):
            await self.set_failed(job_id, "缺少输入：请提供文件、文本、URL 或 HTML")
            return

        if file_path and not Path(file_path).exists():
            await self.set_failed(job_id, f"文件不存在: {file_path}")
            return

        try:
            await self.update_progress(job_id, 10)

            result: EngineResult = await engine.execute(file_path or None, params)

            if result.success:
                if result.output_files:
                    # 构建多输出文件列表
                    # 第一个文件走 /result，其余文件走 /result?file=<name>
                    output_files: list[dict] = []
                    for i, f in enumerate(result.output_files):
                        p = Path(f)
                        file_size = p.stat().st_size if p.exists() else 0
                        url = f"/api/v1/jobs/{job_id}/result"
                        if i > 0:
                            url += f"?file={p.name}"
                        output_files.append({
                            "file_name": p.name,
                            "file_size": file_size,
                            "url": url,
                        })

                    result_path = result.output_files[0]
                    result_file_name = Path(result_path).name
                    result_text = result.data.get("text") if result.data else None
                    ocr_segments = result.data.get("segments") if result.data else None
                    metadata = result.metadata
                    # 将所有文件路径存入 job（供 ?file= 查询）
                    all_output_paths = [str(p) for p in [Path(f) for f in result.output_files]]
                    await self.set_succeeded(
                        job_id,
                        result_path,
                        result_file_name,
                        result_text,
                        ocr_segments,
                        output_files,
                        metadata,
                        all_output_paths,
                    )
                else:
                    await self.set_failed(job_id, "引擎未返回结果文件")
            else:
                await self.set_failed(job_id, result.error or "未知错误")

        except Exception as e:
            logger.exception(f"任务处理异常: {job_id}")
            await self.set_failed(job_id, f"处理异常: {e}")

    # === SSE 事件广播 ===

    def subscribe(self, job_id: str) -> asyncio.Queue:
        """
        订阅任务的 SSE 事件

        Args:
            job_id: 任务 ID

        Returns:
            asyncio.Queue — 事件队列
        """
        queue: asyncio.Queue = asyncio.Queue()

        if job_id not in self._subscribers:
            self._subscribers[job_id] = set()
        self._subscribers[job_id].add(queue)

        logger.debug(f"SSE 订阅: {job_id}, 当前订阅者数: {len(self._subscribers[job_id])}")
        return queue

    def unsubscribe(self, job_id: str, queue: asyncio.Queue) -> None:
        """
        取消订阅

        Args:
            job_id: 任务 ID
            queue: 要取消的队列
        """
        queues = self._subscribers.get(job_id)
        if queues:
            queues.discard(queue)
            if not queues:
                del self._subscribers[job_id]

    async def _broadcast(self, job_id: str, event: str, data: dict) -> None:
        """
        向所有订阅者广播事件

        Args:
            job_id: 任务 ID
            event: 事件类型（progress / complete / error）
            data: 事件数据
        """
        queues = self._subscribers.get(job_id, set()).copy()
        for queue in queues:
            try:
                queue.put_nowait({"event": event, "data": data})
            except asyncio.QueueFull:
                logger.warning(f"SSE 队列已满: {job_id}")

    # === TTL 过期清理 ===

    async def cleanup_expired_jobs(self) -> int:
        """
        清理超过 TTL 的任务（可周期性调度）

        Returns:
            清理的任务数
        """
        now = time.time()
        ttl = settings.RESULT_TTL_SECONDS
        expired_ids: list[str] = []

        for job_id, job in self._jobs.items():
            created_at = datetime.fromisoformat(job["created_at"])
            age = now - created_at.timestamp()
            if age > ttl:
                expired_ids.append(job_id)

        for job_id in expired_ids:
            job = self._jobs.pop(job_id, None)
            if job:
                job["status"] = "expired"
            # 清理订阅者
            self._subscribers.pop(job_id, None)

        if expired_ids:
            logger.info(f"清理过期任务: {len(expired_ids)} 个")

        return len(expired_ids)


# 全局单例
job_service = JobService()
