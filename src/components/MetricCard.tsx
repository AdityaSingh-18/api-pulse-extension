import type { ReactNode } from "react";

type MetricCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

export default function MetricCard({
  icon,
  label,
  value,
}: MetricCardProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>

      <p className="mt-3 break-words text-xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  );
}