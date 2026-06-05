import { ref, onUnmounted } from 'vue'
import { to } from '@/lib/to'
import { apiClient } from '@/lib/api'
import type { TaskStatus } from '@/types/tool'
import type { OcrSegment } from '@/types/api'

/**
 * @name useTaskPolling
 * @description 任务状态轮询 composable
 *
 * 调用 start(jobId) 开始轮询，立即查一次（缓存命中可秒返），
 * 之后每 1s 轮询。
 */
export function useTaskPolling() {
  const status = ref<TaskStatus['status']>('pending')
  const progress = ref(0)
  const errorMessage = ref<string | null>(null)
  const resultUrl = ref<string | null>(null)
  const resultFileName = ref<string | null>(null)
  const resultText = ref<string | null>(null)
  const ocrSegments = ref<OcrSegment[] | null>(null)

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let stopped = false

  async function fetchStatus(jobId: string): Promise<void> {
    const [resp, err] = await to(
      apiClient.get<{
        status: TaskStatus['status']
        progress: number
        resultUrl: string | null
        resultFileName?: string | null
        error: string | null
        resultText?: string | null
        ocrSegments?: OcrSegment[] | null
      }>(`/api/v1/jobs/${jobId}`)
    )

    if (err || !resp?.data) return
    if (stopped) return

    status.value = resp.data.status
    progress.value = resp.data.progress
    resultUrl.value = resp.data.resultUrl
    resultFileName.value = resp.data.resultFileName || null
    resultText.value = resp.data.resultText || null
    ocrSegments.value = resp.data.ocrSegments || null
    errorMessage.value = resp.data.error

    if (['succeeded', 'failed', 'canceled'].includes(resp.data.status)) {
      stop()
    }
  }

  function stop(): void {
    stopped = true
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function start(jobId: string): void {
    stop()
    stopped = false
    status.value = 'pending'
    progress.value = 0
    errorMessage.value = null
    resultUrl.value = null
    resultFileName.value = null
    resultText.value = null
    ocrSegments.value = null

    // 立即查一次（缓存命中秒返）
    fetchStatus(jobId)

    // 然后每秒轮询
    pollTimer = setInterval(() => fetchStatus(jobId), 1000)
  }

  onUnmounted(() => stop())

  return {
    status,
    progress,
    errorMessage,
    resultUrl,
    resultFileName,
    resultText,
    ocrSegments,
    start,
    stop,
  }
}
