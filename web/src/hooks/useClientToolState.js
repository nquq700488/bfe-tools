/**
 * useClientToolState — 纯前端工具共享状态管理模式
 * 提供统一的 input/output/error/loading 状态管理
 */
import { ref } from 'vue';
export function useClientToolState() {
    const input = ref('');
    const output = ref('');
    const error = ref(null);
    const loading = ref(false);
    function setInput(val) {
        input.value = val;
        // 输入变化时清除之前的错误
        error.value = null;
    }
    function setOutput(val) {
        output.value = val;
        loading.value = false;
    }
    function setError(val) {
        error.value = val;
        loading.value = false;
    }
    function reset() {
        input.value = '';
        output.value = '';
        error.value = null;
        loading.value = false;
    }
    return { input, output, error, loading, setInput, setOutput, setError, reset };
}
