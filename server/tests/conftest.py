"""
测试配置 — FastAPI TestClient fixture

所有测试通过此 fixture 获取无副作用的应用实例。
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app


@pytest.fixture
def app():
    """
    创建 FastAPI 应用实例（测试用）

    每个测试获取独立的 app 实例，避免状态污染。
    """
    return create_app()


@pytest.fixture
async def async_client(app):
    """
    创建异步 HTTP 测试客户端

    使用 ASGITransport 直接与 app 通信，无需启动真实服务器。
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
