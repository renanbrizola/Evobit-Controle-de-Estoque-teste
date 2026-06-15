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

const renderHome = () => {
    return render(
        <BrowserRouter>
            <Movements />
        </BrowserRouter>
    );
};

describe('Home Component (Cart Logic)', () => {
    it('should render correctly', async () => {
        renderHome();

        // Wait for the mode selector to render (entry/exit toggle buttons).
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /entrada/i })).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: /saída/i })).toBeInTheDocument();
    });

    // Note: Testing complex interaction involves selecting from dropdown which is tricky in jsdom without user-event
    // complex setup. We will do a basic sanity check of rendering.

    it('should switch modes', async () => {
        renderHome();

        const btnEntry = await screen.findByRole('button', { name: /entrada/i });
        fireEvent.click(btnEntry);
        // Entry mode shows the total-value field (label "Total (R$)").
        expect(screen.getByText(/Total \(/i)).toBeInTheDocument();

        const btnExit = screen.getByRole('button', { name: /saída/i });
        fireEvent.click(btnExit);
        // Exit mode hides the total-value field.
        expect(screen.queryByText(/Total \(/i)).not.toBeInTheDocument();
    });
});
