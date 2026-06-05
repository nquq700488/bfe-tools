import { ref, onMounted } from 'vue';
import { NConfigProvider } from 'naive-ui';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import { initTauriRuntime } from '@/lib/runtime';
/** Naive UI 主题覆盖 — 与设计 token 保持一致 */
const themeOverrides = {
    common: {
        primaryColor: '#3b82f6',
        primaryColorHover: '#0f6bff',
        primaryColorPressed: '#0b55d9',
        primaryColorSuppl: '#1e40af',
        borderRadius: '8px',
        fontFamily: "'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, -apple-system, sans-serif",
    },
    Button: {
        textColorPrimary: '#0f6bff',
        textColorHoverPrimary: '#0b55d9',
        textColorPressedPrimary: '#1e40af',
    },
};
/** 后端是否就绪（仅桌面端有意义，浏览器模式始终 true） */
const backendReady = ref(false);
const isDesktop = ref(false);
onMounted(async () => {
    // 检测是否在 Tauri 桌面壳中（开发 + 生产都有效）
    const w = window;
    isDesktop.value = !!(w.__TAURI__ || new URLSearchParams(window.location.search).get('__bfe_port'));
    const info = await initTauriRuntime();
    backendReady.value = true;
    if (info) {
        console.info('[App] Tauri 后端就绪:', info.baseUrl);
    }
});
function openSettings() {
    ;
    window.__TAURI__?.core.invoke('open_settings_window');
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['desktop-settings-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['app-main']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-settings-btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
const __VLS_0 = {}.NConfigProvider;
/** @type {[typeof __VLS_components.NConfigProvider, typeof __VLS_components.NConfigProvider, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    themeOverrides: (__VLS_ctx.themeOverrides),
}));
const __VLS_2 = __VLS_1({
    themeOverrides: (__VLS_ctx.themeOverrides),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
var __VLS_4 = {};
__VLS_3.slots.default;
if (!__VLS_ctx.backendReady) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center justify-center min-h-screen" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "text-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "spinner text-primary-600 text-2xl mx-auto mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-neutral-500" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "app-layout" },
    });
    /** @type {[typeof AppSidebar, ]} */ ;
    // @ts-ignore
    const __VLS_5 = __VLS_asFunctionalComponent(AppSidebar, new AppSidebar({}));
    const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
        ...{ class: "app-main" },
    });
    const __VLS_8 = {}.RouterView;
    /** @type {[typeof __VLS_components.RouterView, typeof __VLS_components.routerView, typeof __VLS_components.RouterView, typeof __VLS_components.routerView, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({}));
    const __VLS_10 = __VLS_9({}, ...__VLS_functionalComponentArgsRest(__VLS_9));
    {
        const { default: __VLS_thisSlot } = __VLS_11.slots;
        const [{ Component }] = __VLS_getSlotParams(__VLS_thisSlot);
        const __VLS_12 = {}.transition;
        /** @type {[typeof __VLS_components.Transition, typeof __VLS_components.transition, typeof __VLS_components.Transition, typeof __VLS_components.transition, ]} */ ;
        // @ts-ignore
        const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
            name: "page",
            mode: "out-in",
        }));
        const __VLS_14 = __VLS_13({
            name: "page",
            mode: "out-in",
        }, ...__VLS_functionalComponentArgsRest(__VLS_13));
        __VLS_15.slots.default;
        const __VLS_16 = ((Component));
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({}));
        const __VLS_18 = __VLS_17({}, ...__VLS_functionalComponentArgsRest(__VLS_17));
        var __VLS_15;
        __VLS_11.slots['' /* empty slot name completion */];
    }
    var __VLS_11;
    if (__VLS_ctx.isDesktop) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.openSettings) },
            ...{ class: "desktop-settings-btn" },
            title: "设置目标 URL",
        });
    }
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['min-h-screen']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['mx-auto']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['app-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['app-main']} */ ;
/** @type {__VLS_StyleScopedClasses['desktop-settings-btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NConfigProvider: NConfigProvider,
            AppSidebar: AppSidebar,
            themeOverrides: themeOverrides,
            backendReady: backendReady,
            isDesktop: isDesktop,
            openSettings: openSettings,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
