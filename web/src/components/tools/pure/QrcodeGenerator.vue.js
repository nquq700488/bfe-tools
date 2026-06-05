import { ref, watch, computed, nextTick, onUnmounted } from 'vue';
import { NButton, NInput, NSelect, NRadioGroup, NRadio, NSpace, NSlider } from 'naive-ui';
import QRCode from 'qrcode';
import ToolHeader from '@/components/tools/shared/ToolHeader.vue';
import ColorPicker from '@/components/tools/shared/ColorPicker.vue';
import CopyButton from '@/components/tools/shared/CopyButton.vue';
const props = defineProps();
const contentMode = ref('text');
const textInput = ref('https://example.com');
const qrData = computed(() => {
    switch (contentMode.value) {
        case 'vcard': return buildVCard();
        case 'wifi': return buildWifiString();
        default: return textInput.value;
    }
});
// ---- 颜色 ----
const fgColor = ref('#000000');
const bgColor = ref('#FFFFFF');
// ---- 纠错级别 ----
const errorLevel = ref('M');
const errorLevelOptions = [
    { label: 'L — 7% 纠错', value: 'L' },
    { label: 'M — 15% 纠错（推荐）', value: 'M' },
    { label: 'Q — 25% 纠错', value: 'Q' },
    { label: 'H — 30% 纠错', value: 'H' },
];
// ---- Logo ----
const logoUrl = ref(null);
const logoSize = ref(20); // 百分比 10-30
const logoFileRef = ref(null);
function triggerLogoInput() { logoFileRef.value?.click(); }
function handleLogoChange(e) {
    const input = e.target;
    const file = input.files?.[0];
    if (!file)
        return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        qrError.value = 'Logo 仅支持 PNG/JPEG/WebP 格式';
        return;
    }
    // 释放旧 URL
    if (logoUrl.value)
        URL.revokeObjectURL(logoUrl.value);
    logoUrl.value = URL.createObjectURL(file);
    input.value = '';
    // Logo 启用时建议 H 纠错级别
    if (errorLevel.value !== 'H') {
        qrError.value = '已启用 Logo，建议使用 H 纠错级别以增加容错空间';
    }
}
function removeLogo() {
    if (logoUrl.value) {
        URL.revokeObjectURL(logoUrl.value);
        logoUrl.value = null;
    }
    qrError.value = null;
}
// 通过 canvas 手动绘制 Logo 的叠加函数（用于 qrcode 原生渲染 + Logo 手动叠加）
function drawLogoOnCanvas(canvas, logoSrc, sizePercent) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve();
                return;
            }
            const logoW = canvas.width * sizePercent / 100;
            const logoH = canvas.height * sizePercent / 100;
            const x = (canvas.width - logoW) / 2;
            const y = (canvas.height - logoH) / 2;
            // 白色背景圆角矩形
            const radius = 8;
            ctx.beginPath();
            ctx.moveTo(x + radius, y);
            ctx.lineTo(x + logoW - radius, y);
            ctx.arcTo(x + logoW, y, x + logoW, y + radius, radius);
            ctx.lineTo(x + logoW, y + logoH - radius);
            ctx.arcTo(x + logoW, y + logoH, x + logoW - radius, y + logoH, radius);
            ctx.lineTo(x + radius, y + logoH);
            ctx.arcTo(x, y + logoH, x, y + logoH - radius, radius);
            ctx.lineTo(x, y + radius);
            ctx.arcTo(x, y, x + radius, y, radius);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            // 绘制 Logo 图片
            ctx.drawImage(img, x + 2, y + 2, logoW - 4, logoH - 4);
            resolve();
        };
        img.onerror = () => resolve();
        img.src = logoSrc;
    });
}
// ---- Canvas 渲染 ----
const canvasRef = ref(null);
const qrError = ref(null);
async function renderQr() {
    qrError.value = null;
    if (!canvasRef.value || !qrData.value.trim())
        return;
    await nextTick();
    try {
        const canvas = canvasRef.value;
        // 清除画布
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        // 标准 QRCode 渲染
        await QRCode.toCanvas(canvas, qrData.value, {
            width: 320,
            margin: 2,
            color: { dark: fgColor.value, light: bgColor.value },
            errorCorrectionLevel: errorLevel.value,
        });
        // 手动叠加 Logo（大小由 logoSize 完全控制）
        if (logoUrl.value) {
            await drawLogoOnCanvas(canvas, logoUrl.value, logoSize.value);
        }
    }
    catch (e) {
        qrError.value = e instanceof Error ? e.message : '生成二维码失败';
    }
}
watch([qrData, fgColor, bgColor, errorLevel, logoUrl, logoSize], renderQr, { immediate: true });
// ---- 导出 ----
function exportPng() {
    if (!canvasRef.value)
        return;
    const url = canvasRef.value.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'qrcode.png';
    a.click();
}
async function exportSvg() {
    // SVG 暂不支持 Logo 叠加，使用 canvas PNG 降级
    if (logoUrl.value) {
        exportPng();
        return;
    }
    QRCode.toString(qrData.value, {
        type: 'svg',
        margin: 2,
        color: { dark: fgColor.value, light: bgColor.value },
        errorCorrectionLevel: errorLevel.value,
    }).then((svg) => {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qrcode.svg';
        a.click();
        URL.revokeObjectURL(url);
    });
}
function exportSvgLabel() {
    return logoUrl.value ? '📥 导出 PNG' : '📥 导出 SVG';
}
// ---- vCard 表单 ----
const vcardName = ref('');
const vcardPhone = ref('');
const vcardEmail = ref('');
const vcardOrg = ref('');
function buildVCard() {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    if (vcardName.value)
        lines.push(`FN:${vcardName.value}`);
    if (vcardPhone.value)
        lines.push(`TEL:${vcardPhone.value}`);
    if (vcardEmail.value)
        lines.push(`EMAIL:${vcardEmail.value}`);
    if (vcardOrg.value)
        lines.push(`ORG:${vcardOrg.value}`);
    lines.push('END:VCARD');
    return lines.join('\n');
}
// ---- WiFi 表单 ----
const wifiSsid = ref('');
const wifiPassword = ref('');
const wifiEncryption = ref('WPA');
function buildWifiString() {
    return `WIFI:T:${wifiEncryption.value};S:${wifiSsid.value};P:${wifiPassword.value};;`;
}
onUnmounted(() => {
    if (logoUrl.value)
        URL.revokeObjectURL(logoUrl.value);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['qr-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-logo-dropzone']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-label']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-canvas-wrapper']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "qrcode-generator" },
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
    ...{ class: "qr-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "qr-controls" },
});
const __VLS_3 = {}.NRadioGroup;
/** @type {[typeof __VLS_components.NRadioGroup, typeof __VLS_components.NRadioGroup, ]} */ ;
// @ts-ignore
const __VLS_4 = __VLS_asFunctionalComponent(__VLS_3, new __VLS_3({
    value: (__VLS_ctx.contentMode),
    ...{ class: "mb-4" },
}));
const __VLS_5 = __VLS_4({
    value: (__VLS_ctx.contentMode),
    ...{ class: "mb-4" },
}, ...__VLS_functionalComponentArgsRest(__VLS_4));
__VLS_6.slots.default;
const __VLS_7 = {}.NRadio;
/** @type {[typeof __VLS_components.NRadio, typeof __VLS_components.NRadio, ]} */ ;
// @ts-ignore
const __VLS_8 = __VLS_asFunctionalComponent(__VLS_7, new __VLS_7({
    value: "text",
}));
const __VLS_9 = __VLS_8({
    value: "text",
}, ...__VLS_functionalComponentArgsRest(__VLS_8));
__VLS_10.slots.default;
var __VLS_10;
const __VLS_11 = {}.NRadio;
/** @type {[typeof __VLS_components.NRadio, typeof __VLS_components.NRadio, ]} */ ;
// @ts-ignore
const __VLS_12 = __VLS_asFunctionalComponent(__VLS_11, new __VLS_11({
    value: "vcard",
}));
const __VLS_13 = __VLS_12({
    value: "vcard",
}, ...__VLS_functionalComponentArgsRest(__VLS_12));
__VLS_14.slots.default;
var __VLS_14;
const __VLS_15 = {}.NRadio;
/** @type {[typeof __VLS_components.NRadio, typeof __VLS_components.NRadio, ]} */ ;
// @ts-ignore
const __VLS_16 = __VLS_asFunctionalComponent(__VLS_15, new __VLS_15({
    value: "wifi",
}));
const __VLS_17 = __VLS_16({
    value: "wifi",
}, ...__VLS_functionalComponentArgsRest(__VLS_16));
__VLS_18.slots.default;
var __VLS_18;
var __VLS_6;
if (__VLS_ctx.contentMode === 'text') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mb-4" },
    });
    const __VLS_19 = {}.NInput;
    /** @type {[typeof __VLS_components.NInput, ]} */ ;
    // @ts-ignore
    const __VLS_20 = __VLS_asFunctionalComponent(__VLS_19, new __VLS_19({
        value: (__VLS_ctx.textInput),
        type: "textarea",
        rows: (3),
        placeholder: "输入文本或 URL...",
        ...{ class: "qr-textarea" },
    }));
    const __VLS_21 = __VLS_20({
        value: (__VLS_ctx.textInput),
        type: "textarea",
        rows: (3),
        placeholder: "输入文本或 URL...",
        ...{ class: "qr-textarea" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_20));
}
if (__VLS_ctx.contentMode === 'vcard') {
    const __VLS_23 = {}.NInput;
    /** @type {[typeof __VLS_components.NInput, ]} */ ;
    // @ts-ignore
    const __VLS_24 = __VLS_asFunctionalComponent(__VLS_23, new __VLS_23({
        value: (__VLS_ctx.vcardName),
        placeholder: "姓名",
        ...{ class: "mb-2" },
        size: "small",
    }));
    const __VLS_25 = __VLS_24({
        value: (__VLS_ctx.vcardName),
        placeholder: "姓名",
        ...{ class: "mb-2" },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_24));
    const __VLS_27 = {}.NInput;
    /** @type {[typeof __VLS_components.NInput, ]} */ ;
    // @ts-ignore
    const __VLS_28 = __VLS_asFunctionalComponent(__VLS_27, new __VLS_27({
        value: (__VLS_ctx.vcardPhone),
        placeholder: "电话",
        ...{ class: "mb-2" },
        size: "small",
    }));
    const __VLS_29 = __VLS_28({
        value: (__VLS_ctx.vcardPhone),
        placeholder: "电话",
        ...{ class: "mb-2" },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_28));
    const __VLS_31 = {}.NInput;
    /** @type {[typeof __VLS_components.NInput, ]} */ ;
    // @ts-ignore
    const __VLS_32 = __VLS_asFunctionalComponent(__VLS_31, new __VLS_31({
        value: (__VLS_ctx.vcardEmail),
        placeholder: "邮箱",
        ...{ class: "mb-2" },
        size: "small",
    }));
    const __VLS_33 = __VLS_32({
        value: (__VLS_ctx.vcardEmail),
        placeholder: "邮箱",
        ...{ class: "mb-2" },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_32));
    const __VLS_35 = {}.NInput;
    /** @type {[typeof __VLS_components.NInput, ]} */ ;
    // @ts-ignore
    const __VLS_36 = __VLS_asFunctionalComponent(__VLS_35, new __VLS_35({
        value: (__VLS_ctx.vcardOrg),
        placeholder: "公司",
        ...{ class: "mb-4" },
        size: "small",
    }));
    const __VLS_37 = __VLS_36({
        value: (__VLS_ctx.vcardOrg),
        placeholder: "公司",
        ...{ class: "mb-4" },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_36));
}
if (__VLS_ctx.contentMode === 'wifi') {
    const __VLS_39 = {}.NInput;
    /** @type {[typeof __VLS_components.NInput, ]} */ ;
    // @ts-ignore
    const __VLS_40 = __VLS_asFunctionalComponent(__VLS_39, new __VLS_39({
        value: (__VLS_ctx.wifiSsid),
        placeholder: "SSID（WiFi 名称）",
        ...{ class: "mb-2" },
        size: "small",
    }));
    const __VLS_41 = __VLS_40({
        value: (__VLS_ctx.wifiSsid),
        placeholder: "SSID（WiFi 名称）",
        ...{ class: "mb-2" },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_40));
    const __VLS_43 = {}.NInput;
    /** @type {[typeof __VLS_components.NInput, ]} */ ;
    // @ts-ignore
    const __VLS_44 = __VLS_asFunctionalComponent(__VLS_43, new __VLS_43({
        value: (__VLS_ctx.wifiPassword),
        placeholder: "密码",
        ...{ class: "mb-2" },
        size: "small",
    }));
    const __VLS_45 = __VLS_44({
        value: (__VLS_ctx.wifiPassword),
        placeholder: "密码",
        ...{ class: "mb-2" },
        size: "small",
    }, ...__VLS_functionalComponentArgsRest(__VLS_44));
    const __VLS_47 = {}.NRadioGroup;
    /** @type {[typeof __VLS_components.NRadioGroup, typeof __VLS_components.NRadioGroup, ]} */ ;
    // @ts-ignore
    const __VLS_48 = __VLS_asFunctionalComponent(__VLS_47, new __VLS_47({
        value: (__VLS_ctx.wifiEncryption),
        ...{ class: "mb-4" },
    }));
    const __VLS_49 = __VLS_48({
        value: (__VLS_ctx.wifiEncryption),
        ...{ class: "mb-4" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_48));
    __VLS_50.slots.default;
    const __VLS_51 = {}.NRadio;
    /** @type {[typeof __VLS_components.NRadio, typeof __VLS_components.NRadio, ]} */ ;
    // @ts-ignore
    const __VLS_52 = __VLS_asFunctionalComponent(__VLS_51, new __VLS_51({
        value: "WPA",
    }));
    const __VLS_53 = __VLS_52({
        value: "WPA",
    }, ...__VLS_functionalComponentArgsRest(__VLS_52));
    __VLS_54.slots.default;
    var __VLS_54;
    const __VLS_55 = {}.NRadio;
    /** @type {[typeof __VLS_components.NRadio, typeof __VLS_components.NRadio, ]} */ ;
    // @ts-ignore
    const __VLS_56 = __VLS_asFunctionalComponent(__VLS_55, new __VLS_55({
        value: "WEP",
    }));
    const __VLS_57 = __VLS_56({
        value: "WEP",
    }, ...__VLS_functionalComponentArgsRest(__VLS_56));
    __VLS_58.slots.default;
    var __VLS_58;
    const __VLS_59 = {}.NRadio;
    /** @type {[typeof __VLS_components.NRadio, typeof __VLS_components.NRadio, ]} */ ;
    // @ts-ignore
    const __VLS_60 = __VLS_asFunctionalComponent(__VLS_59, new __VLS_59({
        value: "nopass",
    }));
    const __VLS_61 = __VLS_60({
        value: "nopass",
    }, ...__VLS_functionalComponentArgsRest(__VLS_60));
    __VLS_62.slots.default;
    var __VLS_62;
    var __VLS_50;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "qr-logo-section mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "qr-label block mb-1" },
});
if (!__VLS_ctx.logoUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.triggerLogoInput) },
        ...{ onKeydown: (__VLS_ctx.triggerLogoInput) },
        ...{ class: "qr-logo-dropzone" },
        role: "button",
        tabindex: "0",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "qr-logo-dropzone-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "qr-logo-dropzone-text" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "qr-logo-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.logoUrl),
        alt: "Logo 预览",
        ...{ class: "qr-logo-img" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "qr-logo-info" },
    });
    const __VLS_63 = {}.NButton;
    /** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
    // @ts-ignore
    const __VLS_64 = __VLS_asFunctionalComponent(__VLS_63, new __VLS_63({
        ...{ 'onClick': {} },
        size: "tiny",
    }));
    const __VLS_65 = __VLS_64({
        ...{ 'onClick': {} },
        size: "tiny",
    }, ...__VLS_functionalComponentArgsRest(__VLS_64));
    let __VLS_67;
    let __VLS_68;
    let __VLS_69;
    const __VLS_70 = {
        onClick: (__VLS_ctx.removeLogo)
    };
    __VLS_66.slots.default;
    var __VLS_66;
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onChange: (__VLS_ctx.handleLogoChange) },
    ref: "logoFileRef",
    type: "file",
    accept: "image/png,image/jpeg,image/webp",
    ...{ class: "hidden" },
});
/** @type {typeof __VLS_ctx.logoFileRef} */ ;
if (__VLS_ctx.logoUrl) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "mt-2" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "qr-label" },
    });
    (__VLS_ctx.logoSize);
    const __VLS_71 = {}.NSlider;
    /** @type {[typeof __VLS_components.NSlider, ]} */ ;
    // @ts-ignore
    const __VLS_72 = __VLS_asFunctionalComponent(__VLS_71, new __VLS_71({
        value: (__VLS_ctx.logoSize),
        min: (10),
        max: (30),
        step: (1),
    }));
    const __VLS_73 = __VLS_72({
        value: (__VLS_ctx.logoSize),
        min: (10),
        max: (30),
        step: (1),
    }, ...__VLS_functionalComponentArgsRest(__VLS_72));
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "qr-colors mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "qr-color-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "qr-label" },
});
/** @type {[typeof ColorPicker, ]} */ ;
// @ts-ignore
const __VLS_75 = __VLS_asFunctionalComponent(ColorPicker, new ColorPicker({
    modelValue: (__VLS_ctx.fgColor),
}));
const __VLS_76 = __VLS_75({
    modelValue: (__VLS_ctx.fgColor),
}, ...__VLS_functionalComponentArgsRest(__VLS_75));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "qr-color-item" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "qr-label" },
});
/** @type {[typeof ColorPicker, ]} */ ;
// @ts-ignore
const __VLS_78 = __VLS_asFunctionalComponent(ColorPicker, new ColorPicker({
    modelValue: (__VLS_ctx.bgColor),
}));
const __VLS_79 = __VLS_78({
    modelValue: (__VLS_ctx.bgColor),
}, ...__VLS_functionalComponentArgsRest(__VLS_78));
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "mb-4" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "qr-label block mb-1" },
});
const __VLS_81 = {}.NSelect;
/** @type {[typeof __VLS_components.NSelect, ]} */ ;
// @ts-ignore
const __VLS_82 = __VLS_asFunctionalComponent(__VLS_81, new __VLS_81({
    value: (__VLS_ctx.errorLevel),
    options: (__VLS_ctx.errorLevelOptions),
    size: "small",
}));
const __VLS_83 = __VLS_82({
    value: (__VLS_ctx.errorLevel),
    options: (__VLS_ctx.errorLevelOptions),
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_82));
const __VLS_85 = {}.NSpace;
/** @type {[typeof __VLS_components.NSpace, typeof __VLS_components.NSpace, ]} */ ;
// @ts-ignore
const __VLS_86 = __VLS_asFunctionalComponent(__VLS_85, new __VLS_85({
    ...{ class: "mb-3" },
}));
const __VLS_87 = __VLS_86({
    ...{ class: "mb-3" },
}, ...__VLS_functionalComponentArgsRest(__VLS_86));
__VLS_88.slots.default;
const __VLS_89 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_90 = __VLS_asFunctionalComponent(__VLS_89, new __VLS_89({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_91 = __VLS_90({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_90));
let __VLS_93;
let __VLS_94;
let __VLS_95;
const __VLS_96 = {
    onClick: (__VLS_ctx.exportPng)
};
__VLS_92.slots.default;
var __VLS_92;
const __VLS_97 = {}.NButton;
/** @type {[typeof __VLS_components.NButton, typeof __VLS_components.NButton, ]} */ ;
// @ts-ignore
const __VLS_98 = __VLS_asFunctionalComponent(__VLS_97, new __VLS_97({
    ...{ 'onClick': {} },
    size: "small",
}));
const __VLS_99 = __VLS_98({
    ...{ 'onClick': {} },
    size: "small",
}, ...__VLS_functionalComponentArgsRest(__VLS_98));
let __VLS_101;
let __VLS_102;
let __VLS_103;
const __VLS_104 = {
    onClick: (__VLS_ctx.exportSvg)
};
__VLS_100.slots.default;
(__VLS_ctx.exportSvgLabel());
var __VLS_100;
var __VLS_88;
if (__VLS_ctx.qrError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "qr-error" },
    });
    (__VLS_ctx.qrError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "qr-preview" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "qr-canvas-wrapper" },
    ...{ style: ({ backgroundColor: __VLS_ctx.bgColor }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.canvas)({
    ref: "canvasRef",
    width: "320",
    height: "320",
});
/** @type {typeof __VLS_ctx.canvasRef} */ ;
if (__VLS_ctx.qrData) {
    /** @type {[typeof CopyButton, ]} */ ;
    // @ts-ignore
    const __VLS_105 = __VLS_asFunctionalComponent(CopyButton, new CopyButton({
        content: (__VLS_ctx.qrData),
    }));
    const __VLS_106 = __VLS_105({
        content: (__VLS_ctx.qrData),
    }, ...__VLS_functionalComponentArgsRest(__VLS_105));
}
/** @type {__VLS_StyleScopedClasses['qrcode-generator']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-controls']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-2']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-logo-section']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-label']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-logo-dropzone']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-logo-dropzone-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-logo-dropzone-text']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-logo-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-logo-img']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-logo-info']} */ ;
/** @type {__VLS_StyleScopedClasses['hidden']} */ ;
/** @type {__VLS_StyleScopedClasses['mt-2']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-label']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-colors']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-color-item']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-label']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-color-item']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-label']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-label']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-1']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-error']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['qr-canvas-wrapper']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            NButton: NButton,
            NInput: NInput,
            NSelect: NSelect,
            NRadioGroup: NRadioGroup,
            NRadio: NRadio,
            NSpace: NSpace,
            NSlider: NSlider,
            ToolHeader: ToolHeader,
            ColorPicker: ColorPicker,
            CopyButton: CopyButton,
            contentMode: contentMode,
            textInput: textInput,
            qrData: qrData,
            fgColor: fgColor,
            bgColor: bgColor,
            errorLevel: errorLevel,
            errorLevelOptions: errorLevelOptions,
            logoUrl: logoUrl,
            logoSize: logoSize,
            logoFileRef: logoFileRef,
            triggerLogoInput: triggerLogoInput,
            handleLogoChange: handleLogoChange,
            removeLogo: removeLogo,
            canvasRef: canvasRef,
            qrError: qrError,
            exportPng: exportPng,
            exportSvg: exportSvg,
            exportSvgLabel: exportSvgLabel,
            vcardName: vcardName,
            vcardPhone: vcardPhone,
            vcardEmail: vcardEmail,
            vcardOrg: vcardOrg,
            wifiSsid: wifiSsid,
            wifiPassword: wifiPassword,
            wifiEncryption: wifiEncryption,
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
