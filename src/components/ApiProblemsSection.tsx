import {
  ApiFilters,
  type GroupedRequest,
  type RequestFilter,
} from "../lib/utils/request";
import type { CapturedRequest } from "../lib/monitoring-types";

import EmptyState from "./EmptyState";
import RequestCard from "./RequestCard";

import { AlertCircle, Download, Trash2 } from "lucide-react";

type ApiProblemsSectionProps = {
  activeTabId: number | null;
  currentTabRequests: CapturedRequest[];
  filteredRequests: GroupedRequest[];
  filter: RequestFilter;
  onFilterChange: (filter: RequestFilter) => void;
  actionMessage: string | null;
  storageError: boolean;
  canClearTab: boolean;
  isDark: boolean;
  onExportReport: (format: "json" | "csv") => void;
  onClearCurrentTab: () => void;
  onCopyRequest: (request: GroupedRequest) => Promise<void>;
};

export default function ApiProblemsSection({
  activeTabId,
  currentTabRequests,
  filteredRequests,
  filter,
  onFilterChange,
  actionMessage,
  storageError,
  canClearTab,
  isDark,
  onExportReport,
  onClearCurrentTab,
  onCopyRequest,
}: ApiProblemsSectionProps) {
  const actionBtnClass = isDark
    ? "border-white/10 text-slate-300 hover:bg-white/[0.07]"
    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100";

  return (
    <section className="mt-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertCircle
            className={`h-4 w-4 ${isDark ? "text-rose-300" : "text-rose-600"}`}
          />
          <h2 className="text-sm font-semibold">API problems</h2>
          <span
            className={`rounded-full px-2 py-1 text-xs ${
              isDark
                ? "bg-white/[0.06] text-slate-400"
                : "bg-slate-200/80 text-slate-700"
            }`}
          >
            {filteredRequests.length} groups
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onExportReport("json")}
            disabled={activeTabId === null}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${actionBtnClass}`}
            title="Export the current view as JSON"
          >
            <Download className="h-3.5 w-3.5" />
            JSON
          </button>

          <button
            type="button"
            onClick={() => onExportReport("csv")}
            disabled={activeTabId === null}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${actionBtnClass}`}
            title="Export the current view as CSV"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>

          <button
            type="button"
            onClick={onClearCurrentTab}
            disabled={!canClearTab}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-40 ${
              isDark
                ? "border-white/10 text-slate-400 hover:border-rose-400/30 hover:bg-rose-400/10 hover:text-rose-200"
                : "border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
            }`}
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
          className={`mt-2 text-xs ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}
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
            onClick={() => onFilterChange(item.value)}
            className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
              filter === item.value
                ? isDark
                  ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
                  : "border-violet-300 bg-violet-600 text-white"
                : isDark
                  ? "border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07]"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {storageError && (
        <p
          className={`mt-3 rounded-lg border p-3 text-xs ${
            isDark
              ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
              : "border-rose-300 bg-rose-50 text-rose-700"
          }`}
        >
          Unable to read monitoring data. Check the extension's storage
          permissions.
        </p>
      )}

      {activeTabId === null ? (
        <EmptyState
          isDark={isDark}
          message="Select a regular website tab to view its monitoring data."
        />
      ) : filteredRequests.length === 0 ? (
        <EmptyState
          isDark={isDark}
          message={
            currentTabRequests.length === 0
              ? "No problems captured for this tab. Browse or reload the page to monitor its API requests."
              : "No requests match this filter."
          }
        />
      ) : (
        <div className="mt-3 space-y-2">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              isDark={isDark}
              onCopyRequest={onCopyRequest}
            />
          ))}
        </div>
      )}
    </section>
  );
}