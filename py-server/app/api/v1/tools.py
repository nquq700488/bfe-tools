"""
工具/分类管理 API — CRUD 端点

所有端点使用统一响应格式 APIResponse。
"""

import logging

from fastapi import APIRouter, HTTPException

from app.db.database import get_db
from app.db.models import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    FormatCreate,
    FormatResponse,
    FormatUpdate,
    ToolResponse,
    ToolUpdate,
    VoiceCreate,
    VoiceResponse,
    VoiceUpdate,
)
from app.schemas.common import APIResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["工具/分类管理"])


# ============================================================
# Category 端点
# ============================================================


@router.get("/categories", response_model=APIResponse[list[CategoryResponse]])
async def list_categories() -> APIResponse[list[CategoryResponse]]:
    """获取所有分类（按 sort_order 排序）"""
    db = await get_db()
    cursor = await db.execute(
        """
        SELECT c.*, COUNT(t.id) AS tool_count
        FROM categories c
        LEFT JOIN tools t ON t.category_id = c.id
        GROUP BY c.id
        ORDER BY c.sort_order
        """
    )
    rows = await cursor.fetchall()
    categories = [CategoryResponse(**dict(r)) for r in rows]
    return APIResponse(success=True, data=categories)


@router.post("/categories", status_code=201, response_model=APIResponse[CategoryResponse])
async def create_category(body: CategoryCreate) -> APIResponse[CategoryResponse]:
    """创建新分类"""
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO categories (id, name, sort_order) VALUES (?, ?, ?)",
            (body.id, body.name, body.sort_order),
        )
        await db.commit()
    except Exception:
        raise HTTPException(status_code=409, detail=f"分类 '{body.id}' 已存在") from None

    cursor = await db.execute("SELECT * FROM categories WHERE id = ?", (body.id,))
    row = await cursor.fetchone()
    assert row is not None, "刚创建的分类查询不应为空"
    return APIResponse(success=True, data=CategoryResponse(**dict(row), tool_count=0))


@router.patch("/categories/{category_id}", response_model=APIResponse[CategoryResponse])
async def update_category(
    category_id: str, body: CategoryUpdate
) -> APIResponse[CategoryResponse]:
    """更新分类（名称、排序）"""
    db = await get_db()

    # 检查存在
    cursor = await db.execute("SELECT * FROM categories WHERE id = ?", (category_id,))
    row = await cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="分类不存在")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="没有要更新的字段")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values())
    set_clause += ", updated_at = datetime('now')"

    await db.execute(
        f"UPDATE categories SET {set_clause} WHERE id = ?",
        values + [category_id],
    )
    await db.commit()

    cursor = await db.execute(
        """
        SELECT c.*, COUNT(t.id) AS tool_count
        FROM categories c
        LEFT JOIN tools t ON t.category_id = c.id
        WHERE c.id = ?
        GROUP BY c.id
        """,
        (category_id,),
    )
    row = await cursor.fetchone()
    assert row is not None, "刚更新的分类查询不应为空"
    return APIResponse(success=True, data=CategoryResponse(**dict(row)))


@router.delete("/categories/{category_id}", response_model=APIResponse[None])
async def delete_category(category_id: str) -> APIResponse[None]:
    """删除分类（仅当分类下无工具时允许）"""
    db = await get_db()

    cursor = await db.execute("SELECT COUNT(*) FROM tools WHERE category_id = ?", (category_id,))
    count_row = await cursor.fetchone()
    assert count_row is not None, "COUNT 查询不应为空"
    count = count_row[0]
    if count > 0:
        raise HTTPException(
            status_code=409,
            detail=f"分类下还有 {count} 个工具，请先迁移或删除工具后再删除分类",
        )

    cursor = await db.execute("DELETE FROM categories WHERE id = ?", (category_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="分类不存在")

    await db.commit()
    return APIResponse(success=True, data=None)


# ============================================================
# Tool 端点
# ============================================================


@router.get("/tools", response_model=APIResponse[list[ToolResponse]])
async def list_tools(category: str | None = None) -> APIResponse[list[ToolResponse]]:
    """获取工具列表，支持按分类筛选"""
    db = await get_db()

    if category:
        cursor = await db.execute(
            """
            SELECT t.*, c.name AS category_name
            FROM tools t
            JOIN categories c ON c.id = t.category_id
            WHERE t.category_id = ?
            ORDER BY t.sort_order
            """,
            (category,),
        )
    else:
        cursor = await db.execute(
            """
            SELECT t.*, c.name AS category_name
            FROM tools t
            JOIN categories c ON c.id = t.category_id
            ORDER BY t.category_id, t.sort_order
            """
        )

    rows = await cursor.fetchall()
    tool_list = [ToolResponse(**dict(r)) for r in rows]
    return APIResponse(success=True, data=tool_list)


@router.get("/tools/{tool_id}")
async def get_tool(tool_id: str) -> APIResponse[dict[str, object]]:
    """获取单个工具详情（含声音/格式列表）"""
    db = await get_db()
    cursor = await db.execute(
        """
        SELECT t.*, c.name AS category_name
        FROM tools t
        JOIN categories c ON c.id = t.category_id
        WHERE t.id = ?
        """,
        (tool_id,),
    )
    row = await cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="工具不存在")

    result = dict(row)

    # 加载 TTS 声音列表
    cursor = await db.execute(
        "SELECT id, name, gender, language, sort_order, created_at "
        "FROM tts_voices WHERE tool_id = ? ORDER BY sort_order",
        (tool_id,),
    )
    result["voices"] = [VoiceResponse(**dict(r)) for r in await cursor.fetchall()]

    # 加载转换格式列表
    cursor = await db.execute(
        "SELECT value, label, category, sort_order, created_at "
        "FROM convert_formats WHERE tool_id = ? ORDER BY sort_order",
        (tool_id,),
    )
    result["formats"] = [FormatResponse(**dict(r)) for r in await cursor.fetchall()]

    return APIResponse(success=True, data=result)


@router.patch("/tools/{tool_id}", response_model=APIResponse[ToolResponse])
async def update_tool(tool_id: str, body: ToolUpdate) -> APIResponse[ToolResponse]:
    """更新工具（支持手动改变分类）"""
    db = await get_db()

    cursor = await db.execute("SELECT * FROM tools WHERE id = ?", (tool_id,))
    row = await cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="工具不存在")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="没有要更新的字段")

    if "category_id" in updates:
        cursor = await db.execute(
            "SELECT id FROM categories WHERE id = ?", (updates["category_id"],)
        )
        if await cursor.fetchone() is None:
            raise HTTPException(status_code=400, detail="目标分类不存在")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values())
    set_clause += ", updated_at = datetime('now')"

    await db.execute(
        f"UPDATE tools SET {set_clause} WHERE id = ?",
        values + [tool_id],
    )
    await db.commit()

    cursor = await db.execute(
        """
        SELECT t.*, c.name AS category_name
        FROM tools t
        JOIN categories c ON c.id = t.category_id
        WHERE t.id = ?
        """,
        (tool_id,),
    )
    row = await cursor.fetchone()
    assert row is not None, "刚更新的工具查询不应为空"
    return APIResponse(success=True, data=ToolResponse(**dict(row)))


# ============================================================
# TTS Voices 端点（嵌套在 /tools/{tool_id}/voices 下）
# ============================================================


@router.get("/tools/{tool_id}/voices", response_model=APIResponse[list[VoiceResponse]])
async def list_voices(tool_id: str) -> APIResponse[list[VoiceResponse]]:
    """获取工具的所有 TTS 声音"""
    db = await get_db()
    cursor = await db.execute(
        "SELECT id, name, gender, language, sort_order, created_at "
        "FROM tts_voices WHERE tool_id = ? ORDER BY sort_order",
        (tool_id,),
    )
    voices = [VoiceResponse(**dict(r)) for r in await cursor.fetchall()]
    return APIResponse(success=True, data=voices)


@router.post("/tools/{tool_id}/voices", status_code=201, response_model=APIResponse[VoiceResponse])
async def create_voice(tool_id: str, body: VoiceCreate) -> APIResponse[VoiceResponse]:
    """添加 TTS 声音"""
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO tts_voices (id, tool_id, name, gender, language, sort_order) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (body.id, tool_id, body.name, body.gender, body.language, body.sort_order),
        )
        await db.commit()
    except Exception:
        raise HTTPException(status_code=409, detail=f"声音 '{body.id}' 已存在") from None

    cursor = await db.execute(
        "SELECT id, name, gender, language, sort_order, created_at "
        "FROM tts_voices WHERE tool_id = ? AND id = ?",
        (tool_id, body.id),
    )
    row = await cursor.fetchone()
    assert row is not None
    return APIResponse(success=True, data=VoiceResponse(**dict(row)))


@router.patch(
    "/tools/{tool_id}/voices/{voice_id}", response_model=APIResponse[VoiceResponse]
)
async def update_voice(
    tool_id: str, voice_id: str, body: VoiceUpdate
) -> APIResponse[VoiceResponse]:
    """更新 TTS 声音"""
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM tts_voices WHERE tool_id = ? AND id = ?", (tool_id, voice_id)
    )
    if await cursor.fetchone() is None:
        raise HTTPException(status_code=404, detail="声音不存在")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="没有要更新的字段")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values())
    await db.execute(
        f"UPDATE tts_voices SET {set_clause} WHERE tool_id = ? AND id = ?",
        values + [tool_id, voice_id],
    )
    await db.commit()

    cursor = await db.execute(
        "SELECT id, name, gender, language, sort_order, created_at "
        "FROM tts_voices WHERE tool_id = ? AND id = ?",
        (tool_id, voice_id),
    )
    row = await cursor.fetchone()
    assert row is not None
    return APIResponse(success=True, data=VoiceResponse(**dict(row)))


@router.delete("/tools/{tool_id}/voices/{voice_id}", response_model=APIResponse[None])
async def delete_voice(tool_id: str, voice_id: str) -> APIResponse[None]:
    """删除 TTS 声音"""
    db = await get_db()
    cursor = await db.execute(
        "DELETE FROM tts_voices WHERE tool_id = ? AND id = ?", (tool_id, voice_id)
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="声音不存在")
    await db.commit()
    return APIResponse(success=True, data=None)


# ============================================================
# Convert Formats 端点（嵌套在 /tools/{tool_id}/formats 下）
# ============================================================


@router.get(
    "/tools/{tool_id}/formats", response_model=APIResponse[list[FormatResponse]]
)
async def list_formats(tool_id: str) -> APIResponse[list[FormatResponse]]:
    """获取工具的所有转换格式"""
    db = await get_db()
    cursor = await db.execute(
        "SELECT value, label, category, sort_order, created_at "
        "FROM convert_formats WHERE tool_id = ? ORDER BY sort_order",
        (tool_id,),
    )
    formats = [FormatResponse(**dict(r)) for r in await cursor.fetchall()]
    return APIResponse(success=True, data=formats)


@router.post(
    "/tools/{tool_id}/formats", status_code=201, response_model=APIResponse[FormatResponse]
)
async def create_format(
    tool_id: str, body: FormatCreate
) -> APIResponse[FormatResponse]:
    """添加转换格式"""
    db = await get_db()
    try:
        await db.execute(
            "INSERT INTO convert_formats (value, tool_id, label, category, sort_order) "
            "VALUES (?, ?, ?, ?, ?)",
            (body.value, tool_id, body.label, body.category, body.sort_order),
        )
        await db.commit()
    except Exception:
        raise HTTPException(
            status_code=409, detail=f"格式 '{body.value}' 已存在"
        ) from None

    cursor = await db.execute(
        "SELECT value, label, category, sort_order, created_at "
        "FROM convert_formats WHERE tool_id = ? AND value = ?",
        (tool_id, body.value),
    )
    row = await cursor.fetchone()
    assert row is not None
    return APIResponse(success=True, data=FormatResponse(**dict(row)))


@router.patch(
    "/tools/{tool_id}/formats/{format_value}", response_model=APIResponse[FormatResponse]
)
async def update_format(
    tool_id: str, format_value: str, body: FormatUpdate
) -> APIResponse[FormatResponse]:
    """更新转换格式"""
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM convert_formats WHERE tool_id = ? AND value = ?",
        (tool_id, format_value),
    )
    if await cursor.fetchone() is None:
        raise HTTPException(status_code=404, detail="格式不存在")

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="没有要更新的字段")

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    values = list(updates.values())
    await db.execute(
        f"UPDATE convert_formats SET {set_clause} WHERE tool_id = ? AND value = ?",
        values + [tool_id, format_value],
    )
    await db.commit()

    cursor = await db.execute(
        "SELECT value, label, category, sort_order, created_at "
        "FROM convert_formats WHERE tool_id = ? AND value = ?",
        (tool_id, format_value),
    )
    row = await cursor.fetchone()
    assert row is not None
    return APIResponse(success=True, data=FormatResponse(**dict(row)))


@router.delete(
    "/tools/{tool_id}/formats/{format_value}", response_model=APIResponse[None]
)
async def delete_format(tool_id: str, format_value: str) -> APIResponse[None]:
    """删除转换格式"""
    db = await get_db()
    cursor = await db.execute(
        "DELETE FROM convert_formats WHERE tool_id = ? AND value = ?",
        (tool_id, format_value),
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="格式不存在")
    await db.commit()
    return APIResponse(success=True, data=None)
