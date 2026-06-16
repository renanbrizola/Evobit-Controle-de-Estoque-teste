import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeamSettings from './TeamSettings';
import { AuthProvider } from '../contexts/AuthContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { BrowserRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn()
    }
}));

const mockTeamList = vi.fn();
const mockInvite = vi.fn();
const mockRemove = vi.fn();

vi.mock('../services/api', () => ({
    api: {
        teams: {
            list: (...args) => mockTeamList(...args),
            invite: (...args) => mockInvite(...args),
            remove: (...args) => mockRemove(...args)
        }
    }
}));

// Mock AuthContext to provide a user
const mockUser = { email: 'owner@test.com', id: 'owner123', role: 'owner' };

vi.mock('../contexts/AuthContext', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useAuth: () => ({ user: mockUser, loading: false })
    };
});

describe('TeamSettings Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockTeamList.mockResolvedValue([]);
    });

    it('renders correctly', async () => {
        render(
            <BrowserRouter>
                <LanguageProvider>
                    <TeamSettings />
                </LanguageProvider>
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText(/Minha Equipe/i)).toBeInTheDocument();
        });

        expect(screen.getByPlaceholderText(/funcionario@email.com/i)).toBeInTheDocument();
        expect(screen.getByText(/Você \(Dono\)/i)).toBeInTheDocument();
    });

    it('invites a member successfully', async () => {
        mockInvite.mockResolvedValue({ id: 'new-member-id', member_email: 'new@test.com' });
        mockTeamList.mockResolvedValue([{ id: 'new-member-id', member_email: 'new@test.com' }]);

        render(
            <BrowserRouter>
                <LanguageProvider>
                    <TeamSettings />
                </LanguageProvider>
            </BrowserRouter>
        );

        const input = screen.getByPlaceholderText(/funcionario@email.com/i);
        fireEvent.change(input, { target: { value: 'new@test.com' } });

        const button = screen.getByRole('button', { name: /Adicionar à Equipe/i });
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockInvite).toHaveBeenCalledWith('new@test.com');
        });
    });

    it('displays error if invite fails', async () => {
        mockInvite.mockRejectedValue(new Error('Falha'));
        const { toast } = await import('sonner');

        render(
            <BrowserRouter>
                <LanguageProvider>
                    <TeamSettings />
                </LanguageProvider>
            </BrowserRouter>
        );

        fireEvent.change(screen.getByPlaceholderText(/funcionario@email.com/i), { target: { value: 'fail@test.com' } });
        fireEvent.click(screen.getByRole('button', { name: /Adicionar à Equipe/i }));

        await waitFor(() => {
            expect(toast.error).toHaveBeenCalled();
        });
    });
});
