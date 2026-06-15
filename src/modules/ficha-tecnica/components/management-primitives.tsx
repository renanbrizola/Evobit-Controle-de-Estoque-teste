'use client';

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import { useEffect } from 'react';
import { cn } from '../lib/utils';

const controlClassName =
  'w-full rounded-[10px] border bg-[var(--bg-surface)] px-3.5 py-2.5 text-sm text-[var(--text-strong)] outline-none transition-all duration-150 placeholder:text-[var(--text-soft)] focus:border-[var(--brand-primary-700)] focus:ring-2 focus:ring-[rgba(35,86,93,0.12)] disabled:cursor-not-allowed disabled:opacity-60';

export function EditorCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="overflow-hidden rounded-[12px] border bg-[var(--bg-surface)] shadow-[var(--shadow-panel)]"
      style={{ borderColor: 'var(--line-soft)' }}
    >
      <div
        className="border-b px-5 py-4"
        style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--bg-subtle)' }}
      >
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Editor
        </p>
        <h3 className="mt-1 text-[15px] font-semibold text-[var(--text-strong)]">{title}</h3>
        {description ? <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
      </div>
      <div className="space-y-4 p-5">{children}</div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(controlClassName, props.className)}
      style={{ borderColor: 'var(--line-soft)' }}
    />
  );
}

export function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(controlClassName, props.className)}
      style={{ borderColor: 'var(--line-soft)' }}
    />
  );
}

export function CheckInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className="inline-flex cursor-pointer items-center gap-3 rounded-[10px] border bg-[var(--bg-subtle)] px-4 py-3 text-sm text-[var(--text-strong)] transition-colors duration-150 hover:bg-[var(--bg-surface)]"
      style={{ borderColor: 'var(--line-soft)' }}
    >
      <input
        {...props}
        type="checkbox"
        className="h-4 w-4 rounded border-[var(--line-strong)] accent-[var(--brand-primary-700)]"
      />
      <span className="leading-5">{props['aria-label']}</span>
    </label>
  );
}

export function ActionButton({
  tone = 'primary',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'primary' | 'secondary' | 'danger';
}) {
  const toneClassName = {
    primary:
      'border-[var(--brand-primary-700)] bg-[var(--brand-primary-700)] text-white hover:border-[var(--brand-primary-900)] hover:bg-[var(--brand-primary-900)] shadow-[var(--shadow-panel)]',
    secondary:
      'border-[var(--line-soft)] bg-[var(--bg-surface)] text-[var(--text-strong)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-subtle)]',
    danger:
      'border-[var(--state-danger-700)] bg-[var(--state-danger-700)] text-white hover:brightness-95',
  }[tone];

  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center rounded-[10px] border px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        toneClassName,
        className,
      )}
    />
  );
}

export function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} aria-hidden="true" />
      <div
        className="relative w-full max-w-sm rounded-[14px] border bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-overlay)]"
        style={{ borderColor: 'var(--line-soft)' }}
      >
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
          Confirmação
        </p>
        <p className="mt-2 text-sm font-medium leading-6 text-[var(--text-strong)]">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <ActionButton tone="secondary" onClick={onCancel}>
            Cancelar
          </ActionButton>
          <ActionButton tone="danger" onClick={onConfirm}>
            Confirmar
          </ActionButton>
        </div>
      </div>
    </div>
  );
}

export function StatusMessage({
  tone,
  message,
  duration = 4000,
  onDismiss,
}: {
  tone: 'success' | 'error';
  message: string;
  duration?: number;
  onDismiss?: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  return (
    <div
      className={cn(
        'rounded-[10px] border px-4 py-3 text-[13px] font-medium shadow-[var(--shadow-panel)]',
        tone === 'success'
          ? 'border-[var(--state-success-100)] bg-[var(--state-success-100)] text-[var(--state-success-700)]'
          : 'border-[var(--state-danger-100)] bg-[var(--state-danger-100)] text-[var(--state-danger-700)]',
      )}
    >
      {message}
    </div>
  );
}
