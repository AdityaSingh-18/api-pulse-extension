export const SETTINGS_STORAGE_KEY = "apiAnalyzerSettings";

export const HISTORY_RETENTION_HOURS = [
  1,
  6,
  24,
  72,
] as const;

export const SLOW_REQUEST_THRESHOLDS_MS = [
  500,
  1000,
  1500,
  2000,
  3000,
  5000,
] as const;

export const THEME_MODES = ["dark", "light"] as const;

export type HistoryRetentionHours =
  (typeof HISTORY_RETENTION_HOURS)[number];

export type SlowRequestThresholdMs =
  (typeof SLOW_REQUEST_THRESHOLDS_MS)[number];

export type ThemeMode = (typeof THEME_MODES)[number];

export interface AnalyzerSettings {
  ignoredStatusCodes: number[];
  includeNetworkErrors: boolean;
  retentionHours: HistoryRetentionHours;
  slowRequestThresholdMs: SlowRequestThresholdMs;
  theme: ThemeMode;
}

export const DEFAULT_ANALYZER_SETTINGS: AnalyzerSettings = {
  ignoredStatusCodes: [401],
  includeNetworkErrors: true,
  retentionHours: 24,
  slowRequestThresholdMs: 1500,
  theme: "dark",
};

export function normalizeAnalyzerSettings(
  value: unknown,
): AnalyzerSettings {
  if (typeof value !== "object" || value === null) {
    return {
      ...DEFAULT_ANALYZER_SETTINGS,
      ignoredStatusCodes: [
        ...DEFAULT_ANALYZER_SETTINGS.ignoredStatusCodes,
      ],
    };
  }

  const settings = value as Partial<AnalyzerSettings>;

  const ignoredStatusCodes = Array.isArray(
    settings.ignoredStatusCodes,
  )
    ? [
        ...new Set(
          settings.ignoredStatusCodes.filter(
            (status): status is number =>
              typeof status === "number" &&
              Number.isInteger(status) &&
              status >= 400 &&
              status <= 599,
          ),
        ),
      ]
    : [...DEFAULT_ANALYZER_SETTINGS.ignoredStatusCodes];

  const retentionHours = HISTORY_RETENTION_HOURS.includes(
    settings.retentionHours as HistoryRetentionHours,
  )
    ? (settings.retentionHours as HistoryRetentionHours)
    : DEFAULT_ANALYZER_SETTINGS.retentionHours;

  const slowRequestThresholdMs =
    SLOW_REQUEST_THRESHOLDS_MS.includes(
      settings.slowRequestThresholdMs as SlowRequestThresholdMs,
    )
      ? (settings.slowRequestThresholdMs as SlowRequestThresholdMs)
      : DEFAULT_ANALYZER_SETTINGS.slowRequestThresholdMs;

  const theme = THEME_MODES.includes(settings.theme as ThemeMode)
    ? (settings.theme as ThemeMode)
    : DEFAULT_ANALYZER_SETTINGS.theme;

  return {
    ignoredStatusCodes,
    includeNetworkErrors:
      typeof settings.includeNetworkErrors === "boolean"
        ? settings.includeNetworkErrors
        : DEFAULT_ANALYZER_SETTINGS.includeNetworkErrors,
    retentionHours,
    slowRequestThresholdMs,
    theme,
  };
}