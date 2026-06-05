import { computed } from 'vue';
import { NInput } from 'naive-ui';
const props = defineProps();
const emit = defineEmits();
/** 校验是否为有效 hex 颜色 */
function isValidHex(value) {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value);
}
/** 规范化用户输入的 hex 值 */
function normalizeHex(raw) {
    let val = raw.trim();
    if (!val.startsWith('#'))
        val = '#' + val;
    // 简写 #RGB → #RRGGBB
    if (val.length === 4 && /^#[0-9A-Fa-f]{3}$/.test(val)) {
        val = '#' + val[1] + val[1] + val[2] + val[2] + val[3] + val[3];
    }
    return val.toUpperCase();
}
const displayColor = computed(() => isValidHex(props.modelValue) ? props.modelValue : '#000000');
function handleNativeInput(e) {
    const target = e.target;
    emit('update:modelValue', target.value);
}
function handleTextInput(value) {
    const normalized = normalizeHex(value);
    if (isValidHex(normalized)) {
        emit('update:modelValue', normalized);
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['color-picker-swatch']} */ ;
/** @type {__VLS_StyleScopedClasses['color-picker-block']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "color-picker" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "color-picker-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "color-picker-swatch" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onInput: (__VLS_ctx.handleNativeInput) },
    type: "color",
    value: (__VLS_ctx.displayColor),
    ...{ class: "color-picker-native" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
    ...{ class: "color-picker-block" },
    ...{ style: ({ backgroundColor: __VLS_ctx.displayColor }) },
});
const __VLS_0 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.modelValue),
    size: "small",
    placeholder: "#FF5733",
    ...{ class: "color-picker-input" },
}));
const __VLS_2 = __VLS_1({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.modelValue),
    size: "small",
    placeholder: "#FF5733",
    ...{ class: "color-picker-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    'onUpdate:value': (__VLS_ctx.handleTextInput)
};
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['color-picker']} */ ;
/** @type {__VLS_StyleScopedClasses['color-picker-row']} */ ;
/** @type {__VLS_StyleScopedClasses['color-picker-swatch']} */ ;
/** @type {__VLS_StyleScopedClasses['color-picker-native']} */ ;
/** @type {__VLS_StyleScopedClasses['color-picker-block']} */ ;
/** @type {__VLS_StyleScopedClasses['color-picker-input']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NInput: NInput,
            displayColor: displayColor,
            handleNativeInput: handleNativeInput,
            handleTextInput: handleTextInput,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
