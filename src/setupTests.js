import '@testing-library/jest-dom';
// Provides a working IndexedDB implementation under jsdom so RxDB/Dexie can
// open the local database during tests instead of throwing MissingAPIError.
import 'fake-indexeddb/auto';

// jsdom does not implement matchMedia, which sonner's <Toaster /> relies on.
// Provide a minimal no-op stub so components that render toasts don't crash.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {}, // deprecated
      removeListener: () => {}, // deprecated
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
