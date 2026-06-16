import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Movements from './Movements';
import { LanguageProvider } from '../contexts/LanguageContext';
import { BrowserRouter } from 'react-router-dom';

// Mock API Service
vi.mock('../services/api', () => ({
    api: {
        products: {
            list: vi.fn(() => Promise.resolve([
                { id: '1', name: 'Produto Teste', category: 'TESTE', unit: 'UN', current_stock: 10, min_stock: 5 }
            ])),
        },
        providers: {
            list: vi.fn(() => Promise.resolve([])),
        },
        categories: {
            list: vi.fn(() => Promise.resolve([])),
        },
        movements: {
            createTransaction: vi.fn(() => Promise.resolve([])),
        }
    }
}));

// Mock Sonner toast
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        warning: vi.fn(),
    }
}));

// Mock contextos que dependem de serviços externos (Theme: moeda, Auth: sessão Supabase)
vi.mock('../contexts/ThemeContext', () => ({
    useTheme: () => ({ getCurrencySymbol: () => 'R$' })
}));

vi.mock('../contexts/AuthContext', () => ({
    useAuth: () => ({ user: { id: 'test-user' } })
}));

const renderMovements = () => {
    return render(
        <BrowserRouter>
            <LanguageProvider>
                <Movements />
            </LanguageProvider>
        </BrowserRouter>
    );
};

describe('Movements Component (Cart Logic)', () => {
    it('should render correctly', async () => {
        renderMovements();

        // Botões de modo (Entrada / Saída) sempre presentes
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /entrada/i })).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: /saída/i })).toBeInTheDocument();
    });

    // Note: Testing complex interaction involves selecting from dropdown which is tricky in jsdom without user-event
    // complex setup. We will do a basic sanity check of rendering.

    it('should switch modes', () => {
        renderMovements();
        fireEvent.click(screen.getByRole('button', { name: /entrada/i }));
        // Em modo ENTRADA, o campo de valor total (placeholder 0,00) fica visível
        expect(screen.getByPlaceholderText('0,00')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /saída/i }));
        // Em modo SAÍDA, o campo de valor some
        expect(screen.queryByPlaceholderText('0,00')).not.toBeInTheDocument();
    });
});
