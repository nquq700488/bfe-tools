<script setup lang="ts">
/**
 * AppSidebar — 左侧悬浮侧边栏
 * fixed 定位，不随内容滚动，桌面端左侧固定，移动端收起
 */
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toolRegistry } from '@/tools/registry'
import type { ToolDefinition } from '@/types/tool'

const router = useRouter()
const route = useRoute()

const currentYear = new Date().getFullYear()

const tools = computed<ToolDefinition[]>(() =>
  [...toolRegistry.values()].sort((a, b) => a.name.localeCompare(b.name))
)

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

    <!-- 工具导航 -->
    <nav aria-label="工具导航" class="sidebar-nav">
      <button
        v-for="tool in tools"
        :key="tool.id"
        class="sidebar-nav-item"
        :class="{ active: route.params.toolId === tool.id }"
        @click="handleNavigateToTool(tool.id)"
      >
        <span class="sidebar-nav-icon">{{ tool.icon }}</span>
        <span class="sidebar-nav-label">{{ tool.name }}</span>
      </button>
    </nav>

    <!-- 底部版权 -->
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
  width: 224px;
  height: 100vh;
  background: linear-gradient(180deg, rgb(255 255 255 / .95) 0%, rgb(248 250 252 / .92) 100%);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-right: 1px solid var(--color-neutral-100);
  padding: 24px 14px 14px;
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
  margin-bottom: 8px;
  transition: background-color var(--duration-fast);
}

.sidebar-logo:hover {
  background-color: var(--color-neutral-50);
}

.logo-mark {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--color-primary-600), var(--color-primary-500));
  color: #fff;
  flex-shrink: 0;
}

.logo-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-neutral-900);
  letter-spacing: -0.3px;
}

/* === 导航 === */
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  overflow-y: auto;
  padding: 6px 0 12px;
  border-top: 1px solid var(--color-neutral-100);
}

.sidebar-nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 8px;
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
  left: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  border-radius: 0 3px 3px 0;
  background-color: var(--color-primary-500);
}

.sidebar-nav-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 26px;
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

/* === 底部 === */
.sidebar-footer {
  padding-top: 12px;
  border-top: 1px solid var(--color-neutral-100);
  margin-top: 10px;
  text-align: center;
}

.sidebar-copyright {
  font-size: 11px;
  color: var(--color-neutral-300);
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
  .sidebar-nav-label {
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

  .sidebar-nav-item {
    width: auto;
    padding: 8px 14px;
    gap: 6px;
    border-radius: 9999px;
    white-space: nowrap;
  }

  .sidebar-nav-item.active::before {
    content: '';
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 3px;
    border-radius: 3px 3px 0 0;
    background-color: var(--color-primary-500);
    top: auto;
  }

  .sidebar-nav-item.active {
    background-color: var(--color-primary-50);
  }
}
</style>
