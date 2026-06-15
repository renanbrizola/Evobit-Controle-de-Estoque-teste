import { createContext, useContext } from 'react';

// Default value keeps consumers (e.g. components rendered without a
// ThemeProvider in isolated tests) functional. The provider overrides it.
export const ThemeContext = createContext({
    companyName: 'Evobit App',
    currency: 'BRL',
    loadingSettings: false,
    updateSettings: async () => {},
    getCurrencySymbol: () => 'R$',
});

export const useTheme = () => useContext(ThemeContext);
