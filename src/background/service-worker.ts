import { shouldReportHttpStatus } from "../lib/classify-status";
import {
  maxRequests,
  maxTabMetrics,
  storageKey,
  normalizeMonitoringState,
  type CapturedRequest,
  type MonitoringState,
  type PageMetrics,
} from "../lib/monitoring-types";

const apiFilter: chrome.webRequest.RequestFilter = {
  urls: ["http://*/*", "https://*/*"],
  types: ["xmlhttprequest"],
};

const requestStarts = new Map<string, number>();

let updateQueue: Promise<void> = Promise.resolve();

function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "Unknown URL";
  }
}

function updateMonitoringState(
  update: (state: MonitoringState) => MonitoringState,
): Promise<void> {
  updateQueue = updateQueue
    .then(async () => {
      const stored = await chrome.storage.session.get(storageKey);

      const current = normalizeMonitoringState(stored[storageKey]);
      const next = update(current);

      await chrome.storage.session.set({[storageKey]: next});
    })
    .catch((error: unknown) => {
      console.error(
        "[API Analyzer] Failed to update monitoring data:",
        error,
      );
    });

  return updateQueue;
}

function saveRequest(issue: CapturedRequest): void {
  void updateMonitoringState((state) => ({
    ...state,
    requests: [
      ...state.requests,
      issue,
    ].slice(-maxRequests),
  }));
}

function savePageMetrics(metrics: PageMetrics): void {
  void updateMonitoringState((state) => {
    const pageMetrics = {
      ...state.pageMetrics,
      [String(metrics.tabId)]: metrics,
    };

    const retainedMetrics = Object.fromEntries(
      Object.entries(pageMetrics)
        .sort(
          ([, a], [, b]) => b.capturedAt - a.capturedAt,
        )
        .slice(0, maxTabMetrics),
    );

    return {
      ...state,
      pageMetrics: retainedMetrics,
    };
  });
}

chrome.sidePanel
  .setPanelBehavior({
    openPanelOnActionClick: true,
  })
  .catch((error: unknown) => {
    console.error(
      "[API Analyzer] Unable to configure side panel:",
      error,
    );
  });

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    requestStarts.set(
      details.requestId,
      details.timeStamp,
    );

    return {};
  },
  apiFilter,
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    const startedAt = requestStarts.get(details.requestId);
    requestStarts.delete(details.requestId);

    if (!shouldReportHttpStatus(details.statusCode)) {
      return;
    }

    const issue: CapturedRequest = {
      id: `${details.requestId}-${details.timeStamp}`,
      tabId: details.tabId,
      method: details.method,
      url: sanitizeUrl(details.url),
      kind: "http",
      status: details.statusCode,
      error: null,
      durationMs: startedAt === undefined
        ? null
        : Math.max(0, Math.round(details.timeStamp - startedAt)),
      timestamp: Date.now(),
    };

    saveRequest(issue);
  },
  apiFilter,
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    const startedAt = requestStarts.get(details.requestId);

    requestStarts.delete(details.requestId);

    if (details.error === "net::ERR_ABORTED") {
      return;
    }

    const issue: CapturedRequest = {
      id: `${details.requestId}-${details.timeStamp}`,
      tabId: details.tabId,
      method: details.method,
      url: sanitizeUrl(details.url),
      kind: "network",
      status: null,
      error: details.error,
      durationMs: startedAt === undefined
        ? null
        : Math.max(0, Math.round(details.timeStamp - startedAt)),
      timestamp: Date.now(),
    };

    saveRequest(issue);
  },
  apiFilter,
);

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableNumber(
  value: unknown,
): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isFinite(value))
  );
}

chrome.runtime.onMessage.addListener(
  (message: unknown, sender) => {
    if (
      !isRecord(message) ||
      message.type !== "PAGE_METRICS" ||
      !isRecord(message.payload)
    ) {
      return;
    }

    const tabId = sender.tab?.id;
    const payload = message.payload;

    if (
      typeof tabId !== "number" ||
      typeof payload.url !== "string" ||
      !isNullableNumber(payload.loadMs) ||
      !isNullableNumber(payload.domContentLoadedMs) ||
      !isNullableNumber(payload.ttfbMs)
    ) {
      return;
    }

    const metrics: PageMetrics = {
      tabId,
      url: sanitizeUrl(payload.url),
      loadMs: payload.loadMs,
      domContentLoadedMs: payload.domContentLoadedMs,
      ttfbMs: payload.ttfbMs,
      capturedAt: Date.now(),
    };

    savePageMetrics(metrics);
  },
);