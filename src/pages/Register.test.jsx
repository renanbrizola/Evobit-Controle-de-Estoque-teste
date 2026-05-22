import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from './Register';
import { BrowserRouter } from 'react-router-dom';

// Mock Supabase Auth
const mockSignUp = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({
        signUp: mockSignUp
    })
}));

// Mock Sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    }
}));

const renderRegister = () => {
    return render(
        <BrowserRouter>
            <Register />
        </BrowserRouter>
    );
};

describe('Register Component', () => {
    it('should render correctly', () => {
        renderRegister();
        expect(screen.getByText(/Criar Conta/i, { selector: 'h1' })).toBeInTheDocument();
        expect(screen.getByPlaceholderText('seu@email.com')).toBeInTheDocument();
    });

    it('should show error when passwords do not match', async () => {
        renderRegister();

        fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'test@example.com' } });
        fireEvent.change(screen.getByLabelText(/^Senha/i), { target: { value: '123456' } });
        fireEvent.change(screen.getByLabelText(/Confirmar Senha/i), { target: { value: '123457' } }); // Mismatch

        fireEvent.click(screen.getByRole('button', { name: /Criar Conta/i }));

        await waitFor(() => {
            expect(mockSignUp).not.toHaveBeenCalled();
        });
    });

    it('should call signUp with correct data when form is valid', async () => {
        mockSignUp.mockResolvedValue({}); // Success case

        renderRegister();

        fireEvent.change(screen.getByLabelText(/^Email/i), { target: { value: 'newuser@example.com' } });
        fireEvent.change(screen.getByLabelText(/^Senha/i), { target: { value: 'password123!' } });
        fireEvent.change(screen.getByLabelText(/Confirmar Senha/i), { target: { value: 'password123!' } });

        fireEvent.click(screen.getByRole('button', { name: /Criar Conta/i }));

        await waitFor(() => {
            expect(mockSignUp).toHaveBeenCalledWith('newuser@example.com', 'password123!');
        });
    });
});
