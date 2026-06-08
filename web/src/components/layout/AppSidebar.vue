<script setup lang="ts">
/**
 * AppSidebar — 左侧侧边栏（搜索优先 + 分类折叠）
 * - 顶部搜索框：输入即过滤，不匹配的分类整组隐藏
 * - 分类折叠：默认展开有 active 工具的分类和第一个分类
 * - 移动端：搜索框 + 横向滑动图标
 */
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toolRegistry } from '@/tools/registry'
import type { ToolCategory } from '@/types/tool'

const router = useRouter()
const route = useRoute()
const currentYear = new Date().getFullYear()

// == 分类元数据 ==
interface CategoryMeta {
  key: ToolCategory
  label: string
}

const CATEGORIES: CategoryMeta[] = [
  { key: 'text', label: '文本处理' },
  { key: 'image', label: '图片处理' },
  { key: 'audio', label: '音频处理' },
  { key: 'video', label: '视频处理' },
  { key: 'pdf', label: 'PDF 工具' },
  { key: 'ui', label: 'UI / 设计' },
  { key: 'browser', label: '浏览器' },
  { key: 'general', label: '开发工具' },
]

// == 搜索 ==
const searchQuery = ref('')
const queryLower = computed(() => searchQuery.value.trim().toLowerCase())

/** 按分类分组的工具列表（含搜索过滤） */
const groupedTools = computed(() => {
  const all = [...toolRegistry.values()]
  const query = queryLower.value

  return CATEGORIES
    .map((cat) => {
      const items = all
        .filter((t) => t.category === cat.key)
        .filter((t) => {
          if (!query) return true
          return (
            t.name.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query) ||
            t.id.includes(query)
          )
        })
        .sort((a, b) => a.name.localeCompare(b.name, 'zh'))

      return { ...cat, items }
    })
    .filter((g) => g.items.length > 0)
})

// == 折叠状态（初始展开 active 工具所在分类 + 第一个分类，其余折叠）==
const collapsed = ref(new Set<string>())

function initCollapsed() {
  const activeTool = [...toolRegistry.values()].find(
    (t) => t.id === route.params.toolId,
  )
  const expanded = new Set<string>()
  if (activeTool) expanded.add(activeTool.category)
  if (CATEGORIES.length > 0) expanded.add(CATEGORIES[0].key)
  CATEGORIES.forEach((c) => {
    if (!expanded.has(c.key)) collapsed.value.add(c.key)
  })
}
initCollapsed()

function toggleCategory(key: string) {
  if (collapsed.value.has(key)) {
    collapsed.value.delete(key)
  } else {
    collapsed.value.add(key)
  }
}

// == 路由 ==
function handleNavigateToTool(toolId: string) {
  router.push({ name: 'tool', params: { toolId } })
}

function handleGoHome() {
  router.push({ name: 'home' })
}
</script>

<template>
  <aside class="sidebar">
    <!-- Logo -->
    <button
      class="sidebar-logo"
      @click="handleGoHome"
      aria-label="返回首页"
    >
      <span class="logo-mark">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      </span>
      <span class="logo-text">bfe-tools</span>
    </button>

    <!-- 搜索框 -->
    <div class="sidebar-search">
      <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        class="search-input"
        placeholder="搜索工具..."
        aria-label="搜索工具"
      />
      <button
        v-if="searchQuery"
        class="search-clear"
        @click="searchQuery = ''"
        aria-label="清除搜索"
      >
        ✕
      </button>
    </div>

    <!-- 分类分组导航 -->
    <nav aria-label="工具导航" class="sidebar-nav">
      <template v-for="group in groupedTools" :key="group.key">
        <div class="nav-group">
          <!-- 分类标题（可点击折叠） -->
          <button
            class="nav-group-header"
            @click="toggleCategory(group.key)"
            :aria-expanded="!collapsed.has(group.key)"
          >
            <svg
              class="nav-group-chevron"
              :class="{ collapsed: collapsed.has(group.key) }"
              width="10"
              height="10"
              viewBox="0 0 10 10"
            >
              <path d="M2 3l3 4 3-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span class="nav-group-label">{{ group.label }}</span>
            <span class="nav-group-count">{{ group.items.length }}</span>
          </button>

          <!-- 工具列表 -->
          <div v-show="!collapsed.has(group.key)" class="nav-group-items">
            <button
              v-for="tool in group.items"
              :key="tool.id"
              class="sidebar-nav-item"
              :class="{ active: route.params.toolId === tool.id }"
              @click="handleNavigateToTool(tool.id)"
            >
              <span class="sidebar-nav-icon">{{ tool.icon }}</span>
              <span class="sidebar-nav-label">{{ tool.name }}</span>
            </button>
          </div>
        </div>
      </template>

      <!-- 无匹配结果 -->
      <div v-if="groupedTools.length === 0" class="nav-empty">
        <p>未找到匹配的工具</p>
      </div>
    </nav>

    <!-- 底部 -->
    <div class="sidebar-footer">
      <p class="sidebar-copyright">&copy; {{ currentYear }}</p>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: var(--z-sticky, 30);
  display: flex;
  flex-direction: column;
  width: 232px;
  height: 100vh;
  background: linear-gradient(180deg, rgb(255 255 255 / .95) 0%, rgb(248 250 252 / .92) 100%);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-right: 1px solid var(--color-neutral-100);
  padding: 20px 12px 12px;
  overflow-y: auto;
}

/* === Logo === */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 10px;
  margin-bottom: 10px;
  transition: background-color var(--duration-fast);
  flex-shrink: 0;
}
.sidebar-logo:hover {
  background-color: var(--color-neutral-50);
}

.logo-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500));
  color: #fff;
  flex-shrink: 0;
}

.logo-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-neutral-900);
  letter-spacing: -0.3px;
}

/* === 搜索框 === */
.sidebar-search {
  position: relative;
  margin-bottom: 10px;
  flex-shrink: 0;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-neutral-400);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 7px 28px 7px 30px;
  border: 1px solid var(--color-neutral-200);
  border-radius: 8px;
  font-size: 12px;
  color: var(--color-neutral-800);
  background: var(--color-neutral-50);
  outline: none;
  transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
}

.search-input::placeholder {
  color: var(--color-neutral-400);
}

.search-input:focus {
  border-color: var(--color-primary-400);
  box-shadow: 0 0 0 2px var(--color-primary-50);
}

.search-clear {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 12px;
  color: var(--color-neutral-400);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1;
}

.search-clear:hover {
  color: var(--color-neutral-600);
  background: var(--color-neutral-100);
}

/* === 导航容器 === */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  overflow-y: auto;
  border-top: 1px solid var(--color-neutral-100);
  padding-top: 6px;
}

/* === 分类组 === */
.nav-group {
  margin-bottom: 0;
}

/* 分类标题 */
.nav-group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 8px 6px 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  color: var(--color-neutral-500);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  transition: color var(--duration-fast);
  user-select: none;
}

.nav-group-header:hover {
  color: var(--color-neutral-700);
}

.nav-group-chevron {
  flex-shrink: 0;
  transition: transform var(--duration-fast);
  color: var(--color-neutral-400);
}

.nav-group-chevron.collapsed {
  transform: rotate(-90deg);
}

.nav-group-label {
  flex: 1;
}

.nav-group-count {
  font-size: 10px;
  color: var(--color-neutral-300);
  font-weight: 400;
}

/* 工具列表 */
.nav-group-items {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 0 0 4px 4px;
}

/* === 工具项 === */
.sidebar-nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-in-out);
  text-align: left;
  font-size: inherit;
  color: inherit;
}

.sidebar-nav-item:hover {
  background-color: var(--color-neutral-50);
}

.sidebar-nav-item:active {
  background-color: var(--color-neutral-100);
  transform: scale(0.98);
}

.sidebar-nav-item.active {
  background-color: var(--color-primary-50);
}

.sidebar-nav-item.active::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 16px;
  border-radius: 0 3px 3px 0;
  background-color: var(--color-primary-500);
}

.sidebar-nav-icon {
  font-size: 15px;
  flex-shrink: 0;
  width: 24px;
  text-align: center;
  transition: transform var(--duration-fast);
}

.sidebar-nav-item:hover .sidebar-nav-icon {
  transform: scale(1.1);
}

.sidebar-nav-label {
  font-size: 12px;
  font-weight: var(--font-weight-medium);
  color: var(--color-neutral-700);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color var(--duration-fast);
}

.sidebar-nav-item.active .sidebar-nav-label {
  color: var(--color-primary-700);
  font-weight: var(--font-weight-semibold);
}

/* 无结果 */
.nav-empty {
  padding: 24px 12px;
  text-align: center;
  font-size: 12px;
  color: var(--color-neutral-300);
}

/* === 底部 === */
.sidebar-footer {
  padding-top: 10px;
  border-top: 1px solid var(--color-neutral-100);
  text-align: center;
  flex-shrink: 0;
}

.sidebar-copyright {
  font-size: 11px;
  color: var(--color-neutral-300);
  margin: 0;
}

/* === 移动端 === */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    flex-direction: row;
    align-items: center;
    width: 100%;
    height: 56px;
    padding: 0 8px;
    background: rgb(255 255 255 / .94);
    border-right: none;
    border-top: 1px solid var(--color-neutral-200);
    box-shadow: 0 -1px 8px rgb(15 23 42 / .06);
    overflow-x: auto;
    overflow-y: hidden;
  }

  .sidebar-logo,
  .sidebar-footer,
  .logo-text,
  .sidebar-search,
  .nav-group-header,
  .nav-group-count,
  .nav-group-chevron,
  .sidebar-nav-label,
  .nav-empty {
    display: none;
  }

  .sidebar-nav {
    flex-direction: row;
    gap: 6px;
    flex: none;
    border-top: none;
    padding: 0;
    overflow-x: auto;
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .sidebar-nav::-webkit-scrollbar {
    display: none;
  }

  .nav-group {
    margin: 0;
  }

  .nav-group-items {
    display: flex;
    flex-direction: row;
    gap: 6px;
    padding: 0;
  }

  .sidebar-nav-item {
    width: auto;
    padding: 8px 14px;
    gap: 6px;
    border-radius: 9999px;
    white-space: nowrap;
  }

  .sidebar-nav-item.active::before {
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 3px;
    border-radius: 3px 3px 0 0;
    top: auto;
  }

  .sidebar-nav-item.active {
    background-color: var(--color-primary-50);
  }
}
</style>
