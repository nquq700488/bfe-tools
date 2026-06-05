import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { getTool } from '@/tools/registry';
import BackendJobToolPanel from '@/components/tools/backend/BackendJobToolPanel.vue';
import ClientToolPanel from '@/components/tools/pure/ClientToolPanel.vue';
const route = useRoute();
const toolId = computed(() => route.params.toolId);
const tool = computed(() => getTool(toolId.value));
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.tool?.mode === 'backend-job') {
    /** @type {[typeof BackendJobToolPanel, ]} */ ;
    // @ts-ignore
    const __VLS_0 = __VLS_asFunctionalComponent(BackendJobToolPanel, new BackendJobToolPanel({
        tool: (__VLS_ctx.tool),
    }));
    const __VLS_1 = __VLS_0({
        tool: (__VLS_ctx.tool),
    }, ...__VLS_functionalComponentArgsRest(__VLS_0));
    var __VLS_3 = {};
    var __VLS_2;
}
else if (__VLS_ctx.tool?.mode === 'client-only') {
    /** @type {[typeof ClientToolPanel, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(ClientToolPanel, new ClientToolPanel({
        tool: (__VLS_ctx.tool),
    }));
    const __VLS_5 = __VLS_4({
        tool: (__VLS_ctx.tool),
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
    var __VLS_7 = {};
    var __VLS_6;
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "tool-page py-16 text-center" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "text-neutral-500" },
    });
}
/** @type {__VLS_StyleScopedClasses['tool-page']} */ ;
/** @type {__VLS_StyleScopedClasses['py-16']} */ ;
/** @type {__VLS_StyleScopedClasses['text-center']} */ ;
/** @type {__VLS_StyleScopedClasses['text-neutral-500']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            BackendJobToolPanel: BackendJobToolPanel,
            ClientToolPanel: ClientToolPanel,
            tool: tool,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
