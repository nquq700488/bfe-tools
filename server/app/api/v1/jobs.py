"""
统一任务 API

端点：
- GET /api/v1/jobs/{jobId} — 查询任务状态
- GET /api/v1/jobs/{jobId}/events — SSE 进度事件流
- POST /api/v1/jobs/{jobId}/cancel — 取消任务
- GET /api/v1/jobs/{jobId}/result — 下载结果文件
"""

import asyncio
import json
import logging
import mimetypes

logger = logging.getLogger(__name__)

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from starlette.responses import FileResponse

from app.core.config import settings
from app.schemas.common import APIResponse
from app.schemas.job import (
    CancelJobResponse,
    JobCreateRequest,
    JobCreateResponse,
    JobStatusResponse,
)
from app.services.job import job_service
from app.services.upload import upload_service

router = APIRouter(prefix="/jobs", tags=["任务管理"])


@router.post("", summary="创建处理任务")
async def create_job(body: JobCreateRequest) -> APIResponse[JobCreateResponse]:
    """
    创建异步处理任务（如语音转文字、格式转换等）

    任务异步执行，通过 jobId 查询进度或通过 SSE 监听实时状态。
    """
    # file_path 不来自前端请求，由后端从 upload_id 内部查
    file_path = None
    if body.upload_id:
        path_result = upload_service.get_file_path(body.upload_id)
        if path_result.ok:
            file_path = path_result.data
        else:
            logger.warning(f"无法获取文件路径: {path_result.error}（将延迟处理）")

    result = await job_service.create_job(
        tool_id=body.tool_id,
        upload_id=body.upload_id,
        params=body.params or {},
        file_path=file_path,
    )

    if not result.ok:
        raise HTTPException(status_code=400, detail=result.error)

    return APIResponse(
        success=True,
        data=JobCreateResponse(
            job_id=result.data["job_id"],
            status="pending",
            created_at=result.data["created_at"],
        ),
    )


@router.get("/{job_id}", summary="查询任务状态")
async def get_job_status(job_id: str) -> APIResponse[JobStatusResponse]:
    """
    查询任务的当前状态、进度、结果信息
    """
    result = job_service.get_job(job_id)

    if not result.ok:
        raise HTTPException(status_code=404, detail=result.error)

    job = result.data
    return APIResponse(
        success=True,
        data=JobStatusResponse(
            job_id=job["job_id"],
            status=job["status"],
            progress=job["progress"],
            result_url=job.get("result_url"),
            result_file_name=job.get("result_file_name"),
            result_text=job.get("result_text"),
            ocr_segments=job.get("ocr_segments"),
            output_files=job.get("output_files") or None,
            result_metadata=job.get("result_metadata"),
            error=job.get("error"),
            created_at=job["created_at"],
        ),
    )


@router.get("/{job_id}/events", summary="SSE 进度事件流")
async def job_events(job_id: str):
    """
    通过 Server-Sent Events 实时推送任务进度

    事件类型：
    - progress: 进度更新
    - complete: 任务完成
    - error: 任务异常
    """
    queue: asyncio.Queue = job_service.subscribe(job_id)

    async def event_generator():
        try:
            while True:
                event_data = await asyncio.wait_for(queue.get(), timeout=30)

                # 发送事件
                yield f"event: {event_data['event']}\n"
                yield f"data: {json.dumps(event_data['data'], ensure_ascii=False)}\n\n"

                # 终态时结束 SSE 流
                if event_data["event"] in ("complete", "error"):
                    break

        except asyncio.TimeoutError:
            # 超时发送注释（保持连接）
            yield ": keepalive\n\n"
        finally:
            job_service.unsubscribe(job_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{job_id}/cancel", summary="取消任务")
async def cancel_job(job_id: str) -> APIResponse[CancelJobResponse]:
    """
    取消进行中的任务
    """
    result = await job_service.cancel_job(job_id)

    if not result.ok:
        raise HTTPException(status_code=400, detail=result.error)

    return APIResponse(
        success=True,
        data=CancelJobResponse(job_id=job_id),
    )


mimetypes.init()
_AUDIO_EXTS = {".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a"}
_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}
_VIDEO_EXTS = {".mp4", ".webm", ".avi", ".mov", ".mkv"}


def _media_type(file_name: str) -> str:
    guessed, _ = mimetypes.guess_type(file_name)
    return guessed or "application/octet-stream"


def _is_inline_previewable(file_name: str) -> bool:
    ext = file_name[file_name.rfind("."):].lower() if "." in file_name else ""
    return ext in _AUDIO_EXTS or ext in _IMAGE_EXTS or ext in _VIDEO_EXTS


def _file_response(file_path: str, file_name: str, download: bool | None) -> FileResponse:
    media = _media_type(file_name)
    is_preview = not download and _is_inline_previewable(file_name)
    return FileResponse(
        path=file_path,
        filename=file_name,
        media_type=media,
        content_disposition_type="inline" if is_preview else "attachment",
    )


@router.get("/{job_id}/result", summary="下载/播放结果文件")
async def download_result(
    job_id: str,
    download: bool | None = None,
    file: str | None = None,
):
    """
    获取任务处理结果文件

    - 默认返回主输出文件（如 zip 包）
    - ?file=<name> 返回指定输出文件（如视频取帧的单个帧图片）
    - 音频/图片/视频默认内联播放（?download=1 强制下载）
    """
    if file:
        result = job_service.get_output_file_by_name(job_id, file)
        if result.ok:
            file_path, file_name = result.data
            return _file_response(file_path, file_name, True)

    result = job_service.get_result_path(job_id)

    if result.ok:
        file_path, file_name = result.data
        return _file_response(file_path, file_name, download)

    results_dir = settings.RESULTS_DIR
    if results_dir.exists():
        for f in sorted(results_dir.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
            if f.is_file() and f.name.startswith(job_id[:8]):
                return _file_response(str(f), f.name, download)

    raise HTTPException(status_code=404, detail=result.error)
