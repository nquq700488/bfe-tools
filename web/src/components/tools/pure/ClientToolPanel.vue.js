import { computed } from 'vue';
import JsonFormatter from './JsonFormatter.vue';
import UrlCodec from './UrlCodec.vue';
import HtmlEntityCodec from './HtmlEntityCodec.vue';
import ColorConverter from './ColorConverter.vue';
import QrcodeGenerator from './QrcodeGenerator.vue';
import CsvToJson from './CsvToJson.vue';
import CronParser from './CronParser.vue';
import ImageCompression from './ImageCompression.vue';
import SvgEditor from './svg-editor/SvgEditor.vue';
import AnimeLab from './AnimeLab.vue';
const props = defineProps();
/** 工具 ID → 组件映射 */
const toolComponent = computed(() => {
    const map = {
        'anime-lab': AnimeLab,
        'json-formatter': JsonFormatter,
        'url-codec': UrlCodec,
        'html-entity-codec': HtmlEntityCodec,
        'color-converter': ColorConverter,
        'qrcode-generator': QrcodeGenerator,
        'csv-to-json': CsvToJson,
        'cron-parser': CronParser,
        'image-compression': ImageCompression,
        'svg-editor': SvgEditor,
    };
    return map[props.tool.id];
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "client-tool-panel" },
});
if (__VLS_ctx.toolComponent) {
    const __VLS_0 = ((__VLS_ctx.toolComponent));
    // @ts-ignore
    const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
        tool: (__VLS_ctx.tool),
    }));
    const __VLS_2 = __VLS_1({
        tool: (__VLS_ctx.tool),
    }, ...__VLS_functionalComponentArgsRest(__VLS_1));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-8" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "flex items-center gap-3 mb-3" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "flex h-10 w-10 items-center justify-center rounded-2 bg-primary-50 text-xl ring-1 ring-primary-100" },
    });
    (__VLS_ctx.tool.icon);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "text-2xl font-bold text-neutral-900" },
    });
    (__VLS_ctx.tool.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-sm text-neutral-500 mt-0.5" },
    });
    (__VLS_ctx.tool.description);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div)({
        ...{ class: "divider" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "placeholder-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "placeholder-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "placeholder-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "placeholder-desc" },
    });
}
/** @type {__VLS_StyleScopedClasses['client-tool-panel']} */ ;
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
/** @type {__VLS_StyleScopedClasses['divider']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-card']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-title']} */ ;
/** @type {__VLS_StyleScopedClasses['placeholder-desc']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            toolComponent: toolComponent,
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
