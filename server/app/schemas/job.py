"""
任务/上传相关 Schema — 请求/响应模型

统一约定：
- 所有 Request/Response 字段通过 alias 对接前端 camelCase
- Python 侧内部使用 snake_case
- 序列化时 by_alias=True 自动输出 camelCase JSON
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def _to_camel(snake: str) -> str:
    """snake_case → camelCase"""
    parts = snake.split('_')
    return parts[0] + ''.join(p.title() for p in parts[1:])


class BaseSchema(BaseModel):
    """所有 Schema 基类：输入接受 snake_case 或 camelCase，输出强制 camelCase JSON"""
    model_config = ConfigDict(
        alias_generator=_to_camel,
        populate_by_name=True,
    )

    def model_dump(self, **kwargs):
        return super().model_dump(by_alias=True, **kwargs)

    def model_dump_json(self, **kwargs):
        return super().model_dump_json(by_alias=True, **kwargs)


# === 上传相关 ===


class UploadCreateRequest(BaseSchema):
    """创建上传任务请求"""

    file_name: str = Field(description="原始文件名")
    file_size: int = Field(description="文件大小（字节）", gt=0)
    mime_type: str = Field(description="文件 MIME 类型")
    total_chunks: int = Field(description="分片总数", ge=1)


class UploadCreateResponse(BaseSchema):
    """创建上传任务响应"""

    upload_id: str = Field(description="上传任务唯一标识")
    file_name: str = Field(description="原始文件名")
    file_size: int = Field(description="文件大小（字节）")
    total_chunks: int = Field(description="分片总数")


class UploadChunkResponse(BaseSchema):
    """上传分片响应"""

    upload_id: str = Field(description="上传任务 ID")
    chunk_index: int = Field(description="分片序号")
    received: bool = Field(description="分片是否接收成功")


class UploadCompleteRequest(BaseSchema):
    """完成上传请求"""

    total_chunks: int | None = Field(default=None, description="总分片数（可选，用于校验）")


class UploadCompleteResponse(BaseSchema):
    """完成上传响应"""

    upload_id: str = Field(description="上传任务 ID")
    file_id: str = Field(description="合并后的文件唯一标识")
    file_size: int = Field(description="合并后的文件大小（字节）")
    sha256: str = Field(description="文件 SHA256 校验值")


# === 任务相关 ===


JobStatus = Literal["pending", "running", "succeeded", "failed", "canceled"]


class JobCreateRequest(BaseSchema):
    """创建处理任务请求 — 仅暴露公开字段，file_path 由后端内部填充"""

    tool_id: str = Field(description="工具标识（如 speech-to-text）")
    upload_id: str | None = Field(default=None, description="关联的上传任务 ID（截图/HTML渲染等工具不需要上传文件）")
    params: dict | None = Field(default=None, description="工具特定参数（如目标格式）")


class JobCreateResponse(BaseSchema):
    """创建处理任务响应"""

    job_id: str = Field(description="任务唯一标识")
    status: JobStatus = Field(default="pending", description="任务初始状态")
    created_at: str = Field(description="创建时间（ISO 8601）")


class JobStatusResponse(BaseSchema):
    """任务状态查询响应"""

    job_id: str = Field(description="任务 ID")
    status: JobStatus = Field(description="任务当前状态")
    progress: float = Field(default=0.0, description="进度百分比（0-100）")
    result_url: str | None = Field(default=None, description="结果文件下载 URL")
    result_file_name: str | None = Field(default=None, description="结果文件名")
    result_text: str | None = Field(default=None, description="识别文本（OCR/TTS等引擎返回的文本内容）")
    ocr_segments: list[dict] | None = Field(default=None, description="OCR 文字段落详情（含文字、坐标、置信度）")
    output_files: list[dict] | None = Field(default=None, description="多输出文件列表，每项 {file_name, file_size, url}")
    result_metadata: dict | None = Field(default=None, description="结构化元数据（如 img srcset、PDF 提取文字、截图分辨率列表等）")
    error: str | None = Field(default=None, description="错误消息（仅在 failed 状态）")
    created_at: str = Field(description="创建时间（ISO 8601）")


class CancelJobResponse(BaseSchema):
    """取消任务响应"""

    job_id: str = Field(description="任务 ID")
    status: Literal["canceled"] = Field(default="canceled", description="任务已取消")
