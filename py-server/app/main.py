"""
FastAPI 应用入口 — 应用工厂、中间件、全局异常处理、路由注册
"""

import asyncio
import logging
import os
import signal
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1 import router as v1_router
from app.core.config import settings
from app.db.database import close_db, init_db
from app.engine.ocr_engine import preload_ocr_reader
from app.engine.stt_engine import preload_stt_model
from app.lib.browser_manager import browser_manager
from app.schemas.common import APIResponse

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理

    启动时执行初始化逻辑，关闭时执行清理逻辑。
    """
    # 启动事件
    logger.info(f"🚀 {settings.APP_NAME} 启动中...")
    logger.info(f"   环境: {'开发' if settings.DEBUG else '生产'}")
    logger.info(f"   上传目录: {settings.UPLOAD_DIR}")
    logger.info(f"   结果 TTL: {settings.RESULT_TTL_SECONDS}s")

    # 确保上传和临时目录存在
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
    settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    # 清理孤儿临时目录（上传中断/取消遗留）
    import shutil
    for d in settings.TEMP_DIR.iterdir():
        if d.is_dir():
            shutil.rmtree(d, ignore_errors=True)

    # 初始化 SQLite 数据库（建表 + seed）
    await init_db()

    # 预热 OCR 引擎
    preload_ocr_reader()
    # 预热 STT 引擎
    preload_stt_model()
    # 启动 Playwright 浏览器（未安装 playwright 时静默跳过）
    await browser_manager.start()

    try:
        yield
    except asyncio.CancelledError:
        # 服务器关闭时 lifespan 的 receive() 会被取消，
        # 这是正常行为 — 静默处理，避免 ERROR 日志噪音。
        logger.info(f"🛑 {settings.APP_NAME} 收到关闭信号")
    finally:
        # 确保清理逻辑始终执行
        await close_db()
        await browser_manager.stop()
        logger.info(f"🧹 {settings.APP_NAME} 清理完成")


def create_app() -> FastAPI:
    """应用工厂 — 创建并配置 FastAPI 应用实例"""

    # 桌面模式要求 token 不能为空（安全底线）
    if settings.BFE_DESKTOP and not settings.BFE_DESKTOP_TOKEN:
        raise RuntimeError(
            "桌面模式要求 BFE_DESKTOP_TOKEN 不能为空，请检查 Rust 端是否传入了 token"
        )

    app = FastAPI(
        title=settings.APP_NAME,
        version="0.1.0",
        description="bfe-tools — 前端实用工具集合站 API",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # CORS 中间件
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*", "X-BFE-Desktop-Token"],
    )

    # 桌面模式 token 校验中间件
    if settings.BFE_DESKTOP and settings.BFE_DESKTOP_TOKEN:

        @app.middleware("http")
        async def desktop_token_middleware(request: Request, call_next):
            """桌面端安全 token 校验（仅 BFE_DESKTOP=1 时启用）"""
            # /healthz /docs 等不需要 token
            if request.url.path in ("/healthz", "/docs", "/redoc", "/openapi.json"):
                return await call_next(request)

            token = request.headers.get("X-BFE-Desktop-Token")
            expected = settings.BFE_DESKTOP_TOKEN

            if not token or token != expected:
                return JSONResponse(
                    status_code=401,
                    content={"success": False, "data": None, "error": "未授权的桌面端请求"},
                )

            return await call_next(request)

    # 注册全局异常处理器
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        """全局异常处理器 — 将所有未捕获异常转为统一格式"""
        logger.error(f"未处理异常: {exc}", exc_info=True)
        error_response = APIResponse(
            success=False, data=None, error="服务器内部错误，请稍后重试"
        )
        return JSONResponse(
            status_code=500,
            content=error_response.model_dump(),
        )

    # 注册 v1 路由
    app.include_router(v1_router)

    # 桌面模式专用端点
    @app.get("/healthz")
    async def healthz():
        """桌面端健康检查 — 快速返回 200"""
        if not settings.BFE_DESKTOP:
            raise HTTPException(status_code=404)
        return {"status": "ok", "timestamp": time.time()}

    @app.post("/shutdown")
    async def shutdown(request: Request):
        """桌面端优雅关闭 — 等待进行中任务完成后退出"""
        if not settings.BFE_DESKTOP:
            raise HTTPException(status_code=404)

        # token 校验（/shutdown 不走中间件白名单）
        if settings.BFE_DESKTOP_TOKEN:
            token = request.headers.get("X-BFE-Desktop-Token")
            if not token or token != settings.BFE_DESKTOP_TOKEN:
                raise HTTPException(status_code=401, detail="未授权的关闭请求")

        logger.info("收到桌面端关闭信号，正在清理...")
        # 等待进行中任务（最多 10 秒）
        try:
            await asyncio.wait_for(_drain_pending_jobs(), timeout=10)
        except TimeoutError:
            logger.warning("等待任务完成超时，强制退出")

        # 发送 SIGTERM 给自己
        os.kill(os.getpid(), signal.SIGTERM)
        return {"status": "shutting_down"}

    return app


async def _drain_pending_jobs():
    """等待所有进行中的异步任务完成"""
    # 空循环等待，实际项目中应接入 job_service 的 pending 计数器
    # 此处为骨架 — 后续从 job_service 获取进行中任务数
    await asyncio.sleep(0.5)


# 应用实例
app = create_app()

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
    )
