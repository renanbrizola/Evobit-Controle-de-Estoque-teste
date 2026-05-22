import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

const OfflineIndicator = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showRecovered, setShowRecovered] = useState(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowRecovered(true);
            setTimeout(() => setShowRecovered(false), 3000);
        };
        const handleOffline = () => {
            setIsOnline(false);
            setShowRecovered(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Don't render anything if online and not showing recovery message
    if (isOnline && !showRecovered) return null;

    return (
        <div
            className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg border backdrop-blur-md transition-all duration-500 animate-in ${
                isOnline
                    ? 'bg-emerald-50/90 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 slide-in-from-bottom-4 fade-in'
                    : 'bg-red-50/90 dark:bg-red-900/90 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 slide-in-from-bottom-4 fade-in'
            }`}
        >
            {isOnline ? (
                <>
                    <Wifi size={16} className="text-emerald-500" />
                    <span className="text-xs font-semibold">Conexão restaurada</span>
                </>
            ) : (
                <>
                    <WifiOff size={16} className="text-red-500 animate-pulse" />
                    <span className="text-xs font-semibold">Sem conexão — modo offline</span>
                    <span className="text-[10px] text-red-500/70 ml-1">dados serão sincronizados ao reconectar</span>
                </>
            )}
        </div>
    );
};

export default OfflineIndicator;
