<script setup lang="ts">
/**
 * AnimeLab — 动画试映台
 *
 * 三段式纵向工作台：预设画廊 → 预览舞台 → 参数 Inspector
 * 预览区是主角，控件是配角。支持键盘操作。
 */
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { animate, stagger } from 'animejs'
import type { JSAnimation as AnimeInstance } from 'animejs'
import type { ClientOnlyToolDefinition } from '@/types/tool'

defineProps<{ tool: ClientOnlyToolDefinition }>()

// === 预设 ===
const presets = [
  { id: 'bounce',     name: '弹入',      icon: '🏀', group: '基础' },
  { id: 'rotate',     name: '旋转',      icon: '🔄', group: '基础' },
  { id: 'scale',      name: '心跳缩放',   icon: '💓', group: '基础' },
  { id: 'path',       name: '路径移动',   icon: '📍', group: '基础' },
  { id: 'stagger',    name: '交错入场',   icon: '🎹', group: '基础' },
  { id: 'colorShift', name: '色彩变换',   icon: '🌈', group: '基础' },
  { id: 'particle',   name: '粒子爆炸',   icon: '💥', group: '高级' },
  { id: 'wave',       name: '波纹扩散',   icon: '🌊', group: '高级' },
  { id: 'flip3d',     name: '3D 翻转',   icon: '🃏', group: '高级' },
  { id: 'typewriter', name: '打字机',     icon: '⌨️', group: '高级' },
  { id: 'svgDraw',    name: 'SVG 描边',  icon: '✒️', group: '高级' },
]

const currentPreset = ref('bounce')
const categoryFilter = ref<'全部' | '基础' | '高级'>('全部')
const filteredPresets = computed(() =>
  categoryFilter.value === '全部'
    ? presets
    : presets.filter((p) => p.group === categoryFilter.value),
)

const currentPresetMeta = computed(() => presets.find((p) => p.id === currentPreset.value)!)

// === 参数 ===
const duration = ref(1000)
const delay = ref(0)
const easing = ref('easeOutElastic(1, .5)')
const loop = ref(false)

const easings = [
  'easeOutElastic(1, .5)', 'easeOutBounce', 'easeInOutQuad',
  'easeInOutSine', 'easeOutExpo', 'linear', 'easeInOutBack(1.7)',
]

const particleCount = ref(20)
const waveRings = ref(4)

// === DOM refs ===
const targetBox = ref<HTMLElement>()
const staggerContainer = ref<HTMLElement>()
const previewArea = ref<HTMLElement>()
const cardFront = ref<HTMLElement>()
const cardBack = ref<HTMLElement>()
const typewriterEl = ref<HTMLElement>()
const svgPath = ref<SVGPathElement>()
const replayIcon = ref<HTMLElement>()

let activeAnim: AnimeInstance | null = null
let particleCleanup: (() => void) | null = null

const needsSpecialDOM = (id: string) =>
  ['stagger', 'particle', 'wave', 'flip3d', 'typewriter', 'svgDraw'].includes(id)

// === 粒子爆炸 ===
let particleTimer: ReturnType<typeof setTimeout> | null = null

function runParticle() {
  const container = previewArea.value!
  container.querySelectorAll('.particle-dot').forEach((e) => e.remove())
  particleCleanup?.()
  particleCleanup = null
  if (particleTimer) clearTimeout(particleTimer)

  const totalMs = duration.value + delay.value + particleCount.value * 30
  const fire = () => {
    const cx = container.clientWidth / 2
    const cy = container.clientHeight / 2
    const dots: HTMLElement[] = []
    const anims: AnimeInstance[] = []

    for (let i = 0; i < particleCount.value; i++) {
      const dot = document.createElement('div')
      dot.className = 'particle-dot'
      dot.style.cssText = `left:${cx}px;top:${cy}px;background:hsl(${i * (360 / particleCount.value)}, 80%, 55%);`
      container.appendChild(dot)
      dots.push(dot)
    }

    const angle = (2 * Math.PI) / dots.length
    for (let i = 0; i < dots.length; i++) {
      const radius = 80 + Math.random() * 140
      const toX = Math.cos(angle * i) * radius
      const toY = Math.sin(angle * i) * radius
      const phaseDur = duration.value * 0.5
      anims.push(animate(dots[i], {
        translateX: toX, translateY: toY,
        scale: [0, 0.6 + Math.random() * 0.8],
        opacity: [1, 0.8],
        borderRadius: ['50%', `${20 + Math.random() * 30}%`],
        rotate: Math.random() * 360 - 180,
        duration: phaseDur,
        delay: delay.value + i * (duration.value * 0.03),
        easing: 'easeOutExpo', loop: false,
      }))
      setTimeout(() => {
        anims.push(animate(dots[i], {
          translateX: 0, translateY: 0, scale: 0.2, opacity: 0,
          duration: duration.value * 0.4, easing: 'easeInQuad',
        }))
      }, delay.value + i * (duration.value * 0.03) + (phaseDur - duration.value * 0.1))
    }

    if (loop.value) {
      particleTimer = setTimeout(() => { dots.forEach((d) => d.remove()); fire() }, totalMs)
    } else {
      particleTimer = setTimeout(() => { dots.forEach((d) => d.remove()) }, totalMs + 600)
    }
    activeAnim = anims[0]
    particleCleanup = () => { dots.forEach((d) => d.remove()); anims.forEach((a) => a.complete()) }
  }
  fire()
}

// === 波纹扩散 ===
function runWave() {
  const container = previewArea.value!
  container.querySelectorAll('.wave-ring').forEach((e) => e.remove())
  const cx = container.clientWidth / 2
  const cy = container.clientHeight / 2
  const maxRadius = Math.min(cx, cy) * 0.85
  const rings: HTMLElement[] = []
  for (let i = 0; i < waveRings.value; i++) {
    const ring = document.createElement('div')
    ring.className = 'wave-ring'
    ring.style.cssText = `left:${cx}px;top:${cy}px;`
    container.appendChild(ring)
    rings.push(ring)
  }
  const waveAnims: AnimeInstance[] = []
  for (let i = 0; i < rings.length; i++) {
    waveAnims.push(animate(rings[i], {
      width: [0, maxRadius * 2], height: [0, maxRadius * 2],
      translateX: -maxRadius, translateY: -maxRadius,
      borderWidth: [3, 0.5], opacity: [0.8, 0],
      delay: delay.value + i * (duration.value / waveRings.value),
      duration: duration.value, easing: 'easeOutExpo', loop: loop.value,
    }))
  }
  activeAnim = waveAnims[0]
  particleCleanup = () => { rings.forEach((r) => r.remove()); waveAnims.forEach((a) => a.complete()) }
}

// === 3D 翻转 ===
function runFlip3D() {
  if (!cardFront.value) return
  activeAnim = animate(cardFront.value.parentElement!, {
    rotateY: [0, 360], duration: duration.value, delay: delay.value,
    easing: easing.value, loop: loop.value,
  })
}

// === 打字机 ===
function runTypewriter() {
  const el = typewriterEl.value!
  const text = 'Hello, Anime.js ✨'
  const chars = text.split('')
  el.innerHTML = ''
  const spans = chars.map((ch) => {
    const s = document.createElement('span')
    s.textContent = ch
    s.style.opacity = '0'
    el.appendChild(s)
    return s
  })
  activeAnim = animate(spans, {
    opacity: [0, 1],
    duration: duration.value / chars.length,
    delay: stagger(duration.value / chars.length, { start: delay.value }),
    easing: 'steps(1)', loop: loop.value,
  })
}

// === SVG 描边 ===
function runSvgDraw() {
  if (!svgPath.value) return
  const length = svgPath.value.getTotalLength()
  svgPath.value.style.strokeDasharray = `${length}`
  svgPath.value.style.strokeDashoffset = `${length}`
  activeAnim = animate(svgPath.value, {
    strokeDashoffset: [length, 0],
    duration: duration.value, delay: delay.value,
    easing: 'easeInOutSine', loop: loop.value,
  })
}

// === 执行动画（带 stage fade 过渡）===
const stageKey = ref(0)
let debounceTimer: ReturnType<typeof setTimeout> | null = null

async function runAnimation(instant = false) {
  await nextTick()
  const id = currentPreset.value
  if (needsSpecialDOM(id)) {
    if (id === 'stagger' && staggerContainer.value) { /* ok */ }
    else if (id !== 'stagger' && previewArea.value) { /* ok */ }
    else return
  } else {
    if (!targetBox.value) return
  }

  activeAnim?.complete?.()
  activeAnim = null
  particleCleanup?.()
  particleCleanup = null

  if (!instant) {
    stageKey.value++
    await nextTick()
  }

  const baseOpts = { duration: duration.value, delay: delay.value, easing: easing.value, loop: loop.value }
  switch (id) {
    case 'bounce':
      activeAnim = animate(targetBox.value!, { translateY: [60, 0], opacity: [0, 1], scale: [0.6, 1], ...baseOpts }); break
    case 'rotate':
      activeAnim = animate(targetBox.value!, { rotate: [0, 360], borderRadius: ['12px', '50%', '12px'], ...baseOpts }); break
    case 'scale':
      activeAnim = animate(targetBox.value!, { scale: [1, 1.3, 0.9, 1], ...baseOpts }); break
    case 'path':
      activeAnim = animate(targetBox.value!, {
        translateX: [{ to: 120, duration: duration.value * 0.4 }, { to: -60, duration: duration.value * 0.3 }, { to: 0, duration: duration.value * 0.3 }],
        translateY: [{ to: -60, duration: duration.value * 0.3 }, { to: 30, duration: duration.value * 0.4 }, { to: 0, duration: duration.value * 0.3 }],
        delay: delay.value, easing: 'easeInOutQuad', loop: loop.value,
      }); break
    case 'stagger': {
      const items = staggerContainer.value!.querySelectorAll('.stagger-item')
      if (items?.length) {
        activeAnim = animate(items, { translateY: [40, 0], opacity: [0, 1], scale: [0.5, 1], delay: stagger(80, { start: delay.value }), duration: duration.value, easing: easing.value, loop: loop.value })
      }
      break
    }
    case 'colorShift': {
      const style = getComputedStyle(document.documentElement)
      const primary = style.getPropertyValue('--color-primary-500').trim() || '#3b82f6'
      const purple = style.getPropertyValue('--color-info').trim() || '#6366f1'
      const orange = style.getPropertyValue('--color-warning').trim() || '#f59e0b'
      const green = style.getPropertyValue('--color-success').trim() || '#10b981'
      activeAnim = animate(targetBox.value!, {
        background: [primary, purple, '#ec4899', orange, green, primary],
        scale: [1, 1.05, 1], ...baseOpts,
      })
      break
    }
    case 'particle':   runParticle(); break
    case 'wave':       runWave(); break
    case 'flip3d':     runFlip3D(); break
    case 'typewriter': runTypewriter(); break
    case 'svgDraw':    runSvgDraw(); break
  }
}

function handleReplay() {
  runAnimation(true)
  // 重播按钮图标旋转反馈
  if (replayIcon.value) {
    animate(replayIcon.value, { rotate: [0, 360], duration: 400, easing: 'easeOutExpo' })
  }
}

// 切换预设时 stage fade 过渡
function selectPreset(id: string) {
  if (id === currentPreset.value) return
  currentPreset.value = id
}

// 参数变化带 debounce，避免 slider 拖动时动画频闪
watch([currentPreset, duration, delay, easing, loop, particleCount, waveRings], () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  const needsInstant = currentPreset.value === 'particle' || currentPreset.value === 'wave'
  debounceTimer = setTimeout(() => runAnimation(!needsInstant), needsInstant ? 120 : 200)
})

// 键盘操作
function handleKeydown(e: KeyboardEvent) {
  if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); handleReplay(); return }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    e.preventDefault()
    const visible = filteredPresets.value
    const idx = visible.findIndex((p) => p.id === currentPreset.value)
    const next = e.key === 'ArrowRight'
      ? visible[(idx + 1) % visible.length]
      : visible[(idx - 1 + visible.length) % visible.length]
    selectPreset(next.id)
  }
}

onMounted(() => {
  runAnimation(true)
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  activeAnim?.complete?.()
  particleCleanup?.()
  if (particleTimer) clearTimeout(particleTimer)
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <section class="anime-lab" tabindex="0">
    <!-- 顶栏 -->
    <div class="lab-header">
      <div class="lab-header-left">
        <span class="lab-title">动画实验室</span>
        <span class="lab-badge">{{ presets.length }} 种预设</span>
      </div>
      <div class="lab-header-center">
        <button
          v-for="cat in (['全部', '基础', '高级'] as const)"
          :key="cat"
          :class="['lab-chip', { active: categoryFilter === cat }]"
          @click="categoryFilter = cat"
        >{{ cat }}</button>
      </div>
      <div class="lab-header-right">
        <button class="replay-btn" @click="handleReplay">
          <span ref="replayIcon" class="replay-icon">↻</span>
          <span>重播</span>
        </button>
      </div>
    </div>

    <!-- 预设画廊 -->
    <div class="preset-gallery">
      <button
        v-for="p in filteredPresets"
        :key="p.id"
        :class="['motion-tile', { active: currentPreset === p.id }]"
        @click="selectPreset(p.id)"
        :title="p.name"
      >
        <span class="tile-icon">{{ p.icon }}</span>
        <span class="tile-name">{{ p.name }}</span>
        <span class="tile-tag">{{ p.group }}</span>
        <span v-if="currentPreset === p.id" class="tile-indicator" />
      </button>
    </div>

    <!-- 预览舞台 -->
    <main ref="previewArea" class="stage" :key="stageKey">
      <!-- 基础动画：通用 target box -->
      <div
        v-if="!needsSpecialDOM(currentPreset)"
        ref="targetBox"
        class="target-box"
      >
        <span class="target-emoji">{{ currentPresetMeta.icon }}</span>
        <span class="target-label">{{ currentPresetMeta.name }}</span>
      </div>

      <!-- 交错入场 -->
      <div v-if="currentPreset === 'stagger'" ref="staggerContainer" class="stagger-grid">
        <div v-for="i in 8" :key="i" class="stagger-item" />
      </div>

      <!-- 3D 翻转 -->
      <div v-if="currentPreset === 'flip3d'" class="card-3d">
        <div class="card-face card-front" ref="cardFront">✨ 正面</div>
        <div class="card-face card-back" ref="cardBack">🔙 背面</div>
      </div>

      <!-- 打字机 -->
      <div v-if="currentPreset === 'typewriter'" ref="typewriterEl" class="typewriter" />

      <!-- SVG 描边 -->
      <svg v-if="currentPreset === 'svgDraw'" class="svg-stage" viewBox="0 0 240 120">
        <path
          ref="svgPath"
          d="M20,60 Q60,10 100,60 T180,60 Q200,60 220,40"
          fill="none" stroke="url(#svgGrad)" stroke-width="3" stroke-linecap="round"
        />
        <defs>
          <linearGradient id="svgGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style="stop-color:var(--color-primary-500)" />
            <stop offset="100%" style="stop-color:var(--color-info)" />
          </linearGradient>
        </defs>
      </svg>
    </main>

    <!-- 参数 Inspector -->
    <div class="inspector">
      <div class="inspector-items">
        <label class="inspector-param">
          <span class="inspector-label">时长</span>
          <input v-model.number="duration" type="range" min="200" max="4000" step="100" />
          <span class="inspector-val">{{ duration }}ms</span>
        </label>

        <label class="inspector-param">
          <span class="inspector-label">延迟</span>
          <input v-model.number="delay" type="range" min="0" max="2000" step="50" />
          <span class="inspector-val">{{ delay }}ms</span>
        </label>

        <label class="inspector-param">
          <span class="inspector-label">缓动</span>
          <select v-model="easing" class="inspector-select">
            <option v-for="e in easings" :key="e" :value="e">{{ e }}</option>
          </select>
        </label>

        <label class="inspector-param inspector-toggle">
          <span class="inspector-label">循环</span>
          <input v-model="loop" type="checkbox" />
        </label>

        <template v-if="currentPreset === 'particle'">
          <span class="inspector-divider" />
          <label class="inspector-param">
            <span class="inspector-label">粒子</span>
            <input v-model.number="particleCount" type="range" min="6" max="50" step="2" />
            <span class="inspector-val">{{ particleCount }}</span>
          </label>
        </template>

        <template v-if="currentPreset === 'wave'">
          <span class="inspector-divider" />
          <label class="inspector-param">
            <span class="inspector-label">波纹层</span>
            <input v-model.number="waveRings" type="range" min="2" max="10" step="1" />
            <span class="inspector-val">{{ waveRings }}</span>
          </label>
        </template>
      </div>

      <span class="inspector-hint">← → 切换预设 · 空格 重播</span>
    </div>
  </section>
</template>

<style scoped>
/* === 整体 === */
.anime-lab {
  padding: 0 24px 8px;
  display: flex; flex-direction: column;
  width: 100%;
  min-height: calc(100vh - 64px);
  max-width: none;
  outline: none;
}

/* === 顶栏 === */
.lab-header {
  display: flex; align-items: center; gap: 16px;
  margin-bottom: 8px; flex-shrink: 0;
}
.lab-header-left { display: flex; align-items: baseline; gap: 8px; }
.lab-title { font-size: var(--text-lg); font-weight: 700; color: var(--color-neutral-900); }
.lab-badge { font-size: var(--text-xs); color: var(--color-neutral-400); }
.lab-header-center { display: flex; gap: 6px; flex: 1; justify-content: center; }
.lab-chip {
  padding: 4px 14px; border-radius: 999px; border: 1px solid var(--color-neutral-200);
  background: var(--color-white); font-size: 0.75rem; color: var(--color-neutral-600);
  cursor: pointer; transition: all 0.15s;
}
.lab-chip:hover { border-color: var(--color-primary-300); color: var(--color-primary-600); }
.lab-chip.active { background: var(--color-primary-50); border-color: var(--color-primary-400); color: var(--color-primary-700); font-weight: 500; }
.lab-header-right { flex-shrink: 0; }
.replay-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 14px; border-radius: 8px; border: none;
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700));
  color: var(--color-white); font-size: 0.8125rem; font-weight: 500; cursor: pointer; transition: filter 0.15s;
}
.replay-btn:hover { filter: brightness(1.1); }
.replay-icon { display: inline-block; font-size: 1rem; }

/* === 预设画廊 === */
.preset-gallery {
  display: flex; gap: 8px; flex-wrap: wrap; flex-shrink: 0;
  margin-bottom: 10px;
}
.motion-tile {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px; width: 88px; height: 72px; padding-bottom: 8px;
  border-radius: 10px;
  border: 1px solid var(--color-neutral-200);
  background: var(--color-neutral-50);
  cursor: pointer; transition: all 0.15s var(--ease-in-out);
}
.motion-tile:hover {
  border-color: var(--color-primary-300);
  background: var(--color-primary-50);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}
.motion-tile.active {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
  box-shadow: 0 0 0 2px var(--color-primary-100);
}
.tile-icon { font-size: 1.25rem; }
.tile-name { font-size: 0.65rem; color: var(--color-neutral-600); font-weight: 500; }
.motion-tile.active .tile-name { color: var(--color-primary-700); }
.tile-tag {
  position: absolute; top: 4px; right: 6px;
  font-size: 0.55rem; color: var(--color-neutral-300); text-transform: uppercase; letter-spacing: 0.5px;
}
.tile-indicator {
  position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
  width: 20px; height: 3px; border-radius: 0 0 2px 2px;
  background: var(--color-primary-500);
}

/* === 预览舞台 === */
.stage {
  flex: 1; min-height: 260px; max-height: 440px;
  background:
    linear-gradient(var(--color-neutral-200) 1px, transparent 1px),
    linear-gradient(90deg, var(--color-neutral-200) 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: center center;
  background-color: var(--color-white);
  border: 1px solid var(--color-neutral-200); border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; position: relative;
}
/* 舞台中央的径向光晕 */
.stage::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse at center, rgba(59, 130, 246, 0.04) 0%, transparent 60%);
  pointer-events: none;
}

/* target box */
.target-box { width: 120px; height: 120px; border-radius: 16px; background: var(--color-primary-500); color: var(--color-white); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; box-shadow: 0 8px 24px rgba(59, 130, 246, 0.25); will-change: transform, opacity; position: relative; z-index: 1; }
.target-emoji { font-size: 2rem; }
.target-label { font-size: 0.75rem; font-weight: 500; opacity: 0.9; }

/* Stagger */
.stagger-grid { display: grid; grid-template-columns: repeat(4, 64px); gap: 12px; justify-content: center; position: relative; z-index: 1; }
.stagger-item { width: 64px; height: 64px; border-radius: 12px; background: linear-gradient(135deg, var(--color-primary-500), var(--color-info)); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2); }

/* 3D 翻转 */
.card-3d { width: 160px; height: 100px; perspective: 800px; cursor: pointer; position: relative; z-index: 1; }
.card-face { position: absolute; width: 100%; height: 100%; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; font-weight: 600; color: var(--color-white); backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.card-front { background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-700)); }
.card-back { background: linear-gradient(135deg, #ec4899, #be185d); transform: rotateY(180deg); }

/* 打字机 */
.typewriter { font-family: var(--font-mono); font-size: 1.5rem; color: var(--color-neutral-800); letter-spacing: 2px; display: flex; gap: 0; position: relative; z-index: 1; }

/* SVG 描边 */
.svg-stage { width: 320px; height: 160px; position: relative; z-index: 1; }

/* 粒子 */
:deep(.particle-dot) {
  position: absolute; width: 12px; height: 12px; border-radius: 50%;
  margin-left: -6px; margin-top: -6px;
  transform: translate(0, 0) scale(1); opacity: 1;
}
/* 波纹 */
:deep(.wave-ring) {
  position: absolute; border-radius: 50%; border: 3px solid var(--color-primary-500);
  transform: translate(-50%, -50%);
  opacity: 0.8; pointer-events: none;
}

/* === 参数 Inspector === */
.inspector {
  display: flex; align-items: center; gap: 12px;
  margin-top: 10px; padding: 8px 16px;
  background: var(--color-white); border: 1px solid var(--color-neutral-200); border-radius: 12px;
  flex-shrink: 0; flex-wrap: wrap;
}
.inspector-items { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; flex: 1; }
.inspector-param { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.inspector-label { font-size: 0.7rem; font-weight: 500; color: var(--color-neutral-500); text-transform: uppercase; letter-spacing: 0.5px; min-width: 24px; }
.inspector-param input[type="range"] { width: 96px; accent-color: var(--color-primary-500); }
.inspector-val { font-size: 0.7rem; color: var(--color-neutral-400); min-width: 44px; font-variant-numeric: tabular-nums; }
.inspector-select { padding: 3px 6px; border-radius: 6px; border: 1px solid var(--color-neutral-200); font-size: 0.72rem; color: var(--color-neutral-700); background: var(--color-white); outline: none; max-width: 180px; }
.inspector-toggle { gap: 4px; }
.inspector-toggle input { width: 15px; height: 15px; accent-color: var(--color-primary-500); }
.inspector-divider { width: 1px; height: 20px; background: var(--color-neutral-200); }
.inspector-hint { font-size: 0.65rem; color: var(--color-neutral-300); white-space: nowrap; }

/* === 响应式 === */
@media (max-width: 768px) {
  .anime-lab { padding: 16px 12px; min-height: auto; }
  .lab-header { flex-wrap: wrap; }
  .lab-header-center { order: 3; flex-basis: 100%; justify-content: flex-start; }
  .preset-gallery { gap: 6px; }
  .motion-tile { width: 76px; height: 64px; }
  .stage { min-height: 280px; background-size: 20px 20px; }
  .inspector-items { gap: 10px; }
  .inspector-param input[type="range"] { width: 72px; }
  .inspector-hint { display: none; }
}
</style>
