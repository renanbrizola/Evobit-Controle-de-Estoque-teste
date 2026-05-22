import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Movements from './Movements';
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

const renderHome = () => {
    return render(
        <BrowserRouter>
            <Home />
        </BrowserRouter>
    );
};

describe('Home Component (Cart Logic)', () => {
    it('should render correctly', async () => {
        renderHome();

        // Wait for async data loading
        await waitFor(() => {
            expect(screen.getByText(/ENTRADA/i)).toBeInTheDocument();
        });

        const saidaElements = screen.getAllByText(/SAÍDA/i);
        expect(saidaElements.length).toBeGreaterThan(0);
    });

    // Note: Testing complex interaction involves selecting from dropdown which is tricky in jsdom without user-event
    // complex setup. We will do a basic sanity check of rendering.

    it('should switch modes', () => {
        renderHome();
        const btnEntry = screen.getByText(/ENTRADA/i);
        fireEvent.click(btnEntry);
        expect(screen.getByText(/Preço Total/i)).toBeInTheDocument();

        const btnExit = screen.getByText(/^SAÍDA$/i); // Regex anchor to avoid button inside button text issues
        fireEvent.click(btnExit);
        expect(screen.queryByText(/Preço Total/i)).not.toBeInTheDocument();
    });
});
