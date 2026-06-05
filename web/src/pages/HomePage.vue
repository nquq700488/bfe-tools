<script setup lang="ts">
/**
 * HomePage — 欢迎引导页
 */
import { ref, onMounted } from 'vue'

const show = ref(false)

onMounted(() => {
  requestAnimationFrame(() => { show.value = true })
})
</script>

<template>
  <section class="welcome-page">
    <div class="welcome-hero" :class="{ visible: show }">
      <!-- emoji 徽标 -->
      <div class="welcome-badge">
        <span class="welcome-emoji">🛠️</span>
      </div>

      <!-- 标题：逐字动画 -->
      <h1 class="welcome-title">
        <span
          v-for="(char, i) in '前端实用工具集合站'.split('')"
          :key="i"
          class="welcome-char"
          :style="{ animationDelay: `${0.25 + i * 0.04}s` }"
        >{{ char }}</span>
      </h1>

      <!-- 描述 -->
      <p class="welcome-desc">
        一站式解决日常高频痛点。语音文字互转、图片 OCR、媒体格式转换，即开即用。
      </p>
    </div>

    <!-- 底部提示 -->
    <div class="welcome-footer" :class="{ visible: show }">
      <span class="welcome-dot" />
      <p class="welcome-hint">点击左侧工具列表开始使用</p>
    </div>
  </section>
</template>

<style scoped>
.welcome-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 120px);
  padding: 80px 64px;
  text-align: center;
}

/* ===== Hero ===== */
.welcome-hero {
  max-width: 520px;
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.8s var(--ease-out-expo), transform 0.8s var(--ease-out-expo);
}

.welcome-hero.visible {
  opacity: 1;
  transform: translateY(0);
}

/* === Badge === */
.welcome-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: 22px;
  background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50), #e8f0ff);
  margin-bottom: 36px;
  position: relative;
  animation: badge-float 4s ease-in-out infinite, badge-glow 3s ease-in-out infinite;
  box-shadow:
    0 0 0 1px var(--color-primary-200),
    0 8px 32px rgb(59 130 246 / .1),
    inset 0 1px 0 rgb(255 255 255 / .8);
}

.welcome-emoji {
  font-size: 36px;
  position: relative;
  z-index: 1;
  animation: emoji-soft 4s ease-in-out infinite;
}

@keyframes badge-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes badge-glow {
  0%, 100% { box-shadow: 0 0 0 1px var(--color-primary-200), 0 8px 32px rgb(59 130 246 / .1), inset 0 1px 0 rgb(255 255 255 / .8); }
  50% { box-shadow: 0 0 0 1px var(--color-primary-300), 0 12px 40px rgb(59 130 246 / .18), 0 0 60px rgb(59 130 246 / .06), inset 0 1px 0 rgb(255 255 255 / .8); }
}

@keyframes emoji-soft {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.05) rotate(-2deg); }
  75% { transform: scale(0.97) rotate(2deg); }
}

/* === 标题逐字 === */
.welcome-title {
  margin-bottom: 20px;
  line-height: 1.3;
}

.welcome-char {
  display: inline-block;
  font-size: clamp(28px, 3.5vw, 40px);
  font-weight: 800;
  color: var(--color-neutral-900);
  letter-spacing: -0.5px;
  opacity: 0;
  transform: translateY(16px);
  animation: char-rise 0.5s var(--ease-out-expo) forwards;
}

@keyframes char-rise {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* === 描述 === */
.welcome-desc {
  font-size: var(--text-base);
  color: var(--color-neutral-400);
  line-height: 1.8;
  opacity: 0;
  animation: fade-in 0.6s var(--ease-out-expo) forwards;
  animation-delay: 0.7s;
}

@keyframes fade-in {
  to { opacity: 1; }
}

/* ===== 底部 ===== */
.welcome-footer {
  position: absolute;
  bottom: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: 0;
  transition: opacity 0.6s var(--ease-out-expo);
  transition-delay: 1.2s;
}

.welcome-footer.visible {
  opacity: 1;
}

.welcome-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-primary-400);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}

.welcome-hint {
  font-size: var(--text-xs);
  color: var(--color-neutral-300);
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .welcome-page {
    padding: 64px 24px;
    min-height: calc(100vh - 120px);
  }

  .welcome-badge {
    width: 56px;
    height: 56px;
    border-radius: 17px;
  }

  .welcome-emoji {
    font-size: 28px;
  }

  .welcome-char {
    font-size: clamp(22px, 6vw, 30px);
  }

  .welcome-footer {
    display: none;
  }
}

/* ===== 减少动画偏好 ===== */
@media (prefers-reduced-motion: reduce) {
  .welcome-badge,
  .welcome-emoji,
  .welcome-dot {
    animation: none;
  }

  .welcome-hero {
    opacity: 1;
    transform: none;
    transition: none;
  }

  .welcome-char {
    opacity: 1;
    transform: none;
    animation: none;
  }
}
</style>
