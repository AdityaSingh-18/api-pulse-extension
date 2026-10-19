export const SETTINGS_STORAGE_KEY = "apiPulseSettings";

export const HISTORY_RETENTION_HOURS = [
  1,
  6,
  24,
  72,
] as const;

export type HistoryRetentionHours = (typeof HISTORY_RETENTION_HOURS)[number];

export interface AnalyzerSettings {
  ignoredStatusCodes: number[];
  includeNetworkErrors: boolean;
  retentionHours: HistoryRetentionHours;
}

export const DEFAULT_ANALYZER_SETTINGS: AnalyzerSettings = {
  ignoredStatusCodes: [401],
  includeNetworkErrors: true,
  retentionHours: 24,
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
  const ignoredStatusCodes = Array.isArray(settings.ignoredStatusCodes,)
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

  return {
    ignoredStatusCodes,
    includeNetworkErrors: typeof settings.includeNetworkErrors === "boolean"
      ? settings.includeNetworkErrors
      : DEFAULT_ANALYZER_SETTINGS.includeNetworkErrors,
    retentionHours,
  };
}