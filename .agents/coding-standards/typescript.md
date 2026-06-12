# 编码规范 — TypeScript 特定

> 本文件定义 TypeScript / JavaScript 项目的特定约束。
> 通用命名、注释、质量要求见 `common.md`。

---

## 类型系统

- 函数参数和返回值**必须标注类型**，禁止使用 `any`（第三方库无法避免除外）
- 复杂结构用 `interface`，简单联合类型用 `type`
- 可空值用 `T | null`，不用 `T | undefined`（函数可选参数除外）
- **优先具名导出**，仅单例实例允许默认导出
- 工具函数文件通过 `index.ts` 统一 re-export

---

## Vue / React 组件特定

### Vue（Composition API）

- 使用 `<script setup lang="ts">`
- 组件名 PascalCase，文件名与组件名一致
- Props 用 `defineProps<{}>()` 带类型
- Emits 用 `defineEmits<{}>()` 带类型
- 逻辑提取为 Composable，不在组件内写过长逻辑

### React

- 函数组件 + Hooks，不用 Class 组件
- Props 类型用 `interface`，命名 `{ComponentName}Props`
- 自定义 Hook 以 `use` 开头，返回数组或对象需标注类型

---

## 异步处理

- 优先 `async/await`，避免回调地狱
- 并行请求用 `Promise.all`，错误统一处理
- 取消逻辑：组件卸载时取消未完成的请求

```typescript
// ✅ 并行请求 + 统一错误
const [users, orders] = await Promise.all([
  fetchUsers().catch(handleError),
  fetchOrders().catch(handleError),
])

// ❌ 串行请求（无依赖时不必要）
const users = await fetchUsers()
const orders = await fetchOrders()
```

---

## 类型定义组织

- 全局类型放 `types/` 或 `src/types/`
- 模块内类型与实现放同一文件（或同目录 `.types.ts`）
- 避免在组件文件内写过长类型定义

---

## 导入规范

- 按来源分组：内置 → 第三方 → 别名路径 → 相对路径
- 每组之间空一行
- 禁止循环依赖

```typescript
// ✅
import { ref } from 'vue'
import axios from 'axios'

import { useUserStore } from '@/stores/user'
import { formatDate } from './utils'
```
