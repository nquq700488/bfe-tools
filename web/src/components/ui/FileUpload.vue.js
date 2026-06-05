import { ref, computed } from 'vue';
import { validateFile, formatFileSize } from '@/lib/file-utils';
const props = withDefaults(defineProps(), {
    maxSize: 100 * 1024 * 1024,
    multiple: false,
    uploadStates: () => [],
});
const emit = defineEmits();
const isDragOver = ref(false);
let dragCounter = 0;
const sizeError = ref(null);
const formatErrors = ref([]);
const pendingFiles = ref([]);
function localValidate(file) {
    return validateFile(file, props.accept, props.maxSize);
}
const hasErrors = computed(() => {
    return sizeError.value !== null || formatErrors.value.length > 0;
});
function handleFiles(files) {
    sizeError.value = null;
    formatErrors.value = [];
    const fileArray = Array.from(files);
    const errors = [];
    for (const file of fileArray) {
        const error = localValidate(file);
        if (error)
            errors.push(error);
    }
    if (errors.length > 0)
        formatErrors.value = errors;
    pendingFiles.value = props.multiple ? fileArray : fileArray.slice(0, 1);
    const valid = fileArray.filter((f) => localValidate(f) === null);
    if (valid.length > 0) {
        emit('select', valid.slice(0, props.multiple ? undefined : 1));
    }
}
function handleDragEnter(e) {
    e.preventDefault();
    dragCounter++;
    isDragOver.value = true;
}
function handleDragLeave(e) {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
        isDragOver.value = false;
        dragCounter = 0;
    }
}
function handleDrop(e) {
    e.preventDefault();
    isDragOver.value = false;
    dragCounter = 0;
    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
}
function handleInputChange(e) {
    const input = e.target;
    if (input.files && input.files.length > 0) {
        handleFiles(input.files);
    }
    input.value = '';
}
function handleClickTrigger() {
    const input = document.getElementById('file-upload-input');
    input?.click();
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_withDefaultsArg = (function (t) { return t; })({
    maxSize: 100 * 1024 * 1024,
    multiple: false,
    uploadStates: () => [],
});
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "file-upload" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onDragenter: (__VLS_ctx.handleDragEnter) },
    ...{ onDragover: () => { } },
    ...{ onDragleave: (__VLS_ctx.handleDragLeave) },
    ...{ onDrop: (__VLS_ctx.handleDrop) },
    ...{ onClick: (__VLS_ctx.handleClickTrigger) },
    ...{ onKeydown: (__VLS_ctx.handleClickTrigger) },
    ...{ class: "drop-zone" },
    ...{ class: ({ 'drag-over': __VLS_ctx.isDragOver }) },
    role: "button",
    tabindex: "0",
    'aria-label': "上传文件区域，点击选择文件或拖拽文件到此处",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleInputChange) },
    id: "file-upload-input",
    type: "file",
    accept: (__VLS_ctx.accept),
    multiple: (__VLS_ctx.multiple),
    ...{ class: "sr-only" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex flex-col items-center gap-3 pointer-events-none" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    ...{ class: "w-10 h-10 text-primary-500" },
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    'aria-hidden': "true",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    'stroke-linecap': "round",
    'stroke-linejoin': "round",
    'stroke-width': "1.5",
    d: "M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-base font-semibold text-neutral-800" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "text-primary-600" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-xs text-neutral-400 mt-1.5" },
});
(__VLS_ctx.accept);
(__VLS_ctx.formatFileSize(__VLS_ctx.maxSize));
if (__VLS_ctx.hasErrors) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-3 space-y-1" },
    });
    for (const [err, idx] of __VLS_getVForSourceType((__VLS_ctx.formatErrors))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            key: (idx),
            ...{ class: "text-xs text-danger flex items-center gap-1" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            'aria-hidden': "true",
        });
        (err);
    }
}
if (__VLS_ctx.uploadStates.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-4 space-y-3" },
    });
    for (const [state] of __VLS_getVForSourceType((__VLS_ctx.uploadStates))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (state.fileId),
            ...{ class: "flex flex-col gap-2 p-3.5 bg-white rounded-2 border border-neutral-200 shadow-sm" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center gap-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-sm truncate flex-1 font-medium text-neutral-700" },
        });
        (state.fileName);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs text-neutral-400 flex-shrink-0" },
        });
        (__VLS_ctx.formatFileSize(state.loaded));
        (__VLS_ctx.formatFileSize(state.total));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs text-primary-600 font-semibold flex-shrink-0 w-10 text-right" },
        });
        (Math.round(state.progress));
        if (state.status === 'uploading') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.uploadStates.length > 0))
                            return;
                        if (!(state.status === 'uploading'))
                            return;
                        __VLS_ctx.emit('cancel', state.fileId);
                    } },
                ...{ class: "text-xs text-neutral-400 hover:text-danger transition-colors flex-shrink-0" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "h-1.5 bg-neutral-100 rounded-full overflow-hidden" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
            ...{ class: "h-full bg-primary-600 rounded-full transition-all duration-300" },
            ...{ style: ({ width: `${state.progress}%` }) },
        });
    }
}
/** @type {__VLS_StyleScopedClasses['file-upload']} */ ;
/** @type {__VLS_StyleScopedClasses['drop-zone']} */ ;
/** @type {__VLS_StyleScopedClasses['drag-over']} */ ;
/** @type {__VLS_StyleScopedClasses['sr-only']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-500']} */ ;
/** @type {__VLS_StyleScopedClasses['text-base']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-800']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-3']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-1']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-4']} */ ;
/** @type {__VLS_StyleScopedClasses['space-y-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-col']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['p-3.5']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-white']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2']} */ ;
/** @type {__VLS_StyleScopedClasses['border']} */ ;
/** @type {__VLS_StyleScopedClasses['border-neutral-200']} */ ;
/** @type {__VLS_StyleScopedClasses['shadow-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-1']} */ ;
/** @type {__VLS_StyleScopedClasses['font-medium']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['text-right']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-400']} */ ;
/** @type {__VLS_StyleScopedClasses['hover:text-danger']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-colors']} */ ;
/** @type {__VLS_StyleScopedClasses['flex-shrink-0']} */ ;
/** @type {__VLS_StyleScopedClasses['h-1.5']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-neutral-100']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['overflow-hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['h-full']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-600']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-full']} */ ;
/** @type {__VLS_StyleScopedClasses['transition-all']} */ ;
/** @type {__VLS_StyleScopedClasses['duration-300']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            formatFileSize: formatFileSize,
            emit: emit,
            isDragOver: isDragOver,
            formatErrors: formatErrors,
            hasErrors: hasErrors,
            handleDragEnter: handleDragEnter,
            handleDragLeave: handleDragLeave,
            handleDrop: handleDrop,
            handleInputChange: handleInputChange,
            handleClickTrigger: handleClickTrigger,
        };
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
    props: {},
});
; /* PartiallyEnd: #4569/main.vue */
