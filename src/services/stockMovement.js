import { v4 as uuidv4 } from 'uuid';

/**
 * Módulo centralizado para operações atômicas de estoque.
 * Toda movimentação de estoque (entrada, saída) deve passar por aqui
 * para garantir consistência no cálculo de custo médio e event sourcing.
 */

const getDeviceId = () => localStorage.getItem('evobit_device_id') || 'unknown_device';

/**
 * Cria um evento de sincronização (event sourcing).
 */
const createSyncEvent = async (db, { movementId, batchId, type, productId, quantity, costUnit, oldStock, newStock, referenceId }) => {
    const now = new Date().toISOString();
    await db.sync_events.insert({
        id: uuidv4(),
        entity: 'movements',
        action: 'INSERT',
        payload: JSON.stringify({
            movement_id: movementId,
            batch_id: batchId || null,
            type,
            product_id: productId,
            quantity,
            cost_unit: costUnit,
            old_stock: oldStock,
            new_stock: newStock,
            reference_id: referenceId
        }),
        local_timestamp: now,
        device_id: getDeviceId(),
        sync_status: 'PENDING',
        error_message: '',
        created_at: now,
        deleted_at: ''
    });
};

/**
 * Cria uma entrada de estoque (IN) com lote, custo médio ponderado e sync event.
 * @param {Object} db - Instância RxDB
 * @param {Object} params
 * @param {string} params.productId
 * @param {number} params.quantity
 * @param {number} params.costUnit - Custo unitário de aquisição
 * @param {string} params.userId
 * @param {string} params.reason - Ex: "Compra #abc123"
 * @param {string} [params.providerId]
 * @param {string} [params.expirationDate]
 * @param {string} [params.referenceId] - ID da compra/receita de origem
 * @returns {Promise<{movementId: string, batchId: string, newStock: number, newAvgCost: number}>}
 */
export const createStockEntry = async (db, { productId, quantity, costUnit, userId, reason, providerId = '', expirationDate = '', referenceId = '' }) => {
    const now = new Date().toISOString();
    const productDoc = await db.products.findOne(productId).exec();
    if (!productDoc) throw new Error(`Produto ${productId} não encontrado`);

    const qty = Number(quantity);
    const cost = Number(costUnit);
    const currentStock = Number(productDoc.current_stock || 0);
    const newStock = currentStock + qty;

    const movementId = uuidv4();
    const batchId = uuidv4();

    // 1. Criar Lote
    await db.product_batches.insert({
        id: batchId,
        product_id: productId,
        quantity: qty,
        initial_quantity: qty,
        cost_unit: cost,
        expiration_date: expirationDate,
        provider: providerId,
        movement_id: movementId,
        user_id: userId,
        created_at: now,
        updated_at: now,
        deleted_at: ''
    });

    // 2. Criar Movimento
    await db.movements.insert({
        id: movementId,
        product_id: productId,
        type: 'IN',
        quantity: qty,
        price: cost,
        cost_unit: cost,
        reason,
        obs: '',
        reference_id: referenceId,
        batch_id: batchId,
        provider: providerId,
        validity: expirationDate,
        date: now,
        user_id: userId,
        updated_at: now
    });

    // 3. Calcular Custo Médio Ponderado
    const oldAvgCost = Number(productDoc.average_cost || productDoc.cost_price || 0);
    const newAvgCost = newStock > 0
        ? ((currentStock * oldAvgCost) + (qty * cost)) / newStock
        : cost;

    // 4. Atualizar Produto
    const productUpdates = {
        current_stock: newStock,
        cost_price: cost,
        average_cost: newAvgCost,
        updated_at: now
    };
    if (providerId) productUpdates.provider_id = providerId;
    if (expirationDate) productUpdates.expiration_date = expirationDate;

    await productDoc.patch(productUpdates);

    // 5. Event Sourcing
    await createSyncEvent(db, {
        movementId, batchId, type: 'IN', productId, quantity: qty,
        costUnit: cost, oldStock: currentStock, newStock, referenceId
    });

    return { movementId, batchId, newStock, newAvgCost };
};

/**
 * Cria uma saída de estoque (OUT) com sync event.
 * @param {Object} db - Instância RxDB
 * @param {Object} params
 * @param {string} params.productId
 * @param {number} params.quantity
 * @param {number} params.unitPrice - Preço de venda unitário
 * @param {string} params.userId
 * @param {string} params.reason - Ex: "Venda #abc123"
 * @param {string} [params.referenceId] - ID da venda de origem
 * @param {boolean} [params.skipServiceProducts] - Se true, pula produtos is_service
 * @returns {Promise<{movementId: string, newStock: number, costUnit: number} | null>}
 */
export const createStockExit = async (db, { productId, quantity, unitPrice, userId, reason, referenceId = '', skipServiceProducts = true }) => {
    const now = new Date().toISOString();
    const productDoc = await db.products.findOne(productId).exec();
    if (!productDoc) return null;

    // Pular serviços
    if (skipServiceProducts && productDoc.is_service) return null;

    const qty = Number(quantity);
    const currentStock = Number(productDoc.current_stock || 0);
    const newStock = currentStock - qty;
    const costUnit = Number(productDoc.average_cost || productDoc.cost_price || 0);

    const movementId = uuidv4();

    // 1. Criar Movimento
    await db.movements.insert({
        id: movementId,
        product_id: productId,
        type: 'OUT',
        quantity: qty,
        price: Number(unitPrice),
        cost_unit: costUnit,
        reason,
        obs: '',
        reference_id: referenceId,
        batch_id: '',
        provider: '',
        validity: '',
        date: now,
        user_id: userId,
        updated_at: now
    });

    // 2. Atualizar Produto
    await productDoc.patch({
        current_stock: newStock,
        last_sale_date: now,
        updated_at: now
    });

    // 3. Event Sourcing
    await createSyncEvent(db, {
        movementId, type: 'OUT', productId, quantity: qty,
        costUnit, oldStock: currentStock, newStock, referenceId
    });

    return { movementId, newStock, costUnit };
};
