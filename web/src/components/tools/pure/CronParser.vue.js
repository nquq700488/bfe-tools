import { ref, computed, watch } from 'vue';
import { NButton, NInput, NAlert, NTag } from 'naive-ui';
import ToolHeader from '@/components/tools/shared/ToolHeader.vue';
import CopyButton from '@/components/tools/shared/CopyButton.vue';
import { validateCron, describeCron, CRON_PRESETS } from '@/lib/parsers/cron';
const props = defineProps();
const cronExpr = ref('0 9 * * 1-5');
const result = ref(null);
const description = ref('');
const nextTimes = ref([]);
const fieldNames = {
    minute: '分钟',
    hour: '小时',
    dom: '日期',
    month: '月份',
    dow: '星期',
};
const tokens = computed(() => cronExpr.value.trim().split(/\s+/));
function analyze() {
    const res = validateCron(cronExpr.value);
    result.value = res;
    if (res.valid) {
        description.value = describeCron(cronExpr.value);
        computeNextTimes();
    }
    else {
        description.value = '';
        nextTimes.value = [];
    }
}
/** 计算未来5次执行时间（简化：基于规则推演而非真实调度器） */
function computeNextTimes() {
    const parts = cronExpr.value.trim().split(/\s+/);
    if (parts.length !== 5)
        return;
    const [minStr, hourStr, domStr, monthStr, dowStr] = parts;
    const now = new Date();
    const times = [];
    let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), 0, 0);
    // 最多尝试 366 天找到5次匹配
    let attempts = 0;
    while (times.length < 5 && attempts < 366 * 24 * 60) {
        cursor = new Date(cursor.getTime() + 60000); // +1 分钟
        attempts++;
        const m = cursor.getMinutes();
        const h = cursor.getHours();
        const d = cursor.getDate();
        const mo = cursor.getMonth() + 1;
        const dow = cursor.getDay();
        if (!matchField(minStr, m))
            continue;
        if (!matchField(hourStr, h))
            continue;
        if (!matchField(domStr, d))
            continue;
        if (!matchField(monthStr, mo))
            continue;
        if (!matchField(dowStr, dow))
            continue;
        times.push(`${cursor.getFullYear()}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    nextTimes.value = times;
}
function matchField(field, value) {
    if (field === '*')
        return true;
    // 步长 */N
    if (field.startsWith('*/')) {
        const step = parseInt(field.slice(2), 10);
        return value % step === 0;
    }
    // 范围 1-5
    if (field.includes('-') && !field.includes(',')) {
        const [start, end] = field.split('-').map(Number);
        return value >= start && value <= end;
    }
    // 列表 1,3,5
    if (field.includes(',')) {
        return field.split(',').map(Number).includes(value);
    }
    // 精确值
    return Number(field) === value;
}
function applyPreset(expr) {
    cronExpr.value = expr;
}
function handleClear() {
    cronExpr.value = '';
    result.value = null;
    description.value = '';
    nextTimes.value = [];
}
// 初始化分析
analyze();
watch(cronExpr, analyze);
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['cp-time-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "cron-parser" },
});
/** @type {[typeof ToolHeader, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ToolHeader, new ToolHeader({
    tool: (props.tool),
}));
const __VLS_1 = __VLS_0({
    tool: (props.tool),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cp-presets mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "cp-presets-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cp-presets-grid" },
});
for (const [preset] of __VLS_getVForSourceType((__VLS_ctx.CRON_PRESETS))) {
    const __VLS_3 = {}.NTag;
    /** @type {[typeof __VLS_components.NTag, typeof __VLS_components.NTag, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
        ...{ 'onClick': {} },
        key: (preset.value),
        type: (__VLS_ctx.cronExpr === preset.value ? 'primary' : 'default'),
        ...{ class: "cp-preset-tag" },
        size: "small",
        bordered: (false),
        checkable: true,
        checked: (__VLS_ctx.cronExpr === preset.value),
    }));
    const __VLS_5 = __VLS_4({
        ...{ 'onClick': {} },
        key: (preset.value),
        type: (__VLS_ctx.cronExpr === preset.value ? 'primary' : 'default'),
        ...{ class: "cp-preset-tag" },
        size: "small",
        bordered: (false),
        checkable: true,
        checked: (__VLS_ctx.cronExpr === preset.value),
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
    let __VLS_7;
    let __VLS_8;
    let __VLS_9;
    const __VLS_10 = {
        onClick: (...[$event]) => {
            __VLS_ctx.applyPreset(preset.value);
        }
    };
    __VLS_6.slots.default;
    (preset.label);
    var __VLS_6;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "cp-input-row mb-4" },
});
const __VLS_11 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
    ...{ 'onKeyup': {} },
    value: (__VLS_ctx.cronExpr),
    placeholder: "* * * * *",
    size: "large",
    ...{ class: "cp-input" },
}));
const __VLS_13 = __VLS_12({
    ...{ 'onKeyup': {} },
    value: (__VLS_ctx.cronExpr),
    placeholder: "* * * * *",
    size: "large",
    ...{ class: "cp-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
let __VLS_15;
let __VLS_16;
let __VLS_17;
const __VLS_18 = {
    onKeyup: (__VLS_ctx.analyze)
};
var __VLS_14;
/** @type {[typeof CopyButton, ]} */ ;
// @ts-ignore
const __VLS_19 = __VLS_asFunctionalComponent(CopyButton, new CopyButton({
    content: (__VLS_ctx.cronExpr),
}));
const __VLS_20 = __VLS_19({
    content: (__VLS_ctx.cronExpr),
}, ...__VLS_functionalComponentArgsRest(__VLS_19));
const __VLS_22 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_23 = __VLS_asFunctionalComponent(__VLS_22, new __VLS_22({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_24 = __VLS_23({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_23));
let __VLS_26;
let __VLS_27;
let __VLS_28;
const __VLS_29 = {
    onClick: (__VLS_ctx.handleClear)
};
__VLS_25.slots.default;
var __VLS_25;
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "cp-fields-hint" },
});
for (const [t, i] of __VLS_getVForSourceType((__VLS_ctx.tokens))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        key: (i),
        ...{ class: "cp-field-token" },
    });
    (t);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cp-field-name" },
    });
    (['分', '时', '日', '月', '周'][i] || '');
}
if (__VLS_ctx.result?.fieldErrors) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cp-errors mb-4" },
    });
    for (const [msg, field] of __VLS_getVForSourceType((__VLS_ctx.result.fieldErrors))) {
        const __VLS_30 = {}.NAlert;
        /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
        // @ts-ignore
        const __VLS_31 = __VLS_asFunctionalComponent(__VLS_30, new __VLS_30({
            key: (field),
            type: "warning",
            bordered: (false),
            title: (__VLS_ctx.fieldNames[field]),
            ...{ class: "mb-2" },
        }));
        const __VLS_32 = __VLS_31({
            key: (field),
            type: "warning",
            bordered: (false),
            title: (__VLS_ctx.fieldNames[field]),
            ...{ class: "mb-2" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_31));
        __VLS_33.slots.default;
        (msg);
        var __VLS_33;
    }
}
if (__VLS_ctx.result && !__VLS_ctx.result.valid && !__VLS_ctx.result.fieldErrors) {
    const __VLS_34 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
    // @ts-ignore
    const __VLS_35 = __VLS_asFunctionalComponent(__VLS_34, new __VLS_34({
        type: "error",
        bordered: (false),
        ...{ class: "mb-4" },
    }));
    const __VLS_36 = __VLS_35({
        type: "error",
        bordered: (false),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_35));
    __VLS_37.slots.default;
    (__VLS_ctx.result.error);
    var __VLS_37;
}
if (__VLS_ctx.description) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cp-description-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cp-description-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "cp-description-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "cp-description-text" },
    });
    (__VLS_ctx.description);
}
if (__VLS_ctx.nextTimes.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cp-times-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "cp-times-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cp-times-list" },
    });
    for (const [time, i] of __VLS_getVForSourceType((__VLS_ctx.nextTimes))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (i),
            ...{ class: "cp-time-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "cp-time-index" },
        });
        (i + 1);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "cp-time-value" },
        });
        (time);
    }
}
/** @type {__VLS_StyleScopedClasses['cron-parser']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-presets']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-presets-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-presets-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-preset-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-input']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-fields-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-field-token']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-field-name']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-errors']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-description-card']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-description-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-description-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-description-text']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-times-section']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-times-title']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-times-list']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-time-item']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-time-index']} */ ;
/** @type {__VLS_StyleScopedClasses['cp-time-value']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NInput: NInput,
            NAlert: NAlert,
            NTag: NTag,
            ToolHeader: ToolHeader,
            CopyButton: CopyButton,
            CRON_PRESETS: CRON_PRESETS,
            cronExpr: cronExpr,
            result: result,
            description: description,
            nextTimes: nextTimes,
            fieldNames: fieldNames,
            tokens: tokens,
            analyze: analyze,
            applyPreset: applyPreset,
            handleClear: handleClear,
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
