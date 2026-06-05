import { computed } from 'vue';
const props = withDefaults(defineProps(), {
    percent: undefined,
    height: 8,
    status: 'primary',
    showLabel: false,
    striped: false,
});
/** 是否不确定模式（未传 percent 或 percent < 0） */
const isIndeterminate = computed(() => {
    return props.percent === undefined || props.percent < 0;
});
/** 安全裁剪后的进度值 */
const clampedPercent = computed(() => {
    if (props.percent === undefined)
        return 0;
    return Math.max(0, Math.min(100, props.percent));
});
/** 状态对应的背景色类 */
const barColorClass = computed(() => {
    const map = {
        primary: 'bg-primary-600',
        success: 'bg-success',
        warning: 'bg-warning',
        danger: 'bg-danger',
    };
    return map[props.status] || map.primary;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    percent: undefined,
    height: 8,
    status: 'primary',
    showLabel: false,
    striped: false,
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['progress-bar-fill']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "progress-bar-wrapper" },
});
if (__VLS_ctx.showLabel && !__VLS_ctx.isIndeterminate) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex justify-between mb-1" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xs text-neutral-500" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "text-xs font-medium text-neutral-700" },
    });
    (Math.round(__VLS_ctx.clampedPercent));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "progress-bar-track" },
    ...{ style: ({ height: `${__VLS_ctx.height}px` }) },
    role: "progressbar",
    'aria-valuenow': (__VLS_ctx.isIndeterminate ? undefined : __VLS_ctx.clampedPercent),
    'aria-valuemin': (0),
    'aria-valuemax': (100),
    'aria-label': (__VLS_ctx.isIndeterminate ? '处理中...' : `进度 ${Math.round(__VLS_ctx.clampedPercent)}%`),
});
if (!__VLS_ctx.isIndeterminate) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "progress-bar-fill" },
        ...{ class: ([__VLS_ctx.barColorClass, { striped: __VLS_ctx.striped }]) },
        ...{ style: ({ width: `${__VLS_ctx.clampedPercent}%` }) },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "progress-bar-indeterminate" },
        ...{ class: (__VLS_ctx.barColorClass) },
    });
}
/** @type {__VLS_StyleScopedClasses['progress-bar-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar-track']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar-fill']} */ ;
/** @type {__VLS_StyleScopedClasses['striped']} */ ;
/** @type {__VLS_StyleScopedClasses['progress-bar-indeterminate']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            isIndeterminate: isIndeterminate,
            clampedPercent: clampedPercent,
            barColorClass: barColorClass,
        };
    },
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
