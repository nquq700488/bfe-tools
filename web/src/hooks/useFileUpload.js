import { ref, computed } from 'vue';
import { to } from '@/lib/to';
import { apiClient } from '@/lib/api';
/** 分片大小：5MB */
const CHUNK_SIZE = 5 * 1024 * 1024;
/**
 * @name useFileUpload
 * @description 文件上传 composable — 分片上传、断点续传、进度追踪、取消
 * @param maxConcurrent 最大并发分片数，默认 3
 * @return 上传相关的状态与方法
 */
export function useFileUpload(maxConcurrent = 3) {
    /** 所有上传任务状态 */
    const uploadStates = ref([]);
    /** AbortController 映射，用于取消上传 */
    const abortControllers = new Map();
    /** 当前活跃的上传数 */
    const activeCount = computed(() => uploadStates.value.filter((s) => s.status === 'uploading').length);
    /** 是否有上传进行中 */
    const isUploading = computed(() => activeCount.value > 0);
    /**
     * 为文件创建分片
     */
    function sliceFile(file) {
        const chunks = [];
        let start = 0;
        while (start < file.size) {
            const end = Math.min(start + CHUNK_SIZE, file.size);
            chunks.push(file.slice(start, end));
            start = end;
        }
        return chunks;
    }
    /**
     * 上传单个分片
     */
    async function uploadChunk(uploadId, chunkIndex, chunk, signal) {
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('index', String(chunkIndex));
        const [, err] = await to(apiClient.put(`/api/v1/uploads/${uploadId}/chunks/${chunkIndex}`, formData, { signal }));
        if (err)
            throw err;
    }
    /**
     * 开始上传文件
     */
    async function uploadFile(file) {
        const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const controller = new AbortController();
        abortControllers.set(fileId, controller);
        const state = {
            fileId,
            fileName: file.name,
            status: 'uploading',
            progress: 0,
            loaded: 0,
            total: file.size,
        };
        uploadStates.value = [...uploadStates.value, state];
        // 1. 创建上传任务
        const [createResult, createErr] = await to(apiClient.post('/api/v1/uploads', {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            totalChunks: Math.ceil(file.size / CHUNK_SIZE),
        }));
        if (createErr || !createResult?.data) {
            updateState(fileId, { status: 'failed', error: createErr?.message || '创建上传任务失败' });
            return null;
        }
        const uploadId = createResult.data.uploadId;
        // 2. 分片上传
        const chunks = sliceFile(file);
        let uploadedBytes = 0;
        for (let i = 0; i < chunks.length; i += maxConcurrent) {
            if (controller.signal.aborted) {
                updateState(fileId, { status: 'canceled' });
                return null;
            }
            const batch = chunks.slice(i, i + maxConcurrent).map((chunk, idx) => {
                const chunkIndex = i + idx;
                return uploadChunk(uploadId, chunkIndex, chunk, controller.signal).then(() => {
                    uploadedBytes += chunk.size;
                    updateState(fileId, {
                        loaded: uploadedBytes,
                        progress: (uploadedBytes / file.size) * 100,
                    });
                });
            });
            const [, err] = await to(Promise.all(batch));
            if (err) {
                if (controller.signal.aborted) {
                    updateState(fileId, { status: 'canceled' });
                }
                else {
                    updateState(fileId, { status: 'failed', error: err.message });
                }
                return null;
            }
        }
        // 3. 标记上传完成
        const [, completeErr] = await to(apiClient.post(`/api/v1/uploads/${uploadId}/complete`));
        if (completeErr) {
            updateState(fileId, { status: 'failed', error: completeErr.message });
            return null;
        }
        updateState(fileId, { status: 'succeeded', progress: 100 });
        return uploadId;
    }
    /**
     * 取消指定文件的上传
     */
    function cancelUpload(fileId) {
        const controller = abortControllers.get(fileId);
        if (controller) {
            controller.abort();
            abortControllers.delete(fileId);
        }
        updateState(fileId, { status: 'canceled' });
    }
    /**
     * 取消所有进行中的上传
     */
    function cancelAll() {
        abortControllers.forEach((controller) => controller.abort());
        abortControllers.clear();
        uploadStates.value = uploadStates.value.map((s) => s.status === 'uploading' ? { ...s, status: 'canceled' } : s);
    }
    /**
     * 更新上传状态（不可变模式）
     */
    function updateState(fileId, update) {
        uploadStates.value = uploadStates.value.map((s) => s.fileId === fileId ? { ...s, ...update } : s);
    }
    return {
        uploadStates,
        activeCount,
        isUploading,
        uploadFile,
        cancelUpload,
        cancelAll,
    };
}
