"""
工具/分类/配置数据模型 — Pydantic v2 请求/响应 schema
"""

from typing import Literal

from pydantic import BaseModel, Field

# ============================================================
# Category
# ============================================================


class CategoryCreate(BaseModel):
    """创建分类请求"""

    id: str = Field(description="分类 slug，如 'audio'")
    name: str = Field(description="分类显示名，如 '音频'")
    sort_order: int = Field(default=0, description="排序序号")


class CategoryUpdate(BaseModel):
    """更新分类请求（所有字段可选）"""

    name: str | None = Field(default=None, description="分类显示名")
    sort_order: int | None = Field(default=None, description="排序序号")


class CategoryResponse(BaseModel):
    """分类响应"""

    id: str
    name: str
    sort_order: int
    tool_count: int = Field(default=0, description="该分类下的工具数量")
    created_at: str
    updated_at: str


# ============================================================
# Tool
# ============================================================


class ToolCreate(BaseModel):
    """创建工具请求"""

    id: str = Field(description="工具 slug，如 'speech-to-text'")
    name: str = Field(description="工具名称")
    description: str = Field(description="功能描述")
    icon: str = Field(default="", description="emoji 图标")
    route: str = Field(description="路由路径")
    category_id: str = Field(description="所属分类 slug")
    implementation: str = Field(default="", description="实现说明")
    mode: Literal["backend-job", "client-only"] = Field(
        default="backend-job", description="运行模式"
    )
    input_type: str = Field(default="", description="输入类型: file | text")
    accept: str = Field(default="", description="接受的 MIME 类型")
    max_size: int = Field(default=0, description="最大文件大小（字节）")
    options: str = Field(default="{}", description="工具级 JSON 选项（标量默认值）")
    sort_order: int = Field(default=0, description="排序序号")


class ToolUpdate(BaseModel):
    """更新工具请求（所有字段可选，支持手动改变分类）"""

    name: str | None = Field(default=None, description="工具名称")
    description: str | None = Field(default=None, description="功能描述")
    icon: str | None = Field(default=None, description="emoji 图标")
    route: str | None = Field(default=None, description="路由路径")
    category_id: str | None = Field(default=None, description="所属分类 slug")
    implementation: str | None = Field(default=None, description="实现说明")
    mode: Literal["backend-job", "client-only"] | None = Field(
        default=None, description="运行模式"
    )
    input_type: str | None = Field(default=None, description="输入类型")
    accept: str | None = Field(default=None, description="接受的 MIME 类型")
    max_size: int | None = Field(default=None, description="最大文件大小（字节）")
    options: str | None = Field(default=None, description="工具级 JSON 选项")
    sort_order: int | None = Field(default=None, description="排序序号")


class ToolResponse(BaseModel):
    """工具基础响应（列表用）"""

    id: str
    name: str
    description: str
    icon: str
    route: str
    category_id: str
    category_name: str = Field(default="", description="分类显示名（JOIN 查询）")
    implementation: str
    mode: str
    input_type: str
    accept: str
    max_size: int
    options: str = Field(default="{}", description="工具级 JSON 选项")
    sort_order: int
    created_at: str
    updated_at: str


# ============================================================
# TTS Voices
# ============================================================


class VoiceCreate(BaseModel):
    """创建 TTS 声音"""

    id: str = Field(description="声音 ID，如 'zh-CN-XiaoxiaoNeural'")
    name: str = Field(description="显示名，如 '晓晓 — 温柔'")
    gender: Literal["male", "female"] = Field(description="性别")
    language: str = Field(description="语言，如 '中文'")
    sort_order: int = Field(default=0, description="排序序号")


class VoiceUpdate(BaseModel):
    """更新 TTS 声音"""

    name: str | None = Field(default=None, description="显示名")
    gender: Literal["male", "female"] | None = Field(default=None, description="性别")
    language: str | None = Field(default=None, description="语言")
    sort_order: int | None = Field(default=None, description="排序序号")


class VoiceResponse(BaseModel):
    """TTS 声音响应"""

    id: str
    name: str
    gender: str
    language: str
    sort_order: int
    created_at: str = ""


# ============================================================
# Convert Formats
# ============================================================


class FormatCreate(BaseModel):
    """创建转换格式"""

    value: str = Field(description="格式值，如 'png'")
    label: str = Field(description="显示名，如 'PNG'")
    category: Literal["image", "video", "audio"] = Field(description="格式分类")
    sort_order: int = Field(default=0, description="排序序号")


class FormatUpdate(BaseModel):
    """更新转换格式"""

    label: str | None = Field(default=None, description="显示名")
    category: Literal["image", "video", "audio"] | None = Field(
        default=None, description="格式分类"
    )
    sort_order: int | None = Field(default=None, description="排序序号")


class FormatResponse(BaseModel):
    """转换格式响应"""

    value: str
    label: str
    category: str
    sort_order: int
    created_at: str = ""
