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
  Globe,
  Network,
  ShieldAlert,
  Timer,
  Trash2,
  WifiOff,
} from "lucide-react";

import {
  EmptyMonitoringState,
  storageKey,
  normalizeMonitoringState,
  type CapturedRequest,
  type MonitoringState,
} from "./lib/monitoring-types";

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

export default function App() {
  const [monitoringState, setMonitoringState] = useState<MonitoringState>(EmptyMonitoringState);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [storageError, setStorageError] = useState(false);

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
      if (areaName !== "session" || !(storageKey in changes)) {
        return;
      }

      storageChangedBeforeInitialRead = true;

      setMonitoringState(
        normalizeMonitoringState(changes[storageKey].newValue),
      );

      setStorageError(false);
    }

    chrome.storage.onChanged.addListener(handleStorageChange);

    void chrome.storage.session
      .get(storageKey)
      .then((stored) => {
        if (mounted && !storageChangedBeforeInitialRead) {
          setMonitoringState(
            normalizeMonitoringState(stored[storageKey]),
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

  const currentTabRequests = useMemo(() => {
    if (activeTabId === null) {
      return [];
    }

    return monitoringState.requests
      .filter((request) => request.tabId === activeTabId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [monitoringState.requests, activeTabId]);

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

  const pageMetrics = activeTabId === null
    ? undefined
    : monitoringState.pageMetrics[String(activeTabId)];

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
      </header>

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
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-300" />

            <h2 className="text-sm font-semibold">
              API problems
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">
              {filteredRequests.length} groups
            </span>

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