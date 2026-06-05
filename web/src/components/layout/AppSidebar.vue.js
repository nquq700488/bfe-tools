import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { toolRegistry } from '@/tools/registry';
const router = useRouter();
const route = useRoute();
const currentYear = new Date().getFullYear();
const tools = computed(() => [...toolRegistry.values()].sort((a, b) => a.name.localeCompare(b.name)));
function handleNavigateToTool(toolId) {
    router.push({ name: 'tool', params: { toolId } });
}
function handleGoHome() {
    router.push({ name: 'home' });
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['sidebar-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-text']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleGoHome) },
    ...{ class: "sidebar-logo" },
    'aria-label': "返回首页",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "logo-mark" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2.5",
    'stroke-linecap': "round",
    'stroke-linejoin': "round",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
    points: "16 18 22 12 16 6",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.polyline)({
    points: "8 6 2 12 8 18",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "logo-text" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    'aria-label': "工具导航",
    ...{ class: "sidebar-nav" },
});
for (const [tool] of __VLS_getVForSourceType((__VLS_ctx.tools))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.handleNavigateToTool(tool.id);
            } },
        key: (tool.id),
        ...{ class: "sidebar-nav-item" },
        ...{ class: ({ active: __VLS_ctx.route.params.toolId === tool.id }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sidebar-nav-icon" },
    });
    (tool.icon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "sidebar-nav-label" },
    });
    (tool.name);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-footer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "sidebar-copyright" },
});
(__VLS_ctx.currentYear);
/** @type {__VLS_StyleScopedClasses['sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-logo']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-mark']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-text']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-nav-label']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-copyright']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            route: route,
            currentYear: currentYear,
            tools: tools,
            handleNavigateToTool: handleNavigateToTool,
            handleGoHome: handleGoHome,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
