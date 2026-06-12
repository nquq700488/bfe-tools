"""
v1 路由聚合

统一前缀 /api/v1，聚合所有子模块路由。
"""

from fastapi import APIRouter

from app.api.v1.jobs import router as jobs_router
from app.api.v1.tools import router as tools_router
from app.api.v1.upload import router as upload_router

router = APIRouter(prefix="/api/v1")

router.include_router(upload_router)
router.include_router(jobs_router)
router.include_router(tools_router)
