"""
统一 API 响应信封 — 所有 HTTP 接口复用此格式

与前端 web/src/types/api.ts 中的 APIResponse 一一对应。
"""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """统一 API 响应信封"""

    success: bool = Field(description="请求是否成功")
    data: T | None = Field(default=None, description="响应数据（成功时返回）")
    error: str | None = Field(default=None, description="错误消息（失败时返回）")
    meta: dict | None = Field(default=None, description="附加元数据（如分页信息）")


class PageMeta(BaseModel):
    """分页元数据"""

    total: int = Field(description="总记录数")
    page: int = Field(description="当前页码")
    page_size: int = Field(description="每页条数")


class Result(Generic[T]):
    """
    Go 风格结果封装 — 对标前端 to() 模式

    const [data, err] = await to(promise)

    Usage:
        result = Result.ok(data)
        if not result.ok:
            return result
    """

    def __init__(self, data: T | None = None, error: str | None = None):
        self.data = data
        self.error = error

    @property
    def ok(self) -> bool:
        """是否成功"""
        return self.error is None

    @classmethod
    def success(cls, data: T) -> "Result[T]":
        """创建成功结果"""
        return cls(data=data)

    @classmethod
    def failure(cls, error: str) -> "Result[T]":
        """创建失败结果"""
        return cls(error=error)
