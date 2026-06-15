import React, { useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { Eye, EyeOff } from 'lucide-react';

export const Input = React.forwardRef(({ label, error, className, icon: Icon, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
        <div className="w-full group/input">
            {label && <label htmlFor={props.id} className="block text-xs font-bold text-gray-500 dark:text-brand-light/60 mb-2 uppercase tracking-wide transition-colors group-focus-within/input:text-brand-primary">{label}</label>}
            <div className="relative group">
                {Icon && (
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors duration-300 pointer-events-none">
                        <Icon size={20} />
                    </div>
                )}
                <input
                    ref={ref}
                    type={isPassword ? (showPassword ? 'text' : 'password') : type}
                    className={twMerge(
                        "w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-gray-900 dark:text-brand-light font-medium outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-white/20",
                        "hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20",
                        "focus:border-brand-primary/50 focus:bg-white dark:focus:bg-black/40 focus:shadow-glow focus:ring-1 focus:ring-brand-primary/50",
                        Icon && "pl-12",
                        isPassword && "pr-12",
                        error && "border-brand-danger/50 focus:border-brand-danger focus:shadow-[0_0_20px_rgba(239,68,68,0.15)]",
                        className
                    )}
                    onKeyDown={(e) => {
                        if (type === 'number') {
                            if (['e', 'E', '+'].includes(e.key)) e.preventDefault();
                            if (e.key === '-' && props.min !== undefined && Number(props.min) >= 0) e.preventDefault();
                        }
                        if (props.onKeyDown) props.onKeyDown(e);
                    }}
                    {...props}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-primary transition-colors duration-300 p-1"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                )}
            </div>
            {error && <p className="mt-1.5 text-xs font-bold text-brand-danger/90 flex items-center gap-1 animate-in slide-in-from-top-1 transition-all">
                <span className="inline-block w-1 h-1 rounded-full bg-brand-danger mr-1" />
                {error}
            </p>}
        </div>
    );
});

export const Select = React.forwardRef(({ label, error, children, className, ...props }, ref) => {
    return (
        <div className="w-full group/select">
            {label && <label className="block text-xs font-bold text-gray-500 dark:text-brand-light/60 mb-2 uppercase tracking-wide transition-colors group-focus-within/select:text-brand-primary">{label}</label>}
            <div className="relative">
                <select
                    ref={ref}
                    className={twMerge(
                        "w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-gray-900 dark:text-brand-light font-medium outline-none transition-all duration-300 appearance-none cursor-pointer",
                        "hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20",
                        "focus:border-brand-primary/50 focus:bg-white dark:focus:bg-black/40 focus:shadow-glow focus:ring-1 focus:ring-brand-primary/50",
                        error && "border-brand-danger/50 focus:border-brand-danger",
                        className
                    )}
                    {...props}
                >
                    {children}
                </select>
                {/* Custom Chevron */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 group-focus-within/select:text-brand-primary transition-colors duration-300">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
            </div>
            {error && <p className="mt-1.5 text-xs font-bold text-brand-danger/90 animate-in slide-in-from-top-1">{error}</p>}
        </div>
    );
});

export const Textarea = React.forwardRef(({ label, error, className, ...props }, ref) => {
    return (
        <div className="w-full group/textarea">
            {label && <label className="block text-xs font-bold text-gray-500 dark:text-brand-light/60 mb-2 uppercase tracking-wide transition-colors group-focus-within/textarea:text-brand-primary">{label}</label>}
            <textarea
                ref={ref}
                className={twMerge(
                    "w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 text-gray-900 dark:text-brand-light font-medium outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-white/20 resize-y min-h-[100px]",
                    "hover:bg-gray-50 dark:hover:bg-white/10 hover:border-gray-300 dark:hover:border-white/20",
                    "focus:border-brand-primary/50 focus:bg-white dark:focus:bg-black/40 focus:shadow-glow focus:ring-1 focus:ring-brand-primary/50",
                    error && "border-brand-danger/50 focus:border-brand-danger",
                    className
                )}
                {...props}
            />
            {error && <p className="mt-1.5 text-xs font-bold text-brand-danger/90 animate-in slide-in-from-top-1">{error}</p>}
        </div>
    );
});
