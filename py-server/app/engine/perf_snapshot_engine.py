"""
页面性能快照引擎 — 基于 Playwright BrowserManager
"""

import asyncio
import json
import logging
from pathlib import Path

from app.core.config import settings
from app.engine import BaseEngine, EngineResult
from app.lib.browser_manager import browser_manager

logger = logging.getLogger(__name__)


def _score_color(label: str, value: float | None, thresholds: tuple[float, float]) -> str:
    """根据阈值返回评级"""
    if value is None:
        return "—"
    good, poor = thresholds
    if value <= good:
        return "🟢 优"
    if value <= poor:
        return "🟡 中"
    return "🔴 差"


class PerfSnapshotEngine(BaseEngine):
    """页面性能快照引擎"""

    @property
    def engine_name(self) -> str:
        return "perf-snapshot"

    async def execute(self, input_path: str | None, params: dict) -> EngineResult:
        if not browser_manager.is_available:
            return EngineResult(
                success=False,
                error="playwright 未安装，请运行: pip install playwright && playwright install chromium",
            )

        url = params.get("url", "").strip()
        if not url:
            return EngineResult(success=False, error="请提供目标 URL（params.url）")

        try:
            data = await browser_manager.perf_snapshot(url)

            settings.RESULTS_DIR.mkdir(parents=True, exist_ok=True)

            # 生成 JSON 报告文件
            safe_name = url.replace("https://", "").replace("http://", "").replace("/", "_")[:60]
            json_name = f"{safe_name}_perf.json"
            json_path = settings.RESULTS_DIR / json_name
            await asyncio.get_running_loop().run_in_executor(
                None, lambda: json_path.write_text(json.dumps(data, ensure_ascii=False, indent=2))
            )

            # 构建人类可读摘要
            t = data.get("timing") or {}
            fcp = data.get("fcp_ms")
            lcp = data.get("lcp_ms")
            res = data.get("resources") or {}

            summary_lines = [
                f"📍 {url}",
                f"HTTP {data.get('status_code', '?')}  ·  导航耗时 {data.get('nav_time_ms', '?')}ms",
                "",
                "━━━ Core Web Vitals ━━━",
                f"  FCP  {fcp}ms  {_score_color('fcp', fcp, (1800, 3000))}",
                f"  LCP  {lcp}ms  {_score_color('lcp', lcp, (2500, 4000))}",
                f"  TTFB {t.get('ttfb', '?')}ms  {_score_color('ttfb', t.get('ttfb'), (800, 1800))}",
                "",
                "━━━ 网络 ━━━",
                f"  DNS  {t.get('dnsLookup', '?')}ms  ·  TCP  {t.get('tcpConnect', '?')}ms",
                f"  首次字节  {t.get('firstByte', '?')}ms  ·  DOM 可交互  {t.get('domInteractive', '?')}ms",
                f"  DOMContentLoaded  {t.get('domContentLoaded', '?')}ms  ·  Load  {t.get('loadComplete', '?')}ms",
                f"  传输大小  {_format_bytes(t.get('transferSize'))}  ·  解码后  {_format_bytes(t.get('decodedBodySize'))}",
                "",
                f"━━━ 资源 ({res.get('totalCount', 0)} 个, {_format_bytes(res.get('totalSize', 0))}) ━━━",
            ]

            by_type = res.get("byType", {}) or {}
            for rtype, info in sorted(by_type.items(), key=lambda x: -(x[1].get("size", 0))):
                count = info.get("count", 0)
                size_val = info.get("size", 0)
                duration = info.get("totalDuration", 0)
                summary_lines.append(
                    f"  {rtype:12s}  {count:3d} 个  {_format_bytes(size_val):>8s}  {round(duration)}ms"
                )

            summary = "\n".join(summary_lines)

            logger.info(f"性能采集完成: {url} (FCP={fcp}ms, LCP={lcp}ms)")
            return EngineResult(
                success=True,
                data={
                    "action": "perf-snapshot",
                    "url": url,
                    "text": summary,
                },
                output_files=[str(json_path)],
                metadata={
                    "url": url,
                    "status_code": data.get("status_code"),
                    "nav_time_ms": data.get("nav_time_ms"),
                    "fcp_ms": fcp,
                    "lcp_ms": lcp,
                    "ttfb_ms": t.get("ttfb"),
                    "dns_ms": t.get("dnsLookup"),
                    "dom_interactive_ms": t.get("domInteractive"),
                    "load_complete_ms": t.get("loadComplete"),
                    "transfer_size": t.get("transferSize"),
                    "resource_count": res.get("totalCount"),
                    "resource_size": res.get("totalSize"),
                    "resources_by_type": by_type,
                },
            )
        except ValueError as e:
            return EngineResult(success=False, error=str(e))
        except RuntimeError as e:
            return EngineResult(success=False, error=str(e))
        except Exception as e:
            logger.exception("性能采集失败")
            return EngineResult(success=False, error=f"性能采集失败: {e}")


def _format_bytes(b: int | None) -> str:
    if b is None or b == 0:
        return "0 B"
    if b < 1024:
        return f"{b} B"
    if b < 1024 * 1024:
        return f"{b / 1024:.1f} KB"
    return f"{b / (1024 * 1024):.1f} MB"
