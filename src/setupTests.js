import '@testing-library/jest-dom';

// jsdom não implementa matchMedia — usado por componentes que detectam o tema do
// sistema (ex.: Toaster do sonner com theme="system" e o ThemeContext).
if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
    });
}
