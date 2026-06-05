import { ref, computed } from 'vue';
import { NButton, NAlert, NInput, NSpace, NTable } from 'naive-ui';
import ToolHeader from '@/components/tools/shared/ToolHeader.vue';
import CopyButton from '@/components/tools/shared/CopyButton.vue';
import { useUndoHistory } from '@/hooks/useUndoHistory';
import { encodeUrl, decodeUrl, parseQueryParams } from '@/lib/parsers/urlCodec';
import { isDangerousProtocol } from '@/lib/security/safeUrl';
const props = defineProps();
const { state: text, push: pushHistory, undo, canUndo } = useUndoHistory('');
const result = ref('');
const operation = ref(null);
const opError = ref(null);
const dangerProtocol = ref(false);
const params = ref([]);
const showParams = computed(() => params.value.length > 0);
const highlightTokens = computed(() => {
    if (operation.value !== 'encode' || !result.value)
        return [];
    const parts = result.value.split(/(%[0-9A-Fa-f]{2})/g);
    return parts
        .filter((part) => part.length > 0)
        .map((part) => ({
        text: part,
        isEncoded: /^%[0-9A-Fa-f]{2}$/.test(part),
    }));
});
function handleEncode() {
    if (!text.value.trim())
        return;
    opError.value = null;
    dangerProtocol.value = false;
    try {
        pushHistory(text.value);
        result.value = encodeUrl(text.value);
        operation.value = 'encode';
        params.value = parseQueryParams(text.value);
        dangerProtocol.value = isDangerousProtocol(text.value);
    }
    catch (e) {
        opError.value = `编码失败：${e instanceof Error ? e.message : '未知错误'}`;
    }
}
function handleDecode() {
    if (!text.value.trim())
        return;
    opError.value = null;
    dangerProtocol.value = false;
    try {
        pushHistory(text.value);
        result.value = decodeUrl(text.value);
        operation.value = 'decode';
        // 解码结果也可能包含查询参数
        params.value = parseQueryParams(result.value);
    }
    catch (e) {
        opError.value = `解码失败：${e instanceof Error ? e.message : '未知错误'}`;
    }
}
function handleUndo() {
    undo();
    result.value = '';
    operation.value = null;
    opError.value = null;
    params.value = [];
}
function handleClear() {
    text.value = '';
    result.value = '';
    operation.value = null;
    opError.value = null;
    params.value = [];
    dangerProtocol.value = false;
}
const paramColumns = [
    { title: '参数名', key: 'key', width: 160 },
    { title: '原始值', key: 'value', ellipsis: { tooltip: true } },
    { title: '编码值', key: 'encoded' },
];
const paramRows = computed(() => params.value.map((p) => ({
    key: p.key,
    value: p.value,
    encoded: encodeURIComponent(p.value),
})));
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "url-codec" },
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
    disabled: (!__VLS_ctx.text.trim()),
}));
const __VLS_9 = __VLS_8({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    disabled: (!__VLS_ctx.text.trim()),
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
    disabled: (!__VLS_ctx.text.trim()),
}));
const __VLS_17 = __VLS_16({
    ...{ 'onClick': {} },
    size: "small",
    disabled: (!__VLS_ctx.text.trim()),
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
    disabled: (!__VLS_ctx.canUndo),
}));
const __VLS_25 = __VLS_24({
    ...{ 'onClick': {} },
    size: "small",
    disabled: (!__VLS_ctx.canUndo),
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
let __VLS_27;
let __VLS_28;
let __VLS_29;
const __VLS_30 = {
    onClick: (__VLS_ctx.handleUndo)
};
__VLS_26.slots.default;
var __VLS_26;
const __VLS_31 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_33 = __VLS_32({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
let __VLS_35;
let __VLS_36;
let __VLS_37;
const __VLS_38 = {
    onClick: (__VLS_ctx.handleClear)
};
__VLS_34.slots.default;
var __VLS_34;
var __VLS_6;
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "uc-label" },
});
const __VLS_39 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, ]} */ ;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.text),
    type: "textarea",
    rows: (6),
    placeholder: "在此输入 URL 或编码文本...",
    ...{ class: "uc-textarea mb-4" },
}));
const __VLS_41 = __VLS_40({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.text),
    type: "textarea",
    rows: (6),
    placeholder: "在此输入 URL 或编码文本...",
    ...{ class: "uc-textarea mb-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
let __VLS_43;
let __VLS_44;
let __VLS_45;
const __VLS_46 = {
    'onUpdate:value': ((v) => { __VLS_ctx.text = v; __VLS_ctx.opError = null; __VLS_ctx.dangerProtocol = false; })
};
var __VLS_42;
if (__VLS_ctx.dangerProtocol) {
    const __VLS_47 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
    // @ts-ignore
    const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
        type: "warning",
        bordered: (false),
        ...{ class: "mb-4" },
    }));
    const __VLS_49 = __VLS_48({
        type: "warning",
        bordered: (false),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_48));
    __VLS_50.slots.default;
    var __VLS_50;
}
if (__VLS_ctx.opError) {
    const __VLS_51 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
        type: "error",
        bordered: (false),
        ...{ class: "mb-4" },
    }));
    const __VLS_53 = __VLS_52({
        type: "error",
        bordered: (false),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    __VLS_54.slots.default;
    (__VLS_ctx.opError);
    var __VLS_54;
}
if (__VLS_ctx.result) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "uc-result-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "uc-result-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "uc-result-label" },
    });
    (__VLS_ctx.operation === 'encode' ? '编码结果' : '解码结果');
    /** @type {[typeof CopyButton, ]} */ ;
    // @ts-ignore
    const __VLS_55 = __VLS_asFunctionalComponent(CopyButton, new CopyButton({
        content: (__VLS_ctx.result),
    }));
    const __VLS_56 = __VLS_55({
        content: (__VLS_ctx.result),
    }, ...__VLS_functionalComponentArgsRest(__VLS_55));
    if (__VLS_ctx.highlightTokens.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "uc-result-highlight" },
        });
        for (const [token, i] of __VLS_getVForSourceType((__VLS_ctx.highlightTokens))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (i),
                ...{ class: (token.isEncoded ? 'uc-hl-mark' : '') },
            });
            (token.text);
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
            ...{ class: "uc-result" },
        });
        (__VLS_ctx.result);
    }
}
if (__VLS_ctx.showParams) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "uc-params-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "uc-params-title" },
    });
    (__VLS_ctx.params.length);
    const __VLS_58 = {}.NTable;
    /** @type {[typeof __VLS_components.NTable, ]} */ ;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent(__VLS_58, new __VLS_58({
        columns: (__VLS_ctx.paramColumns),
        data: (__VLS_ctx.paramRows),
        bordered: (false),
        singleLine: (false),
        size: "small",
        ...{ class: "uc-params-table" },
    }));
    const __VLS_60 = __VLS_59({
        columns: (__VLS_ctx.paramColumns),
        data: (__VLS_ctx.paramRows),
        bordered: (false),
        singleLine: (false),
        size: "small",
        ...{ class: "uc-params-table" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
}
/** @type {__VLS_StyleScopedClasses['url-codec']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['uc-label']} */ ;
/** @type {__VLS_StyleScopedClasses['uc-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['uc-result-section']} */ ;
/** @type {__VLS_StyleScopedClasses['uc-result-header']} */ ;
/** @type {__VLS_StyleScopedClasses['uc-result-label']} */ ;
/** @type {__VLS_StyleScopedClasses['uc-result-highlight']} */ ;
/** @type {__VLS_StyleScopedClasses['uc-result']} */ ;
/** @type {__VLS_StyleScopedClasses['uc-params-section']} */ ;
/** @type {__VLS_StyleScopedClasses['uc-params-title']} */ ;
/** @type {__VLS_StyleScopedClasses['uc-params-table']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NAlert: NAlert,
            NInput: NInput,
            NSpace: NSpace,
            NTable: NTable,
            ToolHeader: ToolHeader,
            CopyButton: CopyButton,
            text: text,
            canUndo: canUndo,
            result: result,
            operation: operation,
            opError: opError,
            dangerProtocol: dangerProtocol,
            params: params,
            showParams: showParams,
            highlightTokens: highlightTokens,
            handleEncode: handleEncode,
            handleDecode: handleDecode,
            handleUndo: handleUndo,
            handleClear: handleClear,
            paramColumns: paramColumns,
            paramRows: paramRows,
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
