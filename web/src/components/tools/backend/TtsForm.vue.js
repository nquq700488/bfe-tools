import { computed, ref, watch } from 'vue';
import { NButton, NInput, NSelect, NSlider } from 'naive-ui';
import { formatFileSize } from '@/lib/file-utils';
const props = defineProps();
const emit = defineEmits();
const ttsText = ref(`春天的脚步近了，大地从沉睡中苏醒。嫩绿的草芽悄悄钻出泥土，好奇地打量着这个崭新的世界。山间的溪流唱起了欢快的歌谣，一路奔向远方。桃花、杏花竞相开放，把山坡染成了粉色的海洋。小鸟在枝头跳跃，用清脆的歌声赞美这美好的季节。人们脱下厚重的冬衣，走进田野，感受着温暖的阳光和轻柔的微风。`);
const ttsVoice = ref('');
const ttsSpeed = ref(1.0);
const ttsPitch = ref(0);
const ttsFormat = ref('mp3');
const ttsFile = ref(null);
const inputMode = ref('text');
const txtInputRef = ref(null);
const voiceOptions = computed(() => {
    const voices = props.tool.ttsOptions?.voices || [];
    const groups = new Map();
    for (const v of voices) {
        const lang = v.language || '其他';
        if (!groups.has(lang))
            groups.set(lang, []);
        groups.get(lang).push({
            label: `${v.gender === 'female' ? '👩' : '👨'} ${v.name}`,
            value: v.id,
        });
    }
    return [...groups.entries()].map(([label, children]) => ({
        type: 'group',
        label,
        key: label,
        children,
    }));
});
watch(() => props.tool.ttsOptions, (opts) => {
    if (opts) {
        ttsVoice.value = opts.defaultVoice;
        ttsSpeed.value = opts.defaultSpeed;
        ttsPitch.value = opts.defaultPitch;
        ttsFormat.value = opts.defaultFormat;
    }
}, { immediate: true });
function triggerTxtUpload() { txtInputRef.value?.click(); }
function handleTxtFileChange(e) {
    const input = e.target;
    if (input.files?.[0])
        ttsFile.value = input.files[0];
    input.value = '';
}
function clearTtsFile() { ttsFile.value = null; }
function handleSubmit() {
    if (!ttsText.value.trim() && !ttsFile.value)
        return;
    emit('submit', {
        text: ttsText.value,
        voiceId: ttsVoice.value,
        speed: String(ttsSpeed.value),
        pitch: String(ttsPitch.value),
        format: ttsFormat.value,
        ttsFile: ttsFile.value,
    });
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['tts-card']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-tab-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-dropzone']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-file-chip-remove']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-format-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-format-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-file-chip-name']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-card" },
    ...{ class: ({ 'is-loading': __VLS_ctx.isBusy }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-tabs" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.inputMode = 'text';
        } },
    ...{ class: "tts-tab-btn" },
    ...{ class: ({ active: __VLS_ctx.inputMode === 'text' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.inputMode = 'file';
        } },
    ...{ class: "tts-tab-btn" },
    ...{ class: ({ active: __VLS_ctx.inputMode === 'file' }) },
});
if (__VLS_ctx.inputMode === 'text') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tts-input-area" },
    });
    const __VLS_0 = {}.NInput;
    /** @type {[typeof __VLS_components.NInput, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        value: (__VLS_ctx.ttsText),
        type: "textarea",
        rows: (5),
        maxlength: (5000),
        placeholder: "在此输入要转换为语音的文字…",
        showCount: true,
    }));
    const __VLS_2 = __VLS_1({
        value: (__VLS_ctx.ttsText),
        type: "textarea",
        rows: (5),
        maxlength: (5000),
        placeholder: "在此输入要转换为语音的文字…",
        showCount: true,
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tts-file-area" },
    });
    if (!__VLS_ctx.ttsFile) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (__VLS_ctx.triggerTxtUpload) },
            ...{ onKeydown: (__VLS_ctx.triggerTxtUpload) },
            ...{ class: "tts-dropzone" },
            role: "button",
            tabindex: "0",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            ...{ class: "tts-dropzone-icon" },
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            'stroke-linecap': "round",
            'stroke-linejoin': "round",
            'stroke-width': "1.5",
            d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "tts-dropzone-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "tts-dropzone-hint" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tts-file-chip" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tts-file-chip-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            ...{ class: "tts-file-chip-icon" },
            fill: "none",
            stroke: "currentColor",
            viewBox: "0 0 24 24",
            'aria-hidden': "true",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            'stroke-linecap': "round",
            'stroke-linejoin': "round",
            'stroke-width': "1.5",
            d: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "tts-file-chip-name" },
        });
        (__VLS_ctx.ttsFile.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "tts-file-chip-size" },
        });
        (__VLS_ctx.formatFileSize(__VLS_ctx.ttsFile.size));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.clearTtsFile) },
            ...{ class: "tts-file-chip-remove" },
            'aria-label': "移除文件",
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleTxtFileChange) },
    ref: "txtInputRef",
    type: "file",
    accept: ".txt,text/plain",
    ...{ class: "hidden" },
});
/** @type {typeof __VLS_ctx.txtInputRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "tts-card-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-settings-grid" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-setting-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "tts-setting-label" },
});
const __VLS_4 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    value: (__VLS_ctx.ttsVoice),
    options: (__VLS_ctx.voiceOptions),
    placeholder: "选择声音",
    ...{ class: "tts-select" },
}));
const __VLS_6 = __VLS_5({
    value: (__VLS_ctx.ttsVoice),
    options: (__VLS_ctx.voiceOptions),
    placeholder: "选择声音",
    ...{ class: "tts-select" },
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-setting-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "tts-setting-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-format-toggle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.ttsFormat = 'mp3';
        } },
    ...{ class: "tts-format-btn" },
    ...{ class: ({ active: __VLS_ctx.ttsFormat === 'mp3' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.ttsFormat = 'wav';
        } },
    ...{ class: "tts-format-btn" },
    ...{ class: ({ active: __VLS_ctx.ttsFormat === 'wav' }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-settings-grid tts-settings-grid--sliders" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-setting-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-setting-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "tts-setting-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "tts-setting-value" },
});
(__VLS_ctx.ttsSpeed.toFixed(1));
const __VLS_8 = {}.NSlider;
/** @type {[typeof __VLS_components.NSlider, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    value: (__VLS_ctx.ttsSpeed),
    min: (0.5),
    max: (2.0),
    step: (0.1),
    marks: ({ 0.5: '0.5', 1.0: '1.0', 1.5: '1.5', 2.0: '2.0' }),
    ...{ class: "tts-slider" },
}));
const __VLS_10 = __VLS_9({
    value: (__VLS_ctx.ttsSpeed),
    min: (0.5),
    max: (2.0),
    step: (0.1),
    marks: ({ 0.5: '0.5', 1.0: '1.0', 1.5: '1.5', 2.0: '2.0' }),
    ...{ class: "tts-slider" },
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-setting-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tts-setting-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "tts-setting-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "tts-setting-value" },
});
(__VLS_ctx.ttsPitch > 0 ? '+' : '');
(__VLS_ctx.ttsPitch);
const __VLS_12 = {}.NSlider;
/** @type {[typeof __VLS_components.NSlider, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    value: (__VLS_ctx.ttsPitch),
    min: (-6),
    max: (6),
    step: (1),
    marks: ({ '-6': '-6', '0': '0', '6': '+6' }),
    ...{ class: "tts-slider" },
}));
const __VLS_14 = __VLS_13({
    value: (__VLS_ctx.ttsPitch),
    min: (-6),
    max: (6),
    step: (1),
    marks: ({ '-6': '-6', '0': '0', '6': '+6' }),
    ...{ class: "tts-slider" },
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
const __VLS_16 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    block: true,
    loading: (__VLS_ctx.isBusy),
    disabled: ((!__VLS_ctx.ttsText.trim() && !__VLS_ctx.ttsFile) || __VLS_ctx.isBusy),
    ...{ class: "tts-submit-btn" },
}));
const __VLS_18 = __VLS_17({
    ...{ 'onClick': {} },
    type: "primary",
    size: "large",
    block: true,
    loading: (__VLS_ctx.isBusy),
    disabled: ((!__VLS_ctx.ttsText.trim() && !__VLS_ctx.ttsFile) || __VLS_ctx.isBusy),
    ...{ class: "tts-submit-btn" },
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
let __VLS_20;
let __VLS_21;
let __VLS_22;
const __VLS_23 = {
    onClick: (__VLS_ctx.handleSubmit)
};
__VLS_19.slots.default;
if (!__VLS_ctx.isBusy) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
var __VLS_19;
/** @type {__VLS_StyleScopedClasses['tts-card']} */ ;
/** @type {__VLS_StyleScopedClasses['is-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-tabs']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-tab-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-tab-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-input-area']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-file-area']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-dropzone']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-dropzone-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-dropzone-title']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-dropzone-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-file-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-file-chip-info']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-file-chip-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-file-chip-name']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-file-chip-size']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-file-chip-remove']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-card']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-setting-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-setting-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-select']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-setting-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-setting-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-format-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-format-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-format-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-card']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-settings-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-settings-grid--sliders']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-setting-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-setting-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-setting-value']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-slider']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-setting-group']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-setting-row']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-setting-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-setting-value']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-slider']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-submit-btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NInput: NInput,
            NSelect: NSelect,
            NSlider: NSlider,
            formatFileSize: formatFileSize,
            ttsText: ttsText,
            ttsVoice: ttsVoice,
            ttsSpeed: ttsSpeed,
            ttsPitch: ttsPitch,
            ttsFormat: ttsFormat,
            ttsFile: ttsFile,
            inputMode: inputMode,
            txtInputRef: txtInputRef,
            voiceOptions: voiceOptions,
            triggerTxtUpload: triggerTxtUpload,
            handleTxtFileChange: handleTxtFileChange,
            clearTtsFile: clearTtsFile,
            handleSubmit: handleSubmit,
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
