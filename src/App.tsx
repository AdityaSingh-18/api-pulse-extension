import { useMemo, useState } from "react";
import type { CapturedRequest } from "./lib/monitoring-types";

import {
  DEFAULT_ANALYZER_SETTINGS,
  SETTINGS_STORAGE_KEY,
  type AnalyzerSettings,
  type DisplayMode,
  type ThemeMode,
} from "./lib/analyzer-settings";

import {
  downloadFile,
  escapeCsvValue,
  formatDuration,
  groupDuplicateRequests,
  type GroupedRequest,
  type RequestFilter,
} from "./lib/utils/request";

import { useActiveTab } from "./hooks/useActiveTab";
import { useAnalyzerSettings } from "./hooks/useAnalyzerSettings";
import { useMonitoringData } from "./hooks/useMonitoringData";
import ApiProblemsSection from "./components/ApiProblemsSection";
import AppHeader from "./components/AppHeader";
import PerformanceSection from "./components/PerformanceSection";
import SettingsPanel from "./components/SettingsPanel";

export default function App() {
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const activeTabId = useActiveTab();

  const {
    monitoringState,
    storageError,
    setStorageError,
  } = useMonitoringData();

  const {
    settings,
    setSettings,
    draftSettings,
    setDraftSettings,
    ignoredStatusCodesInput,
    setIgnoredStatusCodesInput,
    settingsMessage,
    setSettingsMessage,
  } = useAnalyzerSettings(setStorageError);

  const isFloatingView = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view") === "floating";
  }, []);

  const isDark = settings.theme === "dark";

  const currentTabRequests = useMemo(() => {
    if (activeTabId === null) {
      return [];
    }

    const cutoff = Date.now() - settings.retentionHours * 60 * 60 * 1000;

    return monitoringState.requests
      .filter(
        (request) =>
          request.tabId === activeTabId && request.timestamp >= cutoff,
      )
      .filter((request) => {
        if (request.kind === "network") {
          return settings.includeNetworkErrors;
        }

        if (request.isSlow) {
          return true;
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
            (request.status ?? 0) < 500 &&
            !settings.ignoredStatusCodes.includes(request.status ?? 0),
        );
        break;

      case "5xx":
        matchingRequests = currentTabRequests.filter(
          (request) =>
            request.kind === "http" &&
            (request.status ?? 0) >= 500 &&
            (request.status ?? 0) < 600 &&
            !settings.ignoredStatusCodes.includes(request.status ?? 0),
        );
        break;

      case "network":
        matchingRequests = currentTabRequests.filter(
          (request) => request.kind === "network",
        );
        break;

      case "slow":
        matchingRequests = currentTabRequests.filter(
          (request) => request.isSlow,
        );
        break;

      default:
        matchingRequests = currentTabRequests;
    }

    return groupDuplicateRequests(matchingRequests);
  }, [currentTabRequests, filter, settings.ignoredStatusCodes]);

  async function persistQuickSetting(
    patch: Partial<AnalyzerSettings>,
  ): Promise<void> {
    const nextSettings: AnalyzerSettings = {
      ...settings,
      ...patch,
    };

    try {
      await chrome.storage.local.set({
        [SETTINGS_STORAGE_KEY]: nextSettings,
      });

      setSettings(nextSettings);
      setDraftSettings((current) => ({
        ...current,
        ...patch,
      }));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }

  async function handleToggleTheme(): Promise<void> {
    const nextTheme: ThemeMode = settings.theme === "dark" ? "light" : "dark";
    await persistQuickSetting({ theme: nextTheme });
  }

  async function handleSwitchDisplayMode(mode: DisplayMode): Promise<void> {
    await persistQuickSetting({ displayMode: mode });

    if (mode === "floating") {
      try {
        await chrome.sidePanel.setPanelBehavior({
          openPanelOnActionClick: false,
        });
        await chrome.action.setPopup({
          popup: "index.html?view=floating",
        });

        if (!isFloatingView) {
          if (typeof chrome.action.openPopup === "function") {
            await chrome.action.openPopup();
            window.close();
            return;
          }
          setActionMessage("Floating popup enabled. Click the extension icon in your toolbar.");
        }
      } catch {
        setActionMessage("Floating popup enabled. Click the extension icon in your toolbar.");
      }
      return;
    }

    try {
      await chrome.action.setPopup({ popup: "" });
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: true,
      });

      if (isFloatingView) {
        const currentWindow = await chrome.windows.getCurrent();
        if (currentWindow.id !== undefined) {
          await chrome.sidePanel.open({ windowId: currentWindow.id });
          window.close();
          return;
        }
      }

      setActionMessage("Sidebar mode enabled.");
    } catch {
      setActionMessage("Sidebar mode enabled. Click the extension icon in your toolbar.");
    }
  }

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

  async function handleCopyRequest(request: GroupedRequest): Promise<void> {
    const details = [
      `Method: ${request.method}`,
      `URL: ${request.url}`,
      `Type: ${request.kind}`,
      `Status: ${request.status ?? "N/A"}`,
      `Error: ${request.error ?? "N/A"}`,
      `Duration: ${formatDuration(request.durationMs)}`,
      `Occurrences: ${request.count}`,
      `Slow occurrences: ${request.slowCount}`,
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
      raw === "" ? [] : raw.split(",").map((value) => Number(value.trim()));

    if (
      parsedStatuses.some(
        (status) =>
          !Number.isInteger(status) || status < 400 || status > 599,
      )
    ) {
      setSettingsMessage(
        "Enter valid HTTP status codes between 400 and 599, separated by commas.",
      );
      return;
    }

    const nextSettings: AnalyzerSettings = {
      ...draftSettings,
      ignoredStatusCodes: [...new Set(parsedStatuses)],
    };

    try {
      await chrome.storage.local.set({
        [SETTINGS_STORAGE_KEY]: nextSettings,
      });

      setSettings(nextSettings);
      setDraftSettings(nextSettings);
      setIgnoredStatusCodesInput(nextSettings.ignoredStatusCodes.join(", "));
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
      setIgnoredStatusCodesInput(defaults.ignoredStatusCodes.join(", "));
      setSettingsMessage("Default settings restored.");
      setStorageError(false);
    } catch {
      setSettingsMessage("Unable to reset settings.");
    }
  }

  function handleExportReport(format: "json" | "csv"): void {
    if (activeTabId === null) {
      return;
    }

    const exportedAt = new Date().toISOString();

    const report = {
      application: "API Pulse",
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
        slowOccurrences: request.slowCount,
        lastObserved: new Date(request.timestamp).toISOString(),
      })),
    };

    const filenameTime = exportedAt.replace(/[:.]/g, "-");
    const filename = `api-pulse-${activeTabId}-${filenameTime}`;

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
      "slow_occurrences",
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
        request.slowCount,
        new Date(request.timestamp).toISOString(),
        pageMetrics?.loadMs ?? null,
        pageMetrics?.domContentLoadedMs ?? null,
        pageMetrics?.ttfbMs ?? null,
      ]
        .map(escapeCsvValue)
        .join(","),
    );

    const csv = [headers.map(escapeCsvValue).join(","), ...rows].join("\r\n");

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
    <main
      className={`${
        isFloatingView
          ? "w-[420px] max-h-[600px] overflow-y-auto"
          : "min-h-screen w-full"
      } p-4 transition-colors duration-200 ${
        isDark
          ? "bg-[#080f1c] text-slate-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      <AppHeader
        showSettings={showSettings}
        isDark={isDark}
        displayMode={settings.displayMode}
        onSwitchDisplayMode={(mode) => void handleSwitchDisplayMode(mode)}
        onToggleTheme={() => void handleToggleTheme()}
        onToggleSettings={() => {
          setShowSettings((current) => !current);
          setSettingsMessage(null);
        }}
      />

      {showSettings && (
        <SettingsPanel
          draftSettings={draftSettings}
          setDraftSettings={setDraftSettings}
          ignoredStatusCodesInput={ignoredStatusCodesInput}
          setIgnoredStatusCodesInput={setIgnoredStatusCodesInput}
          settingsMessage={settingsMessage}
          setSettingsMessage={setSettingsMessage}
          isDark={isDark}
          onSaveSettings={() => void handleSaveSettings()}
          onResetSettings={() => void handleResetSettings()}
        />
      )}

      <PerformanceSection
        pageMetrics={pageMetrics}
        currentTabRequestCount={currentTabRequests.length}
        isDark={isDark}
      />

      <ApiProblemsSection
        activeTabId={activeTabId}
        currentTabRequests={currentTabRequests}
        filteredRequests={filteredRequests}
        filter={filter}
        onFilterChange={setFilter}
        actionMessage={actionMessage}
        storageError={storageError}
        canClearTab={activeTabId !== null && !(currentTabRequests.length === 0 && !pageMetrics)}
        isDark={isDark}
        onExportReport={handleExportReport}
        onClearCurrentTab={() => void handleClearCurrentTab()}
        onCopyRequest={handleCopyRequest}
      />
    </main>
  );
}