import { getDatabase } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from './authHelper';
import { createStockExit } from './stockMovement';

export const SalesService = {
    list: async () => {
        const db = await getDatabase();
        const docs = await db.sales.find().sort({ date: 'desc' }).exec();
        return docs.map(doc => doc.toJSON());
    },

    create: async (saleData) => {
        const user = await getCurrentUser();
        const db = await getDatabase();
        const now = new Date().toISOString();
        const saleId = uuidv4();
        const userId = user?.id || '';

        // 1. Validar estoque antes de processar
        for (const item of saleData.items) {
            const productDoc = await db.products.findOne(item.product_id).exec();
            if (!productDoc) {
                throw new Error(`Produto não encontrado: ${item.product_id}`);
            }
            const currentStock = Number(productDoc.current_stock || 0);
            const requestedQty = Number(item.quantity || 0);

            if (!productDoc.is_service && currentStock < requestedQty) {
                throw new Error(`Estoque insuficiente para ${productDoc.name}. Disponível: ${currentStock}, Solicitado: ${requestedQty}`);
            }
        }

        // 2. Preparar dados da Venda
        const newSale = {
            id: saleId,
            type: 'SALE',
            customer_id: saleData.customer_id || '',
            user_id: userId,
            total: Number(saleData.total || 0),
            subtotal: Number(saleData.subtotal || 0),
            discount: Number(saleData.discount || 0),
            shipping_cost: 0,
            other_costs: 0,
            payment_method: saleData.payment_method || 'cash',
            amount_paid: Number(saleData.amount_paid || saleData.total || 0),
            change_amount: Number(saleData.change || 0),
            notes: '',
            fiscal_status: 'PENDING',
            nfe_key: '',
            nfe_number: 0,
            nfe_series: 0,
            nfe_url: '',
            status: 'COMPLETED',
            date: now,
            created_at: now,
            updated_at: now
        };

        // 3. Preparar Itens
        const items = saleData.items.map(item => ({
            id: uuidv4(),
            sale_id: saleId,
            product_id: item.product_id,
            quantity: Number(item.quantity || 0),
            unit_price: Number(item.unit_price || 0),
            discount: Number(item.discount || 0),
            total: Number(item.total || 0),
            cost_unit: Number(item.cost_unit || 0),
            notes: item.notes || '',
            created_at: now,
            updated_at: now
        }));

        // 4. Executar Transações
        try {
            await db.sales.insert(newSale);
            await Promise.all(items.map(item => db.sale_items.insert(item)));

            // Baixar Estoque via módulo centralizado
            for (const item of items) {
                await createStockExit(db, {
                    productId: item.product_id,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    userId,
                    reason: `Venda #${saleId.substr(0, 8)}`,
                    referenceId: saleId
                });
            }

            // Lançar no Financeiro
            await db.transactions.insert({
                id: uuidv4(),
                user_id: userId,
                description: `Venda #${saleId.substr(0, 8)} (${saleData.payment_method || 'cash'})`,
                amount: newSale.total,
                type: 'income',
                category: 'Vendas',
                date: now.split('T')[0],
                reference_id: saleId,
                reference_type: 'sale',
                status: 'completed',
                created_at: now,
                updated_at: now
            });

            return newSale;
        } catch (error) {
            console.error("Erro ao processar venda:", error);
            throw error;
        }
    }
};
