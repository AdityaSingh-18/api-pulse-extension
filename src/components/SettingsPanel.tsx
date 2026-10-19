import type { Dispatch, SetStateAction } from "react";

import {
  SLOW_REQUEST_THRESHOLDS_MS,
  type AnalyzerSettings,
} from "../lib/analyzer-settings";

import {
  RotateCcw,
  Save,
  Settings2,
} from "lucide-react";

type SettingsPanelProps = {
  draftSettings: AnalyzerSettings;
  setDraftSettings: Dispatch<SetStateAction<AnalyzerSettings>>;
  ignoredStatusCodesInput: string;
  setIgnoredStatusCodesInput: Dispatch<SetStateAction<string>>;
  settingsMessage: string | null;
  setSettingsMessage: Dispatch<SetStateAction<string | null>>;
  onSaveSettings: () => void;
  onResetSettings: () => void;
};

export default function SettingsPanel({
  draftSettings,
  setDraftSettings,
  ignoredStatusCodesInput,
  setIgnoredStatusCodesInput,
  settingsMessage,
  setSettingsMessage,
  onSaveSettings,
  onResetSettings,
}: SettingsPanelProps) {
  return (
    <section className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Monitoring settings</h2>
          <p className="mt-1 text-xs text-slate-400">
            Configure which problems API Pulse displays.
          </p>
        </div>

        <Settings2 className="h-5 w-5 text-violet-300" />
      </div>

      <div className="mt-5">
        <label
          htmlFor="ignored-status-codes"
          className="text-sm font-medium"
        >
          Ignored HTTP status codes
        </label>

        <input
          id="ignored-status-codes"
          type="text"
          value={ignoredStatusCodesInput}
          onChange={(event) => {
            setIgnoredStatusCodesInput(event.target.value);
            setSettingsMessage(null);
          }}
          placeholder="401, 404"
          className="mt-2 w-full rounded-lg border border-white/10 bg-[#080f1c] px-3 py-2 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
        />

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Separate codes with commas. Use values from 400 to 599. By default,
          401 Unauthorized is ignored.
        </p>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={draftSettings.includeNetworkErrors}
          onChange={(event) => {
            setDraftSettings((current) => ({
              ...current,
              includeNetworkErrors: event.target.checked,
            }));
            setSettingsMessage(null);
          }}
          className="mt-0.5 h-4 w-4 accent-violet-400"
        />

        <span>
          <span className="block text-sm font-medium">
            Include network errors
          </span>

          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Capture failed requests without an HTTP response, excluding
            intentionally aborted requests.
          </span>
        </span>
      </label>

      <div className="mt-5">
        <label htmlFor="history-retention" className="text-sm font-medium">
          History retention
        </label>

        <select
          id="history-retention"
          value={draftSettings.retentionHours}
          onChange={(event) => {
            setDraftSettings((current) => ({
              ...current,
              retentionHours: Number(
                event.target.value,
              ) as AnalyzerSettings["retentionHours"],
            }));
            setSettingsMessage(null);
          }}
          className="mt-2 w-full rounded-lg border border-white/10 bg-[#080f1c] px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/50"
        >
          <option value={1}>1 hour</option>
          <option value={6}>6 hours</option>
          <option value={24}>24 hours</option>
          <option value={72}>3 days</option>
        </select>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Older entries are removed when monitoring data is next updated. Session
          history is also cleared when the browser session ends or the extension
          is reloaded.
        </p>
      </div>

      <div className="mt-5">
        <label
          htmlFor="slow-request-threshold"
          className="text-sm font-medium"
        >
          Slow request threshold
        </label>

        <select
          id="slow-request-threshold"
          value={draftSettings.slowRequestThresholdMs}
          onChange={(event) => {
            setDraftSettings((current) => ({
              ...current,
              slowRequestThresholdMs: Number(
                event.target.value,
              ) as AnalyzerSettings["slowRequestThresholdMs"],
            }));
            setSettingsMessage(null);
          }}
          className="mt-2 w-full rounded-lg border border-white/10 bg-[#080f1c] px-3 py-2 text-sm text-slate-100 outline-none focus:border-violet-400/50"
        >
          {SLOW_REQUEST_THRESHOLDS_MS.map((threshold) => (
            <option key={threshold} value={threshold}>
              {threshold < 1000
                ? `${threshold} ms`
                : `${threshold / 1000} second${threshold === 1000 ? "" : "s"}`}
            </option>
          ))}
        </select>

        <p className="mt-2 text-xs leading-5 text-slate-500">
          Requests taking at least this long will be marked slow. Changes apply
          to new requests.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSaveSettings}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-violet-400"
        >
          <Save className="h-3.5 w-3.5" />
          Save settings
        </button>

        <button
          type="button"
          onClick={onResetSettings}
          className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 transition hover:bg-white/[0.07]"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset defaults
        </button>
      </div>

      {settingsMessage && (
        <p role="status" className="mt-3 text-xs text-slate-400">
          {settingsMessage}
        </p>
      )}
    </section>
  );
}