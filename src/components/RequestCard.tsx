import { AlertCircle, Copy, WifiOff } from "lucide-react";
import {
  formatDuration,
  getRequestBadgeClass,
  type GroupedRequest,
} from "../lib/utils/request";

type RequestCardProps = {
  request: GroupedRequest;
  isDark: boolean;
  onCopyRequest: (request: GroupedRequest) => Promise<void>;
};

export default function RequestCard({
  request,
  isDark,
  onCopyRequest,
}: RequestCardProps) {
  return (
    <article
      className={`rounded-xl border p-3 ${
        isDark
          ? "border-white/[0.08] bg-white/[0.03]"
          : "border-slate-200 bg-white shadow-2xs"
      }`}
    >
      <div className="flex items-start gap-2">
        {request.kind === "network" ? (
          <WifiOff
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              isDark ? "text-amber-300" : "text-amber-600"
            }`}
          />
        ) : (
          <AlertCircle
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              (request.status ?? 0) >= 500
                ? isDark
                  ? "text-rose-300"
                  : "text-rose-600"
                : isDark
                  ? "text-orange-300"
                  : "text-orange-600"
            }`}
          />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-xs font-medium ${
                isDark ? "text-slate-200" : "text-slate-800"
              }`}
            >
              {request.method}
            </span>

            <div className="flex items-center gap-2">
              {request.count > 1 && (
                <span
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    isDark
                      ? "border-white/10 bg-white/5 text-slate-300"
                      : "border-slate-200 bg-slate-100 text-slate-700"
                  }`}
                >
                  {request.count} occurrences
                </span>
              )}

              <span
                className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold ${getRequestBadgeClass(
                  request,
                  isDark,
                )}`}
              >
                {request.kind === "network" ? "NETWORK" : request.status}
              </span>

              {request.slowCount > 0 && (
                <span
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    isDark
                      ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
                      : "border-amber-400/40 bg-amber-50 text-amber-800"
                  }`}
                >
                  {request.slowCount} slow
                </span>
              )}

              <button
                type="button"
                onClick={() => void onCopyRequest(request)}
                className={`rounded-md border p-1.5 transition ${
                  isDark
                    ? "border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                    : "border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                }`}
                title="Copy request details"
                aria-label={`Copy details for ${request.method} ${request.url}`}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p
            className={`mt-2 break-all font-mono text-xs leading-5 ${
              isDark ? "text-slate-300" : "text-slate-700"
            }`}
            title={request.url}
          >
            {request.url}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span>
              {request.kind === "network"
                ? request.error
                : `HTTP ${request.status}`}
            </span>

            <span>{formatDuration(request.durationMs)}</span>
            <span>{new Date(request.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </div>
    </article>
  );
}