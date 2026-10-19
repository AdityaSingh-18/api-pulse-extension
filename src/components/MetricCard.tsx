import type { ReactNode } from "react";

type MetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  isDark: boolean;
};

export default function MetricCard({
  icon,
  label,
  value,
  isDark,
}: MetricCardProps) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        isDark
          ? "border-white/[0.08] bg-white/[0.03]"
          : "border-slate-200 bg-white shadow-2xs"
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span
          className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}
        >
          {label}
        </span>
      </div>

      <p className="mt-3 break-words text-xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}