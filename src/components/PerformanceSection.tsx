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
};

export default function PerformanceSection({
  pageMetrics,
  currentTabRequestCount,
}: PerformanceSectionProps) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-cyan-300" />
        <h2 className="text-sm font-semibold">Page performance</h2>
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
          label="Captured requests"
          value={String(currentTabRequestCount)}
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