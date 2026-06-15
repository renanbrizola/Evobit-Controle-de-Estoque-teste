import React from 'react';
import { twMerge } from 'tailwind-merge';

export const Card = ({ children, className, ...props }) => {
    return (
        <div
            className={twMerge(
                "glass-card rounded-[2rem] p-8 relative overflow-hidden bg-white/80 dark:bg-[#121212]/60 border border-gray-100 dark:border-white/5 shadow-glass",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

export const CardHeader = ({ className, ...props }) => (
    <div className={twMerge("flex flex-col space-y-1.5 p-6 border-b border-gray-100 dark:border-white/5", className)} {...props} />
);

export const CardTitle = ({ className, ...props }) => (
    <h3 className={twMerge("font-serif font-bold text-2xl tracking-tight text-gray-900 dark:text-white", className)} {...props} />
);

export const CardDescription = ({ className, ...props }) => (
    <p className={twMerge("text-sm text-gray-500 dark:text-brand-light/60 font-medium", className)} {...props} />
);

export const CardContent = ({ className, ...props }) => (
    <div className={twMerge("p-6 pt-0", className)} {...props} />
);

export const CardFooter = ({ className, ...props }) => (
    <div className={twMerge("flex items-center p-6 pt-0", className)} {...props} />
);
