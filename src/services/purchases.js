import { getDatabase } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from './authHelper';
import { createStockEntry } from './stockMovement';

export const PurchaseService = {
    list: async () => {
        const db = await getDatabase();
        const docs = await db.purchases.find().sort({ date: 'desc' }).exec();

        const allProviders = await db.providers.find().exec();
        const providerMap = new Map();
        allProviders.forEach(p => providerMap.set(p.id, p.toJSON()));

        return docs.map((doc) => {
            const purchase = doc.toJSON();
            const provider = providerMap.get(purchase.provider_id);
            return { ...purchase, providerName: provider ? provider.name : 'Desconhecido' };
        });
    },

    create: async (purchaseData) => {
        const user = await getCurrentUser();
        const db = await getDatabase();
        const now = new Date().toISOString();
        const purchaseId = uuidv4();
        const userId = user?.id || '';

        // 1. Preparar dados da Compra
        const newPurchase = {
            id: purchaseId,
            provider_id: purchaseData.provider_id || '',
            user_id: userId,
            total: Number(purchaseData.total || 0),
            subtotal: Number(purchaseData.subtotal || purchaseData.total || 0),
            discount: Number(purchaseData.discount || 0),
            freight: Number(purchaseData.freight || 0),
            insurance: Number(purchaseData.insurance || 0),
            other_expenses: Number(purchaseData.other_expenses || 0),
            status: (purchaseData.status || 'COMPLETED').toUpperCase(),
            date: purchaseData.date || now,
            nfe_key: purchaseData.nfe_key || '',
            nfe_xml: purchaseData.nfe_xml || '',
            issue_date: purchaseData.issue_date || (purchaseData.date || now),
            created_at: now,
            updated_at: now
        };

        // 2. Preparar Itens
        const items = purchaseData.items.map((item) => ({
            id: uuidv4(),
            purchase_id: purchaseId,
            product_id: item.product_id,
            quantity: Number(item.quantity || 0),
            unit_cost: Number(item.cost || 0),
            total: Number(item.total || 0),
            ipi_percent: Number(item.ipi_percent || 0),
            icms_percent: Number(item.icms_percent || 0),
            created_at: now,
            updated_at: now
        }));

        // 3. Persistir Compra e Itens
        await db.purchases.insert(newPurchase);
        await Promise.all(items.map((item) => db.purchase_items.insert(item)));

        // 4. Estoque via módulo centralizado (apenas se COMPLETED)
        if (newPurchase.status === 'COMPLETED') {
            for (const item of purchaseData.items) {
                await createStockEntry(db, {
                    productId: item.product_id,
                    quantity: Number(item.quantity || 0),
                    costUnit: Number(item.cost || 0),
                    userId,
                    reason: `Compra #${purchaseId.substr(0, 8)}`,
                    providerId: purchaseData.provider_id || '',
                    expirationDate: item.expiration_date || '',
                    referenceId: purchaseId
                });
            }
        }

        // 5. Financeiro (Contas a Pagar vs Despesa Direta)
        const installments = purchaseData.installments || [];

        if (installments.length > 0) {
            const paymentDocs = installments.map((inst, index) => ({
                id: uuidv4(),
                purchase_id: purchaseId,
                provider_id: purchaseData.provider_id,
                description: `Parcela ${index + 1}/${installments.length} - Compra #${purchaseId.substring(0, 6)}`,
                amount: Number(inst.amount),
                due_date: inst.due_date,
                status: 'PENDING',
                payment_method: inst.method || 'boleto',
                paid_amount: 0,
                paid_date: '',
                barcode: inst.barcode || '',
                created_at: now,
                updated_at: now
            }));
            await Promise.all(paymentDocs.map(p => db.purchase_payments.insert(p)));
        } else {
            await db.purchase_payments.insert({
                id: uuidv4(),
                purchase_id: purchaseId,
                provider_id: purchaseData.provider_id,
                description: `Pagamento à vista - Compra #${purchaseId.substring(0, 6)}`,
                amount: Number(newPurchase.total),
                due_date: newPurchase.date.split('T')[0],
                paid_amount: Number(newPurchase.total),
                paid_date: newPurchase.date,
                status: 'PAID',
                payment_method: 'cash',
                barcode: '',
                created_at: now,
                updated_at: now
            });

            await db.transactions.insert({
                id: uuidv4(),
                user_id: userId,
                description: `Compra #${purchaseId.substring(0, 6)}`,
                amount: Number(newPurchase.total || 0),
                type: 'expense',
                category: 'Fornecedores',
                date: purchaseData.date ? purchaseData.date.split('T')[0] : now.split('T')[0],
                reference_id: purchaseId,
                reference_type: 'purchase',
                status: 'completed',
                created_at: now,
                updated_at: now
            });
        }

        return newPurchase;
    }
};
