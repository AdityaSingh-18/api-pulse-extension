import type { PageMetrics } from "../lib/monitoring-types";
import { formatDuration } from "../lib/utils/request";
import MetricCard from "./MetricCard";

import {
  Activity,
  AlertCircle,
  Clock3,
  Globe,
  Network,
  Timer,
} from "lucide-react";

type PerformanceSectionProps = {
  pageMetrics: PageMetrics | undefined;
  currentTabRequestCount: number;
  isDark: boolean;
};

export default function PerformanceSection({
  pageMetrics,
  currentTabRequestCount,
  isDark,
}: PerformanceSectionProps) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Activity
          className={`h-4 w-4 ${isDark ? "text-cyan-300" : "text-cyan-600"}`}
        />
        <h2 className="text-sm font-semibold">Page performance</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          isDark={isDark}
          icon={
            <Timer
              className={`h-4 w-4 ${
                isDark ? "text-cyan-300" : "text-cyan-600"
              }`}
            />
          }
          label="Page load"
          value={formatDuration(pageMetrics?.loadMs)}
        />

        <MetricCard
          isDark={isDark}
          icon={
            <Clock3
              className={`h-4 w-4 ${
                isDark ? "text-violet-300" : "text-violet-600"
              }`}
            />
          }
          label="DOM content loaded"
          value={formatDuration(pageMetrics?.domContentLoadedMs)}
        />

        <MetricCard
          isDark={isDark}
          icon={
            <Network
              className={`h-4 w-4 ${
                isDark ? "text-emerald-300" : "text-emerald-600"
              }`}
            />
          }
          label="TTFB"
          value={formatDuration(pageMetrics?.ttfbMs)}
        />

        <MetricCard
          isDark={isDark}
          icon={
            <AlertCircle
              className={`h-4 w-4 ${
                isDark ? "text-rose-300" : "text-rose-600"
              }`}
            />
          }
          label="Captured requests"
          value={String(currentTabRequestCount)}
        />
      </div>

      {pageMetrics && (
        <div
          className={`mt-2 flex items-start gap-2 rounded-lg border px-3 py-2 ${
            isDark
              ? "border-white/[0.06] bg-white/[0.03]"
              : "border-slate-200 bg-white"
          }`}
        >
          <Globe
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
              isDark ? "text-slate-500" : "text-slate-400"
            }`}
          />

          <div className="min-w-0">
            <p
              className={`truncate text-xs ${
                isDark ? "text-slate-400" : "text-slate-700"
              }`}
            >
              {pageMetrics.url}
            </p>

            <p className="mt-1 text-[11px] text-slate-500">
              Captured at {new Date(pageMetrics.capturedAt).toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}

      {!pageMetrics && (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          No page timing recorded for this tab yet. Reload the webpage to
          capture its navigation metrics.
        </p>
      )}
    </section>
  );
}