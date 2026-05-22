import { getDatabase } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from './authHelper';
import { createStockExit } from './stockMovement';

export const OrdersService = {
    list: async (filters = {}) => {
        const db = await getDatabase();
        let query = db.sales.find().sort({ date: 'desc' });

        if (filters.type) {
            query = query.where('type').eq(filters.type);
        }
        if (filters.status) {
            query = query.where('status').eq(filters.status);
        }

        const docs = await query.exec();
        return docs.map(doc => doc.toJSON());
    },

    getById: async (id) => {
        const db = await getDatabase();
        const doc = await db.sales.findOne(id).exec();
        if (!doc) return null;

        const sale = doc.toJSON();

        const items = await db.sale_items.find({
            selector: { sale_id: id }
        }).exec();

        const payments = await db.order_payments.find({
            selector: { sale_id: id }
        }).exec();

        return {
            ...sale,
            items: items.map(i => i.toJSON()),
            payments: payments.map(p => p.toJSON())
        };
    },

    createQuote: async (data) => {
        const user = await getCurrentUser();
        const userId = user?.id || '';
        const db = await getDatabase();
        const now = new Date().toISOString();
        const id = uuidv4();

        const quote = {
            id,
            type: 'QUOTE',
            status: 'OPEN',
            customer_id: data.customer_id || '',
            user_id: userId,
            subtotal: Number(data.subtotal || 0),
            discount: Number(data.discount || 0),
            shipping_cost: Number(data.shipping_cost || 0),
            other_costs: Number(data.other_costs || 0),
            total: Number(data.total || 0),
            notes: data.notes || '',
            date: now,
            created_at: now,
            updated_at: now,
            amount_paid: 0,
            change_amount: 0,
            payment_method: '',
            fiscal_status: 'PENDING',
            nfe_key: '',
            nfe_number: 0,
            nfe_series: 0,
            nfe_url: ''
        };

        const items = data.items.map(item => ({
            id: uuidv4(),
            sale_id: id,
            product_id: item.product_id,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            discount: Number(item.discount || 0),
            total: Number(item.total),
            cost_unit: Number(item.cost_unit || 0),
            notes: item.notes || '',
            created_at: now,
            updated_at: now
        }));

        await db.sales.insert(quote);
        await Promise.all(items.map(i => db.sale_items.insert(i)));

        return { ...quote, items };
    },

    updateQuote: async (id, data) => {
        const db = await getDatabase();
        const doc = await db.sales.findOne(id).exec();
        if (!doc) throw new Error("Orçamento não encontrado");
        if (doc.status !== 'OPEN' && doc.status !== 'DRAFT') {
            throw new Error("Apenas orçamentos em aberto podem ser editados");
        }

        await doc.patch({
            customer_id: data.customer_id,
            subtotal: data.subtotal,
            discount: data.discount,
            shipping_cost: data.shipping_cost,
            other_costs: data.other_costs,
            total: data.total,
            notes: data.notes,
            updated_at: new Date().toISOString()
        });

        // Re-create items
        const oldItems = await db.sale_items.find({ selector: { sale_id: id } }).exec();
        await Promise.all(oldItems.map(i => i.remove()));

        const now = new Date().toISOString();
        const newItems = data.items.map(item => ({
            id: uuidv4(),
            sale_id: id,
            product_id: item.product_id,
            quantity: Number(item.quantity),
            unit_price: Number(item.unit_price),
            discount: Number(item.discount || 0),
            total: Number(item.total),
            cost_unit: Number(item.cost_unit || 0),
            notes: item.notes || '',
            created_at: now,
            updated_at: now
        }));
        await Promise.all(newItems.map(i => db.sale_items.insert(i)));

        return { ...doc.toJSON(), items: newItems };
    },

    processOrder: async (id, paymentData) => {
        const db = await getDatabase();
        const doc = await db.sales.findOne(id).exec();
        if (!doc) throw new Error("Pedido/Orçamento não encontrado");

        const user = await getCurrentUser();
        const userId = user?.id || '';
        const now = new Date().toISOString();

        // 1. Validações
        const items = await db.sale_items.find({ selector: { sale_id: id } }).exec();
        if (items.length === 0) throw new Error("O pedido está vazio");

        for (const itemDoc of items) {
            const item = itemDoc.toJSON();
            const product = await db.products.findOne(item.product_id).exec();
            if (product && !product.is_service) {
                const currentStock = Number(product.current_stock || 0);
                if (currentStock < item.quantity) {
                    throw new Error(`Estoque insuficiente para ${product.name}. Disponível: ${currentStock}, Solicitado: ${item.quantity}`);
                }
            }
        }

        // 2. Registrar Pagamentos
        let totalPaid = 0;
        const payments = [];

        if (paymentData?.payments) {
            for (const p of paymentData.payments) {
                const payObj = {
                    id: uuidv4(),
                    sale_id: id,
                    payment_method: p.method,
                    amount: Number(p.amount),
                    installment: p.installment || 1,
                    installments_total: p.installments_total || 1,
                    due_date: p.due_date || now.split('T')[0],
                    status: p.method === 'credit' ? 'PENDING' : 'PAID',
                    created_at: now
                };
                await db.order_payments.insert(payObj);
                payments.push(payObj);

                if (payObj.status === 'PAID') {
                    totalPaid += payObj.amount;
                }
            }
        }

        // 3. Baixar Estoque via módulo centralizado
        for (const itemDoc of items) {
            const item = itemDoc.toJSON();
            await createStockExit(db, {
                productId: item.product_id,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                userId,
                reason: `Venda #${doc.id.substr(0, 8)}`,
                referenceId: doc.id
            });
        }

        // 4. Financeiro
        for (const p of payments) {
            if (p.payment_method === 'credit') {
                await db.receivables.insert({
                    id: uuidv4(),
                    sale_id: id,
                    customer_id: doc.customer_id,
                    description: `Venda #${doc.id.substr(0, 8)} - Parc. ${p.installment}/${p.installments_total}`,
                    amount: p.amount,
                    due_date: p.due_date,
                    status: 'PENDING',
                    paid_amount: 0,
                    paid_date: '',
                    payment_method: 'credit',
                    created_at: now,
                    updated_at: now
                });
            } else {
                await db.transactions.insert({
                    id: uuidv4(),
                    user_id: userId,
                    description: `Venda #${doc.id.substr(0, 8)} (${p.payment_method})`,
                    amount: p.amount,
                    type: 'income',
                    category: 'Vendas',
                    date: now.split('T')[0],
                    reference_id: id,
                    reference_type: 'sale',
                    status: 'completed',
                    created_at: now,
                    updated_at: now
                });
            }
        }

        // 5. Atualizar Status
        await doc.patch({
            type: 'SALE',
            status: 'COMPLETED',
            amount_paid: totalPaid,
            updated_at: now
        });

        return { ...doc.toJSON(), payments };
    },

    createDirectSale: async (data) => {
        const quote = await OrdersService.createQuote(data);
        return await OrdersService.processOrder(quote.id, {
            payments: data.payments || [{
                method: data.payment_method || 'cash',
                amount: data.total,
                installment: 1,
                installments_total: 1
            }]
        });
    }
};
