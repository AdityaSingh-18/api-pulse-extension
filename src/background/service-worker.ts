import { shouldReportHttpStatus } from "../lib/classify-status";

import {
  DEFAULT_ANALYZER_SETTINGS,
  normalizeAnalyzerSettings,
  SETTINGS_STORAGE_KEY,
  type AnalyzerSettings,
  type DisplayMode,
} from "../lib/analyzer-settings";

import {
  maxRequests,
  maxTabMetrics,
  MONITORING_STORAGE_KEY,
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

let currentSettings: AnalyzerSettings = {
  ...DEFAULT_ANALYZER_SETTINGS,
  ignoredStatusCodes: [
    ...DEFAULT_ANALYZER_SETTINGS.ignoredStatusCodes,
  ],
};

async function syncDisplayModeBehavior(mode: DisplayMode): Promise<void> {
  try {
    if (mode === "floating") {
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: false,
      });
      await chrome.action.setPopup({
        popup: "index.html?view=floating",
      });
    } else {
      await chrome.action.setPopup({
        popup: "",
      });
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
      });
    }
  } catch (error: unknown) {
    console.error(
      "[API Analyzer] Unable to configure display mode:",
      error,
    );
  }
}

const settingsReady = chrome.storage.local
  .get(SETTINGS_STORAGE_KEY)
  .then((stored) => {
    currentSettings = normalizeAnalyzerSettings(
      stored[SETTINGS_STORAGE_KEY],
    );
    return syncDisplayModeBehavior(currentSettings.displayMode);
  })
  .catch((error: unknown) => {
    console.error(
      "[API Analyzer] Unable to load settings:",
      error,
    );
  });

let updateQueue: Promise<void> = Promise.resolve();

function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return "Unknown URL";
  }
}

function applyRetention(
  state: MonitoringState,
): MonitoringState {
  const cutoff =
    Date.now() - currentSettings.retentionHours * 60 * 60 * 1000;

  const requests = state.requests
    .filter((request) => request.timestamp >= cutoff)
    .slice(-maxRequests);

  const pageMetrics = Object.fromEntries(
    Object.entries(state.pageMetrics)
      .filter(([, metrics]) => metrics.capturedAt >= cutoff)
      .sort(
        ([, a], [, b]) => b.capturedAt - a.capturedAt,
      )
      .slice(0, maxTabMetrics),
  );

  return {
    requests,
    pageMetrics,
  };
}

function updateMonitoringState(
  update: (state: MonitoringState) => MonitoringState,
): Promise<void> {
  updateQueue = updateQueue
    .then(async () => {
      await settingsReady;

      const stored = await chrome.storage.session.get(MONITORING_STORAGE_KEY);
      const current = normalizeMonitoringState(stored[MONITORING_STORAGE_KEY]);
      const next = applyRetention(update(current));

      await chrome.storage.session.set({
        [MONITORING_STORAGE_KEY]: next,
      });
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
    requests: [...state.requests, issue].slice(-maxRequests),
  }));
}

function savePageMetrics(metrics: PageMetrics): void {
  void updateMonitoringState((state) => ({
    ...state,
    pageMetrics: {
      ...state.pageMetrics,
      [String(metrics.tabId)]: metrics,
    },
  }));
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName !== "local" ||
    !(SETTINGS_STORAGE_KEY in changes)
  ) {
    return;
  }

  currentSettings = normalizeAnalyzerSettings(
    changes[SETTINGS_STORAGE_KEY].newValue,
  );

  void syncDisplayModeBehavior(currentSettings.displayMode);
  void updateMonitoringState((state) => state);
});

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    requestStarts.set(details.requestId, details.timeStamp);
    return {};
  },
  apiFilter,
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    const startedAt = requestStarts.get(details.requestId);
    requestStarts.delete(details.requestId);

    const durationMs =
      startedAt === undefined
        ? null
        : Math.max(
            0,
            Math.round(details.timeStamp - startedAt),
          );

    void settingsReady.then(() => {
      const isSlow =
        durationMs !== null &&
        durationMs >= currentSettings.slowRequestThresholdMs;

      const isHttpProblem = shouldReportHttpStatus(
        details.statusCode,
        currentSettings.ignoredStatusCodes,
      );

      if (!isHttpProblem && !isSlow) {
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
        durationMs,
        isSlow,
        timestamp: Date.now(),
      };

      saveRequest(issue);
    });
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

    void settingsReady.then(() => {
      if (!currentSettings.includeNetworkErrors) {
        return;
      }

      const durationMs = startedAt === undefined
        ? null
        : Math.max(0, Math.round(details.timeStamp - startedAt));

      const issue: CapturedRequest = {
        id: `${details.requestId}-${details.timeStamp}`,
        tabId: details.tabId,
        method: details.method,
        url: sanitizeUrl(details.url),
        kind: "network",
        status: null,
        error: details.error,
        durationMs,
        isSlow: durationMs !== null && durationMs >= currentSettings.slowRequestThresholdMs,
        timestamp: Date.now(),
      };

      saveRequest(issue);
    });
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
    (typeof value === "number" && Number.isFinite(value))
  );
}

chrome.runtime.onMessage.addListener((message: unknown, sender) => {
  if (!isRecord(message)) {
    return;
  }

  if (message.type === "CLEAR_TAB_DATA") {
    if (sender.id !== chrome.runtime.id) {
      return;
    }

    const tabId = message.tabId;

    if (
      typeof tabId !== "number" ||
      !Number.isInteger(tabId) ||
      tabId < 0
    ) {
      return;
    }

    void updateMonitoringState((state) => {
      const pageMetrics = { ...state.pageMetrics };
      delete pageMetrics[String(tabId)];

      return {
        requests: state.requests.filter(
          (request) => request.tabId !== tabId,
        ),
        pageMetrics,
      };
    });

    return;
  }

  if (
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

  savePageMetrics({
    tabId,
    url: sanitizeUrl(payload.url),
    loadMs: payload.loadMs,
    domContentLoadedMs: payload.domContentLoadedMs,
    ttfbMs: payload.ttfbMs,
    capturedAt: Date.now(),
  });
});