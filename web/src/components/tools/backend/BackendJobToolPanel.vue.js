import { computed, ref, watch } from 'vue';
import { NButton, NAlert, NDivider, NSpace, NImage, } from 'naive-ui';
import FileUpload from '@/components/ui/FileUpload.vue';
import MediaConvertForm from './MediaConvertForm.vue';
import WatermarkRemovalForm from './WatermarkRemovalForm.vue';
import TtsForm from './TtsForm.vue';
import ResultDownload from '@/components/ui/ResultDownload.vue';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useTaskPolling } from '@/hooks/useTaskPolling';
import { to } from '@/lib/to';
import { apiClient } from '@/lib/api';
import { resolveBackendUrl } from '@/lib/runtime';
import { INPUT_CATEGORY_MAP } from '@/lib/constants';
const props = defineProps();
const toolId = computed(() => props.tool.id);
/** 将 markdown 链接 [text](url) 渲染为安全的 HTML <a> 标签 */
function renderLinks(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="th-link">$1</a>');
}
const implHtml = computed(() => renderLinks(props.tool.implementation));
const { uploadStates, uploadFile, cancelAll } = useFileUpload();
const { status: jobStatus, errorMessage: jobError, resultUrl: jobResultUrl, resultFileName: jobResultFileName, resultText: jobResultText, ocrSegments: jobOcrSegments, start: startPolling, stop: stopPolling, } = useTaskPolling();
const phase = ref('idle');
const showResult = ref(false);
/** 下载文件名 — 优先后端返回的文件名，降级上传文件名，最后用原值 */
const downloadFileName = computed(() => jobResultFileName.value || resultFileNameLocal.value || 'output');
/** 本地文件名（上传/输入时的原始文件名，后端返回不同名时作为 fallback） */
const resultFileNameLocal = ref('');
/** 当前 jobId，用于构建下载 URL */
const currentJobId = ref(null);
/** 下载 URL 始终走 /api/v1/jobs/{jobId}/result */
const resultDownloadUrl = computed(() => currentJobId.value ? resolveBackendUrl(`/api/v1/jobs/${currentJobId.value}/result`) : '');
/** OCR 识别结果文字 */
const ocrText = ref(null);
/** OCR 段落（带位置信息） */
const ocrSegments = ref(null);
/** 原始图片的 Object URL（用于 OCR 叠加展示） */
const ocrImageUrl = ref(null);
/** watermark-removal 原始图片 URL（用于前后对比） */
const watermarkOriginalUrl = ref(null);
/** 按 y 坐标排序的 OCR 段落 */
const sortedOcrSegments = computed(() => {
    if (!ocrSegments.value)
        return null;
    return [...ocrSegments.value].sort((a, b) => a.bbox[1] - b.bbox[1]);
});
const isTextTool = computed(() => props.tool.inputType === 'text');
const isOcrTool = computed(() => props.tool.id === 'image-ocr');
const isSttTool = computed(() => props.tool.id === 'speech-to-text');
const isConvertTool = computed(() => props.tool.id === 'media-convert');
const isWatermarkTool = computed(() => props.tool.id === 'watermark-removal');
/** 转换结果的输出类别（用于选择预览方式：图片/音频/视频） */
const convertOutputCategory = computed(() => {
    const ext = downloadFileName.value.split('.').pop()?.toLowerCase() || '';
    return INPUT_CATEGORY_MAP[ext] || null;
});
const isBusy = computed(() => phase.value === 'uploading' || phase.value === 'processing');
/** TTS 提交中标志（防止错误闪现） */
const ttsSubmitting = ref(false);
function resetState() {
    cancelAll();
    uploadStates.value = [];
    stopPolling();
    phase.value = 'idle';
    showResult.value = false;
    resultFileNameLocal.value = '';
    currentJobId.value = null;
    ocrText.value = null;
    ocrSegments.value = null;
    ocrImageUrl.value = null;
    watermarkOriginalUrl.value = null;
    ttsSubmitting.value = false;
}
watch(() => props.tool.id, resetState);
async function handleFilesSelected(files) {
    if (!files[0])
        return;
    showResult.value = false;
    currentJobId.value = null;
    resultFileNameLocal.value = files[0].name;
    // OCR 工具保存图片 URL 用于叠加展示
    if (props.tool.id === 'image-ocr') {
        ocrImageUrl.value = URL.createObjectURL(files[0]);
    }
    phase.value = 'uploading';
    const uploadId = await uploadFile(files[0]);
    if (!uploadId) {
        phase.value = 'error';
        return;
    }
    phase.value = 'processing';
    await createAndPollJob({ toolId: toolId.value, uploadId });
}
/** media-convert 两步流程：用户选择格式后确认 → 上传 + 创建任务 */
async function handleMediaConvert(payload) {
    showResult.value = false;
    currentJobId.value = null;
    resultFileNameLocal.value = payload.file.name;
    phase.value = 'uploading';
    const uploadId = await uploadFile(payload.file);
    if (!uploadId) {
        phase.value = 'error';
        return;
    }
    phase.value = 'processing';
    await createAndPollJob({
        toolId: toolId.value,
        uploadId,
        params: { target_format: payload.targetFormat },
    });
}
/** watermark-removal 两步流程：选择文件 → 标注水印区域 → 上传 + 创建任务 */
async function handleWatermarkRemove(payload) {
    showResult.value = false;
    currentJobId.value = null;
    resultFileNameLocal.value = payload.file.name;
    watermarkOriginalUrl.value = URL.createObjectURL(payload.file);
    phase.value = 'uploading';
    const uploadId = await uploadFile(payload.file);
    if (!uploadId) {
        phase.value = 'error';
        return;
    }
    phase.value = 'processing';
    await createAndPollJob({
        toolId: toolId.value,
        uploadId,
        params: {
            x: String(payload.x),
            y: String(payload.y),
            w: String(payload.w),
            h: String(payload.h),
        },
    });
}
/** TTS 表单提交：上传 txt 文件 + 创建语音生成任务 */
async function handleTtsSubmit(payload) {
    showResult.value = false;
    currentJobId.value = null;
    ttsSubmitting.value = true;
    try {
        phase.value = 'uploading';
        let uploadId = null;
        if (payload.ttsFile) {
            resultFileNameLocal.value = payload.ttsFile.name;
            uploadId = await uploadFile(payload.ttsFile);
            if (!uploadId) {
                phase.value = 'error';
                return;
            }
        }
        phase.value = 'processing';
        await createAndPollJob({
            toolId: toolId.value,
            uploadId: uploadId || '',
            params: {
                text: payload.text.slice(0, 2000),
                voiceId: payload.voiceId,
                speed: payload.speed,
                pitch: payload.pitch,
                format: payload.format,
            },
        });
    }
    finally {
        ttsSubmitting.value = false;
    }
}
async function createAndPollJob(payload) {
    const [createResult, createErr] = await to(apiClient.post('/api/v1/jobs', payload));
    if (createErr || !createResult?.data) {
        phase.value = 'error';
        return;
    }
    startPolling(createResult.data.jobId);
    currentJobId.value = createResult.data.jobId;
    const stopWatch = watch([jobStatus, jobResultUrl, jobResultText, jobOcrSegments], ([status, url, text, segments]) => {
        if (status === 'succeeded' && url) {
            phase.value = 'done';
            showResult.value = true;
            ocrText.value = text || null;
            ocrSegments.value = segments || null;
            stopWatch();
        }
        else if (status === 'failed') {
            phase.value = 'error';
            stopWatch();
        }
        else if (status === 'canceled') {
            phase.value = 'idle';
            stopWatch();
        }
    });
}
function handleCancelUpload(_fileId) { phase.value = 'idle'; }
function handleRetry() { stopPolling(); phase.value = 'idle'; showResult.value = false; currentJobId.value = null; ocrText.value = null; ocrSegments.value = null; ocrImageUrl.value = null; ttsSubmitting.value = false; }
/** 格式化秒数为 mm:ss */
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
/** 将 segments 转为 STT 格式（兼容 OCR/STT 混合字段） */
const sttSegments = computed(() => {
    if (!ocrSegments.value)
        return null;
    return ocrSegments.value.map((s) => ({
        text: s.text,
        start: s.start || 0,
        end: s.end || 0,
    }));
});
/** 复制文字到剪贴板 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    }
    catch {
        // 降级方案
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['th-link']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-image-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-image-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-segment-item']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-thumbnail']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-image-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-compare']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-compare-col']} */ ;
/** @type {__VLS_StyleScopedClasses['stt-segment-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "tool-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-8" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "flex items-center gap-3 mb-3" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "flex h-10 w-10 items-center justify-center rounded-2 bg-primary-50 text-xl ring-1 ring-primary-100" },
});
(props.tool.icon);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "text-2xl font-bold text-neutral-900" },
});
(props.tool.name);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-neutral-500 mt-0.5" },
});
(props.tool.description);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p)({
    ...{ class: "text-sm text-neutral-500 mt-1" },
});
__VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.implHtml) }, null, null);
const __VLS_0 = {}.NDivider;
/** @type {[typeof __VLS_components.NDivider, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({}));
const __VLS_2 = __VLS_1({}, ...__VLS_functionalComponentArgsRest(__VLS_1));
const __VLS_4 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.NSpace, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    vertical: true,
    size: (20),
}));
const __VLS_6 = __VLS_5({
    vertical: true,
    size: (20),
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
if (__VLS_ctx.isTextTool) {
    /** @type {[typeof TtsForm, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(TtsForm, new TtsForm({
        ...{ 'onSubmit': {} },
        tool: (props.tool),
        isBusy: (__VLS_ctx.isBusy),
    }));
    const __VLS_9 = __VLS_8({
        ...{ 'onSubmit': {} },
        tool: (props.tool),
        isBusy: (__VLS_ctx.isBusy),
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    let __VLS_11;
    let __VLS_12;
    let __VLS_13;
    const __VLS_14 = {
        onSubmit: (__VLS_ctx.handleTtsSubmit)
    };
    var __VLS_10;
    if (__VLS_ctx.isBusy) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "loading-bar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "loading-bar-spinner" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "loading-bar-text" },
        });
        (__VLS_ctx.phase === 'uploading' ? '正在上传...' : '正在生成语音，请稍候...');
    }
    if (!__VLS_ctx.ttsSubmitting && __VLS_ctx.phase === 'error') {
        const __VLS_15 = {}.NAlert;
        /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
        // @ts-ignore
        const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
            type: "error",
            bordered: (false),
        }));
        const __VLS_17 = __VLS_16({
            type: "error",
            bordered: (false),
        }, ...__VLS_functionalComponentArgsRest(__VLS_16));
        __VLS_18.slots.default;
        (__VLS_ctx.jobError || '处理失败，请重试');
        var __VLS_18;
    }
    if (__VLS_ctx.showResult && __VLS_ctx.resultDownloadUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "audio-player-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs text-neutral-500 mb-2 block" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.audio)({
            src: (__VLS_ctx.resultDownloadUrl),
            controls: true,
            ...{ class: "audio-player" },
            preload: "auto",
        });
    }
    if (__VLS_ctx.showResult && __VLS_ctx.resultDownloadUrl) {
        /** @type {[typeof ResultDownload, ]} */ ;
        // @ts-ignore
        const __VLS_19 = __VLS_asFunctionalComponent(ResultDownload, new ResultDownload({
            downloadUrl: (__VLS_ctx.resultDownloadUrl),
            fileName: (__VLS_ctx.downloadFileName || 'audio.mp3'),
        }));
        const __VLS_20 = __VLS_19({
            downloadUrl: (__VLS_ctx.resultDownloadUrl),
            fileName: (__VLS_ctx.downloadFileName || 'audio.mp3'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_19));
    }
}
if (!__VLS_ctx.isTextTool) {
    if (__VLS_ctx.isConvertTool) {
        /** @type {[typeof MediaConvertForm, ]} */ ;
        // @ts-ignore
        const __VLS_22 = __VLS_asFunctionalComponent(MediaConvertForm, new MediaConvertForm({
            ...{ 'onConvert': {} },
            tool: (props.tool),
            isBusy: (__VLS_ctx.isBusy),
        }));
        const __VLS_23 = __VLS_22({
            ...{ 'onConvert': {} },
            tool: (props.tool),
            isBusy: (__VLS_ctx.isBusy),
        }, ...__VLS_functionalComponentArgsRest(__VLS_22));
        let __VLS_25;
        let __VLS_26;
        let __VLS_27;
        const __VLS_28 = {
            onConvert: (__VLS_ctx.handleMediaConvert)
        };
        var __VLS_24;
    }
    else if (__VLS_ctx.isWatermarkTool) {
        /** @type {[typeof WatermarkRemovalForm, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(WatermarkRemovalForm, new WatermarkRemovalForm({
            ...{ 'onRemove': {} },
            tool: (props.tool),
            isBusy: (__VLS_ctx.isBusy),
        }));
        const __VLS_30 = __VLS_29({
            ...{ 'onRemove': {} },
            tool: (props.tool),
            isBusy: (__VLS_ctx.isBusy),
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        let __VLS_32;
        let __VLS_33;
        let __VLS_34;
        const __VLS_35 = {
            onRemove: (__VLS_ctx.handleWatermarkRemove)
        };
        var __VLS_31;
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: ({ 'opacity-50 pointer-events-none': __VLS_ctx.isBusy }) },
        });
        /** @type {[typeof FileUpload, ]} */ ;
        // @ts-ignore
        const __VLS_36 = __VLS_asFunctionalComponent(FileUpload, new FileUpload({
            ...{ 'onSelect': {} },
            ...{ 'onCancel': {} },
            accept: (props.tool.accept),
            maxSize: (props.tool.maxSize),
            uploadStates: (__VLS_ctx.uploadStates),
        }));
        const __VLS_37 = __VLS_36({
            ...{ 'onSelect': {} },
            ...{ 'onCancel': {} },
            accept: (props.tool.accept),
            maxSize: (props.tool.maxSize),
            uploadStates: (__VLS_ctx.uploadStates),
        }, ...__VLS_functionalComponentArgsRest(__VLS_36));
        let __VLS_39;
        let __VLS_40;
        let __VLS_41;
        const __VLS_42 = {
            onSelect: (__VLS_ctx.handleFilesSelected)
        };
        const __VLS_43 = {
            onCancel: (__VLS_ctx.handleCancelUpload)
        };
        var __VLS_38;
    }
    if (__VLS_ctx.isBusy) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "loading-bar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
            ...{ class: "loading-bar-spinner" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "loading-bar-text" },
        });
        (__VLS_ctx.phase === 'uploading' ? '正在上传...' : __VLS_ctx.isConvertTool ? '正在转换格式，请稍候...' : __VLS_ctx.isWatermarkTool ? '正在去除水印，请稍候...' : '正在识别中，请稍候...');
    }
    if (__VLS_ctx.phase === 'error') {
        const __VLS_44 = {}.NAlert;
        /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
        // @ts-ignore
        const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
            type: "error",
            bordered: (false),
        }));
        const __VLS_46 = __VLS_45({
            type: "error",
            bordered: (false),
        }, ...__VLS_functionalComponentArgsRest(__VLS_45));
        __VLS_47.slots.default;
        (__VLS_ctx.jobError || '文件处理失败，请重试');
        var __VLS_47;
    }
    if (__VLS_ctx.phase === 'error') {
        const __VLS_48 = {}.NButton;
        /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
        // @ts-ignore
        const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
            ...{ 'onClick': {} },
            size: "small",
        }));
        const __VLS_50 = __VLS_49({
            ...{ 'onClick': {} },
            size: "small",
        }, ...__VLS_functionalComponentArgsRest(__VLS_49));
        let __VLS_52;
        let __VLS_53;
        let __VLS_54;
        const __VLS_55 = {
            onClick: (__VLS_ctx.handleRetry)
        };
        __VLS_51.slots.default;
        var __VLS_51;
    }
    if (__VLS_ctx.showResult && __VLS_ctx.isOcrTool && (__VLS_ctx.ocrText || __VLS_ctx.sortedOcrSegments)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "ocr-result-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center justify-between mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-sm font-semibold text-neutral-700" },
        });
        const __VLS_56 = {}.NButton;
        /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            ...{ 'onClick': {} },
            text: true,
            size: "tiny",
            type: "primary",
        }));
        const __VLS_58 = __VLS_57({
            ...{ 'onClick': {} },
            text: true,
            size: "tiny",
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
        let __VLS_60;
        let __VLS_61;
        let __VLS_62;
        const __VLS_63 = {
            onClick: (() => __VLS_ctx.copyToClipboard(__VLS_ctx.ocrText || ''))
        };
        __VLS_59.slots.default;
        var __VLS_59;
        if (__VLS_ctx.sortedOcrSegments && __VLS_ctx.ocrImageUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ocr-layout" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ocr-thumbnail" },
            });
            const __VLS_64 = {}.NImage;
            /** @type {[typeof __VLS_components.NImage, ]} */ ;
            // @ts-ignore
            const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
                src: (__VLS_ctx.ocrImageUrl),
                alt: "上传的图片",
                ...{ class: "ocr-image-preview" },
            }));
            const __VLS_66 = __VLS_65({
                src: (__VLS_ctx.ocrImageUrl),
                alt: "上传的图片",
                ...{ class: "ocr-image-preview" },
            }, ...__VLS_functionalComponentArgsRest(__VLS_65));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "ocr-image-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "ocr-segments-list" },
            });
            for (const [seg, idx] of __VLS_getVForSourceType((__VLS_ctx.sortedOcrSegments))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (idx),
                    ...{ class: "ocr-segment-item" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "ocr-segment-index" },
                });
                (idx + 1);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "ocr-segment-text" },
                });
                (seg.text);
                if (seg.confidence < 1) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "ocr-segment-conf" },
                        ...{ class: (seg.confidence >= 0.8 ? 'text-success' : 'text-warning') },
                    });
                    (Math.round(seg.confidence * 100));
                }
            }
        }
        else if (__VLS_ctx.ocrText) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
                ...{ class: "ocr-text" },
            });
            (__VLS_ctx.ocrText);
        }
    }
    if (__VLS_ctx.showResult && __VLS_ctx.isSttTool && (__VLS_ctx.ocrText || __VLS_ctx.sttSegments)) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "stt-result-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "flex items-center justify-between mb-3" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-sm font-semibold text-neutral-700" },
        });
        const __VLS_68 = {}.NButton;
        /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
        // @ts-ignore
        const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
            ...{ 'onClick': {} },
            text: true,
            size: "tiny",
            type: "primary",
        }));
        const __VLS_70 = __VLS_69({
            ...{ 'onClick': {} },
            text: true,
            size: "tiny",
            type: "primary",
        }, ...__VLS_functionalComponentArgsRest(__VLS_69));
        let __VLS_72;
        let __VLS_73;
        let __VLS_74;
        const __VLS_75 = {
            onClick: (() => __VLS_ctx.copyToClipboard(__VLS_ctx.ocrText || ''))
        };
        __VLS_71.slots.default;
        var __VLS_71;
        if (__VLS_ctx.ocrText) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "stt-full-text" },
            });
            (__VLS_ctx.ocrText);
        }
        if (__VLS_ctx.sttSegments && __VLS_ctx.sttSegments.length > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "stt-segments-list" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "text-xs text-neutral-500 mb-2" },
            });
            for (const [seg, idx] of __VLS_getVForSourceType((__VLS_ctx.sttSegments))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (idx),
                    ...{ class: "stt-segment-item" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "stt-segment-time" },
                });
                (__VLS_ctx.formatTime(seg.start));
                (__VLS_ctx.formatTime(seg.end));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "stt-segment-text" },
                });
                (seg.text);
            }
        }
    }
    if (__VLS_ctx.showResult && __VLS_ctx.isConvertTool && __VLS_ctx.resultDownloadUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "convert-preview-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs text-neutral-500 mb-2 block" },
        });
        if (__VLS_ctx.convertOutputCategory === 'image') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.resultDownloadUrl),
                alt: (__VLS_ctx.downloadFileName),
                ...{ class: "convert-preview-image" },
            });
        }
        else if (__VLS_ctx.convertOutputCategory === 'audio') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.audio)({
                src: (__VLS_ctx.resultDownloadUrl),
                controls: true,
                ...{ class: "convert-preview-audio" },
                preload: "auto",
            });
        }
        else if (__VLS_ctx.convertOutputCategory === 'video') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.video)({
                src: (__VLS_ctx.resultDownloadUrl),
                controls: true,
                ...{ class: "convert-preview-video" },
                preload: "metadata",
            });
        }
    }
    if (__VLS_ctx.showResult && __VLS_ctx.isWatermarkTool && __VLS_ctx.resultDownloadUrl) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "convert-preview-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "wr-compare" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "wr-compare-col" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs text-neutral-500 mb-2 block" },
        });
        if (__VLS_ctx.watermarkOriginalUrl) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
                src: (__VLS_ctx.watermarkOriginalUrl),
                ...{ class: "convert-preview-image" },
                alt: "原图",
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "wr-compare-col" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "text-xs text-neutral-500 mb-2 block" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.resultDownloadUrl),
            ...{ class: "convert-preview-image" },
            alt: "去水印结果",
        });
    }
    if (__VLS_ctx.showResult && __VLS_ctx.resultDownloadUrl) {
        /** @type {[typeof ResultDownload, ]} */ ;
        // @ts-ignore
        const __VLS_76 = __VLS_asFunctionalComponent(ResultDownload, new ResultDownload({
            downloadUrl: (__VLS_ctx.resultDownloadUrl),
            fileName: (__VLS_ctx.downloadFileName || 'result'),
        }));
        const __VLS_77 = __VLS_76({
            downloadUrl: (__VLS_ctx.resultDownloadUrl),
            fileName: (__VLS_ctx.downloadFileName || 'result'),
        }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    }
}
var __VLS_7;
/** @type {__VLS_StyleScopedClasses['tool-page']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-8']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-3']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['h-10']} */ ;
/** @type {__VLS_StyleScopedClasses['w-10']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-center']} */ ;
/** @type {__VLS_StyleScopedClasses['rounded-2']} */ ;
/** @type {__VLS_StyleScopedClasses['bg-primary-50']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xl']} */ ;
/** @type {__VLS_StyleScopedClasses['ring-1']} */ ;
/** @type {__VLS_StyleScopedClasses['ring-primary-100']} */ ;
/** @type {__VLS_StyleScopedClasses['text-2xl']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-900']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-0.5']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-1']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-bar-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-bar-text']} */ ;
/** @type {__VLS_StyleScopedClasses['audio-player-card']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['audio-player']} */ ;
/** @type {__VLS_StyleScopedClasses['opacity-50']} */ ;
/** @type {__VLS_StyleScopedClasses['pointer-events-none']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-bar-spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-bar-text']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-result-card']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-thumbnail']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-image-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-image-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-segments-list']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-segment-item']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-segment-index']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-segment-text']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-segment-conf']} */ ;
/** @type {__VLS_StyleScopedClasses['ocr-text']} */ ;
/** @type {__VLS_StyleScopedClasses['stt-result-card']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['justify-between']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-semibold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-700']} */ ;
/** @type {__VLS_StyleScopedClasses['stt-full-text']} */ ;
/** @type {__VLS_StyleScopedClasses['stt-segments-list']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['stt-segment-item']} */ ;
/** @type {__VLS_StyleScopedClasses['stt-segment-time']} */ ;
/** @type {__VLS_StyleScopedClasses['stt-segment-text']} */ ;
/** @type {__VLS_StyleScopedClasses['convert-preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['convert-preview-image']} */ ;
/** @type {__VLS_StyleScopedClasses['convert-preview-audio']} */ ;
/** @type {__VLS_StyleScopedClasses['convert-preview-video']} */ ;
/** @type {__VLS_StyleScopedClasses['convert-preview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-compare']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-compare-col']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['convert-preview-image']} */ ;
/** @type {__VLS_StyleScopedClasses['wr-compare-col']} */ ;
/** @type {__VLS_StyleScopedClasses['text-xs']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['convert-preview-image']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NAlert: NAlert,
            NDivider: NDivider,
            NSpace: NSpace,
            NImage: NImage,
            FileUpload: FileUpload,
            MediaConvertForm: MediaConvertForm,
            WatermarkRemovalForm: WatermarkRemovalForm,
            TtsForm: TtsForm,
            ResultDownload: ResultDownload,
            implHtml: implHtml,
            uploadStates: uploadStates,
            jobError: jobError,
            phase: phase,
            showResult: showResult,
            downloadFileName: downloadFileName,
            resultDownloadUrl: resultDownloadUrl,
            ocrText: ocrText,
            ocrImageUrl: ocrImageUrl,
            watermarkOriginalUrl: watermarkOriginalUrl,
            sortedOcrSegments: sortedOcrSegments,
            isTextTool: isTextTool,
            isOcrTool: isOcrTool,
            isSttTool: isSttTool,
            isConvertTool: isConvertTool,
            isWatermarkTool: isWatermarkTool,
            convertOutputCategory: convertOutputCategory,
            isBusy: isBusy,
            ttsSubmitting: ttsSubmitting,
            handleFilesSelected: handleFilesSelected,
            handleMediaConvert: handleMediaConvert,
            handleWatermarkRemove: handleWatermarkRemove,
            handleTtsSubmit: handleTtsSubmit,
            handleCancelUpload: handleCancelUpload,
            handleRetry: handleRetry,
            formatTime: formatTime,
            sttSegments: sttSegments,
            copyToClipboard: copyToClipboard,
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
