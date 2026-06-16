/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

const SecurityContext = createContext({});

export const useSecurity = () => useContext(SecurityContext);

const PIN_KEY = 'evobit_security_pin';
const LOCK_KEY = 'evobit_is_locked';

/**
 * Simple hash function for PIN storage.
 * Uses SubtleCrypto SHA-256 when available, falls back to a basic hash.
 */
const hashPin = async (pin) => {
    if (window.crypto && window.crypto.subtle) {
        const encoder = new TextEncoder();
        const data = encoder.encode(pin + '_evobit_salt_2024');
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback for environments without SubtleCrypto (rare)
    let hash = 0;
    const str = pin + '_evobit_salt_2024';
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(16);
};

export const SecurityProvider = ({ children }) => {
    const [isLocked, setIsLocked] = useState(false);
    const [pinHash, setPinHash] = useState(localStorage.getItem(PIN_KEY) || null);

    // Check initial lock state
    useEffect(() => {
        const storedLock = localStorage.getItem(LOCK_KEY);
        if (storedLock === 'true' && pinHash) {
            setIsLocked(true);
        }
    }, [pinHash]);

    // Value can be '1' (1 minute), '5', '15', '30' or null (disabled)
    const [timeoutSettings, setTimeoutSettings] = useState(localStorage.getItem('evobit_auto_lock_time') || null);

    const updatePin = async (newPin) => {
        if (newPin) {
            const hashed = await hashPin(newPin);
            localStorage.setItem(PIN_KEY, hashed);
            setPinHash(hashed);
        } else {
            localStorage.removeItem(PIN_KEY);
            setPinHash(null);
            setIsLocked(false);
            localStorage.removeItem(LOCK_KEY);
        }
    };

    const lockApp = () => {
        if (pinHash) {
            setIsLocked(true);
            localStorage.setItem(LOCK_KEY, 'true');
        }
    };

    const unlockApp = async (inputPin) => {
        const inputHash = await hashPin(inputPin);
        if (inputHash === pinHash) {
            setIsLocked(false);
            localStorage.removeItem(LOCK_KEY);
            return true;
        }
        return false;
    };

    const updateTimeout = (minutes) => {
        if (minutes) {
            localStorage.setItem('evobit_auto_lock_time', minutes);
            setTimeoutSettings(minutes);
        } else {
            localStorage.removeItem('evobit_auto_lock_time');
            setTimeoutSettings(null);
        }
    };

    // Activity Monitor for Auto-Lock
    useEffect(() => {
        if (!timeoutSettings || !pinHash || isLocked) return;

        let timer;
        const resetTimer = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                console.log("Auto-locking due to inactivity...");
                lockApp();
            }, parseInt(timeoutSettings) * 60 * 1000);
        };

        // Events to monitor
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keypress', resetTimer);
        window.addEventListener('click', resetTimer);
        window.addEventListener('scroll', resetTimer);

        resetTimer(); // Start timer

        return () => {
            clearTimeout(timer);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keypress', resetTimer);
            window.removeEventListener('click', resetTimer);
            window.removeEventListener('scroll', resetTimer);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeoutSettings, pinHash, isLocked]);

    return (
        <SecurityContext.Provider value={{
            isLocked,
            hasPin: !!pinHash,
            lockApp,
            unlockApp,
            updatePin,
            timeoutSettings,
            updateTimeout
        }}>
            {children}
        </SecurityContext.Provider>
    );
};
