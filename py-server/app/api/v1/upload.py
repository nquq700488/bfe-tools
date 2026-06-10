"""
统一上传 API

端点：
- POST /api/v1/uploads — 创建上传任务
- PUT /api/v1/uploads/{uploadId}/chunks/{index} — 上传分片
- POST /api/v1/uploads/{uploadId}/complete — 完成上传
"""

from fastapi import APIRouter, File, HTTPException, UploadFile

from app.schemas.common import APIResponse
from app.schemas.job import (
    UploadChunkResponse,
    UploadCompleteRequest,
    UploadCompleteResponse,
    UploadCreateRequest,
    UploadCreateResponse,
)
from app.services.upload import upload_service

router = APIRouter(prefix="/uploads", tags=["文件上传"])


@router.post("", summary="创建上传任务")
async def create_upload(body: UploadCreateRequest) -> APIResponse[UploadCreateResponse]:
    """
    创建上传任务，返回 uploadId 和分片信息

    客户端获得 uploadId 后，按序上传各分片，最后调用 complete 触发合并校验。
    """
    result = await upload_service.create_upload(
        file_name=body.file_name,
        file_size=body.file_size,
        mime_type=body.mime_type,
        total_chunks=body.total_chunks,
    )

    if not result.ok:
        raise HTTPException(status_code=400, detail=result.error)

    return APIResponse(
        success=True,
        data=UploadCreateResponse(
            upload_id=result.data["upload_id"],
            file_name=result.data["file_name"],
            file_size=result.data["file_size"],
            total_chunks=result.data["total_chunks"],
        ),
    )


CHUNK_MAX_SIZE = 10 * 1024 * 1024  # 单分片最大 10MB


@router.put("/{upload_id}/chunks/{chunk_index}", summary="上传分片")
async def upload_chunk(
    upload_id: str,
    chunk_index: int,
    chunk: UploadFile = File(...),
) -> APIResponse[UploadChunkResponse]:
    """
    上传单个分片。分片序号从 0 开始，单分片最大 10MB。
    """
    chunk_data = await chunk.read()

    # 单分片大小校验
    if len(chunk_data) > CHUNK_MAX_SIZE:
        raise HTTPException(status_code=413, detail=f"分片超出大小限制（最大 10MB）")
    if chunk_index < 0:
        raise HTTPException(status_code=400, detail="分片序号无效")

    result = await upload_service.save_chunk(
        upload_id=upload_id,
        chunk_index=chunk_index,
        chunk_data=chunk_data,
    )

    if not result.ok:
        raise HTTPException(status_code=400, detail=result.error)

    return APIResponse(
        success=True,
        data=UploadChunkResponse(
            upload_id=upload_id,
            chunk_index=chunk_index,
            received=True,
        ),
    )


@router.post("/{upload_id}/complete", summary="完成上传")
async def complete_upload(
    upload_id: str,
    body: UploadCompleteRequest | None = None,
) -> APIResponse[UploadCompleteResponse]:
    """
    完成上传，触发分片合并与 SHA256 校验

    校验通过后返回最终文件标识。
    """
    result = await upload_service.complete_upload(upload_id=upload_id)

    if not result.ok:
        raise HTTPException(status_code=400, detail=result.error)

    return APIResponse(
        success=True,
        data=UploadCompleteResponse(
            upload_id=upload_id,
            file_id=result.data["file_id"],
            file_size=result.data["file_size"],
            sha256=result.data["sha256"],
        ),
    )
