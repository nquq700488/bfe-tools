/**
 * @name useHistory
 * @description IndexedDB 历史记录 composable
 * 提供本地历史记录的增删查操作，数据持久化到浏览器 IndexedDB
 *
 * 当前为骨架实现，IndexedDB 具体封装将在后续完善
 * （后续将引入 idb 或本地封装 indexed-db.ts 工具）
 */
import { ref } from 'vue';
/**
 * 使用历史记录功能
 *
 * TODO: 后续引入 IndexedDB 封装库（如 idb）实现实际的持久化逻辑
 */
export function useHistory() {
    const records = ref([]);
    /**
     * 添加一条历史记录
     * TODO: 实现 IndexedDB 写入
     */
    async function addRecord(record) {
        records.value = [record, ...records.value];
        // 骨架：未来写入 IndexedDB
        console.info(`[useHistory] 添加记录: ${record.id} — 待接入 IndexedDB`);
    }
    /**
     * 按工具 ID 筛选历史记录
     * TODO: 实现 IndexedDB 查询
     */
    async function getRecordsByTool(toolId) {
        return records.value.filter((r) => r.toolId === toolId);
    }
    /**
     * 删除指定记录
     * TODO: 实现 IndexedDB 删除
     */
    async function removeRecord(id) {
        records.value = records.value.filter((r) => r.id !== id);
    }
    /**
     * 清空所有历史记录
     * TODO: 实现 IndexedDB 清空
     */
    async function clearAll() {
        records.value = [];
    }
    return {
        records,
        addRecord,
        getRecordsByTool,
        removeRecord,
        clearAll,
    };
}
