import { Settings2, ShieldAlert } from "lucide-react";

type AppHeaderProps = {
  showSettings: boolean;
  onToggleSettings: () => void;
};

export default function AppHeader({
  showSettings,
  onToggleSettings,
}: AppHeaderProps) {
  return (
    <header className="flex items-center gap-3">
      <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3">
        <ShieldAlert className="h-6 w-6 text-violet-300" />
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="text-lg font-semibold">API Pulse</h1>
        <p className="text-xs text-slate-400">
          API errors and page performance
        </p>
      </div>

      <button
        type="button"
        onClick={onToggleSettings}
        aria-label={showSettings ? "Close settings" : "Open settings"}
        aria-expanded={showSettings}
        className={`rounded-lg border p-2 transition ${
          showSettings
            ? "border-violet-400/30 bg-violet-400/10 text-violet-200"
            : "border-white/10 text-slate-400 hover:bg-white/[0.07] hover:text-white"
        }`}
      >
        <Settings2 className="h-4 w-4" />
      </button>
    </header>
  );
}