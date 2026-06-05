import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { animate, stagger } from 'animejs';
const __VLS_props = defineProps();
// === 预设 ===
const presets = [
    { id: 'bounce', name: '弹入', icon: '🏀', group: '基础' },
    { id: 'rotate', name: '旋转', icon: '🔄', group: '基础' },
    { id: 'scale', name: '心跳缩放', icon: '💓', group: '基础' },
    { id: 'path', name: '路径移动', icon: '📍', group: '基础' },
    { id: 'stagger', name: '交错入场', icon: '🎹', group: '基础' },
    { id: 'colorShift', name: '色彩变换', icon: '🌈', group: '基础' },
    { id: 'particle', name: '粒子爆炸', icon: '💥', group: '高级' },
    { id: 'wave', name: '波纹扩散', icon: '🌊', group: '高级' },
    { id: 'flip3d', name: '3D 翻转', icon: '🃏', group: '高级' },
    { id: 'typewriter', name: '打字机', icon: '⌨️', group: '高级' },
    { id: 'svgDraw', name: 'SVG 描边', icon: '✒️', group: '高级' },
];
const currentPreset = ref('bounce');
const categoryFilter = ref('全部');
const filteredPresets = computed(() => categoryFilter.value === '全部'
    ? presets
    : presets.filter((p) => p.group === categoryFilter.value));
const currentPresetMeta = computed(() => presets.find((p) => p.id === currentPreset.value));
// === 参数 ===
const duration = ref(1000);
const delay = ref(0);
const easing = ref('easeOutElastic(1, .5)');
const loop = ref(false);
const easings = [
    'easeOutElastic(1, .5)', 'easeOutBounce', 'easeInOutQuad',
    'easeInOutSine', 'easeOutExpo', 'linear', 'easeInOutBack(1.7)',
];
const particleCount = ref(20);
const waveRings = ref(4);
// === DOM refs ===
const targetBox = ref();
const staggerContainer = ref();
const previewArea = ref();
const cardFront = ref();
const cardBack = ref();
const typewriterEl = ref();
const svgPath = ref();
const replayIcon = ref();
let activeAnim = null;
let particleCleanup = null;
const needsSpecialDOM = (id) => ['stagger', 'particle', 'wave', 'flip3d', 'typewriter', 'svgDraw'].includes(id);
// === 粒子爆炸 ===
let particleTimer = null;
function runParticle() {
    const container = previewArea.value;
    container.querySelectorAll('.particle-dot').forEach((e) => e.remove());
    particleCleanup?.();
    particleCleanup = null;
    if (particleTimer)
        clearTimeout(particleTimer);
    const totalMs = duration.value + delay.value + particleCount.value * 30;
    const fire = () => {
        const cx = container.clientWidth / 2;
        const cy = container.clientHeight / 2;
        const dots = [];
        const anims = [];
        for (let i = 0; i < particleCount.value; i++) {
            const dot = document.createElement('div');
            dot.className = 'particle-dot';
            dot.style.cssText = `left:${cx}px;top:${cy}px;background:hsl(${i * (360 / particleCount.value)}, 80%, 55%);`;
            container.appendChild(dot);
            dots.push(dot);
        }
        const angle = (2 * Math.PI) / dots.length;
        for (let i = 0; i < dots.length; i++) {
            const radius = 80 + Math.random() * 140;
            const toX = Math.cos(angle * i) * radius;
            const toY = Math.sin(angle * i) * radius;
            const phaseDur = duration.value * 0.5;
            anims.push(animate(dots[i], {
                translateX: toX, translateY: toY,
                scale: [0, 0.6 + Math.random() * 0.8],
                opacity: [1, 0.8],
                borderRadius: ['50%', `${20 + Math.random() * 30}%`],
                rotate: Math.random() * 360 - 180,
                duration: phaseDur,
                delay: delay.value + i * (duration.value * 0.03),
                easing: 'easeOutExpo', loop: false,
            }));
            setTimeout(() => {
                anims.push(animate(dots[i], {
                    translateX: 0, translateY: 0, scale: 0.2, opacity: 0,
                    duration: duration.value * 0.4, easing: 'easeInQuad',
                }));
            }, delay.value + i * (duration.value * 0.03) + (phaseDur - duration.value * 0.1));
        }
        if (loop.value) {
            particleTimer = setTimeout(() => { dots.forEach((d) => d.remove()); fire(); }, totalMs);
        }
        else {
            particleTimer = setTimeout(() => { dots.forEach((d) => d.remove()); }, totalMs + 600);
        }
        activeAnim = anims[0];
        particleCleanup = () => { dots.forEach((d) => d.remove()); anims.forEach((a) => a.complete()); };
    };
    fire();
}
// === 波纹扩散 ===
function runWave() {
    const container = previewArea.value;
    container.querySelectorAll('.wave-ring').forEach((e) => e.remove());
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const maxRadius = Math.min(cx, cy) * 0.85;
    const rings = [];
    for (let i = 0; i < waveRings.value; i++) {
        const ring = document.createElement('div');
        ring.className = 'wave-ring';
        ring.style.cssText = `left:${cx}px;top:${cy}px;`;
        container.appendChild(ring);
        rings.push(ring);
    }
    const waveAnims = [];
    for (let i = 0; i < rings.length; i++) {
        waveAnims.push(animate(rings[i], {
            width: [0, maxRadius * 2], height: [0, maxRadius * 2],
            translateX: -maxRadius, translateY: -maxRadius,
            borderWidth: [3, 0.5], opacity: [0.8, 0],
            delay: delay.value + i * (duration.value / waveRings.value),
            duration: duration.value, easing: 'easeOutExpo', loop: loop.value,
        }));
    }
    activeAnim = waveAnims[0];
    particleCleanup = () => { rings.forEach((r) => r.remove()); waveAnims.forEach((a) => a.complete()); };
}
// === 3D 翻转 ===
function runFlip3D() {
    if (!cardFront.value)
        return;
    activeAnim = animate(cardFront.value.parentElement, {
        rotateY: [0, 360], duration: duration.value, delay: delay.value,
        easing: easing.value, loop: loop.value,
    });
}
// === 打字机 ===
function runTypewriter() {
    const el = typewriterEl.value;
    const text = 'Hello, Anime.js ✨';
    const chars = text.split('');
    el.innerHTML = '';
    const spans = chars.map((ch) => {
        const s = document.createElement('span');
        s.textContent = ch;
        s.style.opacity = '0';
        el.appendChild(s);
        return s;
    });
    activeAnim = animate(spans, {
        opacity: [0, 1],
        duration: duration.value / chars.length,
        delay: stagger(duration.value / chars.length, { start: delay.value }),
        easing: 'steps(1)', loop: loop.value,
    });
}
// === SVG 描边 ===
function runSvgDraw() {
    if (!svgPath.value)
        return;
    const length = svgPath.value.getTotalLength();
    svgPath.value.style.strokeDasharray = `${length}`;
    svgPath.value.style.strokeDashoffset = `${length}`;
    activeAnim = animate(svgPath.value, {
        strokeDashoffset: [length, 0],
        duration: duration.value, delay: delay.value,
        easing: 'easeInOutSine', loop: loop.value,
    });
}
// === 执行动画（带 stage fade 过渡）===
const stageKey = ref(0);
let debounceTimer = null;
async function runAnimation(instant = false) {
    await nextTick();
    const id = currentPreset.value;
    if (needsSpecialDOM(id)) {
        if (id === 'stagger' && staggerContainer.value) { /* ok */ }
        else if (id !== 'stagger' && previewArea.value) { /* ok */ }
        else
            return;
    }
    else {
        if (!targetBox.value)
            return;
    }
    activeAnim?.complete?.();
    activeAnim = null;
    particleCleanup?.();
    particleCleanup = null;
    if (!instant) {
        stageKey.value++;
        await nextTick();
    }
    const baseOpts = { duration: duration.value, delay: delay.value, easing: easing.value, loop: loop.value };
    switch (id) {
        case 'bounce':
            activeAnim = animate(targetBox.value, { translateY: [60, 0], opacity: [0, 1], scale: [0.6, 1], ...baseOpts });
            break;
        case 'rotate':
            activeAnim = animate(targetBox.value, { rotate: [0, 360], borderRadius: ['12px', '50%', '12px'], ...baseOpts });
            break;
        case 'scale':
            activeAnim = animate(targetBox.value, { scale: [1, 1.3, 0.9, 1], ...baseOpts });
            break;
        case 'path':
            activeAnim = animate(targetBox.value, {
                translateX: [{ to: 120, duration: duration.value * 0.4 }, { to: -60, duration: duration.value * 0.3 }, { to: 0, duration: duration.value * 0.3 }],
                translateY: [{ to: -60, duration: duration.value * 0.3 }, { to: 30, duration: duration.value * 0.4 }, { to: 0, duration: duration.value * 0.3 }],
                delay: delay.value, easing: 'easeInOutQuad', loop: loop.value,
            });
            break;
        case 'stagger': {
            const items = staggerContainer.value.querySelectorAll('.stagger-item');
            if (items?.length) {
                activeAnim = animate(items, { translateY: [40, 0], opacity: [0, 1], scale: [0.5, 1], delay: stagger(80, { start: delay.value }), duration: duration.value, easing: easing.value, loop: loop.value });
            }
            break;
        }
        case 'colorShift': {
            const style = getComputedStyle(document.documentElement);
            const primary = style.getPropertyValue('--color-primary-500').trim() || '#3b82f6';
            const purple = style.getPropertyValue('--color-info').trim() || '#6366f1';
            const orange = style.getPropertyValue('--color-warning').trim() || '#f59e0b';
            const green = style.getPropertyValue('--color-success').trim() || '#10b981';
            activeAnim = animate(targetBox.value, {
                background: [primary, purple, '#ec4899', orange, green, primary],
                scale: [1, 1.05, 1], ...baseOpts,
            });
            break;
        }
        case 'particle':
            runParticle();
            break;
        case 'wave':
            runWave();
            break;
        case 'flip3d':
            runFlip3D();
            break;
        case 'typewriter':
            runTypewriter();
            break;
        case 'svgDraw':
            runSvgDraw();
            break;
    }
}
function handleReplay() {
    runAnimation(true);
    // 重播按钮图标旋转反馈
    if (replayIcon.value) {
        animate(replayIcon.value, { rotate: [0, 360], duration: 400, easing: 'easeOutExpo' });
    }
}
// 切换预设时 stage fade 过渡
function selectPreset(id) {
    if (id === currentPreset.value)
        return;
    currentPreset.value = id;
}
// 参数变化带 debounce，避免 slider 拖动时动画频闪
watch([currentPreset, duration, delay, easing, loop, particleCount, waveRings], () => {
    if (debounceTimer)
        clearTimeout(debounceTimer);
    const needsInstant = currentPreset.value === 'particle' || currentPreset.value === 'wave';
    debounceTimer = setTimeout(() => runAnimation(!needsInstant), needsInstant ? 120 : 200);
});
// 键盘操作
function handleKeydown(e) {
    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleReplay();
        return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const visible = filteredPresets.value;
        const idx = visible.findIndex((p) => p.id === currentPreset.value);
        const next = e.key === 'ArrowRight'
            ? visible[(idx + 1) % visible.length]
            : visible[(idx - 1 + visible.length) % visible.length];
        selectPreset(next.id);
    }
}
onMounted(() => {
    runAnimation(true);
    window.addEventListener('keydown', handleKeydown);
});
onBeforeUnmount(() => {
    activeAnim?.complete?.();
    particleCleanup?.();
    if (particleTimer)
        clearTimeout(particleTimer);
    window.removeEventListener('keydown', handleKeydown);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['lab-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['lab-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['replay-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['motion-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['motion-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['motion-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-name']} */ ;
/** @type {__VLS_StyleScopedClasses['stage']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-param']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['anime-lab']} */ ;
/** @type {__VLS_StyleScopedClasses['lab-header']} */ ;
/** @type {__VLS_StyleScopedClasses['lab-header-center']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-gallery']} */ ;
/** @type {__VLS_StyleScopedClasses['motion-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['stage']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-items']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-param']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-hint']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "anime-lab" },
    tabindex: "0",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "lab-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "lab-header-left" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "lab-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "lab-badge" },
});
(__VLS_ctx.presets.length);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "lab-header-center" },
});
for (const [cat] of __VLS_getVForSourceType(['全部', '基础', '高级'])) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.categoryFilter = cat;
            } },
        key: (cat),
        ...{ class: (['lab-chip', { active: __VLS_ctx.categoryFilter === cat }]) },
    });
    (cat);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "lab-header-right" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleReplay) },
    ...{ class: "replay-btn" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ref: "replayIcon",
    ...{ class: "replay-icon" },
});
/** @type {typeof __VLS_ctx.replayIcon} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "preset-gallery" },
});
for (const [p] of __VLS_getVForSourceType((__VLS_ctx.filteredPresets))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectPreset(p.id);
            } },
        key: (p.id),
        ...{ class: (['motion-tile', { active: __VLS_ctx.currentPreset === p.id }]) },
        title: (p.name),
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tile-icon" },
    });
    (p.icon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tile-name" },
    });
    (p.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tile-tag" },
    });
    (p.group);
    if (__VLS_ctx.currentPreset === p.id) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "tile-indicator" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ref: "previewArea",
    ...{ class: "stage" },
    key: (__VLS_ctx.stageKey),
});
/** @type {typeof __VLS_ctx.previewArea} */ ;
if (!__VLS_ctx.needsSpecialDOM(__VLS_ctx.currentPreset)) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: "targetBox",
        ...{ class: "target-box" },
    });
    /** @type {typeof __VLS_ctx.targetBox} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "target-emoji" },
    });
    (__VLS_ctx.currentPresetMeta.icon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "target-label" },
    });
    (__VLS_ctx.currentPresetMeta.name);
}
if (__VLS_ctx.currentPreset === 'stagger') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ref: "staggerContainer",
        ...{ class: "stagger-grid" },
    });
    /** @type {typeof __VLS_ctx.staggerContainer} */ ;
    for (const [i] of __VLS_getVForSourceType((8))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            key: (i),
            ...{ class: "stagger-item" },
        });
    }
}
if (__VLS_ctx.currentPreset === 'flip3d') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-3d" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-face card-front" },
        ref: "cardFront",
    });
    /** @type {typeof __VLS_ctx.cardFront} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "card-face card-back" },
        ref: "cardBack",
    });
    /** @type {typeof __VLS_ctx.cardBack} */ ;
}
if (__VLS_ctx.currentPreset === 'typewriter') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ref: "typewriterEl",
        ...{ class: "typewriter" },
    });
    /** @type {typeof __VLS_ctx.typewriterEl} */ ;
}
if (__VLS_ctx.currentPreset === 'svgDraw') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ class: "svg-stage" },
        viewBox: "0 0 240 120",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        ref: "svgPath",
        d: "M20,60 Q60,10 100,60 T180,60 Q200,60 220,40",
        fill: "none",
        stroke: "url(#svgGrad)",
        'stroke-width': "3",
        'stroke-linecap': "round",
    });
    /** @type {typeof __VLS_ctx.svgPath} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.defs, __VLS_intrinsicElements.defs)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.linearGradient, __VLS_intrinsicElements.linearGradient)({
        id: "svgGrad",
        x1: "0",
        y1: "0",
        x2: "1",
        y2: "0",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.stop)({
        offset: "0%",
        ...{ style: {} },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.stop)({
        offset: "100%",
        ...{ style: {} },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inspector" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "inspector-items" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "inspector-param" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "inspector-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "range",
    min: "200",
    max: "4000",
    step: "100",
});
(__VLS_ctx.duration);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "inspector-val" },
});
(__VLS_ctx.duration);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "inspector-param" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "inspector-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "range",
    min: "0",
    max: "2000",
    step: "50",
});
(__VLS_ctx.delay);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "inspector-val" },
});
(__VLS_ctx.delay);
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "inspector-param" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "inspector-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.select, __VLS_intrinsicElements.select)({
    value: (__VLS_ctx.easing),
    ...{ class: "inspector-select" },
});
for (const [e] of __VLS_getVForSourceType((__VLS_ctx.easings))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.option, __VLS_intrinsicElements.option)({
        key: (e),
        value: (e),
    });
    (e);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "inspector-param inspector-toggle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "inspector-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "checkbox",
});
(__VLS_ctx.loop);
if (__VLS_ctx.currentPreset === 'particle') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "inspector-divider" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "inspector-param" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "inspector-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "range",
        min: "6",
        max: "50",
        step: "2",
    });
    (__VLS_ctx.particleCount);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "inspector-val" },
    });
    (__VLS_ctx.particleCount);
}
if (__VLS_ctx.currentPreset === 'wave') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "inspector-divider" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "inspector-param" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "inspector-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        type: "range",
        min: "2",
        max: "10",
        step: "1",
    });
    (__VLS_ctx.waveRings);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "inspector-val" },
    });
    (__VLS_ctx.waveRings);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "inspector-hint" },
});
/** @type {__VLS_StyleScopedClasses['anime-lab']} */ ;
/** @type {__VLS_StyleScopedClasses['lab-header']} */ ;
/** @type {__VLS_StyleScopedClasses['lab-header-left']} */ ;
/** @type {__VLS_StyleScopedClasses['lab-title']} */ ;
/** @type {__VLS_StyleScopedClasses['lab-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['lab-header-center']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['lab-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['lab-header-right']} */ ;
/** @type {__VLS_StyleScopedClasses['replay-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['replay-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['preset-gallery']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['motion-tile']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-name']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['tile-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['stage']} */ ;
/** @type {__VLS_StyleScopedClasses['target-box']} */ ;
/** @type {__VLS_StyleScopedClasses['target-emoji']} */ ;
/** @type {__VLS_StyleScopedClasses['target-label']} */ ;
/** @type {__VLS_StyleScopedClasses['stagger-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['stagger-item']} */ ;
/** @type {__VLS_StyleScopedClasses['card-3d']} */ ;
/** @type {__VLS_StyleScopedClasses['card-face']} */ ;
/** @type {__VLS_StyleScopedClasses['card-front']} */ ;
/** @type {__VLS_StyleScopedClasses['card-face']} */ ;
/** @type {__VLS_StyleScopedClasses['card-back']} */ ;
/** @type {__VLS_StyleScopedClasses['typewriter']} */ ;
/** @type {__VLS_StyleScopedClasses['svg-stage']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-items']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-param']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-label']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-val']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-param']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-label']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-val']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-param']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-label']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-select']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-param']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-label']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-param']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-label']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-val']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-divider']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-param']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-label']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-val']} */ ;
/** @type {__VLS_StyleScopedClasses['inspector-hint']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            presets: presets,
            currentPreset: currentPreset,
            categoryFilter: categoryFilter,
            filteredPresets: filteredPresets,
            currentPresetMeta: currentPresetMeta,
            duration: duration,
            delay: delay,
            easing: easing,
            loop: loop,
            easings: easings,
            particleCount: particleCount,
            waveRings: waveRings,
            targetBox: targetBox,
            staggerContainer: staggerContainer,
            previewArea: previewArea,
            cardFront: cardFront,
            cardBack: cardBack,
            typewriterEl: typewriterEl,
            svgPath: svgPath,
            replayIcon: replayIcon,
            needsSpecialDOM: needsSpecialDOM,
            stageKey: stageKey,
            handleReplay: handleReplay,
            selectPreset: selectPreset,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
