/**
 * @name to
 * @description 将 Promise 包装为 Go 风格的 [data, error] 元组
 * 对标后端 Python Result[T] 模式
 * @param {Promise<T>} promise 待执行的 Promise
 * @return {Promise<[T, null] | [undefined, Error]>} 成功返回 [data, null]，失败返回 [undefined, error]
 * @example
 * const [data, err] = await to(fetchList(params))
 * if (err) return
 * // 安全使用 data
 */
export async function to(promise) {
    try {
        const data = await promise;
        return [data, null];
    }
    catch (error) {
        // 确保始终返回 Error 实例
        const err = error instanceof Error ? error : new Error(String(error));
        return [undefined, err];
    }
}
