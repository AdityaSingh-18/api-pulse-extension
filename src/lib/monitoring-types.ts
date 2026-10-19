export const MONITORING_STORAGE_KEY = "apiPulseMonitoring";

export const maxRequests = 250;

export const maxTabMetrics = 50;

export interface CapturedRequest {
  id: string;
  tabId: number;
  method: string;
  url: string;
  kind: "http" | "network";
  status: number | null;
  error: string | null;
  durationMs: number | null;
  isSlow: boolean;
  timestamp: number;
}

export interface PageMetrics {
  tabId: number;
  url: string;
  loadMs: number | null;
  domContentLoadedMs: number | null;
  ttfbMs: number | null;
  capturedAt: number;
}

export interface MonitoringState {
  requests: CapturedRequest[];
  pageMetrics: Record<string, PageMetrics>;
}

export const EmptyMonitoringState: MonitoringState = {
  requests: [],
  pageMetrics: {},
};

export function normalizeMonitoringState(
  value: unknown,
): MonitoringState {
  if (typeof value !== "object" || value === null) {
    return {
      requests: [],
      pageMetrics: {},
    };
  }

  const state = value as Partial<MonitoringState>;

  return {
    requests: Array.isArray(state.requests)
      ? (state.requests as CapturedRequest[]).map((request) => ({
          ...request,
          isSlow: typeof request.isSlow === "boolean"
            ? request.isSlow
            : false,
        }))
      : [],
    
    pageMetrics: typeof state.pageMetrics === "object" &&
      state.pageMetrics !== null &&
      !Array.isArray(state.pageMetrics)
        ? state.pageMetrics as Record<string, PageMetrics>
        : {},
  };
}