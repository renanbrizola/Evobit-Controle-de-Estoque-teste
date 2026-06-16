import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './Login';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { BrowserRouter } from 'react-router-dom';


// Mock Sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

// Mock Supabase
const mockSignIn = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();

vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        auth: {
            signInWithPassword: (...args) => mockSignIn(...args),
            getSession: (...args) => mockGetSession(...args),
            onAuthStateChange: (...args) => mockOnAuthStateChange(...args)
        }
    }
}));

describe('Login Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mocks
        mockGetSession.mockResolvedValue({ data: { session: null } });
        mockOnAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    });

    it('renders login form correctly', async () => {
        render(
            <BrowserRouter>
                <LanguageProvider>
                    <AuthProvider>
                        <Login />
                    </AuthProvider>
                </LanguageProvider>
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/seu@email.com/i)).toBeInTheDocument();
        });

        expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /entrar no sistema/i })).toBeInTheDocument();
    });

    it('calls signInWithPassword on form submit', async () => {
        mockSignIn.mockResolvedValue({ error: null, data: { user: { id: '123' } } });

        render(
            <BrowserRouter>
                <LanguageProvider>
                    <AuthProvider>
                        <Login />
                    </AuthProvider>
                </LanguageProvider>
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/seu@email.com/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText(/seu@email.com/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'password123' } });

        fireEvent.click(screen.getByRole('button', { name: /entrar no sistema/i }));

        await waitFor(() => {
            expect(mockSignIn).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123'
            });
        });
    });

    it('shows error toast on login failure', async () => {
        mockSignIn.mockResolvedValue({ error: { message: 'Invalid login' }, data: { user: null } });
        const { toast } = await import('sonner');

        render(
            <BrowserRouter>
                <LanguageProvider>
                    <AuthProvider>
                        <Login />
                    </AuthProvider>
                </LanguageProvider>
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/seu@email.com/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText(/seu@email.com/i), { target: { value: 'wrong@example.com' } });
        fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: 'wrongpass' } });

        fireEvent.click(screen.getByRole('button', { name: /entrar no sistema/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Falha no login"));
        });
    });
});
