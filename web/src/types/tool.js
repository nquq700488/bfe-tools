/**
 * 工具/任务相关类型定义
 *
 * 使用 discriminated union：通过 `mode` 字段在编译期区分后端任务工具和纯前端工具。
 * - BackendJobToolDefinition：依赖后端 upload → job → poll 流程
 * - ClientOnlyToolDefinition：纯浏览器端计算，无后端依赖
 */
export {};
