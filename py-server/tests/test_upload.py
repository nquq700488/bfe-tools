"""
上传 API 基础测试

测试上传生命周期：创建 → 分片上传 → 完成
"""

import pytest


@pytest.mark.asyncio
async def test_create_upload_valid(async_client):
    """
    测试正常创建上传任务

    验证返回正确的 uploadId 和分片信息。
    """
    payload = {
        "fileName": "test.mp3",
        "fileSize": 1048576,
        "mimeType": "audio/mpeg",
        "totalChunks": 1,
    }

    response = await async_client.post("/api/v1/uploads", json=payload)
    assert response.status_code == 200

    data = response.json()
    assert data["success"] is True
    assert data["data"]["uploadId"] is not None
    assert data["data"]["totalChunks"] == 1


@pytest.mark.asyncio
async def test_create_upload_invalid_extension(async_client):
    """
    测试不支持的文件扩展名

    验证返回 400 错误。
    """
    payload = {
        "fileName": "test.exe",
        "fileSize": 1048576,
        "mimeType": "application/octet-stream",
        "totalChunks": 1,
    }

    response = await async_client.post("/api/v1/uploads", json=payload)
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_upload_chunk(async_client):
    """
    测试上传分片

    先创建上传任务，再上传一个分片。
    """
    # 创建上传任务
    create_payload = {
        "fileName": "test.wav",
        "fileSize": 100,
        "mimeType": "audio/wav",
        "totalChunks": 1,
    }
    create_resp = await async_client.post("/api/v1/uploads", json=create_payload)
    assert create_resp.status_code == 200
    upload_id = create_resp.json()["data"]["uploadId"]

    # 上传分片
    chunk_data = b"x" * 100
    files = {"chunk": ("chunk_0", chunk_data, "application/octet-stream")}
    chunk_resp = await async_client.put(
        f"/api/v1/uploads/{upload_id}/chunks/0",
        files=files,
    )
    assert chunk_resp.status_code == 200
    assert chunk_resp.json()["data"]["received"] is True


@pytest.mark.asyncio
async def test_complete_upload(async_client):
    """
    测试完成上传（合并 + 校验）

    创建任务 → 上传分片 → 完成上传 → 校验 SHA256。
    """
    # 创建
    payload = {
        "fileName": "test.mp3",
        "fileSize": 200,
        "mimeType": "audio/mpeg",
        "totalChunks": 2,
    }
    resp = await async_client.post("/api/v1/uploads", json=payload)
    upload_id = resp.json()["data"]["uploadId"]

    # 上传 2 个分片
    for i in range(2):
        chunk = b"a" * 100
        files = {"chunk": (f"chunk_{i}", chunk, "application/octet-stream")}
        chunk_resp = await async_client.put(
            f"/api/v1/uploads/{upload_id}/chunks/{i}",
            files=files,
        )
        assert chunk_resp.status_code == 200

    # 完成上传
    complete_resp = await async_client.post(
        f"/api/v1/uploads/{upload_id}/complete",
        json={"uploadId": upload_id},
    )
    assert complete_resp.status_code == 200
    data = complete_resp.json()["data"]
    assert data["fileId"] is not None
    assert data["sha256"] is not None
    assert len(data["sha256"]) == 64  # SHA256 十六进制长度为 64
