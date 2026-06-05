import { ref, computed, onMounted } from 'vue';
import { NButton, NInput } from 'naive-ui';
import ToolHeader from '@/components/tools/shared/ToolHeader.vue';
import ColorPicker from '@/components/tools/shared/ColorPicker.vue';
import CopyButton from '@/components/tools/shared/CopyButton.vue';
import { parseColor, convertColor } from '@/lib/parsers/color';
const props = defineProps();
const HISTORY_KEY = 'color-converter-history';
const MAX_HISTORY = 10;
// ---- 格式字段 ----
const hexValue = ref('#FF5733');
const rgbValue = ref('rgb(255, 87, 51)');
const hslValue = ref('hsl(12, 100%, 60%)');
const rgbaValue = ref('rgba(255, 87, 51, 1.00)');
// ---- 校验状态 ----
const hexError = ref(null);
const rgbError = ref(null);
const hslError = ref(null);
const rgbaError = ref(null);
// ---- 当前解析的颜色 ----
const parsedColor = ref(null);
// ---- 历史 ----
const history = ref([]);
// ---- 更新来源标记（防止循环更新） ----
let updatingFrom = null;
onMounted(() => {
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored)
            history.value = JSON.parse(stored);
    }
    catch { /* ignore */ }
    // 初始化解析默认色值
    updateFromHex(hexValue.value);
});
function saveHistory() {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.value));
}
function addToHistory(hex) {
    const upper = hex.toUpperCase();
    history.value = [upper, ...history.value.filter((h) => h !== upper)].slice(0, MAX_HISTORY);
    saveHistory();
}
function clearHistory() {
    history.value = [];
    localStorage.removeItem(HISTORY_KEY);
}
/** 从 HEX 输入更新全部字段 */
function updateFromHex(val) {
    hexError.value = null;
    const color = parseColor(val);
    if (!color) {
        hexError.value = '无效的颜色值';
        return;
    }
    parsedColor.value = color;
    updatingFrom = 'hex';
    hexValue.value = color.hex;
    rgbValue.value = convertColor(color, 'rgb');
    hslValue.value = convertColor(color, 'hsl');
    rgbaValue.value = convertColor(color, 'rgba');
    rgbError.value = null;
    hslError.value = null;
    rgbaError.value = null;
    addToHistory(color.hex);
    updatingFrom = null;
}
function updateFromRgb(val) {
    if (updatingFrom)
        return;
    rgbError.value = null;
    const color = parseColor(val);
    if (!color) {
        rgbError.value = '无效的 RGB 值';
        return;
    }
    parsedColor.value = color;
    updatingFrom = 'rgb';
    hexValue.value = color.hex;
    hslValue.value = convertColor(color, 'hsl');
    rgbaValue.value = convertColor(color, 'rgba');
    hexError.value = null;
    hslError.value = null;
    rgbaError.value = null;
    addToHistory(color.hex);
    updatingFrom = null;
}
function updateFromHsl(val) {
    if (updatingFrom)
        return;
    hslError.value = null;
    const color = parseColor(val);
    if (!color) {
        hslError.value = '无效的 HSL 值';
        return;
    }
    parsedColor.value = color;
    updatingFrom = 'hsl';
    hexValue.value = color.hex;
    rgbValue.value = convertColor(color, 'rgb');
    rgbaValue.value = convertColor(color, 'rgba');
    hexError.value = null;
    rgbError.value = null;
    rgbaError.value = null;
    addToHistory(color.hex);
    updatingFrom = null;
}
function updateFromRgba(val) {
    if (updatingFrom)
        return;
    rgbaError.value = null;
    const color = parseColor(val);
    if (!color) {
        rgbaError.value = '无效的 RGBA 值';
        return;
    }
    parsedColor.value = color;
    updatingFrom = 'rgba';
    hexValue.value = color.hex;
    rgbValue.value = convertColor(color, 'rgb');
    hslValue.value = convertColor(color, 'hsl');
    hexError.value = null;
    rgbError.value = null;
    hslError.value = null;
    addToHistory(color.hex);
    updatingFrom = null;
}
function applyHistory(hex) {
    updateFromHex(hex);
}
// ---- 色板预览 ----
const swatchColor = computed(() => parsedColor.value?.hex ?? '#000000');
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['cc-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-history']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-history-item']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-history-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "color-converter" },
});
/** @type {[typeof ToolHeader, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ToolHeader, new ToolHeader({
    tool: (props.tool),
}));
const __VLS_1 = __VLS_0({
    tool: (props.tool),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cc-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cc-inputs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cc-swatch-area mb-5" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
    ...{ class: "cc-swatch" },
    ...{ style: ({ backgroundColor: __VLS_ctx.swatchColor }) },
});
/** @type {[typeof ColorPicker, ]} */ ;
// @ts-ignore
const __VLS_3 = __VLS_asFunctionalComponent(ColorPicker, new ColorPicker({
    modelValue: (__VLS_ctx.hexValue),
}));
const __VLS_4 = __VLS_3({
    modelValue: (__VLS_ctx.hexValue),
}, ...__VLS_functionalComponentArgsRest(__VLS_3));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cc-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "cc-field-label" },
});
/** @type {[typeof CopyButton, ]} */ ;
// @ts-ignore
const __VLS_6 = __VLS_asFunctionalComponent(CopyButton, new CopyButton({
    content: (__VLS_ctx.hexValue),
}));
const __VLS_7 = __VLS_6({
    content: (__VLS_ctx.hexValue),
}, ...__VLS_functionalComponentArgsRest(__VLS_6));
const __VLS_9 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, ]} */ ;
// @ts-ignore
const __VLS_10 = __VLS_asFunctionalComponent(__VLS_9, new __VLS_9({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.hexValue),
    size: "small",
    placeholder: "#RRGGBB",
    status: (__VLS_ctx.hexError ? 'error' : undefined),
    ...{ class: "cc-input" },
}));
const __VLS_11 = __VLS_10({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.hexValue),
    size: "small",
    placeholder: "#RRGGBB",
    status: (__VLS_ctx.hexError ? 'error' : undefined),
    ...{ class: "cc-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_10));
let __VLS_13;
let __VLS_14;
let __VLS_15;
const __VLS_16 = {
    'onUpdate:value': (__VLS_ctx.updateFromHex)
};
var __VLS_12;
if (__VLS_ctx.hexError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "cc-error" },
    });
    (__VLS_ctx.hexError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cc-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "cc-field-label" },
});
/** @type {[typeof CopyButton, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(CopyButton, new CopyButton({
    content: (__VLS_ctx.rgbValue),
}));
const __VLS_18 = __VLS_17({
    content: (__VLS_ctx.rgbValue),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
const __VLS_20 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.rgbValue),
    size: "small",
    placeholder: "rgb(r, g, b)",
    status: (__VLS_ctx.rgbError ? 'error' : undefined),
    ...{ class: "cc-input" },
}));
const __VLS_22 = __VLS_21({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.rgbValue),
    size: "small",
    placeholder: "rgb(r, g, b)",
    status: (__VLS_ctx.rgbError ? 'error' : undefined),
    ...{ class: "cc-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
let __VLS_24;
let __VLS_25;
let __VLS_26;
const __VLS_27 = {
    'onUpdate:value': (__VLS_ctx.updateFromRgb)
};
var __VLS_23;
if (__VLS_ctx.rgbError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "cc-error" },
    });
    (__VLS_ctx.rgbError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cc-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "cc-field-label" },
});
/** @type {[typeof CopyButton, ]} */ ;
// @ts-ignore
const __VLS_28 = __VLS_asFunctionalComponent(CopyButton, new CopyButton({
    content: (__VLS_ctx.hslValue),
}));
const __VLS_29 = __VLS_28({
    content: (__VLS_ctx.hslValue),
}, ...__VLS_functionalComponentArgsRest(__VLS_28));
const __VLS_31 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.hslValue),
    size: "small",
    placeholder: "hsl(h, s%, l%)",
    status: (__VLS_ctx.hslError ? 'error' : undefined),
    ...{ class: "cc-input" },
}));
const __VLS_33 = __VLS_32({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.hslValue),
    size: "small",
    placeholder: "hsl(h, s%, l%)",
    status: (__VLS_ctx.hslError ? 'error' : undefined),
    ...{ class: "cc-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
let __VLS_35;
let __VLS_36;
let __VLS_37;
const __VLS_38 = {
    'onUpdate:value': (__VLS_ctx.updateFromHsl)
};
var __VLS_34;
if (__VLS_ctx.hslError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "cc-error" },
    });
    (__VLS_ctx.hslError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cc-field" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "cc-field-label" },
});
/** @type {[typeof CopyButton, ]} */ ;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent(CopyButton, new CopyButton({
    content: (__VLS_ctx.rgbaValue),
}));
const __VLS_40 = __VLS_39({
    content: (__VLS_ctx.rgbaValue),
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
const __VLS_42 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, ]} */ ;
// @ts-ignore
const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.rgbaValue),
    size: "small",
    placeholder: "rgba(r, g, b, a)",
    status: (__VLS_ctx.rgbaError ? 'error' : undefined),
    ...{ class: "cc-input" },
}));
const __VLS_44 = __VLS_43({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.rgbaValue),
    size: "small",
    placeholder: "rgba(r, g, b, a)",
    status: (__VLS_ctx.rgbaError ? 'error' : undefined),
    ...{ class: "cc-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_43));
let __VLS_46;
let __VLS_47;
let __VLS_48;
const __VLS_49 = {
    'onUpdate:value': (__VLS_ctx.updateFromRgba)
};
var __VLS_45;
if (__VLS_ctx.rgbaError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "cc-error" },
    });
    (__VLS_ctx.rgbaError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cc-history" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cc-history-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "cc-history-title" },
});
if (__VLS_ctx.history.length > 0) {
    const __VLS_50 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_51 = __VLS_asFunctionalComponent(__VLS_50, new __VLS_50({
        ...{ 'onClick': {} },
        text: true,
        size: "tiny",
    }));
    const __VLS_52 = __VLS_51({
        ...{ 'onClick': {} },
        text: true,
        size: "tiny",
    }, ...__VLS_functionalComponentArgsRest(__VLS_51));
    let __VLS_54;
    let __VLS_55;
    let __VLS_56;
    const __VLS_57 = {
        onClick: (__VLS_ctx.clearHistory)
    };
    __VLS_53.slots.default;
    var __VLS_53;
}
if (__VLS_ctx.history.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cc-history-empty" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cc-history-grid" },
    });
    for (const [hex] of __VLS_getVForSourceType((__VLS_ctx.history))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.history.length === 0))
                        return;
                    __VLS_ctx.applyHistory(hex);
                } },
            key: (hex),
            ...{ class: "cc-history-item" },
            ...{ class: ({ active: hex === __VLS_ctx.swatchColor }) },
            title: (hex),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "cc-history-swatch" },
            ...{ style: ({ backgroundColor: hex }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "cc-history-hex" },
        });
        (hex);
    }
}
/** @type {__VLS_StyleScopedClasses['color-converter']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-inputs']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-swatch-area']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-5']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-swatch']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-field']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-error']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-field']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-error']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-field']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-error']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-field']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-field-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-error']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-history']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-history-header']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-history-title']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-history-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-history-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-history-item']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-history-swatch']} */ ;
/** @type {__VLS_StyleScopedClasses['cc-history-hex']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NInput: NInput,
            ToolHeader: ToolHeader,
            ColorPicker: ColorPicker,
            CopyButton: CopyButton,
            hexValue: hexValue,
            rgbValue: rgbValue,
            hslValue: hslValue,
            rgbaValue: rgbaValue,
            hexError: hexError,
            rgbError: rgbError,
            hslError: hslError,
            rgbaError: rgbaError,
            history: history,
            clearHistory: clearHistory,
            updateFromHex: updateFromHex,
            updateFromRgb: updateFromRgb,
            updateFromHsl: updateFromHsl,
            updateFromRgba: updateFromRgba,
            applyHistory: applyHistory,
            swatchColor: swatchColor,
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
