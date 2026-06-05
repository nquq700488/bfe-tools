import { ref } from 'vue';
const props = defineProps();
const copied = ref(false);
let timer = null;
async function handleCopy() {
    try {
        await navigator.clipboard.writeText(props.content);
    }
    catch {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = props.content;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
    copied.value = true;
    if (timer)
        clearTimeout(timer);
    timer = setTimeout(() => {
        copied.value = false;
        timer = null;
    }, 2000);
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['copy-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['copy-btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleCopy) },
    ...{ class: "copy-btn" },
    ...{ class: ({ copied: __VLS_ctx.copied }) },
});
(__VLS_ctx.copied ? '已复制 ✓' : '复制');
/** @type {__VLS_StyleScopedClasses['copy-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['copied']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            copied: copied,
            handleCopy: handleCopy,
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
