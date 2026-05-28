import React from 'react';

export const SheetBlock = ({ children, className = '' }) => {
  return (
    <section
      className={`rounded-[var(--radius-panel)] border border-[var(--line-soft)] bg-white p-5 shadow-[var(--shadow-panel)] lg:p-6 ${className}`}
    >
      {children}
    </section>
  );
};
