import { ref, computed, watch, shallowRef } from 'vue';
import { NButton, NAlert, NInput, NSpace } from 'naive-ui';
import ToolHeader from '@/components/tools/shared/ToolHeader.vue';
import CopyButton from '@/components/tools/shared/CopyButton.vue';
import { useClientToolState } from '@/hooks/useClientToolState';
const props = defineProps();
const { input, output, error, setInput, setError, reset } = useClientToolState();
const indent = ref(2);
const treeExpanded = ref(new Set());
const treeData = shallowRef(null);
let debounceTimer = null;
const MAX_JSON_SIZE = 5 * 1024 * 1024; // 5MB 硬限制
const MAX_JSON_DEPTH = 100;
const MAX_TREE_NODES = 5000;
const LARGE_JSON_SIZE = 1 * 1024 * 1024; // 1MB 警告
const treeTruncated = ref(false);
const isOverSize = computed(() => input.value.length > MAX_JSON_SIZE);
const isLarge = computed(() => input.value.length > LARGE_JSON_SIZE && input.value.length <= MAX_JSON_SIZE);
/** 检测 JSON 嵌套深度 */
function computeDepth(data) {
    if (data === null || typeof data !== 'object')
        return 0;
    let maxChild = 0;
    if (Array.isArray(data)) {
        for (const item of data) {
            maxChild = Math.max(maxChild, computeDepth(item));
        }
    }
    else {
        for (const v of Object.values(data)) {
            maxChild = Math.max(maxChild, computeDepth(v));
        }
    }
    return 1 + maxChild;
}
function debouncedValidate() {
    if (debounceTimer)
        clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (!input.value.trim()) {
            error.value = null;
            treeData.value = null;
            output.value = '';
            return;
        }
        try {
            JSON.parse(input.value);
            error.value = null;
        }
        catch (e) {
            if (e instanceof SyntaxError) {
                const match = e.message.match(/position (\d+)/);
                const pos = match ? Number(match[1]) : 0;
                const lines = input.value.slice(0, pos).split('\n');
                error.value = `JSON 语法错误：第 ${lines.length} 行, 第 ${lines[lines.length - 1].length + 1} 列 — ${e.message}`;
            }
            else {
                error.value = '未知解析错误';
            }
            treeData.value = null;
        }
    }, 300);
}
watch(() => input.value, debouncedValidate);
function formatJson() {
    if (!input.value.trim())
        return;
    if (input.value.length > MAX_JSON_SIZE) {
        setError(`输入超过 ${MAX_JSON_SIZE / 1024 / 1024}MB 限制，无法处理`);
        return;
    }
    try {
        const parsed = JSON.parse(input.value);
        if (computeDepth(parsed) > MAX_JSON_DEPTH) {
            setError(`JSON 嵌套深度超过 ${MAX_JSON_DEPTH} 层限制`);
            return;
        }
        const formatted = JSON.stringify(parsed, null, indent.value);
        output.value = formatted;
        input.value = formatted;
        error.value = null;
        treeTruncated.value = false;
        const context = { count: 0, truncated: false };
        treeData.value = buildTree(parsed, 'root', '$', context);
        treeTruncated.value = context.truncated;
    }
    catch (e) {
        setError(e instanceof SyntaxError ? `格式化失败：${e.message}` : '格式化失败');
        treeData.value = null;
    }
}
function compressJson() {
    if (!input.value.trim())
        return;
    if (input.value.length > MAX_JSON_SIZE) {
        setError(`输入超过 ${MAX_JSON_SIZE / 1024 / 1024}MB 限制，无法处理`);
        return;
    }
    try {
        const parsed = JSON.parse(input.value);
        if (computeDepth(parsed) > MAX_JSON_DEPTH) {
            setError(`JSON 嵌套深度超过 ${MAX_JSON_DEPTH} 层限制`);
            return;
        }
        output.value = JSON.stringify(parsed);
        input.value = output.value;
        error.value = null;
        treeTruncated.value = false;
        const context = { count: 0, truncated: false };
        treeData.value = buildTree(parsed, 'root', '$', context);
        treeTruncated.value = context.truncated;
    }
    catch (e) {
        setError(e instanceof SyntaxError ? `压缩失败：${e.message}` : '压缩失败');
        treeData.value = null;
    }
}
function buildTree(data, key = 'root', path = '$', ctx = { count: 0, truncated: false }) {
    ctx.count++;
    if (ctx.count > MAX_TREE_NODES) {
        ctx.truncated = true;
        return { key, path, value: '... (已达 5000 节点上限，已截断)', type: 'string' };
    }
    if (data === null)
        return { key, path, value: null, type: 'null' };
    if (Array.isArray(data)) {
        const children = [];
        for (let i = 0; i < data.length && ctx.count < MAX_TREE_NODES; i++) {
            children.push(buildTree(data[i], String(i), `${path}[${i}]`, ctx));
        }
        if (children.length < data.length) {
            ctx.truncated = true;
            children.push({ key: '...', path: `${path}[...]`, value: `+${data.length - children.length} 项已截断`, type: 'string' });
        }
        return { key, path, value: `Array[${data.length}]`, type: 'array', children };
    }
    if (typeof data === 'object') {
        const entries = Object.entries(data);
        const children = [];
        for (let i = 0; i < entries.length && ctx.count < MAX_TREE_NODES; i++) {
            children.push(buildTree(entries[i][1], entries[i][0], `${path}.${entries[i][0]}`, ctx));
        }
        if (children.length < entries.length) {
            ctx.truncated = true;
            children.push({ key: '...', path: `${path}.<truncated>`, value: `+${entries.length - children.length} 项已截断`, type: 'string' });
        }
        return { key, path, value: `Object{${entries.length}}`, type: 'object', children };
    }
    return { key, path, value: data, type: typeof data };
}
function handleBuildTree() {
    if (input.value.length > MAX_JSON_SIZE) {
        setError(`输入超过 ${MAX_JSON_SIZE / 1024 / 1024}MB 限制`);
        return;
    }
    treeTruncated.value = false;
    try {
        const parsed = JSON.parse(input.value);
        if (computeDepth(parsed) > MAX_JSON_DEPTH) {
            setError(`JSON 嵌套深度超过 ${MAX_JSON_DEPTH} 层限制`);
            return;
        }
        const context = { count: 0, truncated: false };
        treeData.value = buildTree(parsed, 'root', '$', context);
        treeTruncated.value = context.truncated;
    }
    catch {
        treeData.value = null;
    }
}
function toggleExpand(path) {
    const next = new Set(treeExpanded.value);
    if (next.has(path))
        next.delete(path);
    else
        next.add(path);
    treeExpanded.value = next;
}
function expandAll(paths) {
    treeExpanded.value = new Set(paths);
}
function collapseAll() {
    treeExpanded.value = new Set();
}
function collectPaths(node, limit = MAX_TREE_NODES) {
    const paths = [];
    if (node.children && paths.length < limit) {
        paths.push(node.path);
        for (const child of node.children) {
            paths.push(...collectPaths(child, limit - paths.length));
            if (paths.length >= limit)
                break;
        }
    }
    return paths;
}
function handleExpandAll() {
    if (!treeData.value)
        return;
    expandAll(collectPaths(treeData.value));
}
function formatValue(val) {
    if (val === null)
        return 'null';
    if (typeof val === 'string')
        return `"${val}"`;
    return String(val);
}
function valueClass(type) {
    switch (type) {
        case 'string': return 'json-string';
        case 'number': return 'json-number';
        case 'boolean': return 'json-boolean';
        case 'null': return 'json-null';
        default: return '';
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['jf-tree-toggle']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "json-formatter" },
});
/** @type {[typeof ToolHeader, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(ToolHeader, new ToolHeader({
    tool: (props.tool),
}));
const __VLS_1 = __VLS_0({
    tool: (props.tool),
}, ...__VLS_functionalComponentArgsRest(__VLS_0));
if (__VLS_ctx.isOverSize) {
    const __VLS_3 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
    // @ts-ignore
    const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
        type: "error",
        bordered: (false),
        ...{ class: "mb-4" },
    }));
    const __VLS_5 = __VLS_4({
        type: "error",
        bordered: (false),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_4));
    __VLS_6.slots.default;
    var __VLS_6;
}
if (__VLS_ctx.isLarge) {
    const __VLS_7 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
    // @ts-ignore
    const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
        type: "warning",
        bordered: (false),
        ...{ class: "mb-4" },
    }));
    const __VLS_9 = __VLS_8({
        type: "warning",
        bordered: (false),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_8));
    __VLS_10.slots.default;
    var __VLS_10;
}
const __VLS_11 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.NSpace, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
    ...{ class: "mb-4" },
}));
const __VLS_13 = __VLS_12({
    ...{ class: "mb-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
__VLS_14.slots.default;
const __VLS_15 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    disabled: (!__VLS_ctx.input.trim()),
}));
const __VLS_17 = __VLS_16({
    ...{ 'onClick': {} },
    type: "primary",
    size: "small",
    disabled: (!__VLS_ctx.input.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
let __VLS_19;
let __VLS_20;
let __VLS_21;
const __VLS_22 = {
    onClick: (__VLS_ctx.formatJson)
};
__VLS_18.slots.default;
var __VLS_18;
const __VLS_23 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
    ...{ 'onClick': {} },
    size: "small",
    disabled: (!__VLS_ctx.input.trim()),
}));
const __VLS_25 = __VLS_24({
    ...{ 'onClick': {} },
    size: "small",
    disabled: (!__VLS_ctx.input.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_24));
let __VLS_27;
let __VLS_28;
let __VLS_29;
const __VLS_30 = {
    onClick: (__VLS_ctx.compressJson)
};
__VLS_26.slots.default;
var __VLS_26;
const __VLS_31 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
    ...{ 'onClick': {} },
    size: "small",
    disabled: (!__VLS_ctx.input.trim()),
}));
const __VLS_33 = __VLS_32({
    ...{ 'onClick': {} },
    size: "small",
    disabled: (!__VLS_ctx.input.trim()),
}, ...__VLS_functionalComponentArgsRest(__VLS_32));
let __VLS_35;
let __VLS_36;
let __VLS_37;
const __VLS_38 = {
    onClick: (__VLS_ctx.handleBuildTree)
};
__VLS_34.slots.default;
var __VLS_34;
const __VLS_39 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_41 = __VLS_40({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_40));
let __VLS_43;
let __VLS_44;
let __VLS_45;
const __VLS_46 = {
    onClick: (__VLS_ctx.reset)
};
__VLS_42.slots.default;
var __VLS_42;
var __VLS_14;
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "jf-label" },
});
const __VLS_47 = {}.NInput;
/** @type {[typeof __VLS_components.NInput, ]} */ ;
// @ts-ignore
const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.input),
    type: "textarea",
    rows: (12),
    placeholder: '{"key": "value"}',
    ...{ class: "jf-textarea mb-2" },
}));
const __VLS_49 = __VLS_48({
    ...{ 'onUpdate:value': {} },
    value: (__VLS_ctx.input),
    type: "textarea",
    rows: (12),
    placeholder: '{"key": "value"}',
    ...{ class: "jf-textarea mb-2" },
}, ...__VLS_functionalComponentArgsRest(__VLS_48));
let __VLS_51;
let __VLS_52;
let __VLS_53;
const __VLS_54 = {
    'onUpdate:value': (__VLS_ctx.setInput)
};
var __VLS_50;
if (__VLS_ctx.error) {
    const __VLS_55 = {}.NAlert;
    /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
        type: "error",
        bordered: (false),
        ...{ class: "mb-4" },
    }));
    const __VLS_57 = __VLS_56({
        type: "error",
        bordered: (false),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
    __VLS_58.slots.default;
    (__VLS_ctx.error);
    var __VLS_58;
}
if (__VLS_ctx.output) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "jf-output-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "jf-output-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "jf-output-label" },
    });
    /** @type {[typeof CopyButton, ]} */ ;
    // @ts-ignore
    const __VLS_59 = __VLS_asFunctionalComponent(CopyButton, new CopyButton({
        content: (__VLS_ctx.output),
    }));
    const __VLS_60 = __VLS_59({
        content: (__VLS_ctx.output),
    }, ...__VLS_functionalComponentArgsRest(__VLS_59));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
        ...{ class: "jf-output" },
    });
    (__VLS_ctx.output);
}
if (__VLS_ctx.treeData) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "jf-tree-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "jf-tree-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "jf-tree-label" },
    });
    const __VLS_62 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_63 = __VLS_asFunctionalComponent(__VLS_62, new __VLS_62({
        ...{ 'onClick': {} },
        text: true,
        size: "tiny",
        type: "primary",
    }));
    const __VLS_64 = __VLS_63({
        ...{ 'onClick': {} },
        text: true,
        size: "tiny",
        type: "primary",
    }, ...__VLS_functionalComponentArgsRest(__VLS_63));
    let __VLS_66;
    let __VLS_67;
    let __VLS_68;
    const __VLS_69 = {
        onClick: (__VLS_ctx.handleExpandAll)
    };
    __VLS_65.slots.default;
    var __VLS_65;
    const __VLS_70 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_71 = __VLS_asFunctionalComponent(__VLS_70, new __VLS_70({
        ...{ 'onClick': {} },
        text: true,
        size: "tiny",
    }));
    const __VLS_72 = __VLS_71({
        ...{ 'onClick': {} },
        text: true,
        size: "tiny",
    }, ...__VLS_functionalComponentArgsRest(__VLS_71));
    let __VLS_74;
    let __VLS_75;
    let __VLS_76;
    const __VLS_77 = {
        onClick: (__VLS_ctx.collapseAll)
    };
    __VLS_73.slots.default;
    var __VLS_73;
    if (__VLS_ctx.treeTruncated) {
        const __VLS_78 = {}.NAlert;
        /** @type {[typeof __VLS_components.NAlert, typeof __VLS_components.NAlert, ]} */ ;
        // @ts-ignore
        const __VLS_79 = __VLS_asFunctionalComponent(__VLS_78, new __VLS_78({
            type: "warning",
            bordered: (false),
            ...{ class: "ma-3" },
        }));
        const __VLS_80 = __VLS_79({
            type: "warning",
            bordered: (false),
            ...{ class: "ma-3" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_79));
        __VLS_81.slots.default;
        var __VLS_81;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "jf-tree-content" },
    });
    for (const [node] of __VLS_getVForSourceType((__VLS_ctx.treeData.children))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (node.path),
            ...{ class: "jf-tree-root" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "jf-tree-node" },
            ...{ style: ({ paddingLeft: '0' }) },
        });
        if (node.children) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.treeData))
                            return;
                        if (!(node.children))
                            return;
                        __VLS_ctx.toggleExpand(node.path);
                    } },
                ...{ class: "jf-tree-toggle" },
            });
            (__VLS_ctx.treeExpanded.has(node.path) ? '▾' : '▸');
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                ...{ class: "jf-tree-toggle-placeholder" },
            });
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "jf-tree-key" },
        });
        (node.key);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "jf-tree-badge" },
        });
        (node.value);
        if (node.children && __VLS_ctx.treeExpanded.has(node.path)) {
            for (const [child] of __VLS_getVForSourceType((node.children))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (child.path),
                    ...{ class: "jf-tree-node" },
                    ...{ style: ({ paddingLeft: '24px' }) },
                });
                if (child.children) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ onClick: (...[$event]) => {
                                if (!(__VLS_ctx.treeData))
                                    return;
                                if (!(node.children && __VLS_ctx.treeExpanded.has(node.path)))
                                    return;
                                if (!(child.children))
                                    return;
                                __VLS_ctx.toggleExpand(child.path);
                            } },
                        ...{ class: "jf-tree-toggle" },
                    });
                    (__VLS_ctx.treeExpanded.has(child.path) ? '▾' : '▸');
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                        ...{ class: "jf-tree-toggle-placeholder" },
                    });
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "jf-tree-key" },
                });
                (child.key);
                if (!child.children) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "jf-tree-colon" },
                    });
                }
                if (!child.children) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "jf-tree-value" },
                        ...{ class: (__VLS_ctx.valueClass(child.type)) },
                    });
                    (__VLS_ctx.formatValue(child.value));
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "jf-tree-badge" },
                    });
                    (child.value);
                }
            }
            for (const [child] of __VLS_getVForSourceType((node.children))) {
                ('deep-' + child.path);
                if (child.children && __VLS_ctx.treeExpanded.has(child.path)) {
                    for (const [grandchild] of __VLS_getVForSourceType((child.children))) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            key: (grandchild.path),
                            ...{ class: "jf-tree-node" },
                            ...{ style: ({ paddingLeft: '48px' }) },
                        });
                        if (grandchild.children) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                ...{ onClick: (...[$event]) => {
                                        if (!(__VLS_ctx.treeData))
                                            return;
                                        if (!(node.children && __VLS_ctx.treeExpanded.has(node.path)))
                                            return;
                                        if (!(child.children && __VLS_ctx.treeExpanded.has(child.path)))
                                            return;
                                        if (!(grandchild.children))
                                            return;
                                        __VLS_ctx.toggleExpand(grandchild.path);
                                    } },
                                ...{ class: "jf-tree-toggle" },
                            });
                            (__VLS_ctx.treeExpanded.has(grandchild.path) ? '▾' : '▸');
                        }
                        else {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                                ...{ class: "jf-tree-toggle-placeholder" },
                            });
                        }
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                            ...{ class: "jf-tree-key" },
                        });
                        (grandchild.key);
                        if (!grandchild.children) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                ...{ class: "jf-tree-colon" },
                            });
                        }
                        if (!grandchild.children) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                ...{ class: "jf-tree-value" },
                                ...{ class: (__VLS_ctx.valueClass(grandchild.type)) },
                            });
                            (__VLS_ctx.formatValue(grandchild.value));
                        }
                        else {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                ...{ class: "jf-tree-badge" },
                            });
                            (grandchild.value);
                        }
                    }
                }
            }
        }
    }
}
if (!__VLS_ctx.input.trim() && !__VLS_ctx.output) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "jf-empty" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "jf-empty-text" },
    });
}
/** @type {__VLS_StyleScopedClasses['json-formatter']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-label']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-output-section']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-output-header']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-output-label']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-output']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-section']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-header']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-label']} */ ;
/** @type {__VLS_StyleScopedClasses['ma-3']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-content']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-root']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-toggle-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-key']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-toggle-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-key']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-colon']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-value']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-node']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-toggle-placeholder']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-key']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-colon']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-value']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-tree-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['jf-empty-text']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NAlert: NAlert,
            NInput: NInput,
            NSpace: NSpace,
            ToolHeader: ToolHeader,
            CopyButton: CopyButton,
            input: input,
            output: output,
            error: error,
            setInput: setInput,
            reset: reset,
            treeExpanded: treeExpanded,
            treeData: treeData,
            treeTruncated: treeTruncated,
            isOverSize: isOverSize,
            isLarge: isLarge,
            formatJson: formatJson,
            compressJson: compressJson,
            handleBuildTree: handleBuildTree,
            toggleExpand: toggleExpand,
            collapseAll: collapseAll,
            handleExpandAll: handleExpandAll,
            formatValue: formatValue,
            valueClass: valueClass,
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
