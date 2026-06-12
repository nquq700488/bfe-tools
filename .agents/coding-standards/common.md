# 编码规范 — 通用原则

> 本文件定义所有语言通用的编码约束。
> 语言特定约束见同目录下 `{language}.md`（如 `typescript.md`）。

---

## 语言与注释

- 所有代码注释使用**中文**（变量名/API 名除外）
- 禁止在注释中使用英文描述
- commit 说明使用中文

---

## 命名规范

### 通用命名方式

| 类型 | 命名方式 | 示例 |
|------|---------|------|
| 文件（工具/模块） | camelCase | `useMyFeature.ts` |
| 文件（组件/类） | PascalCase | `MyComponent.tsx` |
| 变量/函数 | camelCase | `activeTool`、`handleAction` |
| 常量 | UPPER_SNAKE_CASE | `CANVAS_DEFAULTS` |
| 接口/类型 | PascalCase | `ToolDefinition` |
| 枚举 | PascalCase | `CorrectionType.Homework` |

### 命名禁止项

- ❌ **变量名禁止包含下划线**（解构忽略参数 `_` 除外）

### 函数命名前缀约定

| 前缀 | 场景 | 示例 |
|------|------|------|
| `handle` | 事件处理 | `handleClick` |
| `toggle` | 状态切换 | `toggleVisible` |
| `set` | 状态设置 | `setColor` |
| `get` / `fetch` | 获取数据 | `getUserInfo` |
| `init` | 初始化 | `initApp` |
| `reset` | 重置 | `resetForm` |
| `use` | 组合式函数/Hook | `useDebounce` |

---

## 错误处理

- API 请求使用 Go 风格：`const [data, err] = await to(promise)`
- 非 API 场景使用 `try-catch`，catch 中必须记录错误
- 永远不要静默吞掉错误

---

## JSDoc 注释规范

必须写 JSDoc 的场景：公共工具函数、公共 Hooks/Composables、Store Action/Getter。简单事件处理函数用行内注释 `//` 即可。

标签格式：`@name`、`@description`（中文）、`@param {类型} 参数名 说明`、`@return {类型} 说明`、`@example`（复杂函数必须）、`@deprecated`（废弃时注明替代方案）

```typescript
/**
 * @name to
 * @description 将 Promise 包装为 [data, error] 元组
 * @param {Promise<T>} promise 待执行的 Promise
 * @return {Promise<[T, null] | [null, Error]>} 成功返回 [data, null]，失败返回 [null, error]
 * @example
 * const [data, err] = await to(fetchList(params))
 * if (err) return
 */
export async function to<T>(promise: Promise<T>): Promise<[T, null] | [null, Error]> {}
```

---

## 代码质量要求

| 检查项 | 标准 |
|--------|------|
| 函数长度 | ≤ 50 行，超过须拆分 |
| 文件长度 | 200–400 行典型，最大 800 行 |
| 嵌套深度 | ≤ 4 层，超过用提前返回或抽函数 |
| 不可变性 | 不直接修改对象/数组，用展开运算符创建新副本 |
| 魔法数字 | 抽取为命名常量 |

---

## 通用禁止事项

- ❌ 禁止使用 `any`（除非与第三方库交互无法避免）
- ❌ 禁止使用 `var`
- ❌ 禁止使用 `==`（必须用 `===`）
- ❌ 禁止在业务代码中保留 `console.log`
- ❌ 禁止代码中出现 mock 数据作为兜底逻辑
- ❌ 禁止修改 Lint/格式化/提交钩子配置（除非明确要求）
- ❌ 禁止硬编码敏感信息（密钥、token、密码）

---

## 文件组织原则

- 多个小文件 > 少量大文件
- 高内聚，低耦合
- 按功能/领域组织，而非按文件类型
- 200-400 行典型，800 行最大
