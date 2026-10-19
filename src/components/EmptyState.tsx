import { Activity } from "lucide-react";

type EmptyStateProps = {
  message: string;
};

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
      <Activity className="mx-auto h-6 w-6 text-slate-600" />
      <p className="mx-auto mt-3 max-w-xs text-xs leading-5 text-slate-400">
        {message}
      </p>
    </div>
  );
}