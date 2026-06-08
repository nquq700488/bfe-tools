"""
Playwright 浏览器管理器 — 单例 Browser、独立 Context/Page、并发控制、SSRF 防护

安全特性：
- URL 校验：只允许 http/https，阻断 localhost/内网 IP/link-local
- 请求拦截：阻断非 http/https 的外部请求
- 每个 job 使用独立 BrowserContext/Page（隔离 cookie/localStorage）
- semaphore 限制并发截图数

注意：playwright 依赖后续安装，当前通过懒加载兼容未安装状态。
"""

import asyncio
import ipaddress
import logging
from urllib.parse import urlparse

from app.core.config import settings

logger = logging.getLogger(__name__)

# —— 懒加载 playwright（后续 pip install playwright && playwright install chromium）——
try:
    from playwright.async_api import Browser, BrowserContext, async_playwright

    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    async_playwright = None  # type: ignore[assignment]
    Browser = None  # type: ignore[assignment]
    BrowserContext = None  # type: ignore[assignment]


# === SSRF 防护：URL 安全校验 ===

# 内网 / 特殊用途 IP 段
_BLOCKED_NETWORKS = [
    ipaddress.IPv4Network("127.0.0.0/8"),       # loopback
    ipaddress.IPv4Network("10.0.0.0/8"),        # private A
    ipaddress.IPv4Network("172.16.0.0/12"),     # private B
    ipaddress.IPv4Network("192.168.0.0/16"),    # private C
    ipaddress.IPv4Network("169.254.0.0/16"),    # link-local
    ipaddress.IPv4Network("0.0.0.0/8"),         # current network
    ipaddress.IPv6Network("::1/128"),           # IPv6 loopback
    ipaddress.IPv6Network("fe80::/10"),         # IPv6 link-local
    ipaddress.IPv6Network("fc00::/7"),          # IPv6 unique local
]


def is_url_safe(url: str) -> bool:
    """
    检查 URL 是否安全可访问

    校验规则：
    - 只允许 http/https scheme
    - hostname 不能是 localhost 或内网 IP
    - hostname 不能是 link-local 地址
    - 拒绝空 hostname

    Returns:
        True 表示安全可访问
    """
    try:
        parsed = urlparse(url)
    except Exception:
        return False

    # 只允许 http/https
    if parsed.scheme not in ("http", "https"):
        return False

    hostname = parsed.hostname
    if not hostname:
        return False

    # 拒绝 localhost 的各种写法
    if hostname.lower() in ("localhost", "0.0.0.0", "[::]", "::", "127.0.0.1", "[::1]", "::1"):
        return False

    # 检查是否为内网 IP
    try:
        addr = ipaddress.ip_address(hostname)
        for network in _BLOCKED_NETWORKS:
            if addr in network:
                return False
    except ValueError:
        # 不是 IP 地址（是域名），允许
        pass

    return True


# === 请求拦截 ===


async def _block_dangerous_requests(route):
    """拦截非 http/https 请求（如 file://、data://、chrome-extension:// 等）"""
    request = route.request
    url = request.url
    try:
        parsed = urlparse(url)
    except Exception:
        await route.abort()
        return

    if parsed.scheme not in ("http", "https"):
        logger.warning(f"Playwright 请求拦截: {parsed.scheme}:// — {url[:100]}")
        await route.abort()
        return

    await route.continue_()


# === BrowserManager ===


class BrowserManager:
    """
    Playwright 浏览器管理器

    生命周期：
    - 应用启动时创建 Browser 实例（chromium headless）
    - 每个 job 调用 new_context() 创建独立 BrowserContext/Page
    - semaphore 限制并发截图任务

    Usage:
        await browser_manager.start()
        screenshot_bytes = await browser_manager.screenshot(url, 1920, 1080)
        await browser_manager.stop()
    """

    def __init__(self) -> None:
        self._playwright = None
        self._browser: Browser | None = None
        self._semaphore: asyncio.Semaphore = asyncio.Semaphore(
            settings.PLAYWRIGHT_CONCURRENCY
        )
        self._started = False

    @property
    def is_available(self) -> bool:
        """playwright 是否已安装"""
        return PLAYWRIGHT_AVAILABLE

    async def start(self) -> None:
        """
        启动浏览器实例

        如果 playwright 未安装，记录警告并跳过（不影响其他功能）。
        """
        if not PLAYWRIGHT_AVAILABLE:
            logger.warning(
                "playwright 未安装，BrowserManager 不可用。"
                "安装: pip install playwright && playwright install chromium"
            )
            return

        if self._started:
            return

        logger.info("启动 Playwright 浏览器...")
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=[
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--no-sandbox",
                "--disable-setuid-sandbox",
            ],
        )
        self._started = True
        logger.info("Playwright 浏览器已启动")

    async def stop(self) -> None:
        """关闭浏览器实例"""
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
        self._started = False
        logger.info("Playwright 浏览器已关闭")

    async def screenshot(
        self,
        url: str,
        width: int = 1920,
        height: int = 1080,
        full_page: bool = False,
        output_format: str = "png",
    ) -> bytes:
        """
        对 URL 进行截图

        Args:
            url: 目标网页地址
            width: 视口宽度
            height: 视口高度
            full_page: 是否截取整页
            output_format: 输出格式（png / jpeg）

        Returns:
            截图的 bytes 数据

        Raises:
            RuntimeError: playwright 未安装或浏览器未启动
            ValueError: URL 不安全
        """
        if not self._started or not self._browser:
            raise RuntimeError("BrowserManager 未启动，请先调用 start()")

        if not is_url_safe(url):
            raise ValueError(f"URL 安全校验失败: {url}")

        async with self._semaphore:
            context = await self._browser.new_context(
                viewport={"width": width, "height": height},
            )
            try:
                page = await context.new_page()

                # 请求拦截
                await page.route("**/*", _block_dangerous_requests)

                # 限制页面高度
                if full_page:
                    await page.add_init_script("""
                        document.documentElement.style.maxHeight = '20000px';
                    """)

                await page.goto(
                    url,
                    wait_until="networkidle",
                    timeout=settings.PLAYWRIGHT_NAVIGATION_TIMEOUT * 1000,
                )

                screenshot_bytes = await page.screenshot(
                    full_page=full_page,
                    type=output_format,
                )
                logger.info(f"截图完成: {url} ({width}x{height}, {len(screenshot_bytes)} bytes)")
                return screenshot_bytes
            finally:
                await context.close()

    async def render_html(
        self,
        html: str,
        css: str = "",
        width: int = 1920,
        full_page: bool = False,
        output_format: str = "png",
    ) -> bytes:
        """
        将 HTML/CSS 渲染为图片

        Args:
            html: HTML 内容
            css: CSS 样式（可选）
            width: 视口宽度
            full_page: 是否截取整页
            output_format: 输出格式（png / jpeg）

        Returns:
            渲染结果的 bytes 数据

        Raises:
            RuntimeError: playwright 未安装或浏览器未启动
        """
        if not self._started or not self._browser:
            raise RuntimeError("BrowserManager 未启动，请先调用 start()")

        async with self._semaphore:
            context = await self._browser.new_context(
                viewport={"width": width, "height": 600},
            )
            try:
                page = await context.new_page()

                # 请求拦截（HTML 渲染不应加载外部资源）
                await page.route("**/*", _block_dangerous_requests)

                html_content = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        *, *::before, *::after {{ box-sizing: border-box; }}
        body {{ margin: 0; padding: 0; }}
        {css}
    </style>
</head>
<body>
    {html}
</body>
</html>"""

                await page.set_content(
                    html_content,
                    timeout=settings.PLAYWRIGHT_NAVIGATION_TIMEOUT * 1000,
                )

                # 等待字体和图片加载
                await page.wait_for_load_state("networkidle")

                screenshot_bytes = await page.screenshot(
                    full_page=full_page,
                    type=output_format,
                )
                logger.info(f"HTML 渲染完成: {len(html)} chars → {len(screenshot_bytes)} bytes")
                return screenshot_bytes
            finally:
                await context.close()


# 全局单例
browser_manager = BrowserManager()
