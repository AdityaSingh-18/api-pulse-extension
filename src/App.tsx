import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Activity,
  AlertCircle,
  Clock3,
  Copy,
  Download,
  Globe,
  Network,
  ShieldAlert,
  Timer,
  Trash2,
  WifiOff,
  Save,
  Settings2,
  RotateCcw,
} from "lucide-react";

import {
  EmptyMonitoringState,
  MONITORING_STORAGE_KEY,
  normalizeMonitoringState,
  type CapturedRequest,
  type MonitoringState,
} from "./lib/monitoring-types";

import {
  DEFAULT_ANALYZER_SETTINGS,
  normalizeAnalyzerSettings,
  SETTINGS_STORAGE_KEY,
  type AnalyzerSettings,
} from "./lib/analyzer-settings";

type RequestFilter = "all" | "4xx" | "5xx" | "network";

const ApiFilters: {
  label: string;
  value: RequestFilter;
}[] = [
  { label: "All", value: "all" },
  { label: "4xx", value: "4xx" },
  { label: "5xx", value: "5xx" },
  { label: "Network", value: "network" },
];

function formatDuration(
  milliseconds: number | null | undefined,
): string {
  if (typeof milliseconds !== "number" || !Number.isFinite(milliseconds)) {
    return "—";
  }

  if (milliseconds < 1000) {
    return `${milliseconds} ms`;
  }

  return `${(milliseconds / 1000).toFixed(2)} s`;
}

function getRequestBadgeClass(
  request: CapturedRequest,
): string {
  if (request.kind === "network") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-200";
  }

  if ((request.status ?? 0) >= 500) {
    return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  }

  return "border-orange-400/20 bg-orange-400/10 text-orange-200";
}

interface GroupedRequest extends CapturedRequest {
  count: number;
}

function groupDuplicateRequests(
  requests: CapturedRequest[],
): GroupedRequest[] {
  const groups = new Map<string, GroupedRequest>();

  for (const request of requests) {
    const key = JSON.stringify([
      request.kind,
      request.method,
      request.url,
      request.status,
      request.error,
    ]);

    const existing = groups.get(key);

    if (existing) {
      existing.count += 1;
    } else {
      groups.set(key, {
        ...request,
        count: 1,
      });
    }
  }

  return [...groups.values()].sort(
    (a, b) => b.timestamp - a.timestamp,
  );
}

function downloadFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], {
    type: mimeType,
  });

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

function escapeCsvValue(value: string | number | null): string {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

export default function App() {
  const [monitoringState, setMonitoringState] = useState<MonitoringState>(EmptyMonitoringState);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [storageError, setStorageError] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  
  const [settings, setSettings] = useState<AnalyzerSettings>(DEFAULT_ANALYZER_SETTINGS);
  const [draftSettings, setDraftSettings] = useState<AnalyzerSettings>(DEFAULT_ANALYZER_SETTINGS);
  const [ignoredStatusCodesInput, setIgnoredStatusCodesInput] = useState("401");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function syncActiveTab() {
      try {
        const [tab] = await chrome.tabs.query({
          active: true,
          lastFocusedWindow: true,
        });

        if (mounted) {
          setActiveTabId(tab?.id ?? null);
        }
      } catch {
        if (mounted) {
          setActiveTabId(null);
        }
      }
    }

    function handleTabActivated() {
      void syncActiveTab();
    }

    function handleWindowFocused(windowId: number) {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        setActiveTabId(null);
        return;
      }

      void syncActiveTab();
    }

    function handleTabRemoved(tabId: number) {
      if (tabId === activeTabId) {
        void syncActiveTab();
      }
    }

    void syncActiveTab();

    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.windows.onFocusChanged.addListener(handleWindowFocused);
    chrome.tabs.onRemoved.addListener(handleTabRemoved);

    return () => {
      mounted = false;

      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.windows.onFocusChanged.removeListener(handleWindowFocused);
      chrome.tabs.onRemoved.removeListener(handleTabRemoved);
    };
  }, [activeTabId]);

  useEffect(() => {
    let mounted = true;
    let storageChangedBeforeInitialRead = false;

    function handleStorageChange(
      changes: {
        [key: string]: chrome.storage.StorageChange;
      },
      areaName: string,
    ) {
      if (areaName !== "session" || !(MONITORING_STORAGE_KEY in changes)) {
        return;
      }

      storageChangedBeforeInitialRead = true;

      setMonitoringState(
        normalizeMonitoringState(changes[MONITORING_STORAGE_KEY].newValue),
      );

      setStorageError(false);
    }

    chrome.storage.onChanged.addListener(handleStorageChange);

    void chrome.storage.session
      .get(MONITORING_STORAGE_KEY)
      .then((stored) => {
        if (mounted && !storageChangedBeforeInitialRead) {
          setMonitoringState(
            normalizeMonitoringState(stored[MONITORING_STORAGE_KEY]),
          );
        }
      })
      .catch(() => {
        if (mounted) {
          setStorageError(true);
        }
      });

    return () => {
      mounted = false;

      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let settingsChangedBeforeInitialRead = false;

    function applySettings(value: unknown) {
      const next = normalizeAnalyzerSettings(value);

      setSettings(next);
      setDraftSettings(next);
      setIgnoredStatusCodesInput(next.ignoredStatusCodes.join(", "));
    }

    function handleSettingsChange(
      changes: {
        [key: string]: chrome.storage.StorageChange;
      },
      areaName: string,
    ) {
      if (areaName !== "local" || !(SETTINGS_STORAGE_KEY in changes)) {
        return;
      }

      settingsChangedBeforeInitialRead = true;
      applySettings(changes[SETTINGS_STORAGE_KEY].newValue);
    }

    chrome.storage.onChanged.addListener(
      handleSettingsChange,
    );

    void chrome.storage.local
      .get(SETTINGS_STORAGE_KEY)
      .then((stored) => {
        if (mounted && !settingsChangedBeforeInitialRead) {
          applySettings(stored[SETTINGS_STORAGE_KEY]);
        }
      })
      .catch(() => {
        if (mounted) {
          setStorageError(true);
        }
      });

    return () => {
      mounted = false;
      chrome.storage.onChanged.removeListener(handleSettingsChange);
    };
  }, []);

  const currentTabRequests = useMemo(() => {
    if (activeTabId === null) {
      return [];
    }

    const cutoff = Date.now() - settings.retentionHours * 60 * 60 * 1000;

    return monitoringState.requests
      .filter(
        (request) =>
          request.tabId === activeTabId &&
          request.timestamp >= cutoff,
      )
      .filter((request) => {
        if (request.kind === "network") {
          return settings.includeNetworkErrors;
        }

        return (
          request.status === null ||
          !settings.ignoredStatusCodes.includes(request.status)
        );
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [monitoringState.requests, activeTabId, settings]);

  const filteredRequests = useMemo(() => {
    let matchingRequests: CapturedRequest[];

    switch (filter) {
      case "4xx":
        matchingRequests = currentTabRequests.filter(
          (request) =>
            request.kind === "http" &&
            (request.status ?? 0) >= 400 &&
            (request.status ?? 0) < 500,
        );
        break;

      case "5xx":
        matchingRequests = currentTabRequests.filter(
          (request) =>
            request.kind === "http" &&
            (request.status ?? 0) >= 500 &&
            (request.status ?? 0) < 600,
        );
        break;

      case "network":
        matchingRequests = currentTabRequests.filter(
          (request) => request.kind === "network",
        );
        break;

      default:
        matchingRequests = currentTabRequests;
    }

    return groupDuplicateRequests(matchingRequests);
  }, [currentTabRequests, filter]);

  async function handleClearCurrentTab() {
    if (activeTabId === null) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        type: "CLEAR_TAB_DATA",
        tabId: activeTabId,
      });

      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  async function handleCopyRequest(
    request: GroupedRequest,
  ): Promise<void> {
    const details = [
      `Method: ${request.method}`,
      `URL: ${request.url}`,
      `Type: ${request.kind}`,
      `Status: ${request.status ?? "N/A"}`,
      `Error: ${request.error ?? "N/A"}`,
      `Duration: ${formatDuration(request.durationMs)}`,
      `Occurrences: ${request.count}`,
      `Last observed: ${new Date(request.timestamp).toISOString()}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(details);
      setActionMessage("Request details copied.");
    } catch {
      setActionMessage("Unable to copy request details.");
    }
  }

  async function handleSaveSettings() {
    const raw = ignoredStatusCodesInput.trim();

    const parsedStatuses =
      raw === ""
        ? []
        : raw.split(",").map((value) => Number(value.trim()));

    if (
      parsedStatuses.some(
        (status) =>
          !Number.isInteger(status) ||
          status < 400 ||
          status > 599,
      )
    ) {
      setSettingsMessage(
        "Enter valid HTTP status codes between 400 and 599, separated by commas.",
      );
      return;
    }

    const nextSettings: AnalyzerSettings = {
      ...draftSettings,
      ignoredStatusCodes: [
        ...new Set(parsedStatuses),
      ],
    };

    try {
      await chrome.storage.local.set({
        [SETTINGS_STORAGE_KEY]: nextSettings,
      });

      setSettings(nextSettings);
      setDraftSettings(nextSettings);
      setIgnoredStatusCodesInput(
        nextSettings.ignoredStatusCodes.join(", "),
      );
      setSettingsMessage("Settings saved successfully.");
      setStorageError(false);
    } catch {
      setSettingsMessage("Unable to save settings.");
    }
  }

  async function handleResetSettings() {
    try {
      const defaults: AnalyzerSettings = {
        ...DEFAULT_ANALYZER_SETTINGS,
        ignoredStatusCodes: [
          ...DEFAULT_ANALYZER_SETTINGS.ignoredStatusCodes,
        ],
      };

      await chrome.storage.local.set({
        [SETTINGS_STORAGE_KEY]: defaults,
      });

      setSettings(defaults);
      setDraftSettings(defaults);
      setIgnoredStatusCodesInput(
        defaults.ignoredStatusCodes.join(", "),
      );
      setSettingsMessage("Default settings restored.");
      setStorageError(false);
    } catch {
      setSettingsMessage("Unable to reset settings.");
    }
  }

  function handleExportReport(
    format: "json" | "csv",
  ): void {
    if (activeTabId === null) {
      return;
    }

    const exportedAt = new Date().toISOString();

    const report = {
      application: "API Analyzer",
      exportedAt,
      tabId: activeTabId,
      filter,
      pageMetrics: pageMetrics ?? null,
      summary: {
        groups: filteredRequests.length,
        occurrences: filteredRequests.reduce(
          (total, request) => total + request.count,
          0,
        ),
      },
      requests: filteredRequests.map((request) => ({
        method: request.method,
        url: request.url,
        kind: request.kind,
        status: request.status,
        error: request.error,
        durationMs: request.durationMs,
        occurrences: request.count,
        lastObserved: new Date(request.timestamp).toISOString(),
      })),
    };

    const filenameTime = exportedAt.replace(/[:.]/g, "-");
    const filename = `api-analyzer-${activeTabId}-${filenameTime}`;

    if (format === "json") {
      downloadFile(
        `${filename}.json`,
        JSON.stringify(report, null, 2),
        "application/json;charset=utf-8",
      );

      setActionMessage("JSON report exported.");
      return;
    }

    const headers = [
      "method",
      "url",
      "kind",
      "status",
      "error",
      "duration_ms",
      "occurrences",
      "last_observed",
      "page_load_ms",
      "dom_content_loaded_ms",
      "ttfb_ms",
    ];

    const rows = filteredRequests.map((request) =>
      [
        request.method,
        request.url,
        request.kind,
        request.status,
        request.error,
        request.durationMs,
        request.count,
        new Date(request.timestamp).toISOString(),
        pageMetrics?.loadMs ?? null,
        pageMetrics?.domContentLoadedMs ?? null,
        pageMetrics?.ttfbMs ?? null,
      ]
        .map((value) =>
          escapeCsvValue(value),
        )
        .join(","),
    );

    const csv = [
      headers.map(escapeCsvValue).join(","),
      ...rows,
    ].join("\r\n");

    downloadFile(
      `${filename}.csv`,
      `\uFEFF${csv}`,
      "text/csv;charset=utf-8",
    );

    setActionMessage("CSV report exported.");
  }

  const storedPageMetrics = activeTabId === null
    ? undefined
    : monitoringState.pageMetrics[String(activeTabId)];

  const retentionCutoff = Date.now() - settings.retentionHours * 60 * 60 * 1000;

  const pageMetrics = storedPageMetrics && storedPageMetrics.capturedAt >= retentionCutoff
    ? storedPageMetrics
    : undefined;

  return (
    <main className="min-h-screen bg-[#080f1c] p-4 text-slate-100">
      <header className="flex items-center gap-3">
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3">
          <ShieldAlert className="h-6 w-6 text-violet-300" />
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold">
            API Analyzer
          </h1>

          <p className="text-xs text-slate-400">
            API errors and page performance
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setShowSettings((current) => !current);
            setSettingsMessage(null);
          }}
          aria-label={showSettings ? "Close settings" : "Open settings"}
          aria-expanded={showSettings}
          className={`rounded-lg border p-2 transition ${
            showSettings
              ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
              : "border-white/10 text-slate-400 hover:bg-white/[0.07] hover:text-white"
          }`}
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </header>

      {showSettings && (
        <section className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Monitoring settings</h2>
              <p className="mt-1 text-xs text-slate-400">
                Configure which problems API Analyzer displays.
              </p>
            </div>

            <Settings2 className="h-5 w-5 text-violet-300" />
          </div>

          <div className="mt-5">
            <label
              htmlFor="ignored-status-codes"
              className="text-sm font-medium"
            >
              Ignored HTTP status codes
            </label>

            <input
              id="ignored-status-codes"
              type="text"
              value={ignoredStatusCodesInput}
              onChange={(event) => {
                setIgnoredStatusCodesInput(event.target.value);
                setSettingsMessage(null);
              }}
              placeholder="401, 404"
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#080f1c] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
            />

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Separate codes with commas. Use values from 400 to 599.
              By default, 401 Unauthorized is ignored.
            </p>
          </div>

          <label className="mt-5 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={draftSettings.includeNetworkErrors}
              onChange={(event) => {
                setDraftSettings((current) => ({
                  ...current,
                  includeNetworkErrors: event.target.checked,
                }));
                setSettingsMessage(null);
              }}
              className="mt-0.5 h-4 w-4 accent-violet-400"
            />

            <span>
              <span className="block text-sm font-medium">
                Include network errors
              </span>

              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Capture failed requests without an HTTP response,
                excluding intentionally aborted requests.
              </span>
            </span>
          </label>

          <div className="mt-5">
            <label
              htmlFor="history-retention"
              className="text-sm font-medium"
            >
              History retention
            </label>

            <select
              id="history-retention"
              value={draftSettings.retentionHours}
              onChange={(event) => {
                setDraftSettings((current) => ({
                  ...current,
                  retentionHours: Number(
                    event.target.value,
                  ) as AnalyzerSettings["retentionHours"],
                }));
                setSettingsMessage(null);
              }}
              className="mt-2 w-full rounded-lg border border-white/10 bg-[#080f1c] px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/50"
            >
              <option value={1}>1 hour</option>
              <option value={6}>6 hours</option>
              <option value={24}>24 hours</option>
              <option value={72}>3 days</option>
            </select>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Older entries are removed when monitoring data is next
              updated. Session history is also cleared when the
              browser session ends or the extension is reloaded.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSaveSettings()}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-400"
            >
              <Save className="h-3.5 w-3.5" />
              Save settings
            </button>

            <button
              type="button"
              onClick={() => void handleResetSettings()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.07]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset defaults
            </button>
          </div>

          {settingsMessage && (
            <p
              role="status"
              className="mt-3 text-xs text-slate-400"
            >
              {settingsMessage}
            </p>
          )}
        </section>
      )}

      <section className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-300" />

          <h2 className="text-sm font-semibold">
            Page performance
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={<Timer className="h-4 w-4 text-cyan-300" />}
            label="Page load"
            value={formatDuration(pageMetrics?.loadMs)}
          />

          <MetricCard
            icon={<Clock3 className="h-4 w-4 text-violet-300" />}
            label="DOM content loaded"
            value={formatDuration(pageMetrics?.domContentLoadedMs)}
          />

          <MetricCard
            icon={<Network className="h-4 w-4 text-emerald-300" />}
            label="TTFB"
            value={formatDuration(pageMetrics?.ttfbMs)}
          />

          <MetricCard
            icon={<AlertCircle className="h-4 w-4 text-rose-300" />}
            label="Problem requests"
            value={String(currentTabRequests.length)}
          />
        </div>

        {pageMetrics && (
          <div className="mt-2 flex items-start gap-2 rounded-lg bg-white/[0.03] px-3 py-2">
            <Globe className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />

            <div className="min-w-0">
              <p className="truncate text-xs text-slate-400">
                {pageMetrics.url}
              </p>

              <p className="mt-1 text-[11px] text-slate-500">
                Captured at{" "}
                {new Date(pageMetrics.capturedAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
        )}

        {!pageMetrics && (
          <p className="mt-3 text-xs leading-5 text-slate-500">
            No page timing recorded for this tab yet.
            Reload the webpage to capture its navigation metrics.
          </p>
        )}
      </section>

      <section className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-300" />

            <h2 className="text-sm font-semibold">
              API problems
            </h2>

            <span className="rounded-full bg-white/[0.06] px-2 py-1 text-xs text-slate-400">
              {filteredRequests.length} groups
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleExportReport("json")}
              disabled={activeTabId === null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
              title="Export the current view as JSON"
            >
              <Download className="h-3.5 w-3.5" />
              JSON
            </button>

            <button
              type="button"
              onClick={() => handleExportReport("csv")}
              disabled={activeTabId === null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
              title="Export the current view as CSV"
            >
              <Download className="h-3.5 w-3.5" />
              CSV
            </button>

            <button
              type="button"
              onClick={() => void handleClearCurrentTab()}
              disabled={
                activeTabId === null ||
                (currentTabRequests.length === 0 && !pageMetrics)
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-40"
              title="Clear this tab's requests and page metrics"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear tab
            </button>
          </div>
        </div>

        {actionMessage && (
          <p
            role="status"
            className="mt-2 text-xs text-slate-400"
          >
            {actionMessage}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          {ApiFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                filter === item.value
                  ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
                  : "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {storageError && (
          <p className="mt-3 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200">
            Unable to read monitoring data. Check the
            extension's storage permissions.
          </p>
        )}

        {activeTabId === null ? (
          <EmptyState message="Select a regular website tab to view its monitoring data." />
        ) : filteredRequests.length === 0 ? (
          <EmptyState message={currentTabRequests.length === 0
              ? "No problems captured for this tab. Browse or reload the page to monitor its API requests."
              : "No requests match this filter."
            }
          />
        ) : (
          <div className="mt-3 space-y-2">
            {filteredRequests.map((request) => (
              <article
                key={request.id}
                className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
              >
                <div className="flex items-start gap-2">
                  {request.kind === "network" ? (
                    <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  ) : (
                    <AlertCircle className={`mt-0.5 h-4 w-4 shrink-0 ${
                        (request.status ?? 0) >= 500
                          ? "text-rose-300"
                          : "text-orange-300"
                        }`
                      }
                    />
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-200">
                        {request.method}
                      </span>

                      <div className="flex items-center gap-2">
                        {request.count > 1 && (
                          <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300">
                            {request.count} occurrences
                          </span>
                        )}

                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold ${getRequestBadgeClass(request)}`}>
                          {request.kind === "network" ? "NETWORK" : request.status}
                        </span>

                        <button
                          type="button"
                          onClick={() => void handleCopyRequest(request)}
                          className="rounded-md border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                          title="Copy request details"
                          aria-label={`Copy details for ${request.method} ${request.url}`}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="mt-2 break-all font-mono text-xs leading-5 text-slate-300" title={request.url}>
                      {request.url}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span>
                        {request.kind === "network" ? request.error : `HTTP ${request.status}`}
                      </span>

                      <span>
                        {formatDuration(request.durationMs)}
                      </span>

                      <span>
                        {new Date(request.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex items-center gap-2">
        {icon}

        <span className="text-xs text-slate-400">
          {label}
        </span>
      </div>

      <p className="mt-3 break-words text-xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
      <Activity className="mx-auto h-6 w-6 text-slate-600" />

      <p className="mx-auto mt-3 max-w-xs text-xs leading-5 text-slate-400">
        {message}
      </p>
    </div>
  );
}