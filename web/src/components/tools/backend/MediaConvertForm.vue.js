import { computed, ref, watch } from 'vue';
import { INPUT_CATEGORY_MAP } from '@/lib/constants';
import { validateFile, formatFileSize } from '@/lib/file-utils';
const props = defineProps();
const emit = defineEmits();
const selectedFile = ref(null);
const detectedInputCategory = ref(null);
const convertFormat = ref(props.tool.convertOptions?.defaultFormat || 'mp4');
const fileError = ref(null);
/** 根据输入类别过滤的可用输出格式 */
const availableConvertFormats = computed(() => {
    const formats = props.tool.convertOptions?.formats || [];
    if (!detectedInputCategory.value)
        return formats;
    return formats.filter((f) => f.category === detectedInputCategory.value);
});
/** 是否显示格式选择器（已选择文件后） */
const showFormatSelector = computed(() => selectedFile.value !== null);
watch(() => props.tool.convertOptions?.defaultFormat, (fmt) => {
    if (fmt)
        convertFormat.value = fmt;
});
/** 文件拖拽区点击 */
const fileInputRef = ref(null);
function triggerFileInput() { fileInputRef.value?.click(); }
/** 文件选择 */
function handleFileChange(e) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file)
        return;
    selectFile(file);
    input.value = '';
}
/** 拖拽事件 */
function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file)
        selectFile(file);
}
function handleDragOver(e) { e.preventDefault(); }
/** 选择文件：校验 → 检测类别 → 自动匹配格式 */
function selectFile(file) {
    fileError.value = null;
    const err = validateFile(file, props.tool.accept, props.tool.maxSize);
    if (err) {
        fileError.value = err;
        return;
    }
    selectedFile.value = file;
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    detectedInputCategory.value = INPUT_CATEGORY_MAP[ext] || null;
    // 当前格式不在可用列表中时，自动切换到第一个
    const available = availableConvertFormats.value;
    if (available.length > 0 && !available.some((f) => f.value === convertFormat.value)) {
        convertFormat.value = available[0].value;
    }
}
/** 清除已选文件 */
function clearFile() {
    selectedFile.value = null;
    detectedInputCategory.value = null;
    fileError.value = null;
}
/** 确认转换 */
function handleConvert() {
    if (!selectedFile.value)
        return;
    emit('convert', { file: selectedFile.value, targetFormat: convertFormat.value });
}
/** 类别图标映射 */
const categoryIcon = computed(() => {
    if (!detectedInputCategory.value)
        return '';
    const map = { image: '🖼️', video: '🎬', audio: '🎵' };
    return map[detectedInputCategory.value] || '';
});
const categoryLabel = computed(() => {
    if (!detectedInputCategory.value)
        return '';
    const map = { image: '图片', video: '视频', audio: '音频' };
    return map[detectedInputCategory.value] || '';
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['mcf-dropzone']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-file-change']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-file-change']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-submit-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-format-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-format-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-format-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['convert-format-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-format-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-file-name']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-dropzone']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
if (!__VLS_ctx.showFormatSelector) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.triggerFileInput) },
        ...{ onKeydown: (__VLS_ctx.triggerFileInput) },
        ...{ onDrop: (__VLS_ctx.handleDrop) },
        ...{ onDragover: (__VLS_ctx.handleDragOver) },
        ...{ class: "mcf-dropzone" },
        role: "button",
        tabindex: "0",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ class: "mcf-dropzone-icon" },
        fill: "none",
        stroke: "currentColor",
        viewBox: "0 0 24 24",
        'aria-hidden': "true",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        'stroke-linecap': "round",
        'stroke-linejoin': "round",
        'stroke-width': "1.5",
        d: "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mcf-dropzone-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mcf-dropzone-hint" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleFileChange) },
    ref: "fileInputRef",
    type: "file",
    accept: (__VLS_ctx.tool.accept),
    ...{ class: "hidden" },
});
/** @type {typeof __VLS_ctx.fileInputRef} */ ;
if (__VLS_ctx.fileError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mcf-error" },
    });
    (__VLS_ctx.fileError);
}
if (__VLS_ctx.showFormatSelector) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mcf-config-area" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tts-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mcf-file-row" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mcf-file-info" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ class: "mcf-file-icon" },
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
        ...{ class: "mcf-file-name" },
    });
    (__VLS_ctx.selectedFile?.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "mcf-file-size" },
    });
    (__VLS_ctx.selectedFile ? __VLS_ctx.formatFileSize(__VLS_ctx.selectedFile.size) : '');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearFile) },
        ...{ class: "mcf-file-change" },
        disabled: (__VLS_ctx.isBusy),
        'aria-label': "更换文件",
    });
    if (!__VLS_ctx.detectedInputCategory) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tts-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "mcf-error" },
        });
        (__VLS_ctx.selectedFile?.name.split('.').pop()?.toLowerCase());
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tts-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "tts-card-title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "convert-category-badge" },
        });
        (__VLS_ctx.categoryIcon);
        (__VLS_ctx.categoryLabel);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tts-format-toggle convert-format-grid" },
        });
        for (const [fmt] of __VLS_getVForSourceType((__VLS_ctx.availableConvertFormats))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.showFormatSelector))
                            return;
                        if (!!(!__VLS_ctx.detectedInputCategory))
                            return;
                        __VLS_ctx.convertFormat = fmt.value;
                    } },
                key: (fmt.value),
                ...{ class: "tts-format-btn" },
                ...{ class: ({ active: __VLS_ctx.convertFormat === fmt.value }) },
                disabled: (__VLS_ctx.isBusy),
            });
            (fmt.label);
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (__VLS_ctx.handleConvert) },
            ...{ class: "mcf-submit-btn" },
            disabled: (!__VLS_ctx.selectedFile || __VLS_ctx.isBusy),
        });
        if (!__VLS_ctx.isBusy) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        }
    }
}
/** @type {__VLS_StyleScopedClasses['mcf-dropzone']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-dropzone-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-dropzone-title']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-dropzone-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-error']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-config-area']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-file-row']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-file-info']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-file-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-file-name']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-file-size']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-file-change']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-card']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-error']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-card']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-card-title']} */ ;
/** @type {__VLS_StyleScopedClasses['convert-category-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-format-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['convert-format-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['tts-format-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['mcf-submit-btn']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            formatFileSize: formatFileSize,
            selectedFile: selectedFile,
            detectedInputCategory: detectedInputCategory,
            convertFormat: convertFormat,
            fileError: fileError,
            availableConvertFormats: availableConvertFormats,
            showFormatSelector: showFormatSelector,
            fileInputRef: fileInputRef,
            triggerFileInput: triggerFileInput,
            handleFileChange: handleFileChange,
            handleDrop: handleDrop,
            handleDragOver: handleDragOver,
            clearFile: clearFile,
            handleConvert: handleConvert,
            categoryIcon: categoryIcon,
            categoryLabel: categoryLabel,
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
