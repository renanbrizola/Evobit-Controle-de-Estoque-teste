import React, { useState, useEffect, useRef } from 'react';
import { useSecurity } from '../../contexts/SecurityContext';
import { Lock, Unlock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext'; // Added import

const LockScreen = () => {
    const { t } = useLanguage(); // Added hook
    const { isLocked, unlockApp } = useSecurity();
    const [pin, setPin] = useState(['', '', '', '']);
    const [error, setError] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        if (isLocked) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- init/reset sincrono de estado no effect e intencional (padrao legado auditado)
            setPin(['', '', '', '']);
            setError(false);
            setTimeout(() => inputRefs.current[0]?.focus(), 100);
        }
    }, [isLocked]);

    const handleChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1); // Take last char if multiple
        if (!/^\d*$/.test(value)) return; // Only numbers

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);
        setError(false);

        // Auto move to next input
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto submit if full
        if (index === 3 && value) {
            const fullPin = newPin.join('');
            if (fullPin.length === 4) {
                setTimeout(() => attemptUnlock(fullPin), 100);
            }
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const attemptUnlock = async (inputPin) => {
        const success = await unlockApp(inputPin);
        if (success) {
            toast.success(t('lockScreen', 'unlocked'));
        } else {
            setError(true);
            toast.error(t('lockScreen', 'incorrectPin'));
            setPin(['', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    if (!isLocked) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-brand-dark/95 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in duration-300">
            <div className="text-center space-y-8 p-8">
                <div className="mx-auto w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center shadow-glow border border-brand-primary/20 animate-pulse">
                    <Lock size={48} className="text-brand-primary" />
                </div>

                <div className="space-y-2">
                    <h1 className="text-4xl font-serif font-bold text-transparent bg-clip-text bg-gradient-gold">
                        {t('lockScreen', 'title')}
                    </h1>
                    <p className="text-gray-400">{t('lockScreen', 'subtitle')}</p>
                </div>

                <div className="flex justify-center gap-4 my-8">
                    {pin.map((digit, index) => (
                        <input
                            key={index}
                            ref={el => inputRefs.current[index] = el}
                            type="password"
                            inputMode="numeric"
                            maxLength={1}
                            value={digit}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            className={`w-14 h-16 text-center text-3xl font-bold bg-white/5 border-2 rounded-2xl outline-none transition-all duration-200 
                                ${error
                                    ? 'border-brand-danger text-brand-danger animate-shake'
                                    : 'border-white/10 focus:border-brand-primary text-white focus:bg-white/10 focus:shadow-glow'
                                }`}
                        />
                    ))}
                </div>

                {error && (
                    <p className="text-brand-danger font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
                        <AlertCircle size={16} /> {t('lockScreen', 'error')}
                    </p>
                )}

                <p className="text-xs text-brand-light/20 mt-12">
                    {t('lockScreen', 'forgotPin')}
                </p>
            </div>
        </div>
    );
};

export default LockScreen;
