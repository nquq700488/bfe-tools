/**
 * useUndoHistory — 通用撤销栈 composable
 * 最大 50 步历史，支持 push/undo/redo
 */
import { ref, shallowRef, computed } from 'vue';
const MAX_HISTORY = 50;
export function useUndoHistory(initialValue) {
    const state = ref(initialValue);
    // 使用 shallowRef 避免 Vue 深度 unwrap 数组内的 Ref
    const undoStack = shallowRef([]);
    const redoStack = shallowRef([]);
    const canUndo = computed(() => undoStack.value.length > 0);
    const canRedo = computed(() => redoStack.value.length > 0);
    function push(value) {
        undoStack.value = [...undoStack.value, state.value];
        if (undoStack.value.length > MAX_HISTORY) {
            undoStack.value = undoStack.value.slice(-MAX_HISTORY);
        }
        redoStack.value = [];
        state.value = value;
    }
    function undo() {
        if (!canUndo.value)
            return;
        redoStack.value = [...redoStack.value, state.value];
        state.value = undoStack.value[undoStack.value.length - 1];
        undoStack.value = undoStack.value.slice(0, -1);
    }
    function redo() {
        if (!canRedo.value)
            return;
        undoStack.value = [...undoStack.value, state.value];
        state.value = redoStack.value[redoStack.value.length - 1];
        redoStack.value = redoStack.value.slice(0, -1);
    }
    function clear() {
        undoStack.value = [];
        redoStack.value = [];
    }
    return { state, push, undo, redo, canUndo, canRedo, clear };
}
