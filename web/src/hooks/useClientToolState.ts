/**
 * useClientToolState — 纯前端工具共享状态管理模式
 * 提供统一的 input/output/error/loading 状态管理
 */
import { ref, type Ref } from 'vue'

export interface ClientToolState {
  input: Ref<string>
  output: Ref<string>
  error: Ref<string | null>
  loading: Ref<boolean>
  setInput: (val: string) => void
  setOutput: (val: string) => void
  setError: (val: string | null) => void
  reset: () => void
}

export function useClientToolState(): ClientToolState {
  const input = ref('')
  const output = ref('')
  const error = ref<string | null>(null)
  const loading = ref(false)

  function setInput(val: string): void {
    input.value = val
    // 输入变化时清除之前的错误
    error.value = null
  }

  function setOutput(val: string): void {
    output.value = val
    loading.value = false
  }

  function setError(val: string | null): void {
    error.value = val
    loading.value = false
  }

  function reset(): void {
    input.value = ''
    output.value = ''
    error.value = null
    loading.value = false
  }

  return { input, output, error, loading, setInput, setOutput, setError, reset }
}
