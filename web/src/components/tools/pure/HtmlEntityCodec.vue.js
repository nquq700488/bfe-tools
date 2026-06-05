import { ref, computed } from 'vue';
import { NButton, NAlert, NInput, NSpace } from 'naive-ui';
import ToolHeader from '@/components/tools/shared/ToolHeader.vue';
import CopyButton from '@/components/tools/shared/CopyButton.vue';
import { encodeHtmlEntities, decodeHtmlEntities } from '@/lib/parsers/htmlEntities';
const props = defineProps();
const input = ref('');
const output = ref('');
const mode = ref(null);
const opError = ref(null);
const xssWarning = ref(false);
/** XSS 检测模式 */
const XSS_PATTERNS = [
    /<script\b/i,
    /\bon\w+\s*=/i,
    /javascript:/i,
    /<iframe\b/i,
    /<embed\b/i,
    /<object\b/i,
];
const isXssDangerous = computed(() => xssWarning.value);
function detectXss(text) {
    return XSS_PATTERNS.some((pattern) => pattern.test(text));
}
function handleEncode() {
    if (!input.value.trim())
        return;
    opError.value = null;
    xssWarning.value = false;
    try {
        output.value = encodeHtmlEntities(input.value);
        mode.value = 'encode';
    }
    catch (e) {
        opError.value = `编码失败：${e instanceof Error ? e.message : '未知错误'}`;
    }
}
function handleDecode() {
    if (!input.value.trim())
        return;
    opError.value = null;
    xssWarning.value = false;
    try {
        const decoded = decodeHtmlEntities(input.value);
        output.value = decoded;
        mode.value = 'decode';
        // 检测解码后的 XSS 风险
        if (detectXss(decoded)) {
            xssWarning.value = true;
        }
    }
    catch (e) {
        opError.value = `解码失败：${e instanceof Error ? e.message : '未知错误'}`;
    }
}
function handleClear() {
    input.value = '';
    output.value = '';
    mode.value = null;
    opError.value = null;
    xssWarning.value = false;
}
/** 安全预览模式标识 */
const isDecodeMode = computed(() => mode.value === 'decode');
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['hec-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['hec-output-wrapper']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "html-entity-codec" },
});
/** @type {[typeof ToolHeader, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ToolHeader, new ToolHeader({
    tool: (props.tool),
}));
const __VLS_1 = __VLS_0({
    tool: (props.tool),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
const __VLS_3 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.NSpace, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    ...{ class: "mb-4" },
}));
const __VLS_5 = __VLS_4({
    ...{ class: "mb-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
__VLS_6.slots.default;
const __VLS_7 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    disabled: (!__VLS_ctx.input.trim()),
}));
const __VLS_9 = __VLS_8({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    disabled: (!__VLS_ctx.input.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
let __VLS_11;
let __VLS_12;
let __VLS_13;
const __VLS_14 = {
    onClick: (__VLS_ctx.handleEncode)
};
__VLS_10.slots.default;
var __VLS_10;
const __VLS_15 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    ...{ 'onClick': {} },
    size: "small",
    disabled: (!__VLS_ctx.input.trim()),
}));
const __VLS_17 = __VLS_16({
    ...{ 'onClick': {} },
    size: "small",
    disabled: (!__VLS_ctx.input.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
let __VLS_19;
let __VLS_20;
let __VLS_21;
const __VLS_22 = {
    onClick: (__VLS_ctx.handleDecode)
};
__VLS_18.slots.default;
var __VLS_18;
const __VLS_23 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_25 = __VLS_24({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
let __VLS_27;
let __VLS_28;
let __VLS_29;
const __VLS_30 = {
    onClick: (__VLS_ctx.handleClear)
};
__VLS_26.slots.default;
var __VLS_26;
var __VLS_6;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hec-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "hec-label" },
});
const __VLS_31 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    value: (__VLS_ctx.input),
    type: "textarea",
    rows: (10),
    placeholder: "在此输入 HTML 或文本...",
    ...{ class: "hec-textarea" },
}));
const __VLS_33 = __VLS_32({
    value: (__VLS_ctx.input),
    type: "textarea",
    rows: (10),
    placeholder: "在此输入 HTML 或文本...",
    ...{ class: "hec-textarea" },
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "hec-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "hec-label-badge" },
});
(__VLS_ctx.isDecodeMode ? 'textContent 安全渲染' : '');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hec-output-wrapper" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "hec-output" },
    ...{ class: ({ 'hec-output-empty': !__VLS_ctx.output }) },
});
if (__VLS_ctx.output) {
    (__VLS_ctx.output);
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "hec-output-placeholder" },
    });
}
if (__VLS_ctx.output) {
    /** @type {[typeof CopyButton, ]} */ ;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent(CopyButton, new CopyButton({
        content: (__VLS_ctx.output),
    }));
    const __VLS_36 = __VLS_35({
        content: (__VLS_ctx.output),
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
}
if (__VLS_ctx.isXssDangerous) {
    const __VLS_38 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
    // @ts-ignore
    const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
        type: "error",
        bordered: (false),
        ...{ class: "mt-4" },
    }));
    const __VLS_40 = __VLS_39({
        type: "error",
        bordered: (false),
        ...{ class: "mt-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_39));
    __VLS_41.slots.default;
    var __VLS_41;
}
if (__VLS_ctx.opError) {
    const __VLS_42 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
        type: "error",
        bordered: (false),
        ...{ class: "mt-4" },
    }));
    const __VLS_44 = __VLS_43({
        type: "error",
        bordered: (false),
        ...{ class: "mt-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    __VLS_45.slots.default;
    (__VLS_ctx.opError);
    var __VLS_45;
}
/** @type {__VLS_StyleScopedClasses['html-entity-codec']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['hec-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['hec-label']} */ ;
/** @type {__VLS_StyleScopedClasses['hec-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['hec-label']} */ ;
/** @type {__VLS_StyleScopedClasses['hec-label-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['hec-output-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['hec-output']} */ ;
/** @type {__VLS_StyleScopedClasses['hec-output-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['hec-output-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NAlert: NAlert,
            NInput: NInput,
            NSpace: NSpace,
            ToolHeader: ToolHeader,
            CopyButton: CopyButton,
            input: input,
            output: output,
            opError: opError,
            isXssDangerous: isXssDangerous,
            handleEncode: handleEncode,
            handleDecode: handleDecode,
            handleClear: handleClear,
            isDecodeMode: isDecodeMode,
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
