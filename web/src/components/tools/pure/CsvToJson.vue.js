import { ref, computed } from 'vue';
import { NButton, NInput, NSelect, NAlert, NSpace, NTable } from 'naive-ui';
import ToolHeader from '@/components/tools/shared/ToolHeader.vue';
import CopyButton from '@/components/tools/shared/CopyButton.vue';
import { parseCsv, csvToJson, jsonToCsv } from '@/lib/parsers/csv';
const props = defineProps();
const direction = ref('csv-to-json');
// ---- 输入 ----
const csvInput = ref('');
const jsonInput = ref('');
const delimiter = ref(',');
const encoding = ref('UTF-8');
const opError = ref(null);
const delimiterOptions = [
    { label: '逗号 ( , )', value: ',' },
    { label: '分号 ( ; )', value: ';' },
    { label: 'Tab ( \\t )', value: '\t' },
];
const encodingOptions = [
    { label: 'UTF-8', value: 'UTF-8' },
    { label: 'GBK', value: 'GBK' },
];
// ---- 解析结果 ----
const previewRows = ref([]);
const previewColumns = ref([]);
const output = ref('');
const hasPreview = computed(() => previewRows.value.length > 0);
/** 从 File 读取文本 */
function readFileAsText(file, enc) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file, enc);
    });
}
/** CSV → JSON 转换 */
async function handleCsvToJson() {
    opError.value = null;
    if (!csvInput.value.trim())
        return;
    try {
        const text = csvInput.value;
        const parsed = parseCsv(text, undefined, delimiter.value);
        if (parsed.errors.length > 0) {
            opError.value = parsed.errors.map((e) => `第 ${e.row + 1} 行: ${e.message}`).join('; ');
        }
        // 预览前3行
        previewRows.value = parsed.data.slice(0, 3);
        previewColumns.value = parsed.data[0]?.map((_, i) => `col_${i}`) ?? [];
        // 转 JSON
        const json = csvToJson(text, delimiter.value);
        output.value = JSON.stringify(json, null, 2);
    }
    catch (e) {
        opError.value = `CSV 解析失败：${e instanceof Error ? e.message : '未知错误'}`;
    }
}
/** JSON → CSV 转换 */
function handleJsonToCsv() {
    opError.value = null;
    if (!jsonInput.value.trim())
        return;
    try {
        const parsed = JSON.parse(jsonInput.value);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            opError.value = 'JSON 必须为非空对象数组';
            return;
        }
        output.value = jsonToCsv(parsed, delimiter.value);
        previewRows.value = [];
        previewColumns.value = [];
    }
    catch (e) {
        opError.value = `JSON 解析失败：${e instanceof SyntaxError ? e.message : '未知错误'}`;
    }
}
/** 拖拽文件上传 */
function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (!file)
        return;
    loadFile(file);
}
function handleDragOver(e) {
    e.preventDefault();
}
async function loadFile(file) {
    opError.value = null;
    try {
        const text = await readFileAsText(file, encoding.value);
        csvInput.value = text;
        if (direction.value === 'csv-to-json') {
            await handleCsvToJson();
        }
    }
    catch (e) {
        opError.value = `文件读取失败：${e instanceof Error ? e.message : '未知错误'}`;
    }
}
function handleFileChange(e) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file)
        return;
    loadFile(file);
    input.value = '';
}
function handleClear() {
    csvInput.value = '';
    jsonInput.value = '';
    output.value = '';
    previewRows.value = [];
    previewColumns.value = [];
    opError.value = null;
}
/** 表格列定义 */
const tableColumns = computed(() => previewColumns.value.map((col, i) => ({
    title: col,
    key: `col_${i}`,
    ellipsis: { tooltip: true },
})));
const tableData = computed(() => previewRows.value.map((row) => {
    const obj = {};
    row.forEach((cell, i) => {
        obj[`col_${i}`] = cell;
    });
    return obj;
}));
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['cj-file-btn']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "csv-to-json" },
});
/** @type {[typeof ToolHeader, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ToolHeader, new ToolHeader({
    tool: (props.tool),
}));
const __VLS_1 = __VLS_0({
    tool: (props.tool),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
const __VLS_3 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.NSpace, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    ...{ class: "mb-4" },
}));
const __VLS_5 = __VLS_4({
    ...{ class: "mb-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
__VLS_6.slots.default;
const __VLS_7 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    ...{ 'onClick': {} },
    type: (__VLS_ctx.direction === 'csv-to-json' ? 'primary' : 'default'),
    size: "small",
}));
const __VLS_9 = __VLS_8({
    ...{ 'onClick': {} },
    type: (__VLS_ctx.direction === 'csv-to-json' ? 'primary' : 'default'),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
let __VLS_11;
let __VLS_12;
let __VLS_13;
const __VLS_14 = {
    onClick: (...[$event]) => {
        __VLS_ctx.direction = 'csv-to-json';
    }
};
__VLS_10.slots.default;
var __VLS_10;
const __VLS_15 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    ...{ 'onClick': {} },
    type: (__VLS_ctx.direction === 'json-to-csv' ? 'primary' : 'default'),
    size: "small",
}));
const __VLS_17 = __VLS_16({
    ...{ 'onClick': {} },
    type: (__VLS_ctx.direction === 'json-to-csv' ? 'primary' : 'default'),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
let __VLS_19;
let __VLS_20;
let __VLS_21;
const __VLS_22 = {
    onClick: (...[$event]) => {
        __VLS_ctx.direction = 'json-to-csv';
    }
};
__VLS_18.slots.default;
var __VLS_18;
const __VLS_23 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_25 = __VLS_24({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
let __VLS_27;
let __VLS_28;
let __VLS_29;
const __VLS_30 = {
    onClick: (__VLS_ctx.handleClear)
};
__VLS_26.slots.default;
var __VLS_26;
var __VLS_6;
if (__VLS_ctx.direction === 'csv-to-json') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cj-controls mb-4" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cj-label" },
    });
    const __VLS_31 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, ]} */ ;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
        value: (__VLS_ctx.delimiter),
        options: (__VLS_ctx.delimiterOptions),
        size: "small",
        ...{ class: "cj-select" },
    }));
    const __VLS_33 = __VLS_32({
        value: (__VLS_ctx.delimiter),
        options: (__VLS_ctx.delimiterOptions),
        size: "small",
        ...{ class: "cj-select" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cj-label" },
    });
    const __VLS_35 = {}.NSelect;
    /** @type {[typeof __VLS_components.NSelect, ]} */ ;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
        value: (__VLS_ctx.encoding),
        options: (__VLS_ctx.encodingOptions),
        size: "small",
        ...{ class: "cj-select" },
    }));
    const __VLS_37 = __VLS_36({
        value: (__VLS_ctx.encoding),
        options: (__VLS_ctx.encodingOptions),
        size: "small",
        ...{ class: "cj-select" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "cj-file-btn" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onChange: (__VLS_ctx.handleFileChange) },
        type: "file",
        accept: ".csv,.tsv,.txt",
        ...{ class: "hidden" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "cj-textarea-label" },
    });
    const __VLS_39 = {}.NInput;
    /** @type {[typeof __VLS_components.NInput, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
        ...{ 'onDrop': {} },
        ...{ 'onDragover': {} },
        value: (__VLS_ctx.csvInput),
        type: "textarea",
        rows: (6),
        placeholder: "name,age,city&#10;张三,28,北京&#10;李四,32,上海",
        ...{ class: "cj-textarea mb-4" },
    }));
    const __VLS_41 = __VLS_40({
        ...{ 'onDrop': {} },
        ...{ 'onDragover': {} },
        value: (__VLS_ctx.csvInput),
        type: "textarea",
        rows: (6),
        placeholder: "name,age,city&#10;张三,28,北京&#10;李四,32,上海",
        ...{ class: "cj-textarea mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    let __VLS_43;
    let __VLS_44;
    let __VLS_45;
    const __VLS_46 = {
        onDrop: (__VLS_ctx.handleDrop)
    };
    const __VLS_47 = {
        onDragover: (__VLS_ctx.handleDragOver)
    };
    var __VLS_42;
    const __VLS_48 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
        ...{ 'onClick': {} },
        type: "primary",
        size: "small",
        disabled: (!__VLS_ctx.csvInput.trim()),
        ...{ class: "mb-4" },
    }));
    const __VLS_50 = __VLS_49({
        ...{ 'onClick': {} },
        type: "primary",
        size: "small",
        disabled: (!__VLS_ctx.csvInput.trim()),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_49));
    let __VLS_52;
    let __VLS_53;
    let __VLS_54;
    const __VLS_55 = {
        onClick: (__VLS_ctx.handleCsvToJson)
    };
    __VLS_51.slots.default;
    var __VLS_51;
    if (__VLS_ctx.hasPreview) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "cj-preview-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "cj-section-title" },
        });
        const __VLS_56 = {}.NTable;
        /** @type {[typeof __VLS_components.NTable, ]} */ ;
        // @ts-ignore
        const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
            columns: (__VLS_ctx.tableColumns),
            data: (__VLS_ctx.tableData),
            bordered: (false),
            size: "small",
            ...{ class: "cj-table" },
        }));
        const __VLS_58 = __VLS_57({
            columns: (__VLS_ctx.tableColumns),
            data: (__VLS_ctx.tableData),
            bordered: (false),
            size: "small",
            ...{ class: "cj-table" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_57));
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "cj-textarea-label" },
    });
    const __VLS_60 = {}.NInput;
    /** @type {[typeof __VLS_components.NInput, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        value: (__VLS_ctx.jsonInput),
        type: "textarea",
        rows: (6),
        placeholder: '[{"name":"张三","age":"28"},{"name":"李四","age":"32"}]',
        ...{ class: "cj-textarea mb-4" },
    }));
    const __VLS_62 = __VLS_61({
        value: (__VLS_ctx.jsonInput),
        type: "textarea",
        rows: (6),
        placeholder: '[{"name":"张三","age":"28"},{"name":"李四","age":"32"}]',
        ...{ class: "cj-textarea mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
    const __VLS_64 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        ...{ 'onClick': {} },
        type: "primary",
        size: "small",
        disabled: (!__VLS_ctx.jsonInput.trim()),
        ...{ class: "mb-4" },
    }));
    const __VLS_66 = __VLS_65({
        ...{ 'onClick': {} },
        type: "primary",
        size: "small",
        disabled: (!__VLS_ctx.jsonInput.trim()),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    let __VLS_68;
    let __VLS_69;
    let __VLS_70;
    const __VLS_71 = {
        onClick: (__VLS_ctx.handleJsonToCsv)
    };
    __VLS_67.slots.default;
    var __VLS_67;
}
if (__VLS_ctx.opError) {
    const __VLS_72 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        type: "error",
        bordered: (false),
        ...{ class: "mb-4" },
    }));
    const __VLS_74 = __VLS_73({
        type: "error",
        bordered: (false),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    __VLS_75.slots.default;
    (__VLS_ctx.opError);
    var __VLS_75;
}
if (__VLS_ctx.output) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cj-output-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "cj-output-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cj-output-label" },
    });
    /** @type {[typeof CopyButton, ]} */ ;
    // @ts-ignore
    const __VLS_76 = __VLS_asFunctionalComponent(CopyButton, new CopyButton({
        content: (__VLS_ctx.output),
    }));
    const __VLS_77 = __VLS_76({
        content: (__VLS_ctx.output),
    }, ...__VLS_functionalComponentArgsRest(__VLS_76));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
        ...{ class: "cj-output" },
    });
    (__VLS_ctx.output);
}
/** @type {__VLS_StyleScopedClasses['csv-to-json']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-select']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-select']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-file-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-textarea-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-preview-section']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-table']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-textarea-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-output-section']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-output-header']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-output-label']} */ ;
/** @type {__VLS_StyleScopedClasses['cj-output']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NInput: NInput,
            NSelect: NSelect,
            NAlert: NAlert,
            NSpace: NSpace,
            NTable: NTable,
            ToolHeader: ToolHeader,
            CopyButton: CopyButton,
            direction: direction,
            csvInput: csvInput,
            jsonInput: jsonInput,
            delimiter: delimiter,
            encoding: encoding,
            opError: opError,
            delimiterOptions: delimiterOptions,
            encodingOptions: encodingOptions,
            output: output,
            hasPreview: hasPreview,
            handleCsvToJson: handleCsvToJson,
            handleJsonToCsv: handleJsonToCsv,
            handleDrop: handleDrop,
            handleDragOver: handleDragOver,
            handleFileChange: handleFileChange,
            handleClear: handleClear,
            tableColumns: tableColumns,
            tableData: tableData,
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
