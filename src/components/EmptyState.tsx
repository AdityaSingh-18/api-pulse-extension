import { Activity } from "lucide-react";

type EmptyStateProps = {
  message: string;
  isDark: boolean;
};

export default function EmptyState({ message, isDark }: EmptyStateProps) {
  return (
    <div
      className={`mt-3 rounded-xl border border-dashed px-4 py-8 text-center ${
        isDark ? "border-white/10" : "border-slate-300 bg-white/60"
      }`}
    >
      <Activity
        className={`mx-auto h-6 w-6 ${
          isDark ? "text-slate-600" : "text-slate-400"
        }`}
      />
      <p
        className={`mx-auto mt-3 max-w-xs text-xs leading-5 ${
          isDark ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {message}
      </p>
    </div>
  );
}