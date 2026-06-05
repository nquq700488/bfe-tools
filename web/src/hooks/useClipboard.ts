/**
 * useClipboard — 剪贴板操作 composable
 * 提取自 ToolPage.vue 的 copyToClipboard 逻辑
 */
import { ref, onUnmounted } from 'vue'

export function useClipboard(): {
  copy: (text: string) => Promise<boolean>
  copied: ReturnType<typeof ref<boolean>>
} {
  const copied = ref(false)
  let timer: ReturnType<typeof setTimeout> | null = null

  async function copy(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }

    copied.value = true
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      copied.value = false
      timer = null
    }, 2000)

    return true
  }

  onUnmounted(() => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  })

  return { copy, copied }
}
