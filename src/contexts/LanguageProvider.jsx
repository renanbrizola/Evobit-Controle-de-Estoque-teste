import React, { useState, useEffect } from 'react';
import { LanguageContext } from './LanguageContext';
import { translate } from './translations';

export const LanguageProvider = ({ children }) => {
    // Default to PT-BR, stored in localStorage
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('app_language') || 'pt';
    });

    useEffect(() => {
        localStorage.setItem('app_language', language);
    }, [language]);

    const t = (section, key) => translate(language, section, key);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};
