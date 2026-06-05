import { computed } from 'vue';
const props = defineProps();
/** 状态配置 */
const statusConfig = computed(() => {
    const configs = {
        uploading: {
            label: '上传中',
            textClass: 'text-primary-600',
            bgClass: 'bg-white border-primary-100',
            barClass: 'bg-primary-500',
            icon: '↑',
        },
        pending: {
            label: '等待处理',
            textClass: 'text-neutral-500',
            bgClass: 'bg-white border-neutral-200',
            barClass: 'bg-neutral-300',
            icon: '○',
        },
        running: {
            label: '处理中',
            textClass: 'text-primary-600',
            bgClass: 'bg-white border-primary-100',
            barClass: 'bg-primary-500',
            icon: '◉',
        },
        succeeded: {
            label: '处理完成',
            textClass: 'text-emerald-600',
            bgClass: 'bg-emerald-50/60 border-emerald-200',
            barClass: 'bg-emerald-500',
            icon: '✓',
        },
        failed: {
            label: '处理失败',
            textClass: 'text-red-600',
            bgClass: 'bg-red-50/60 border-red-200',
            barClass: 'bg-red-500',
            icon: '✗',
        },
        canceled: {
            label: '已取消',
            textClass: 'text-neutral-500',
            bgClass: 'bg-white border-neutral-200',
            barClass: 'bg-neutral-300',
            icon: '⊘',
        },
    };
    return configs[props.status] || configs.pending;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['icon-ring']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "task-status rounded-2 border p-4" },
    ...{ class: (__VLS_ctx.statusConfig.bgClass) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex items-center gap-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "icon-ring" },
    ...{ class: (__VLS_ctx.statusConfig.textClass) },
});
(__VLS_ctx.statusConfig.icon);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex-1 min-w-0" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm font-semibold" },
    ...{ class: (__VLS_ctx.statusConfig.textClass) },
});
(__VLS_ctx.statusConfig.label);
if ((__VLS_ctx.status === 'uploading' || __VLS_ctx.status === 'running') && __VLS_ctx.progress !== undefined) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs text-neutral-500 mt-0.5" },
    });
    (Math.round(__VLS_ctx.progress));
}
if (__VLS_ctx.status === 'failed' && __VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs text-red-600 mt-0.5 break-words" },
    });
    (__VLS_ctx.errorMessage);
}
if (__VLS_ctx.status === 'succeeded' && __VLS_ctx.resultSummary) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-xs text-emerald-600 mt-0.5" },
    });
    (__VLS_ctx.resultSummary);
}
if (__VLS_ctx.status === 'uploading' || __VLS_ctx.status === 'running') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ class: "flex-shrink-0 w-6 h-6" },
        viewBox: "0 0 24 24",
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        cx: "12",
        cy: "12",
        r: "10",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        ...{ class: "text-neutral-150" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
        cx: "12",
        cy: "12",
        r: "10",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
        'stroke-dasharray': "62.83",
        'stroke-dashoffset': (62.83 - (62.83 * (__VLS_ctx.progress || 0)) / 100),
        'stroke-linecap': "round",
        ...{ class: "text-primary-500 transition-all duration-500" },
    });
}
if (__VLS_ctx.status === 'uploading' || __VLS_ctx.status === 'running') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "h-2 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "h-full rounded-full transition-all duration-500" },
        ...{ class: (__VLS_ctx.statusConfig.barClass) },
        ...{ style: ({ width: `${__VLS_ctx.progress || 0}%` }) },
    });
}
/** @type {__VLS_StyleScopedClasses['task-status']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['p-4']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-ring']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['min-w-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-red-600']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['break-words']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-emerald-600']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['w-6']} */ ;
/** @type {__VLS_StyleScopedClasses['h-6']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-150']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['h-2']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-500']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            statusConfig: statusConfig,
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
