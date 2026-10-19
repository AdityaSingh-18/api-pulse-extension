import {
  AppWindow,
  Moon,
  PanelRight,
  Settings2,
  ShieldAlert,
  Sun,
} from "lucide-react";
import type { DisplayMode } from "../lib/analyzer-settings";

type AppHeaderProps = {
  showSettings: boolean;
  isDark: boolean;
  displayMode: DisplayMode;
  onSwitchDisplayMode: (mode: DisplayMode) => void;
  onToggleTheme: () => void;
  onToggleSettings: () => void;
};

export default function AppHeader({
  showSettings,
  isDark,
  displayMode,
  onSwitchDisplayMode,
  onToggleTheme,
  onToggleSettings,
}: AppHeaderProps) {
  const subtleButtonClass = isDark
    ? "border-white/10 text-slate-400 hover:bg-white/[0.07] hover:text-white"
    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900";

  return (
    <header className="flex items-center gap-2.5">
      <div
        className={`rounded-xl border p-2.5 ${
          isDark
            ? "border-violet-400/20 bg-violet-500/10 text-violet-300"
            : "border-violet-200 bg-violet-50 text-violet-600"
        }`}
      >
        <ShieldAlert className="h-5 w-5" />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold">API Pulse</h1>
        <p
          className={`truncate text-xs ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          API errors and page performance
        </p>
      </div>

      <div
        className={`inline-flex items-center rounded-lg border p-0.5 ${
          isDark
            ? "border-white/10 bg-white/[0.03]"
            : "border-slate-200 bg-slate-100"
        }`}
        role="group"
        aria-label="Extension display mode"
      >
        <button
          type="button"
          onClick={() => onSwitchDisplayMode("sidebar")}
          title="Sidebar mode"
          aria-pressed={displayMode === "sidebar"}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
            displayMode === "sidebar"
              ? isDark
                ? "bg-violet-500/20 text-violet-200"
                : "bg-white text-violet-700 shadow-2xs"
              : isDark
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <PanelRight className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sidebar</span>
        </button>

        <button
          type="button"
          onClick={() => onSwitchDisplayMode("floating")}
          title="Floating window mode"
          aria-pressed={displayMode === "floating"}
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
            displayMode === "floating"
              ? isDark
                ? "bg-violet-500/20 text-violet-200"
                : "bg-white text-violet-700 shadow-2xs"
              : isDark
                ? "text-slate-400 hover:text-slate-200"
                : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <AppWindow className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Floating</span>
        </button>
      </div>

      <button
        type="button"
        onClick={onToggleTheme}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
        title={isDark ? "Switch to light theme" : "Switch to dark theme"}
        className={`rounded-lg border p-2 transition ${subtleButtonClass}`}
      >
        {isDark ? (
          <Sun className="h-4 w-4 text-amber-300" />
        ) : (
          <Moon className="h-4 w-4 text-slate-700" />
        )}
      </button>

      <button
        type="button"
        onClick={onToggleSettings}
        aria-label={showSettings ? "Close settings" : "Open settings"}
        aria-expanded={showSettings}
        className={`rounded-lg border p-2 transition ${
          showSettings
            ? isDark
              ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
              : "border-violet-300 bg-violet-50 text-violet-700"
            : subtleButtonClass
        }`}
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </header>
  );
}