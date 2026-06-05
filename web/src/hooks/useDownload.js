import { ref } from 'vue';
/** 检测桌面端 */
function detectDesktop() {
    return (typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).has('__bfe_port'));
}
export function useDownload() {
    const downloading = ref(false);
    const progress = ref(0);
    const error = ref(null);
    const isDesktop = detectDesktop();
    async function download(url, fileName) {
        error.value = null;
        progress.value = 0;
        const downloadUrl = url.includes('?') ? `${url}&download=1` : `${url}?download=1`;
        // 统一：fetch 流式下载 → 进度 → Blob → <a download>
        // WKWebView 不支持 HTTP URL 的 <a download>，但支持 Blob URL
        downloading.value = true;
        // 桌面端：注入安全 token（fetch 不走 apiClient，需手动加 header）
        const headers = {};
        if (typeof window !== 'undefined') {
            const g = window;
            const info = g.__BFE_BACKEND_INFO__;
            if (info?.token) {
                headers['X-BFE-Desktop-Token'] = info.token;
            }
        }
        try {
            const resp = await fetch(downloadUrl, { headers });
            if (!resp.ok)
                throw new Error(`下载失败 (HTTP ${resp.status})`);
            const contentLength = Number(resp.headers.get('content-length')) || 0;
            const reader = resp.body?.getReader();
            if (!reader)
                throw new Error('无法读取响应流');
            const chunks = [];
            let received = 0;
            while (true) {
                const { done, value } = await reader.read();
                if (done)
                    break;
                chunks.push(value);
                received += value.length;
                if (contentLength > 0) {
                    progress.value = Math.round((received / contentLength) * 100);
                }
            }
            const blob = new Blob(chunks);
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // 延迟释放 Blob URL，确保下载已触发
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
        }
        catch (err) {
            error.value = err instanceof Error ? err.message : '下载失败';
            console.error('下载失败:', err);
        }
        finally {
            downloading.value = false;
        }
    }
    return { downloading, progress, error, download, isDesktop };
}
