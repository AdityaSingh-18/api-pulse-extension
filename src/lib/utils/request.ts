import type { CapturedRequest } from "../monitoring-types";

export type RequestFilter = "all" | "4xx" | "5xx" | "network" | "slow";

export const ApiFilters: { label: string; value: RequestFilter }[] = [
  { label: "All", value: "all" },
  { label: "4xx", value: "4xx" },
  { label: "5xx", value: "5xx" },
  { label: "Network", value: "network" },
  { label: "Slow", value: "slow" },
];

export interface GroupedRequest extends CapturedRequest {
  count: number;
  slowCount: number;
}

export function formatDuration(
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

export function getRequestBadgeClass(
  request: CapturedRequest,
  isDark = true,
): string {
  if (request.kind === "network") {
    return isDark
      ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
      : "border-amber-500/30 bg-amber-50 text-amber-800";
  }

  if ((request.status ?? 0) >= 500) {
    return isDark
      ? "border-rose-400/20 bg-rose-400/10 text-rose-200"
      : "border-rose-500/30 bg-rose-50 text-rose-700";
  }

  if ((request.status ?? 0) >= 400) {
    return isDark
      ? "border-orange-400/20 bg-orange-400/10 text-orange-200"
      : "border-orange-500/30 bg-orange-50 text-orange-700";
  }

  return isDark
    ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
    : "border-amber-500/30 bg-amber-50 text-amber-800";
}

export function groupDuplicateRequests(
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
      existing.slowCount += request.isSlow ? 1 : 0;
      existing.isSlow = existing.isSlow || request.isSlow;
    } else {
      groups.set(key, {
        ...request,
        count: 1,
        slowCount: request.isSlow ? 1 : 0,
      });
    }
  }

  return [...groups.values()].sort((a, b) => b.timestamp - a.timestamp);
}

export function downloadFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
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

export function escapeCsvValue(value: string | number | null): string {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}