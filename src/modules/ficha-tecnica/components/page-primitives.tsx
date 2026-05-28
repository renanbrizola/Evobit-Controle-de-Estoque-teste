import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export function SheetBlock({
  title,
  emphasis,
  className,
  bodyClassName,
  children,
}: {
  title: string;
  emphasis?: string;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-[12px] border bg-[var(--bg-surface)] shadow-[var(--shadow-panel)]',
        className,
      )}
      style={{ borderColor: 'var(--line-soft)' }}
    >
      <div
        className="border-b px-5 py-4"
        style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--bg-subtle)' }}
      >
        <div className="flex items-start gap-3">
          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-sm bg-[var(--brand-primary-700)]" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Painel
            </p>
            <h2 className="mt-1 text-[15px] font-semibold leading-tight text-[var(--text-strong)]">
              {title}
              {emphasis ? <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">{emphasis}</span> : null}
            </h2>
          </div>
        </div>
      </div>
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function HighlightCard({
  label,
  value,
  toneClassName,
}: {
  label: string;
  value: string;
  toneClassName: string;
}) {
  return (
    <div
      className="rounded-[12px] border bg-[var(--bg-surface)] px-5 py-4 shadow-[var(--shadow-panel)]"
      style={{ borderColor: 'var(--line-soft)' }}
    >
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-primary-700)]" />
        <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
      </div>
      <p className={cn('numeric mt-3 text-[29px] font-semibold leading-none tracking-tight', toneClassName)}>
        {value}
      </p>
    </div>
  );
}
