<script setup lang="ts">
/**
 * 根组件 — 左右分栏布局
 * 左侧：固定悬浮侧边栏，右侧：内容区
 */
import { ref, onMounted } from 'vue'
import { NConfigProvider, type GlobalThemeOverrides } from 'naive-ui'
import AppSidebar from '@/components/layout/AppSidebar.vue'
import { initTauriRuntime } from '@/lib/runtime'
import { initToolRegistry } from '@/tools/registry'

/** Naive UI 主题覆盖 — 与设计 token 保持一致 */
const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#3b82f6',
    primaryColorHover: '#0f6bff',
    primaryColorPressed: '#0b55d9',
    primaryColorSuppl: '#1e40af',
    borderRadius: '8px',
    fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, sans-serif",
  },
}

/** 后端是否就绪（仅桌面端有意义，浏览器模式始终 true） */
const backendReady = ref(false)
const isDesktop = ref(false)

onMounted(async () => {
  // 检测是否在 Tauri 桌面壳中（开发 + 生产都有效）
  const w = window as any
  isDesktop.value = !!(w.__TAURI__ || new URLSearchParams(window.location.search).get('__bfe_port'))

  const info = await initTauriRuntime()
  backendReady.value = true
  // 从后端拉取工具/分类数据（不阻塞 UI）
  initToolRegistry()
  if (info) {
    console.info('[App] Tauri 后端就绪:', info.baseUrl)
  }
})

function openSettings() {
  ;(window as any).__TAURI__?.core.invoke('open_settings_window')
}
</script>

<template>
  <NConfigProvider :theme-overrides="themeOverrides">
    <div v-if="!backendReady" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="spinner text-primary-600 text-2xl mx-auto mb-3" />
        <p class="text-sm text-neutral-500">正在启动后端服务...</p>
      </div>
    </div>
    <div v-else class="app-layout">
      <AppSidebar />
      <main class="app-main">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>

      <!-- 桌面端设置按钮：壳子里永远可见 -->
      <button
        v-if="isDesktop"
        class="desktop-settings-btn"
        title="设置目标 URL"
        @click="openSettings"
      >
        ⚙
      </button>
    </div>
  </NConfigProvider>
</template>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
}

.app-main {
  flex: 1;
  margin-left: 224px;
  min-width: 0;
  min-height: 100vh;
  background: radial-gradient(ellipse at 50% 0%, var(--color-neutral-50) 0%, transparent 70%);
}

.desktop-settings-btn {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 99999;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid var(--color-neutral-300);
  background: rgba(255, 255, 255, 0.55);
  color: var(--color-neutral-400);
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  opacity: 0.7;
}
.desktop-settings-btn:hover {
  background: rgba(255, 255, 255, 0.85);
  color: var(--color-neutral-600);
  border-color: var(--color-neutral-300);
  opacity: 1;
  transform: scale(1.08);
}

/* 页面过渡 */
.page-enter-active,
.page-leave-active {
  transition: opacity var(--duration-normal) var(--ease-in-out);
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .app-main {
    margin-left: 0;
    padding-bottom: 72px;
  }
  .desktop-settings-btn {
    bottom: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
  }
}
</style>
