import React, { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const Tabs = ({ tabs, defaultTab, className }) => {
    const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

    return (
        <div className={twMerge("w-full", className)}>
            {/* Tab Headers */}
            <div className="flex gap-2 mb-6 border-b border-gray-100 dark:border-white/5 pb-1 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={clsx(
                            "relative px-4 py-2 text-sm font-bold uppercase tracking-wide transition-colors whitespace-nowrap outline-none rounded-t-lg",
                            activeTab === tab.id
                                ? "text-brand-primary"
                                : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        )}
                    >
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary"
                                initial={false}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="relative">
                {tabs.map((tab) => {
                    if (tab.id !== activeTab) return null;
                    return (
                        <motion.div
                            key={tab.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {tab.content}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};
