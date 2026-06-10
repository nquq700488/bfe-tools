<script setup lang="ts">
/**
 * AppSidebar — 左侧侧边栏（搜索 + Naive UI NMenu）
 * - 顶部搜索框：输入即过滤，不匹配的分类/工具整组隐藏
 * - NMenu 管理折叠/展开/active/键盘导航
 * - 移动端：横向滑动图标
 */
import { computed, h, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NMenu } from 'naive-ui'
import type { MenuOption } from 'naive-ui'
import { toolRegistry } from '@/tools/registry'
import type { ToolCategory, ToolDefinition } from '@/types/tool'

const router = useRouter()
const route = useRoute()
const currentYear = new Date().getFullYear()

// == 分类元数据 ==
const CATEGORIES: { key: ToolCategory; label: string }[] = [
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
const hasQuery = computed(() => searchQuery.value.trim().length > 0)

// == 当前激活的工具 ID ==
const activeKey = computed(() => (route.params.toolId as string) || null)

// == 将工具转为 NMenu option ==
function toolOption(tool: ToolDefinition): MenuOption {
  return {
    label: () => h('span', { class: 'menu-tool-label' }, [
      h('span', { class: 'menu-tool-icon' }, tool.icon),
      h('span', null, tool.name),
    ]),
    key: tool.id,
  }
}

// == 无搜索：分组树形结构 ==
const groupedMenuOptions = computed<MenuOption[]>(() =>
  CATEGORIES
    .map((cat) => {
      const items = [...toolRegistry.values()]
        .filter((t) => t.category === cat.key)
        .sort((a, b) => a.name.localeCompare(b.name, 'zh'))

      if (items.length === 0) return null
      return {
        type: 'submenu' as const,
        label: `${cat.label} (${items.length})`,
        key: cat.key,
        children: items.map(toolOption),
      }
    })
    .filter(Boolean) as MenuOption[],
)

// == 搜索模式：扁平列表 ==
const flatMenuOptions = computed<MenuOption[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return []

  return [...toolRegistry.values()]
    .filter((t) =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.id.includes(query),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'zh'))
    .map(toolOption)
})

const menuOptions = computed<MenuOption[]>(() =>
  hasQuery.value ? flatMenuOptions.value : groupedMenuOptions.value,
)

// == 折叠控制（controlled — 支持点击展开/收起） ==
const expandedKeys = ref<string[]>([])
const activeTool = [...toolRegistry.values()].find((t) => t.id === activeKey.value)
if (activeTool) expandedKeys.value.push(activeTool.category)
if (CATEGORIES.length > 0 && !expandedKeys.value.includes(CATEGORIES[0].key)) {
  expandedKeys.value.push(CATEGORIES[0].key)
}

// == 导航 ==
function handleMenuUpdate(_key: string, item: MenuOption) {
  router.push({ name: 'tool', params: { toolId: item.key as string } })
}

function handleGoHome() {
  router.push({ name: 'home' })
}

function handleExpandedKeysUpdate(keys: string[]) {
  expandedKeys.value = keys
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

    <!-- NMenu 导航 -->
    <NMenu
      :options="menuOptions"
      :value="activeKey"
      :expanded-keys="expandedKeys"
      accordion
      :collapsed-icon-size="12"
      :expanded-icon-size="12"
      :indent="12"
      @update:value="handleMenuUpdate"
      @update:expanded-keys="handleExpandedKeysUpdate"
    />

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
  overflow-y: hidden;
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
.sidebar-logo:hover { background-color: var(--color-neutral-50); }

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
  margin-bottom: 8px;
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
.search-input::placeholder { color: var(--color-neutral-400); }
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
.search-clear:hover { color: var(--color-neutral-600); background: var(--color-neutral-100); }

/* === 工具项内容 === */
:deep(.menu-tool-label) {
  display: flex;
  align-items: center;
  gap: 10px;
}
:deep(.menu-tool-icon) {
  font-size: 15px;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
}

/* NMenu 填充剩余空间并独立滚动 */
:deep(.n-menu) {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* 没有分组时去掉 title 上方的 border */
:deep(.n-menu .n-menu-item-group .n-menu-item-group-title) {
  border-top: none;
}

/* === 底部 === */
.sidebar-footer {
  padding-top: 10px;
  border-top: 1px solid var(--color-neutral-100);
  text-align: center;
  flex-shrink: 0;
  margin-top: auto;
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
  .sidebar-search {
    display: none;
  }

  :deep(.n-menu) { flex-direction: row !important; overflow-x: auto; }
  :deep(.n-menu .n-menu-item-group) { flex-shrink: 0; }
  :deep(.n-menu .n-menu-item-content) { padding: 6px 14px !important; border-radius: 9999px !important; white-space: nowrap; }
  :deep(.n-menu .n-menu-item-content__icon) { margin-right: 6px !important; }
  :deep(.n-menu .n-menu-item-group-title) { display: none; }
}
</style>
