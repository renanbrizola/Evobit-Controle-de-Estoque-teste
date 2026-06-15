export interface StatCardProps {
  label: string;
  value: string;
  toneClassName: string;
  compact?: boolean;
}

export function StatCard({ label, value, toneClassName, compact = false }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-4' : 'p-5'} shadow-[0_14px_36px_rgba(16,34,71,0.08)]`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p
        className={`${compact ? 'mt-2 text-2xl' : 'mt-3 text-3xl'} font-semibold ${toneClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

export interface WorkflowChipProps {
  step: string;
  title: string;
  description: string;
}

export function WorkflowChip({ step, title, description }: WorkflowChipProps) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0f172a] text-sm font-semibold text-white">
          {step}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

export interface CompoundStageButtonProps {
  step: string;
  title: string;
  description: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function CompoundStageButton({
  step,
  title,
  description,
  active,
  disabled,
  onClick,
}: CompoundStageButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${step}. ${title}: ${description}`}
      title={description}
      className={`min-h-[54px] rounded-[10px] border px-3 py-2 text-left transition ${
        active
          ? 'border-[var(--brand-primary-700)] bg-[rgba(35,86,93,0.08)] shadow-[var(--shadow-panel)]'
          : 'border-[var(--line-soft)] bg-white hover:border-[var(--line-strong)] hover:bg-[var(--bg-subtle)]'
      } disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:opacity-60`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-[var(--brand-primary-700)] text-white' : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'}`}
        >
          {step}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--text-strong)]">
            {title}
          </p>
        </div>
      </div>
    </button>
  );
}
