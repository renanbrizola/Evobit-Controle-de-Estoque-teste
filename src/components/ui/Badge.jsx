import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Badge({ className, variant = "default", ...props }) {
    const variants = {
        default: "border-transparent bg-brand-primary text-white shadow-glow",
        secondary: "border-transparent bg-brand-secondary text-brand-dark font-bold",
        outline: "text-brand-primary border-brand-primary/20 bg-brand-primary/5",
        success: "border-transparent bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        warning: "border-transparent bg-amber-500/10 text-amber-400 border border-amber-500/20",
        destructive: "border-transparent bg-red-500/10 text-red-400 border border-red-500/20",
    };

    return (
        <div className={twMerge(clsx("inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-bold transition-colors shadow-sm", variants[variant], className))} {...props} />
    );
}
