"""
任务状态机测试

测试任务生命周期：创建 → 进度更新 → 完成/失败/取消
"""

import pytest


@pytest.mark.asyncio
async def test_create_job(async_client):
    """
    测试正常创建任务

    验证返回 jobId 且初始状态为 pending。
    """
    payload = {
        "toolId": "speech-to-text",
        "uploadId": "fake-upload-id",
        "params": {},
    }

    response = await async_client.post("/api/v1/jobs", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["data"]["jobId"] is not None
    assert data["data"]["status"] == "pending"


@pytest.mark.asyncio
async def test_get_job_status(async_client):
    """
    测试查询任务状态

    创建任务后查询，验证返回正确的状态信息。
    """
    # 创建任务
    create_resp = await async_client.post("/api/v1/jobs", json={
        "toolId": "image-ocr",
        "uploadId": "fake-upload-id",
        "params": {},
    })
    job_id = create_resp.json()["data"]["jobId"]

    # 查询状态
    status_resp = await async_client.get(f"/api/v1/jobs/{job_id}")
    assert status_resp.status_code == 200

    data = status_resp.json()["data"]
    assert data["jobId"] == job_id
    assert data["status"] == "pending"
    assert data["progress"] == 0.0
    assert data["error"] is None


@pytest.mark.asyncio
async def test_get_job_not_found(async_client):
    """
    测试查询不存在的任务

    验证返回 404。
    """
    response = await async_client.get("/api/v1/jobs/nonexistent-id")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_cancel_job(async_client):
    """
    测试取消任务

    创建任务后立即取消，验证状态变为 canceled。
    """
    # 创建任务
    create_resp = await async_client.post("/api/v1/jobs", json={
        "toolId": "media-convert",
        "uploadId": "fake-upload-id",
        "params": {"target_format": "mp4"},
    })
    job_id = create_resp.json()["data"]["jobId"]

    # 取消任务
    cancel_resp = await async_client.post(f"/api/v1/jobs/{job_id}/cancel")
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["data"]["status"] == "canceled"


@pytest.mark.asyncio
async def test_download_result_not_ready(async_client):
    """
    测试下载未完成的任务结果

    验证返回 404 错误。
    """
    # 创建任务（尚未完成）
    create_resp = await async_client.post("/api/v1/jobs", json={
        "toolId": "speech-to-text",
        "uploadId": "fake-upload-id",
        "params": {},
    })
    job_id = create_resp.json()["data"]["jobId"]

    # 尝试下载
    download_resp = await async_client.get(f"/api/v1/jobs/{job_id}/result")
    assert download_resp.status_code == 404
