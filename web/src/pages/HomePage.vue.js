import { ref, onMounted } from 'vue';
const show = ref(false);
onMounted(() => {
    requestAnimationFrame(() => { show.value = true; });
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['welcome-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['visible']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-page']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-emoji']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-char']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-emoji']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-char']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "welcome-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "welcome-hero" },
    ...{ class: ({ visible: __VLS_ctx.show }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "welcome-badge" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "welcome-emoji" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "welcome-title" },
});
for (const [char, i] of __VLS_getVForSourceType(('前端实用工具集合站'.split('')))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        key: (i),
        ...{ class: "welcome-char" },
        ...{ style: ({ animationDelay: `${0.25 + i * 0.04}s` }) },
    });
    (char);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "welcome-desc" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "welcome-footer" },
    ...{ class: ({ visible: __VLS_ctx.show }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
    ...{ class: "welcome-dot" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "welcome-hint" },
});
/** @type {__VLS_StyleScopedClasses['welcome-page']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['visible']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-emoji']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-title']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-char']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['visible']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-hint']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            show: show,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
