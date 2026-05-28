import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export const SlidePanel = ({ open, onClose, title, children }) => {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative flex w-full max-w-lg flex-col border-l border-[var(--line-soft)] bg-white shadow-[-8px_0_24px_rgba(27,35,41,0.08)] transform transition-transform duration-300">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--line-soft)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--text-strong)]">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--bg-subtle)] p-1.5 text-[var(--text-muted)] transition hover:text-[var(--text-strong)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
