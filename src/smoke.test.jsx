import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import App from './App';

// Mock dependencies
vi.mock('./lib/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
            // Mock subscription with unsubscribe
            onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
        },
        rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
        from: () => ({
            select: () => ({
                order: () => ({
                    limit: () => ({
                        single: () => ({ data: null, error: null })
                    })
                })
            })
        })
    }
}));

describe('App Smoke Test', () => {
    it('mounts without crashing and shows login/public route', async () => {
        try {
            // The app uses a HashRouter, so the route is taken from the URL hash.
            // Start on the public /login route; the root route is wrapped by the
            // LicenseGuard, which (for an unauthenticated session) shows the
            // "expired" screen rather than the login form.
            window.location.hash = '#/login';
            render(<App />);

            // Wait for any async effects or loading states
            await waitFor(() => {
                // Check for a known element on the public page (Login)
                const loginElements = screen.queryAllByText(/Entrar/i);
                expect(loginElements.length).toBeGreaterThan(0);
            });
        } catch (error) {
            console.error("SMOKE TEST CRASH:", error);
            throw error;
        }
    });
});
