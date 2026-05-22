/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'brand': {
                    dark: 'rgb(var(--color-dark) / <alpha-value>)',
                    primary: 'rgb(var(--color-primary) / <alpha-value>)',
                    secondary: 'rgb(var(--color-secondary) / <alpha-value>)',
                    light: 'rgb(var(--color-light) / <alpha-value>)',
                    rose: 'rgb(var(--color-rose) / <alpha-value>)',
                    success: '#10B981',
                    danger: '#EF4444',
                    warning: '#F59E0B',
                    info: '#3B82F6',
                    surface: '#18181B', // Zinc 900 - Keep constant for specific dark surfaces if needed, or map to var
                }
            },
            fontFamily: {
                'sans': ['Poppins', 'sans-serif'],
                'serif': ['"Playfair Display"', 'serif'],
            },
            borderRadius: {
                'xl': '1rem',
                '2xl': '1.5rem',
                '2xl': '1.5rem',
                '3xl': '2rem',
            },
            backgroundImage: {
                'gradient-gold': 'linear-gradient(135deg, #D4AF37 0%, #AA8C2C 100%)',
                'gradient-dark': 'linear-gradient(135deg, #18181B 0%, #09090B 100%)',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(212, 175, 55, 0.3)',
                'neon': '0 0 10px rgba(212, 175, 55, 0.5), 0 0 20px rgba(212, 175, 55, 0.3)',
                'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.2)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
            }
        },
    },
    plugins: [],
}
