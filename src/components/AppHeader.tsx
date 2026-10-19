import { Moon, Settings2, ShieldAlert, Sun } from "lucide-react";

type AppHeaderProps = {
  showSettings: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  onToggleSettings: () => void;
};

export default function AppHeader({
  showSettings,
  isDark,
  onToggleTheme,
  onToggleSettings,
}: AppHeaderProps) {
  const subtleButtonClass = isDark
    ? "border-white/10 text-slate-400 hover:bg-white/[0.07] hover:text-white"
    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900";

  return (
    <header className="flex items-center gap-3">
      <div
        className={`rounded-xl border p-3 ${
          isDark
            ? "border-violet-400/20 bg-violet-500/10 text-violet-300"
            : "border-violet-200 bg-violet-50 text-violet-600"
        }`}
      >
        <ShieldAlert className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold">API Pulse</h1>
        <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          API errors and page performance
        </p>
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