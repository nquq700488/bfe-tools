import { ref, nextTick, computed } from 'vue';
import { NButton } from 'naive-ui';
import { formatFileSize } from '@/lib/file-utils';
const __VLS_props = defineProps();
const emit = defineEmits();
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/bmp'];
const selectedFile = ref(null);
const fileError = ref(null);
const isLoading = ref(false);
const imageLoaded = ref(false);
const canvasRef = ref(null);
let originalImage = null;
let displayW = 0;
let displayH = 0;
let naturalW = 0;
let naturalH = 0;
const selX = ref(0);
const selY = ref(0);
const selW = ref(0);
const selH = ref(0);
const isDrawing = ref(false);
const hasSelection = ref(false);
/** 选区面积占图像面积的比例（0-1） */
const selectionRatio = computed(() => {
    if (!naturalW || !naturalH || !selW.value || !selH.value)
        return 0;
    const selArea = (selW.value * naturalW / displayW) * (selH.value * naturalH / displayH);
    const imgArea = naturalW * naturalH;
    return Math.min(selArea / imgArea, 1);
});
const isSelectionTooLarge = computed(() => selectionRatio.value > 0.7);
function triggerFileInput() {
    document.getElementById('wr-file-input')?.click();
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
function handleDragOver(e) { e.preventDefault(); }
function selectFile(file) {
    fileError.value = null;
    if (!ALLOWED_TYPES.includes(file.type)) {
        fileError.value = '不支持的文件格式，请选择 PNG、JPEG、WebP 或 BMP 图片';
        return;
    }
    selectedFile.value = file;
    hasSelection.value = false;
    selX.value = selY.value = selW.value = selH.value = 0;
    imageLoaded.value = false;
    isLoading.value = true;
    const img = new Image();
    img.onload = async () => {
        originalImage = img;
        naturalW = img.naturalWidth;
        naturalH = img.naturalHeight;
        imageLoaded.value = true;
        isLoading.value = false;
        await nextTick();
        const canvas = canvasRef.value;
        if (!canvas)
            return;
        displayW = naturalW;
        displayH = naturalH;
        canvas.width = displayW;
        canvas.height = displayH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, displayW, displayH);
        }
    };
    img.onerror = () => {
        isLoading.value = false;
        fileError.value = '图片加载失败';
    };
    img.src = URL.createObjectURL(file);
}
// ---- Canvas 鼠标交互 ----
function canvasPos(e) {
    const canvas = canvasRef.value;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
    };
}
let drawStartX = 0;
let drawStartY = 0;
function handleMouseDown(e) {
    if (!imageLoaded.value)
        return;
    const pos = canvasPos(e);
    drawStartX = pos.x;
    drawStartY = pos.y;
    isDrawing.value = true;
    hasSelection.value = false;
}
function handleMouseMove(e) {
    if (!isDrawing.value)
        return;
    const pos = canvasPos(e);
    selX.value = Math.min(drawStartX, pos.x);
    selY.value = Math.min(drawStartY, pos.y);
    selW.value = Math.abs(pos.x - drawStartX);
    selH.value = Math.abs(pos.y - drawStartY);
    drawRect();
}
function handleMouseUp() {
    if (!isDrawing.value)
        return;
    isDrawing.value = false;
    if (selW.value >= 5 && selH.value >= 5) {
        hasSelection.value = true;
        drawRect();
    }
    else {
        selW.value = selH.value = 0;
        drawRect();
    }
}
function drawRect() {
    const canvas = canvasRef.value;
    if (!canvas || !originalImage)
        return;
    const ctx = canvas.getContext('2d');
    if (!ctx)
        return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0, displayW, displayH);
    if (selW.value > 0 && selH.value > 0) {
        ctx.strokeStyle = '#EF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 3]);
        ctx.strokeRect(selX.value, selY.value, selW.value, selH.value);
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(selX.value, selY.value, selW.value, selH.value);
    }
}
function handleRemove() {
    if (!selectedFile.value || selW.value < 5 || selH.value < 5)
        return;
    const sx = naturalW / displayW;
    const sy = naturalH / displayH;
    emit('remove', {
        file: selectedFile.value,
        x: Math.round(selX.value * sx),
        y: Math.round(selY.value * sy),
        w: Math.round(selW.value * sx),
        h: Math.round(selH.value * sy),
    });
}
function clearSelection() {
    hasSelection.value = false;
    isDrawing.value = false;
    selX.value = selY.value = selW.value = selH.value = 0;
    drawRect();
}
function reset() {
    selectedFile.value = null;
    originalImage = null;
    imageLoaded.value = false;
    hasSelection.value = false;
    isDrawing.value = false;
    fileError.value = null;
    selX.value = selY.value = selW.value = selH.value = 0;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['wr-dropzone']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "wr-form" },
});
if (!__VLS_ctx.selectedFile) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.triggerFileInput) },
        ...{ onDrop: (__VLS_ctx.handleDrop) },
        ...{ onDragover: (__VLS_ctx.handleDragOver) },
        ...{ class: "wr-dropzone" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "wr-dropzone-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "wr-dropzone-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "wr-dropzone-hint" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleFileChange) },
    id: "wr-file-input",
    type: "file",
    accept: (__VLS_ctx.ALLOWED_TYPES.join(',')),
    ...{ class: "hidden" },
});
if (__VLS_ctx.fileError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "wr-error" },
    });
    (__VLS_ctx.fileError);
}
if (__VLS_ctx.isLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "wr-loading" },
    });
}
if (__VLS_ctx.selectedFile && !__VLS_ctx.isLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "wr-editor" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "wr-hint" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "wr-canvas-border" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.canvas)({
        ...{ onMousedown: (__VLS_ctx.handleMouseDown) },
        ...{ onMousemove: (__VLS_ctx.handleMouseMove) },
        ...{ onMouseup: (__VLS_ctx.handleMouseUp) },
        ...{ onMouseleave: (__VLS_ctx.handleMouseUp) },
        ref: "canvasRef",
        ...{ class: "wr-canvas" },
    });
    /** @type {typeof __VLS_ctx.canvasRef} */ ;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "wr-meta" },
    });
    (__VLS_ctx.selectedFile.name);
    (__VLS_ctx.formatFileSize(__VLS_ctx.selectedFile.size));
    if (__VLS_ctx.hasSelection) {
        (Math.round(__VLS_ctx.selW * __VLS_ctx.naturalW / __VLS_ctx.displayW));
        (Math.round(__VLS_ctx.selH * __VLS_ctx.naturalH / __VLS_ctx.displayH));
        ((__VLS_ctx.selectionRatio * 100).toFixed(1));
    }
    if (__VLS_ctx.hasSelection && __VLS_ctx.isSelectionTooLarge) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "wr-warning" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "wr-btns" },
    });
    const __VLS_0 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        ...{ 'onClick': {} },
        type: "error",
        disabled: (!__VLS_ctx.hasSelection || __VLS_ctx.isBusy || __VLS_ctx.isSelectionTooLarge),
    }));
    const __VLS_2 = __VLS_1({
        ...{ 'onClick': {} },
        type: "error",
        disabled: (!__VLS_ctx.hasSelection || __VLS_ctx.isBusy || __VLS_ctx.isSelectionTooLarge),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
    let __VLS_4;
    let __VLS_5;
    let __VLS_6;
    const __VLS_7 = {
        onClick: (__VLS_ctx.handleRemove)
    };
    __VLS_3.slots.default;
    var __VLS_3;
    const __VLS_8 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        ...{ 'onClick': {} },
        disabled: (__VLS_ctx.isBusy || !__VLS_ctx.hasSelection),
    }));
    const __VLS_10 = __VLS_9({
        ...{ 'onClick': {} },
        disabled: (__VLS_ctx.isBusy || !__VLS_ctx.hasSelection),
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
    let __VLS_12;
    let __VLS_13;
    let __VLS_14;
    const __VLS_15 = {
        onClick: (__VLS_ctx.clearSelection)
    };
    __VLS_11.slots.default;
    var __VLS_11;
    const __VLS_16 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
        ...{ 'onClick': {} },
        disabled: (__VLS_ctx.isBusy),
    }));
    const __VLS_18 = __VLS_17({
        ...{ 'onClick': {} },
        disabled: (__VLS_ctx.isBusy),
    }, ...__VLS_functionalComponentArgsRest(__VLS_17));
    let __VLS_20;
    let __VLS_21;
    let __VLS_22;
    const __VLS_23 = {
        onClick: (__VLS_ctx.reset)
    };
    __VLS_19.slots.default;
    var __VLS_19;
}
/** @type {__VLS_StyleScopedClasses['wr-form']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-dropzone']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-dropzone-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-dropzone-title']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-dropzone-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-error']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-loading']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-editor']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-canvas-border']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-warning']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-btns']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            formatFileSize: formatFileSize,
            ALLOWED_TYPES: ALLOWED_TYPES,
            selectedFile: selectedFile,
            fileError: fileError,
            isLoading: isLoading,
            canvasRef: canvasRef,
            displayW: displayW,
            displayH: displayH,
            naturalW: naturalW,
            naturalH: naturalH,
            selW: selW,
            selH: selH,
            hasSelection: hasSelection,
            selectionRatio: selectionRatio,
            isSelectionTooLarge: isSelectionTooLarge,
            triggerFileInput: triggerFileInput,
            handleFileChange: handleFileChange,
            handleDrop: handleDrop,
            handleDragOver: handleDragOver,
            handleMouseDown: handleMouseDown,
            handleMouseMove: handleMouseMove,
            handleMouseUp: handleMouseUp,
            handleRemove: handleRemove,
            clearSelection: clearSelection,
            reset: reset,
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
