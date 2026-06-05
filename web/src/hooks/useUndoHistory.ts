/**
 * useUndoHistory — 通用撤销栈 composable
 * 最大 50 步历史，支持 push/undo/redo
 */
import { ref, shallowRef, computed, type Ref, type ComputedRef } from 'vue'

const MAX_HISTORY = 50

export interface UndoHistory<T> {
  /** 当前状态 */
  state: Ref<T>
  /** 推送新状态到历史栈 */
  push: (value: T) => void
  /** 撤销 */
  undo: () => void
  /** 重做 */
  redo: () => void
  /** 是否可以撤销 */
  canUndo: ComputedRef<boolean>
  /** 是否可以重做 */
  canRedo: ComputedRef<boolean>
  /** 清除历史 */
  clear: () => void
}

export function useUndoHistory<T>(initialValue: T): UndoHistory<T> {
  const state = ref<T>(initialValue) as Ref<T>
  // 使用 shallowRef 避免 Vue 深度 unwrap 数组内的 Ref
  const undoStack = shallowRef<T[]>([])
  const redoStack = shallowRef<T[]>([])

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function push(value: T): void {
    undoStack.value = [...undoStack.value, state.value]
    if (undoStack.value.length > MAX_HISTORY) {
      undoStack.value = undoStack.value.slice(-MAX_HISTORY)
    }
    redoStack.value = []
    state.value = value
  }

  function undo(): void {
    if (!canUndo.value) return
    redoStack.value = [...redoStack.value, state.value]
    state.value = undoStack.value[undoStack.value.length - 1]
    undoStack.value = undoStack.value.slice(0, -1)
  }

  function redo(): void {
    if (!canRedo.value) return
    undoStack.value = [...undoStack.value, state.value]
    state.value = redoStack.value[redoStack.value.length - 1]
    redoStack.value = redoStack.value.slice(0, -1)
  }

  function clear(): void {
    undoStack.value = []
    redoStack.value = []
  }

  return { state, push, undo, redo, canUndo, canRedo, clear }
}
