// Currency formatting utilities with dynamic currency support

/**
 * Format a number as currency
 * @param {number} value - The value to format
 * @param {string} currencyCode - Currency code (BRL, USD, EUR, etc.)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, currencyCode = 'BRL') => {
    if (!value && value !== 0) return `${getCurrencySymbol(currencyCode)} 0,00`;

    const localeMap = {
        BRL: 'pt-BR',
        USD: 'en-US',
        EUR: 'de-DE',
        GBP: 'en-GB',
        PEN: 'es-PE',
        ARS: 'es-AR',
        CLP: 'es-CL',
        COP: 'es-CO',
        MXN: 'es-MX'
    };

    const locale = localeMap[currencyCode] || 'pt-BR';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode
    }).format(value);
};

/**
 * Get currency symbol for a currency code
 * @param {string} currencyCode - Currency code
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currencyCode = 'BRL') => {
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
    return symbols[currencyCode] || 'R$';
};

/**
 * Parse a currency string to a number
 * @param {string} value - The currency string to parse
 * @returns {number} Parsed number value
 */
export const parseCurrency = (value) => {
    if (!value && value !== 0) return 0;
    if (typeof value === 'number') return value;

    // Remove currency symbols and format characters
    return parseFloat(
        String(value)
            .replace(/[R$US€£S/]/g, '')
            .replace(/\./g, '') // Remove dots (thousands separators)
            .replace(',', '.')   // Replace comma with dot (decimal separator)
            .trim()
    ) || 0;
};

/**
 * Handle currency input change with mask
 * @param {Event} e - Input event
 * @param {Function} setValue - State setter function
 * @param {string} locale - Locale for formatting (default: pt-BR)
 */
export const handleCurrencyChange = (e, setValue, locale = 'pt-BR') => {
    let value = e.target.value.replace(/\D/g, "");
    value = (Number(value) / 100).toLocaleString(locale, { minimumFractionDigits: 2 });
    setValue(value);
};

/**
 * Format a date string
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date string (dd/mm/yyyy)
 */
export const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('pt-BR').format(date);
};

/**
 * Format a date string with time
 * @param {string} dateString - The date string to format
 * @returns {string} Formatted date and time string (dd/mm/yyyy HH:mm)
 */
export const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
};
