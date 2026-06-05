import { ref, computed, onUnmounted } from 'vue';
import { NButton, NSlider, NSelect, NAlert, NInputNumber } from 'naive-ui';
import imageCompression from 'browser-image-compression';
import { formatFileSize } from '@/lib/file-utils';
import ToolHeader from '@/components/tools/shared/ToolHeader.vue';
const __VLS_props = defineProps();
const LARGE_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const formatOptions = [
    { label: 'PNG', value: 'image/png' },
    { label: 'JPEG', value: 'image/jpeg' },
    { label: 'WebP', value: 'image/webp' },
];
// ---- 文件状态 ----
const originalFile = ref(null);
const originalUrl = ref(null);
const compressedUrl = ref(null);
const compressedBlob = ref(null);
const isProcessing = ref(false);
const errorMsg = ref(null);
const isLarge = computed(() => (originalFile.value?.size ?? 0) > LARGE_IMAGE_SIZE);
// ---- 压缩参数 ----
const quality = ref(80);
const outputFormat = ref('image/jpeg');
const maxWidth = ref(null);
const maxHeight = ref(null);
// ---- 计算结果 ----
const compressedSize = ref(0);
const originalSize = computed(() => originalFile.value?.size ?? 0);
const compressionRatio = computed(() => {
    if (originalSize.value === 0 || compressedSize.value === 0)
        return 0;
    return Math.round((1 - compressedSize.value / originalSize.value) * 100);
});
const compressedFileName = computed(() => {
    if (!originalFile.value)
        return 'compressed';
    const name = originalFile.value.name.replace(/\.[^.]+$/, '');
    const ext = outputFormat.value.split('/')[1];
    return `${name}.${ext}`;
});
const fileInputRef = ref(null);
function triggerFileInput() {
    fileInputRef.value?.click();
}
function handleFileChange(e) {
    const input = e.target;
    const file = input.files?.[0];
    if (file)
        selectFile(file);
    input.value = '';
}
function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file)
        selectFile(file);
}
function handleDragOver(e) {
    e.preventDefault();
}
function selectFile(file) {
    errorMsg.value = null;
    if (!ALLOWED_TYPES.includes(file.type)) {
        errorMsg.value = '不支持的文件格式，请选择 PNG、JPEG 或 WebP 图片';
        return;
    }
    cleanup();
    originalFile.value = file;
    originalUrl.value = URL.createObjectURL(file);
}
async function handleCompress() {
    if (!originalFile.value)
        return;
    errorMsg.value = null;
    isProcessing.value = true;
    try {
        const options = {
            maxSizeMB: originalFile.value.size / 1024 / 1024,
            maxWidthOrHeight: 4096,
            useWebWorker: true,
            fileType: outputFormat.value,
            initialQuality: quality.value / 100,
        };
        if (maxWidth.value)
            options.maxWidthOrHeight = Math.max(maxWidth.value, maxHeight.value ?? 0);
        else if (maxHeight.value)
            options.maxWidthOrHeight = maxHeight.value;
        const result = await imageCompression(originalFile.value, options);
        compressedBlob.value = result;
        compressedSize.value = result.size;
        // 释放旧 URL
        if (compressedUrl.value)
            URL.revokeObjectURL(compressedUrl.value);
        compressedUrl.value = URL.createObjectURL(result);
    }
    catch (e) {
        errorMsg.value = `压缩失败：${e instanceof Error ? e.message : '未知错误'}`;
    }
    finally {
        isProcessing.value = false;
    }
}
function handleDownload() {
    if (!compressedBlob.value)
        return;
    const url = URL.createObjectURL(compressedBlob.value);
    const a = document.createElement('a');
    a.href = url;
    a.download = compressedFileName.value;
    a.click();
    URL.revokeObjectURL(url);
}
function cleanup() {
    if (originalUrl.value) {
        URL.revokeObjectURL(originalUrl.value);
        originalUrl.value = null;
    }
    if (compressedUrl.value) {
        URL.revokeObjectURL(compressedUrl.value);
        compressedUrl.value = null;
    }
    originalFile.value = null;
    compressedBlob.value = null;
    compressedSize.value = 0;
    errorMsg.value = null;
}
onUnmounted(cleanup);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['ic-dropzone']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-param-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-param']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-compare']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "image-compression" },
});
/** @type {[typeof ToolHeader, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ToolHeader, new ToolHeader({
    tool: (__VLS_ctx.tool),
}));
const __VLS_1 = __VLS_0({
    tool: (__VLS_ctx.tool),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
if (!__VLS_ctx.originalFile) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.triggerFileInput) },
        ...{ onKeydown: (__VLS_ctx.triggerFileInput) },
        ...{ onDrop: (__VLS_ctx.handleDrop) },
        ...{ onDragover: (__VLS_ctx.handleDragOver) },
        ...{ class: "ic-dropzone" },
        role: "button",
        tabindex: "0",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ class: "ic-dropzone-icon" },
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
        'stroke-width': "1.5",
        d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "ic-dropzone-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "ic-dropzone-hint" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleFileChange) },
    ref: "fileInputRef",
    type: "file",
    accept: (__VLS_ctx.ALLOWED_TYPES.join(',')),
    ...{ class: "hidden" },
});
/** @type {typeof __VLS_ctx.fileInputRef} */ ;
if (__VLS_ctx.isLarge) {
    const __VLS_3 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
        type: "warning",
        bordered: (false),
        ...{ class: "mb-4" },
    }));
    const __VLS_5 = __VLS_4({
        type: "warning",
        bordered: (false),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
    __VLS_6.slots.default;
    var __VLS_6;
}
if (__VLS_ctx.errorMsg) {
    const __VLS_7 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        type: "error",
        bordered: (false),
        ...{ class: "mb-4" },
    }));
    const __VLS_9 = __VLS_8({
        type: "error",
        bordered: (false),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    __VLS_10.slots.default;
    (__VLS_ctx.errorMsg);
    var __VLS_10;
}
if (__VLS_ctx.originalFile) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ic-params" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ic-param" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "ic-param-label" },
    });
    (__VLS_ctx.quality);
    const __VLS_11 = {}.NSlider;
    /** @type {[typeof __VLS_components.NSlider, ]} */ ;
    // @ts-ignore
    const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
        value: (__VLS_ctx.quality),
        min: (1),
        max: (100),
        step: (1),
    }));
    const __VLS_13 = __VLS_12({
        value: (__VLS_ctx.quality),
        min: (1),
        max: (100),
        step: (1),
    }, ...__VLS_functionalComponentArgsRest(__VLS_12));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ic-param-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ic-param" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "ic-param-label" },
    });
    const __VLS_15 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, ]} */ ;
    // @ts-ignore
    const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
        value: (__VLS_ctx.outputFormat),
        options: (__VLS_ctx.formatOptions),
        size: "small",
    }));
    const __VLS_17 = __VLS_16({
        value: (__VLS_ctx.outputFormat),
        options: (__VLS_ctx.formatOptions),
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_16));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ic-param" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "ic-param-label" },
    });
    const __VLS_19 = {}.NInputNumber;
    /** @type {[typeof __VLS_components.NInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
        value: (__VLS_ctx.maxWidth),
        min: (1),
        max: (8192),
        size: "small",
        placeholder: "不限",
    }));
    const __VLS_21 = __VLS_20({
        value: (__VLS_ctx.maxWidth),
        min: (1),
        max: (8192),
        size: "small",
        placeholder: "不限",
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ic-param" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "ic-param-label" },
    });
    const __VLS_23 = {}.NInputNumber;
    /** @type {[typeof __VLS_components.NInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
        value: (__VLS_ctx.maxHeight),
        min: (1),
        max: (8192),
        size: "small",
        placeholder: "不限",
    }));
    const __VLS_25 = __VLS_24({
        value: (__VLS_ctx.maxHeight),
        min: (1),
        max: (8192),
        size: "small",
        placeholder: "不限",
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ic-actions mt-3" },
    });
    const __VLS_27 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.isProcessing),
    }));
    const __VLS_29 = __VLS_28({
        ...{ 'onClick': {} },
        type: "primary",
        loading: (__VLS_ctx.isProcessing),
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    let __VLS_31;
    let __VLS_32;
    let __VLS_33;
    const __VLS_34 = {
        onClick: (__VLS_ctx.handleCompress)
    };
    __VLS_30.slots.default;
    var __VLS_30;
    const __VLS_35 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
        ...{ 'onClick': {} },
        size: "small",
    }));
    const __VLS_37 = __VLS_36({
        ...{ 'onClick': {} },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    let __VLS_39;
    let __VLS_40;
    let __VLS_41;
    const __VLS_42 = {
        onClick: (__VLS_ctx.cleanup)
    };
    __VLS_38.slots.default;
    var __VLS_38;
}
if (__VLS_ctx.compressedUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ic-compare" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ic-compare-col" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "ic-compare-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.originalUrl),
        ...{ class: "ic-compare-img" },
        alt: "原图",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "ic-compare-size" },
    });
    (__VLS_ctx.formatFileSize(__VLS_ctx.originalSize));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ic-compare-col" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "ic-compare-label" },
    });
    (__VLS_ctx.compressionRatio);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.compressedUrl),
        ...{ class: "ic-compare-img" },
        alt: "压缩后",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "ic-compare-size" },
    });
    (__VLS_ctx.formatFileSize(__VLS_ctx.compressedSize));
    const __VLS_43 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        ...{ class: "mt-2" },
    }));
    const __VLS_45 = __VLS_44({
        ...{ 'onClick': {} },
        size: "small",
        type: "primary",
        ...{ class: "mt-2" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    let __VLS_47;
    let __VLS_48;
    let __VLS_49;
    const __VLS_50 = {
        onClick: (__VLS_ctx.handleDownload)
    };
    __VLS_46.slots.default;
    (__VLS_ctx.compressedFileName);
    var __VLS_46;
}
if (__VLS_ctx.originalFile && !__VLS_ctx.compressedUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "ic-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.originalUrl),
        ...{ class: "ic-preview-img" },
        alt: "原图预览",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "ic-preview-size" },
    });
    (__VLS_ctx.originalFile.name);
    (__VLS_ctx.formatFileSize(__VLS_ctx.originalSize));
}
/** @type {__VLS_StyleScopedClasses['image-compression']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-dropzone']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-dropzone-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-dropzone-title']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-dropzone-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-params']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-param']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-param-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-param-row']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-param']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-param-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-param']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-param-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-param']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-param-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-compare']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-compare-col']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-compare-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-compare-img']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-compare-size']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-compare-col']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-compare-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-compare-img']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-compare-size']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-preview-img']} */ ;
/** @type {__VLS_StyleScopedClasses['ic-preview-size']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NSlider: NSlider,
            NSelect: NSelect,
            NAlert: NAlert,
            NInputNumber: NInputNumber,
            formatFileSize: formatFileSize,
            ToolHeader: ToolHeader,
            ALLOWED_TYPES: ALLOWED_TYPES,
            formatOptions: formatOptions,
            originalFile: originalFile,
            originalUrl: originalUrl,
            compressedUrl: compressedUrl,
            isProcessing: isProcessing,
            errorMsg: errorMsg,
            isLarge: isLarge,
            quality: quality,
            outputFormat: outputFormat,
            maxWidth: maxWidth,
            maxHeight: maxHeight,
            compressedSize: compressedSize,
            originalSize: originalSize,
            compressionRatio: compressionRatio,
            compressedFileName: compressedFileName,
            fileInputRef: fileInputRef,
            triggerFileInput: triggerFileInput,
            handleFileChange: handleFileChange,
            handleDrop: handleDrop,
            handleDragOver: handleDragOver,
            handleCompress: handleCompress,
            handleDownload: handleDownload,
            cleanup: cleanup,
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
