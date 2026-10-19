import { AlertCircle, Copy, WifiOff } from "lucide-react";
import { formatDuration, getRequestBadgeClass, type GroupedRequest } from "../lib/utils/request";

type RequestCardProps = {
  request: GroupedRequest;
  onCopyRequest: (request: GroupedRequest) => Promise<void>;
};

export default function RequestCard({
  request,
  onCopyRequest,
}: RequestCardProps) {
  return (
    <article className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex items-start gap-2">
        {request.kind === "network" ? (
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
        ) : (
          <AlertCircle
            className={`mt-0.5 h-4 w-4 shrink-0 ${
              (request.status ?? 0) >= 500
                ? "text-rose-300"
                : "text-orange-300"
            }`}
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

              <span
                className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold ${getRequestBadgeClass(request)}`}
              >
                {request.kind === "network" ? "NETWORK" : request.status}
              </span>

              {request.slowCount > 0 && (
                <span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[11px] text-amber-200">
                  {request.slowCount} slow
                </span>
              )}

              <button
                type="button"
                onClick={() => void onCopyRequest(request)}
                className="rounded-md border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                title="Copy request details"
                aria-label={`Copy details for ${request.method} ${request.url}`}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <p
            className="mt-2 break-all font-mono text-xs leading-5 text-slate-300"
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
