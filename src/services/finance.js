import { getDatabase } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from './authHelper';

export const FinanceService = {
    // Listar transações
    list: async () => {
        const db = await getDatabase();
        const docs = await db.transactions.find().sort({ date: 'desc' }).exec();
        return docs.map(doc => doc.toJSON());
    },

    // Criar movimentação manual (avulsa)
    create: async (transactionData) => {
        const user = await getCurrentUser();
        const db = await getDatabase();
        const now = new Date().toISOString();

        const newTransaction = {
            id: uuidv4(),
            user_id: user?.id || '',
            description: transactionData.description,
            amount: Number(transactionData.amount),
            type: transactionData.type, // 'income' or 'expense'
            category: transactionData.category || '',
            date: transactionData.date,
            reference_id: '',
            reference_type: 'manual',
            status: 'completed',
            created_at: now,
            updated_at: now
        };

        await db.transactions.insert(newTransaction);
        return newTransaction;
    },

    // Obter Balanço
    getBalance: async () => {
        const db = await getDatabase();
        const docs = await db.transactions.find().exec();
        const transactions = docs.map(doc => doc.toJSON());

        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0);

        const expense = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);

        return {
            balance: income - expense,
            income,
            expense
        };
    }
};
