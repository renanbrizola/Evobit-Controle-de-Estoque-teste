import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

const ThemeContext = createContext({});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    const { user } = useAuth();
    const [companyName, setCompanyName] = useState('Evobit App');
    const [currency, setCurrency] = useState('BRL'); // Default currency
    const [loadingSettings, setLoadingSettings] = useState(true);

    // Load Settings from Supabase
    useEffect(() => {
        if (!user) return;

        async function loadSettings() {
            try {
                const { data, error } = await supabase
                    .from('company_settings')
                    .select('*')
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (error && error.code !== 'PGRST116') { // PGRST116 is "No Data Found"
                    console.error('Error loading settings:', error);
                }

                if (data) {
                    setCompanyName(data.company_name || 'Evobit App');
                    setCurrency(data.currency || 'BRL');
                } else {
                    // Create default settings if not exists
                    const { error: insertError } = await supabase
                        .from('company_settings')
                        .insert([{
                            user_id: user.id,
                            company_name: 'Evobit App',
                            theme_color: 'light',
                            currency: 'BRL'
                        }]);

                    if (insertError) console.error('Error creating default settings:', insertError);
                }
            } catch (err) {
                console.error('Unexpected error loading settings:', err);
            } finally {
                setLoadingSettings(false);
            }
        }

        loadSettings();
    }, [user]);

    // Always apply light theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', 'light');
    }, []);

    // Save Settings
    const updateSettings = async (newName, newCurrency) => {
        try {
            // Optimistic Update
            setCompanyName(newName);
            if (newCurrency) setCurrency(newCurrency);

            const updateData = {
                user_id: user.id,
                company_name: newName,
                theme_color: 'light' // Always light
            };
            if (newCurrency) updateData.currency = newCurrency;

            const { error } = await supabase
                .from('company_settings')
                .upsert(updateData);

            if (error) throw error;
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar configurações.");
        }
    };

    // Get currency symbol
    const getCurrencySymbol = () => {
        const symbols = {
            BRL: 'R$',
            USD: 'US$',
            EUR: '€',
            GBP: '£',
            PEN: 'S/',
            ARS: '$',
            CLP: '$',
            COP: '$',
            MXN: '$'
        };
        return symbols[currency] || 'R$';
    };

    return (
        <ThemeContext.Provider value={{ companyName, currency, updateSettings, loadingSettings, getCurrencySymbol }}>
            {children}
        </ThemeContext.Provider>
    );
};
