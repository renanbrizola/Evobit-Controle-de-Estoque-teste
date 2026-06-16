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

// Mock da verificação de licença para o LicenseGuard liberar a renderização
// (caso contrário a sessão mock nula resulta na tela "Acesso Expirado")
vi.mock('./services/license', () => ({
    licenseService: {
        checkLicense: vi.fn().mockResolvedValue({ active: true, type: 'pro' }),
        getStripeCheckoutUrl: vi.fn(),
    }
}));

describe('App Smoke Test', () => {
    it('mounts without crashing and shows login/public route', async () => {
        try {
            render(<App />);

            // Wait for any async effects or loading states
            await waitFor(() => {
                // Check for a known element on the public page (Login)
                // Assuming the default redirect goes to Login
                const loginElements = screen.queryAllByText(/Entrar/i);
                expect(loginElements.length).toBeGreaterThan(0);
            });
        } catch (error) {
            console.error("SMOKE TEST CRASH:", error);
            throw error;
        }
    });
});
