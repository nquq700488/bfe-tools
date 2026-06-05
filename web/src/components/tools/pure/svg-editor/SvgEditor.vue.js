import { ref, watch } from 'vue';
import { NButton, NInput, NAlert, NSpace } from 'naive-ui';
import ToolHeader from '@/components/tools/shared/ToolHeader.vue';
import CopyButton from '@/components/tools/shared/CopyButton.vue';
import { sanitizeSvg } from '@/lib/security/sanitizeSvg';
/** 默认 SVG 示例 */
const DEFAULT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
  <rect x="10" y="10" width="180" height="80" rx="12" fill="#4F46E5" />
  <text x="100" y="58" text-anchor="middle" fill="white" font-size="20" font-family="Arial">Hello SVG</text>
</svg>`;
const RECT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect x="30" y="40" width="140" height="120" rx="8" fill="#6366F1" />
</svg>`;
const CIRCLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <circle cx="100" cy="100" r="70" fill="#EC4899" />
  <circle cx="100" cy="100" r="50" fill="#F472B6" />
  <circle cx="100" cy="100" r="30" fill="#F9A8D4" />
</svg>`;
const TRIANGLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <polygon points="100,20 180,170 20,170" fill="#10B981" />
</svg>`;
const STAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <polygon points="100,10 122,75 190,75 135,115 155,180 100,140 45,180 65,115 10,75 78,75" fill="#F59E0B" />
</svg>`;
const GRADIENT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6366F1" />
      <stop offset="100%" stop-color="#EC4899" />
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="300" height="200" rx="16" fill="url(#g)" />
  <text x="150" y="108" text-anchor="middle" fill="white" font-size="28" font-family="Arial" font-weight="bold">Gradient</text>
</svg>`;
const __VLS_props = defineProps();
const svgCode = ref(DEFAULT_SVG);
const sanitized = ref('');
const previewKey = ref(0);
const svgError = ref(null);
const PRESETS = [
    { label: '矩形', value: RECT_SVG },
    { label: '圆形', value: CIRCLE_SVG },
    { label: '三角形', value: TRIANGLE_SVG },
    { label: '星形', value: STAR_SVG },
    { label: '渐变卡片', value: GRADIENT_SVG },
];
// ---- 实时处理 ----
let debounceTimer = null;
function processSvg() {
    if (debounceTimer)
        clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const code = svgCode.value.trim();
        if (!code) {
            sanitized.value = '';
            svgError.value = null;
            return;
        }
        // 检查是否包含 <svg> 标签
        if (!/<svg\b/i.test(code)) {
            svgError.value = '未检测到有效的 <svg> 标签';
            sanitized.value = '';
            return;
        }
        try {
            const cleaned = sanitizeSvg(code);
            sanitized.value = cleaned;
            svgError.value = null;
            previewKey.value++;
        }
        catch (e) {
            svgError.value = `SVG 解析错误：${e instanceof Error ? e.message : '未知错误'}`;
            sanitized.value = '';
        }
    }, 400);
}
watch(svgCode, processSvg, { immediate: true });
// ---- 预设 ----
function applyPreset(svg) {
    svgCode.value = svg;
}
// ---- 导出 ----
function exportSvgFile() {
    if (!sanitized.value)
        return;
    const blob = new Blob([sanitized.value], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'image.svg';
    a.click();
    URL.revokeObjectURL(url);
}
function exportPng() {
    // 通过 canvas 将 SVG 渲染为 PNG
    const svgBlob = new Blob([sanitized.value], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 400;
        canvas.height = img.naturalHeight || 400;
        const ctx = canvas.getContext('2d');
        if (!ctx)
            return;
        // 白色背景
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
            if (!blob)
                return;
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = 'image.png';
            a.click();
            URL.revokeObjectURL(pngUrl);
        }, 'image/png');
        URL.revokeObjectURL(url);
    };
    img.onerror = () => {
        svgError.value = 'SVG 无法渲染为 PNG（可能包含无效内容）';
        URL.revokeObjectURL(url);
    };
    img.src = url;
}
// ---- iframe 渲染通过 template 中的 :srcdoc="sanitized" + sandbox="" 安全注入 ----
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['se-layout']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "svg-editor" },
});
/** @type {[typeof ToolHeader, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ToolHeader, new ToolHeader({
    tool: (__VLS_ctx.tool),
}));
const __VLS_1 = __VLS_0({
    tool: (__VLS_ctx.tool),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "se-presets mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "se-presets-label" },
});
const __VLS_3 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.NSpace, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({}));
const __VLS_5 = __VLS_4({}, ...__VLS_functionalComponentArgsRest(__VLS_4));
__VLS_6.slots.default;
for (const [preset] of __VLS_getVForSourceType((__VLS_ctx.PRESETS))) {
    const __VLS_7 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        ...{ 'onClick': {} },
        key: (preset.label),
        size: "tiny",
        type: (__VLS_ctx.svgCode === preset.value ? 'primary' : 'default'),
    }));
    const __VLS_9 = __VLS_8({
        ...{ 'onClick': {} },
        key: (preset.label),
        size: "tiny",
        type: (__VLS_ctx.svgCode === preset.value ? 'primary' : 'default'),
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    let __VLS_11;
    let __VLS_12;
    let __VLS_13;
    const __VLS_14 = {
        onClick: (...[$event]) => {
            __VLS_ctx.applyPreset(preset.value);
        }
    };
    __VLS_10.slots.default;
    (preset.label);
    var __VLS_10;
}
var __VLS_6;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "se-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "se-col" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "se-col-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "se-col-label" },
});
const __VLS_15 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.NSpace, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    size: (4),
}));
const __VLS_17 = __VLS_16({
    size: (4),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_18.slots.default;
/** @type {[typeof CopyButton, ]} */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(CopyButton, new CopyButton({
    content: (__VLS_ctx.svgCode),
}));
const __VLS_20 = __VLS_19({
    content: (__VLS_ctx.svgCode),
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
const __VLS_22 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
    ...{ 'onClick': {} },
    text: true,
    size: "tiny",
    disabled: (!__VLS_ctx.sanitized),
}));
const __VLS_24 = __VLS_23({
    ...{ 'onClick': {} },
    text: true,
    size: "tiny",
    disabled: (!__VLS_ctx.sanitized),
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
let __VLS_26;
let __VLS_27;
let __VLS_28;
const __VLS_29 = {
    onClick: (__VLS_ctx.exportSvgFile)
};
__VLS_25.slots.default;
var __VLS_25;
const __VLS_30 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
    ...{ 'onClick': {} },
    text: true,
    size: "tiny",
    disabled: (!__VLS_ctx.sanitized),
}));
const __VLS_32 = __VLS_31({
    ...{ 'onClick': {} },
    text: true,
    size: "tiny",
    disabled: (!__VLS_ctx.sanitized),
}, ...__VLS_functionalComponentArgsRest(__VLS_31));
let __VLS_34;
let __VLS_35;
let __VLS_36;
const __VLS_37 = {
    onClick: (__VLS_ctx.exportPng)
};
__VLS_33.slots.default;
var __VLS_33;
var __VLS_18;
const __VLS_38 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, ]} */ ;
// @ts-ignore
const __VLS_39 = __VLS_asFunctionalComponent(__VLS_38, new __VLS_38({
    value: (__VLS_ctx.svgCode),
    type: "textarea",
    rows: (18),
    placeholder: "输入 SVG 代码...",
    ...{ class: "se-textarea" },
}));
const __VLS_40 = __VLS_39({
    value: (__VLS_ctx.svgCode),
    type: "textarea",
    rows: (18),
    placeholder: "输入 SVG 代码...",
    ...{ class: "se-textarea" },
}, ...__VLS_functionalComponentArgsRest(__VLS_39));
if (__VLS_ctx.svgError) {
    const __VLS_42 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
    // @ts-ignore
    const __VLS_43 = __VLS_asFunctionalComponent(__VLS_42, new __VLS_42({
        type: "warning",
        bordered: (false),
        ...{ class: "mt-2" },
    }));
    const __VLS_44 = __VLS_43({
        type: "warning",
        bordered: (false),
        ...{ class: "mt-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_43));
    __VLS_45.slots.default;
    (__VLS_ctx.svgError);
    var __VLS_45;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "se-col" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "se-col-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "se-col-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "se-col-badge" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "se-preview-wrapper" },
});
if (__VLS_ctx.sanitized) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.iframe)({
        ...{ class: "se-iframe" },
        sandbox: "",
        srcdoc: (__VLS_ctx.sanitized),
        title: "SVG 预览",
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "se-preview-empty" },
    });
    if (!__VLS_ctx.svgCode.trim()) {
    }
    else if (__VLS_ctx.svgError) {
    }
}
/** @type {__VLS_StyleScopedClasses['svg-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['se-presets']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['se-presets-label']} */ ;
/** @type {__VLS_StyleScopedClasses['se-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['se-col']} */ ;
/** @type {__VLS_StyleScopedClasses['se-col-header']} */ ;
/** @type {__VLS_StyleScopedClasses['se-col-label']} */ ;
/** @type {__VLS_StyleScopedClasses['se-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['se-col']} */ ;
/** @type {__VLS_StyleScopedClasses['se-col-header']} */ ;
/** @type {__VLS_StyleScopedClasses['se-col-label']} */ ;
/** @type {__VLS_StyleScopedClasses['se-col-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['se-preview-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['se-iframe']} */ ;
/** @type {__VLS_StyleScopedClasses['se-preview-empty']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NInput: NInput,
            NAlert: NAlert,
            NSpace: NSpace,
            ToolHeader: ToolHeader,
            CopyButton: CopyButton,
            svgCode: svgCode,
            sanitized: sanitized,
            svgError: svgError,
            PRESETS: PRESETS,
            applyPreset: applyPreset,
            exportSvgFile: exportSvgFile,
            exportPng: exportPng,
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
