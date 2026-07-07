import React from 'react';
import { Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export const Button = ({
    children,
    variant = 'primary',
    size = 'default',
    isLoading,
    className,
    ...props
}) => {
    // Botões de ação (confirmar/cancelar/criar) usam o estilo CTA global
    // (.btn-cta no index.css); ícones e ghosts mantêm o estilo discreto.
    const useCta = size !== 'icon' && size !== 'none' && variant !== 'ghost';

    const sizes = {
        default: "px-6 py-3",
        sm: "px-4 py-2 text-sm",
        icon: "p-2 w-10 h-10",
        none: ""
    };

    if (useCta) {
        const ctaVariants = {
            primary: "btn-cta--gold",
            secondary: "btn-cta--secondary",
            danger: "btn-cta--danger",
            success: "btn-cta--primary",
        };
        return (
            <button
                className={twMerge('btn-cta', sizes[size], ctaVariants[variant] || 'btn-cta--primary', className)}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {/* span contra-inclinado (ver .btn-cta no index.css) */}
                <span className="inline-flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : null}
                    {children}
                </span>
            </button>
        );
    }

    const baseStyles = "relative inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
        primary: "bg-gradient-gold text-brand-dark hover:shadow-glow hover:scale-[1.03] shadow-lg border-none font-bold tracking-wide",
        secondary: "bg-white/5 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/10 hover:border-brand-primary/50 backdrop-blur-md",
        danger: "bg-brand-danger/20 text-brand-danger border border-brand-danger/50 hover:bg-brand-danger hover:text-white transition-colors duration-300",
        ghost: "text-brand-light/60 hover:text-brand-primary hover:bg-white/5",
        success: "bg-brand-success/20 text-brand-success border border-brand-success/50 hover:bg-brand-success hover:text-white",
    };

    return (
        <button
            className={twMerge(baseStyles, sizes[size], variants[variant], className)}
            disabled={isLoading || props.disabled}
            {...props}
        >
            {isLoading ? <Loader2 className="animate-spin mr-2" size={20} /> : null}
            {children}
        </button>
    );
};
