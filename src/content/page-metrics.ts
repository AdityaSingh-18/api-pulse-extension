let hasReported = false;

function reportPageMetrics(): void {
  if (hasReported) {
    return;
  }

  const navigation = performance.getEntriesByType(
    "navigation"
  )[0] as PerformanceNavigationTiming | undefined;

  if (!navigation) {
    return;
  }

  hasReported = true;

  const pageUrl = new URL(window.location.href);
  pageUrl.search = "";
  pageUrl.hash = "";

  const loadMs = navigation.loadEventEnd > 0
    ? Math.round(navigation.loadEventEnd - navigation.startTime)
    : null;

  const domContentLoadedMs = navigation.domContentLoadedEventEnd > 0
    ? Math.round(navigation.domContentLoadedEventEnd - navigation.startTime)
    : null;

  const ttfbMs = navigation.responseStart > 0
    ? Math.round(navigation.responseStart - navigation.startTime)
    : null;

  void chrome.runtime.sendMessage({
    type: "PAGE_METRICS",
    payload: {
      url: `${pageUrl.origin}${pageUrl.pathname}`,
      loadMs,
      domContentLoadedMs,
      ttfbMs
    }
  }).catch(() => undefined);
}

window.addEventListener(
  "load",
  () => window.setTimeout(reportPageMetrics, 0),
  { once: true }
);

if (document.readyState === "complete") {
  window.setTimeout(reportPageMetrics, 0);
}