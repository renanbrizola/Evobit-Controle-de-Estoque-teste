'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface SlidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: 'sm' | 'md' | 'lg';
}

export function SlidePanel({ open, onClose, title, description, children, width = 'md' }: SlidePanelProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-40 flex justify-end transition-all duration-200',
        open ? 'visible' : 'invisible pointer-events-none',
      )}
    >
      <div
        className={cn(
          'absolute inset-0 bg-[rgba(12,17,20,0.38)] backdrop-blur-[3px] transition-opacity duration-200',
          open ? 'opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          'relative flex h-full flex-col bg-[var(--bg-surface)] shadow-[var(--shadow-overlay)] transition-transform duration-200 ease-out',
          width === 'sm' ? 'w-full max-w-[420px]' : width === 'lg' ? 'w-full max-w-[760px]' : 'w-full max-w-[560px]',
          'max-sm:max-w-full',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
        style={{ borderLeft: '1px solid var(--line-soft)' }}
      >
        <div
          className="flex shrink-0 items-start justify-between border-b px-6 py-5"
          style={{ borderColor: 'var(--line-soft)', backgroundColor: 'var(--bg-subtle)' }}
        >
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Painel lateral
            </p>
            <h2 className="mt-1 text-[16px] font-semibold leading-snug text-[var(--text-strong)]">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-[var(--text-muted)]">{description}</p> : null}
          </div>
          <button
            onClick={onClose}
            className="ml-4 mt-0.5 shrink-0 rounded-[10px] border bg-white p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-strong)]"
            style={{ borderColor: 'var(--line-soft)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
