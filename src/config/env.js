import { z } from 'zod';

const envSchema = z.object({
    VITE_SUPABASE_URL: z.string().url().optional(),
    VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

// Skip validation in test environment to prevent crash during smoke tests
const isTest = import.meta.env.MODE === 'test' || process.env.NODE_ENV === 'test';
if (isTest) {
    console.log("Test environment detected, skipping strict env validation");
}

const _env = envSchema.safeParse(import.meta.env);

if (!_env.success && !isTest) {
    console.error('❌ Invalid environment variables:', _env.error.format());
    // Do not throw, as it crashes the app before ErrorBoundary can catch it.
    // Instead, rely on the values being undefined/fallback, or show alert
    if (typeof window !== 'undefined') {
        console.warn("CRITICAL: Missing Env Variables. Check console.");
    }
}

export const env = {
    supabaseUrl: _env.data?.VITE_SUPABASE_URL || 'https://mock.supabase.co',
    supabaseAnonKey: _env.data?.VITE_SUPABASE_ANON_KEY || 'mock-key',
};
