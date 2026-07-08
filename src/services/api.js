import { getDatabase } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabaseClient'; // Kept for teams (online-first)
import { getCurrentUser, canTeamMember } from './authHelper';
import { toast } from 'sonner';

const TEAM_PERMISSION_MSG = 'Você não tem permissão para esta ação. Peça ao dono da conta para liberar em Configurações → Equipe.';

/**
 * Modo equipe: bloqueia a ação se o usuário logado é membro convidado sem a
 * permissão liberada pelo dono. O dono passa sempre. A RLS aplica a mesma
 * regra no servidor; este guard falha cedo, ANTES da escrita local (RxDB),
 * para o membro não "salvar" algo que nunca sincronizaria. Sem sessão local
 * (user null) mantém o comportamento offline antigo — a RLS decide no push.
 */
const assertCan = (user, perms) => {
    if (!user) return;
    if (!canTeamMember(user, perms)) {
        throw new Error(TEAM_PERMISSION_MSG);
    }
};

const requirePermission = async (perms) => {
    const user = await getCurrentUser();
    assertCan(user, perms);
    return user;
};

export const api = {
    // PRODUCTS
    products: {
        list: async (options = {}) => {
            const {
                page = 1,
                limit, // Removed default to allow 'all' mode
                search = '',
                category = 'TODOS',
                stockFilter = 'ALL',
                sort = { key: 'name', direction: 'asc' }
            } = options;

            const db = await getDatabase();
            if (!db) {
                return [];
            }
            let selector = {};

            // 1. Search (Regex-like)
            if (search) {
                // RxDB/Mango queries are limited for OR across fields without specific plugins
                // For simplicity/performance in local-first, we might fetch broader and filter memory for SEARCH
                // ensuring we don't break the query.
                // BUT let's try a primary search on name first
                selector.name = { $regex: new RegExp(search, 'i') };
            }

            // 2. Category
            if (category && category !== 'TODOS') {
                selector.category = { $eq: category };
            }

            // 3. Stock Filter
            if (stockFilter === 'LOW') {
                // Complex logic: current_stock <= min_stock
                // RxDB selector doesn't support comparing two fields in same doc easily (where a < b)
                // We might need to handle this via in-memory filter or a specific plugin
                // For now, let's allow fetching and filtering this specific case in memory if needed,
                // OR we rely on a computed field if we had one.
            }

            // EXECUTE QUERY
            // Determine if we can run full DB query or need memory post-processing
            // For robust search across multiple fields (name, barcode, brand),
            // it is often better in client-side DBs to fetch all valid items and sort/paginate in JS
            // UNLESS the dataset is massive (>50k).
            // Given the complexity of "Search multiple fields" + "Compare two fields (stock vs min)",
            // Let's optimize by fetching ALL valid docs (filtered by category if possible)
            // and doing the rest in JS. It's still "Server-side" in context of separating concerns from UI.

            let query = db.products.find();

            // Apply Category Filter at DB Level (Indexed usually)
            if (category && category !== 'TODOS') {
                query = query.where('category').eq(category);
            }

            const allDocs = await query.exec();

            // IN-MEMORY FILTERING (Rich features)
            let filtered = allDocs.map(doc => doc.toJSON());

            if (search) {
                const lowerSearch = search.toLowerCase();
                filtered = filtered.filter(p =>
                    p.name.toLowerCase().includes(lowerSearch) ||
                    (p.barcode && p.barcode.includes(lowerSearch)) ||
                    (p.brand && p.brand.toLowerCase().includes(lowerSearch))
                );
            }

            if (stockFilter === 'LOW') {
                filtered = filtered.filter(p => (Number(p.current_stock || 0) <= Number(p.min_stock || 0)));
            } else if (stockFilter === 'EXPIRING') {
                const today = new Date();
                filtered = filtered.filter(p => {
                    if (!p.expiration_date) return false;
                    const exp = new Date(p.expiration_date);
                    const diffDays = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
                    return diffDays <= 30; // Expired or expiring in 30 days
                });
            }

            // SORTING
            if (sort && sort.key) {
                filtered.sort((a, b) => {
                    let aVal = a[sort.key];
                    let bVal = b[sort.key];

                    if (['current_stock', 'min_stock', 'price', 'cost_price'].includes(sort.key)) {
                        aVal = Number(aVal || 0);
                        bVal = Number(bVal || 0);
                    } else {
                        aVal = (aVal || '').toString().toLowerCase();
                        bVal = (bVal || '').toString().toLowerCase();
                    }

                    if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            // Return FULL array if no limit specified (Backward Compatibility)
            if (!limit) {
                return filtered;
            }

            const offset = (page - 1) * limit;

            const total = filtered.length;
            const items = filtered.slice(offset, offset + limit);

            // Calculate Total Equity (Patrimônio) based on cost, not selling price
            const totalEquity = filtered.reduce((acc, prod) => {
                const cost = Number(prod.average_cost || prod.cost_price || 0);
                return acc + (Number(prod.current_stock || 0) * cost);
            }, 0);

            return {
                items,
                total,
                totalPages: Math.ceil(total / limit),
                totalEquity // Return total equity
            };
        },
        bulkDelete: async (ids) => {
            await requirePermission(['can_delete']);
            const db = await getDatabase();
            if (!ids || ids.length === 0) return;

            const docs = await db.products.find({
                selector: {
                    id: {
                        $in: ids
                    }
                }
            }).exec();

            // Soft-delete (tombstone) para que a exclusão sincronize ao Supabase
            // em vez de só sumir localmente e voltar no proximo pull.
            const now = new Date().toISOString();
            await Promise.all(docs.map(doc => doc.incrementalPatch({
                deleted_at: now,
                updated_at: now,
                is_active: false
            })));
            return docs.length;
        },
        create: async (product) => {
            const user = await getCurrentUser();
            if (!user || !user.id) {
                throw new Error("Sessão de usuário ausente. Faça login novamente para cadastrar.");
            }
            // Produtos são master data dos dois módulos (insumos/fichas criam produtos)
            assertCan(user, ['inventory_write', 'technical_sheet_write']);

            const db = await getDatabase();
            if (!db) {
                toast.error("Erro: Falha ao abrir banco");
                throw new Error("Failed to initialize database");
            }

            const newProduct = {
                id: uuidv4(),
                ...product,
                user_id: user.ownerId || user.id,
                updated_at: new Date().toISOString(),
                current_stock: Number(product.current_stock || 0),
                min_stock: Number(product.min_stock || 0),
                price: Number(product.price || 0),
                cost_price: Number(product.cost_price || 0),
                average_cost: Number(product.average_cost || 0),
                expiration_date: product.expiration_date || '',
                provider_id: product.provider_id || '',
                category: product.category || '',
                brand: product.brand || '',
                manufacturer: product.manufacturer || '',
                location: product.location || '',
                description: product.description || '',
                barcode: product.barcode || '',
                unit: product.unit || 'UN'
            };

            try {
                await Promise.race([
                    db.products.insert(newProduct),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout inserting into DB")), 5000))
                ]);
            } catch (err) {
                console.error("RxDB Insert Error:", err);
                toast.error(`Erro ao inserir: ${err.message}`);
                throw err;
            }

            return newProduct;
        },
        update: async (id, updates) => {
            await requirePermission(['inventory_write', 'technical_sheet_write']);
            const db = await getDatabase();
            const productDoc = await db.products.findOne(id).exec();
            if (!productDoc) throw new Error("Produto não encontrado");

            await productDoc.patch({
                ...updates,
                // Sanitize potential nulls in updates
                expiration_date: updates.expiration_date !== undefined ? (updates.expiration_date || '') : productDoc.expiration_date,
                provider_id: updates.provider_id !== undefined ? (updates.provider_id || '') : productDoc.provider_id,
                category: updates.category !== undefined ? (updates.category || '') : productDoc.category,
                brand: updates.brand !== undefined ? (updates.brand || '') : productDoc.brand,
                barcode: updates.barcode !== undefined ? (updates.barcode || '') : productDoc.barcode,
                updated_at: new Date().toISOString(),
                price: updates.price !== undefined ? Number(updates.price) : productDoc.price,
                min_stock: updates.min_stock !== undefined ? Number(updates.min_stock) : productDoc.min_stock,
                cost_price: updates.cost_price !== undefined ? Number(updates.cost_price) : productDoc.cost_price,
                average_cost: updates.average_cost !== undefined ? Number(updates.average_cost) : productDoc.average_cost,
                current_stock: updates.current_stock !== undefined ? Number(updates.current_stock) : productDoc.current_stock
            });
            return productDoc.toJSON();
        },
        bulkUpdate: async (ids, updates) => {
            await requirePermission(['inventory_write', 'technical_sheet_write']);
            const db = await getDatabase();
            if (!ids || ids.length === 0) return 0;

            const docs = await db.products.find({
                selector: {
                    id: { $in: ids }
                }
            }).exec();

            const now = new Date().toISOString();
            const patchData = {
                ...updates,
                updated_at: now
            };

            await Promise.all(docs.map(doc => doc.patch(patchData)));
            return docs.length;
        },
        delete: async (id) => {
            await requirePermission(['can_delete']);
            const db = await getDatabase();
            const productDoc = await db.products.findOne(id).exec();
            if (productDoc) {
                // Soft-delete: marca o tombstone (deleted_at) para que a exclusão
                // seja sincronizada ao Supabase. Um remove() local "duro" não
                // propaga, e o produto voltava no proximo pull.
                await productDoc.incrementalPatch({
                    deleted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    is_active: false
                });
            }
        }
    },


    // BATCHES (Lotes)
    batches: {
        list: async () => {
            const db = await getDatabase();
            const docs = await db.product_batches.find({
                selector: { deleted_at: { $eq: '' } }
            }).exec();
            return docs.map(doc => doc.toJSON());
        },
        listByProduct: async (productId) => {
            const db = await getDatabase();
            const docs = await db.product_batches.find({
                selector: {
                    product_id: productId,
                    deleted_at: { $eq: '' },
                    quantity: { $gt: 0 }
                }
            }).exec();
            return docs.map(doc => doc.toJSON());
        },
        listExpiring: async (daysAhead = 30) => {
            const db = await getDatabase();
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() + daysAhead);
            const cutoffStr = cutoffDate.toISOString().split('T')[0];

            const allBatches = await db.product_batches.find({
                selector: {
                    deleted_at: { $eq: '' },
                    quantity: { $gt: 0 }
                }
            }).exec();

            // Filter batches with expiration_date set and before cutoff
            return allBatches
                .map(doc => doc.toJSON())
                .filter(b => b.expiration_date && b.expiration_date <= cutoffStr);
        }
    },

    // MOVEMENTS (Atomic Transactions with Batch support)
    movements: {
        list: async () => {
            const db = await getDatabase();
            const movements = await db.movements.find().sort({ date: 'desc' }).exec();

            // Pre-load ALL products into a Map to avoid N+1 queries
            const allProducts = await db.products.find().exec();
            const productMap = new Map();
            allProducts.forEach(p => productMap.set(p.id, p.toJSON()));

            const enrichedMovements = movements.map((m) => {
                const mov = m.toJSON();
                const product = productMap.get(mov.product_id);

                // Map DB types back to UI types
                let uiType = mov.type;
                if (mov.type === 'IN') uiType = 'Entrada';
                else if (mov.type === 'OUT') uiType = 'Saída';
                else if (mov.type === 'ADJUSTMENT') uiType = 'Ajuste';

                return {
                    ...mov,
                    rawType: mov.type,
                    type: uiType,
                    qty: mov.quantity, // Alias for UI consumers (Dashboard, History, Providers)
                    productName: product ? product.name : 'Produto Deletado',
                    dateStr: new Date(mov.date).toLocaleDateString(),
                    timeStr: new Date(mov.date).toLocaleTimeString()
                };
            });

            return enrichedMovements;
        },

        createTransaction: async (items) => {
            const db = await getDatabase();
            const user = await getCurrentUser();
            if (!user || !user.id) {
                throw new Error("Sessão de usuário ausente. Faça login novamente para cadastrar.");
            }
            assertCan(user, ['inventory_write']);

            const results = [];
            const now = new Date().toISOString();

            // Process sequentially to ensure consistency
            for (const item of items) {
                const productDoc = await db.products.findOne(item.product_id).exec();
                if (!productDoc) throw new Error(`Produto ${item.product_id} não encontrado`);

                const qty = Number(item.quantity || item.qty);
                const currentStock = Number(productDoc.current_stock || 0);
                const costUnit = Number(item.cost_unit || item.price || 0);

                // Map UI Type to DB Type
                let dbType = item.type;
                if (item.type === 'Entrada') dbType = 'IN';
                if (item.type === 'Saída') dbType = 'OUT';
                if (item.type === 'Ajuste') dbType = 'OUT'; // Ajuste = perda/correção = saída



                // Validation
                if (dbType === 'OUT' && currentStock < qty) {
                    throw new Error(`Estoque insuficiente para ${productDoc.name}`);
                }

                const movementId = uuidv4();
                let batchId = null;

                // ENTRADA: Criar lote automaticamente
                if (dbType === 'IN') {
                    batchId = uuidv4();
                    const batchData = {
                        id: batchId,
                        product_id: item.product_id,
                        quantity: qty,
                        initial_quantity: qty,
                        cost_unit: costUnit,
                        expiration_date: item.validity || '',
                        provider: item.provider || '',
                        movement_id: movementId,
                        user_id: user.ownerId || user.id,
                        created_at: now,
                        updated_at: now,
                        deleted_at: ''
                    };
                    await db.product_batches.insert(batchData);

                }

                // Create Movement
                const movementData = {
                    id: movementId,
                    product_id: item.product_id,
                    type: dbType,
                    quantity: qty,
                    price: item.price,
                    cost_unit: costUnit,
                    reason: item.reason,
                    obs: item.obs,
                    provider: item.provider || '',
                    validity: item.validity || '',
                    batch_id: batchId || '',
                    reference_id: '',
                    date: now,
                    user_id: user.ownerId || user.id,
                    updated_at: now
                };

                await db.movements.insert(movementData);

                // Update Stock
                const newStock = dbType === 'IN'
                    ? currentStock + qty
                    : currentStock - qty;

                const productUpdates = {
                    current_stock: newStock,
                    updated_at: now
                };

                // Only update last_sale_date for actual sales, not losses/adjustments
                const isActualSale = dbType === 'OUT' && item.reason && (
                    item.reason.includes('Venda') || item.reason === 'Venda ao Cliente'
                );
                if (isActualSale) {
                    productUpdates.last_sale_date = now;
                }

                if (dbType === 'IN') {
                    const oldAvgCost = Number(productDoc.average_cost || productDoc.cost_price || 0);
                    // Avoid division by zero if newStock is somehow 0 (unlikely for IN)
                    const newAvgCost = newStock > 0
                        ? ((currentStock * oldAvgCost) + (qty * costUnit)) / newStock
                        : costUnit;

                    productUpdates.average_cost = newAvgCost;
                    productUpdates.cost_price = costUnit; // Last Cost update

                    if (item.provider) {
                        productUpdates.provider_id = item.provider;
                    }
                    if (item.validity) {
                        productUpdates.expiration_date = item.validity;
                    }
                }

                await productDoc.patch(productUpdates);

                // NOVO: Fila Imutável de Event Sourcing
                // Log the exact parameters that resulted in this movement to replay on server reliably
                const eventPayload = {
                    movement_id: movementId,
                    batch_id: batchId,
                    type: dbType,
                    product_id: item.product_id,
                    quantity: qty,
                    cost_unit: costUnit,
                    old_stock: currentStock,
                    new_stock: newStock,
                    productUpdates: productUpdates
                };

                await db.sync_events.insert({
                    id: uuidv4(),
                    entity: 'movements',
                    action: 'INSERT',
                    payload: JSON.stringify(eventPayload),
                    local_timestamp: now,
                    device_id: localStorage.getItem('evobit_device_id') || 'unknown_device',
                    sync_status: 'PENDING',
                    error_message: ''
                });

                results.push(movementData);
            }

            return results;
        },

        /**
         * Reverse (estorno) a movement — creates an opposite counter-movement
         * and adjusts product stock accordingly.
         * @param {string} movementId - ID of the movement to reverse
         * @param {string} [reversalReason] - Optional reason for the reversal
         */
        reverse: async (movementId, reversalReason) => {
            await requirePermission(['inventory_write']);
            const db = await getDatabase();

            // 1. Find the original movement
            const originalDoc = await db.movements.findOne({ selector: { id: movementId } }).exec();
            if (!originalDoc) throw new Error('Movimentação não encontrada');

            const original = originalDoc.toJSON();

            // 2. Determine the reverse type
            const originalType = original.type; // 'IN' or 'OUT'
            const reverseType = originalType === 'IN' ? 'OUT' : 'IN';
            const reverseUiType = reverseType === 'IN' ? 'Entrada' : 'Saída';

            // 3. Get the product and validate
            const productDoc = await db.products.findOne({ selector: { id: original.product_id } }).exec();
            if (!productDoc) throw new Error('Produto da movimentação não encontrado');

            const currentStock = Number(productDoc.current_stock || 0);
            const qty = Number(original.quantity || 0);

            // If reversing an IN (returning stock), check if we have enough stock
            if (originalType === 'IN' && qty > currentStock) {
                throw new Error(`Estoque insuficiente para estorno. Estoque atual: ${currentStock}, necessário: ${qty}`);
            }

            // 4. Create the reversal movement via createTransaction
            const reason = reversalReason || `Estorno: ${original.reason || reverseUiType}`;
            await api.movements.createTransaction([{
                product_id: original.product_id,
                type: reverseUiType,
                quantity: qty,
                reason: `[ESTORNO #${movementId.slice(0, 8)}] ${reason}`,
                cost_unit: Number(original.cost_unit || original.price || 0),
                provider: original.provider || ''
            }]);

            return { success: true, reversedId: movementId, reverseType };
        }
    },

    // CATEGORIES (Cadastro dinâmico)
    categories: {
        list: async () => {
            const db = await getDatabase();
            const docs = await db.categories.find().sort({ name: 'asc' }).exec();
            return docs.map(doc => doc.toJSON());
        },
        create: async (name) => {
            const user = await getCurrentUser();
            if (!user || !user.id) {
                throw new Error("Sessão de usuário ausente. Faça login novamente para cadastrar.");
            }
            assertCan(user, ['inventory_write']);
            const userId = user.ownerId || user.id;

            if (!name || typeof name !== 'string' || !name.trim()) {
                throw new Error("Nome da categoria inválido");
            }

            const db = await getDatabase();
            const newCategory = {
                id: uuidv4(),
                name: name.trim(),
                user_id: userId,
                updated_at: new Date().toISOString()
            };

            try {
                await db.categories.insert(newCategory);
                return newCategory;
            } catch (err) {
                console.error("Erro ao criar categoria:", err);
                throw new Error(`Falha ao salvar categoria: ${err.message}`);
            }
        },
        update: async (id, name) => {
            await requirePermission(['inventory_write']);
            if (!name || typeof name !== 'string' || !name.trim()) {
                throw new Error("Nome da categoria inválido");
            }
            const newName = name.trim();
            const db = await getDatabase();
            const doc = await db.categories.findOne(id).exec();
            if (!doc) throw new Error("Categoria não encontrada");

            const oldName = doc.name;

            // 1. Update Category
            await doc.patch({ name: newName, updated_at: new Date().toISOString() });

            // 2. Propagate to associated Products
            if (oldName !== newName) {
                const products = await db.products.find({
                    selector: {
                        category: { $eq: oldName }
                    }
                }).exec();

                if (products.length > 0) {
                    const productUpdates = products.map(prod => prod.patch({
                        category: newName,
                        updated_at: new Date().toISOString()
                    }));
                    await Promise.all(productUpdates);
                }
            }

            return doc.toJSON();
        },
        delete: async (id) => {
            await requirePermission(['can_delete']);
            const db = await getDatabase();
            const doc = await db.categories.findOne(id).exec();
            if (doc) await doc.remove();
        }
    },

    // PROVIDERS (Unified - list, create, update, delete)
    providers: {
        list: async () => {
            const db = await getDatabase();
            if (!db) return [];
            const docs = await db.providers.find().sort({ name: 'asc' }).exec();
            return docs.map(doc => doc.toJSON());
        },
        create: async (data) => {
            const db = await getDatabase();
            const user = await getCurrentUser();
            if (!user || !user.id) {
                throw new Error("Sessão de usuário ausente. Faça login novamente para cadastrar.");
            }
            assertCan(user, ['inventory_write']);

            if (!data.name || !data.name.trim()) {
                throw new Error("Nome do fornecedor é obrigatório");
            }

            const newProvider = {
                ...data,
                id: uuidv4(),
                name: (data.name || 'Sem Razão Social').trim(),
                trade_name: data.trade_name || data.name || '',
                cnpj: data.cnpj || '',
                ie: data.ie || '',
                im: data.im || '',
                phone: data.phone || '',
                mobile_phone: data.mobile_phone || '',
                email: data.email || '',
                email_nfe: data.email_nfe || '',
                website: data.website || '',
                seller: data.seller || '',
                cep: data.cep || '',
                street: data.street || '',
                number: data.number || '',
                complement: data.complement || '',
                neighborhood: data.neighborhood || '',
                city: data.city || '',
                state: data.state || '',
                address: data.address || '',
                delivery_time: data.delivery_time || '',
                payment_terms: data.payment_terms || '',
                product_types: data.product_types || '',
                order_day: data.order_day || '',
                bank_info: data.bank_info || '',
                credit_limit: Number(data.credit_limit || 0),
                is_active: data.is_active !== undefined ? data.is_active : true,
                user_id: user.ownerId || user.id,
                updated_at: new Date().toISOString()
            };

            try {
                await db.providers.insert(newProvider);
                return newProvider;
            } catch (err) {
                console.error("Erro no provider insert:", err);
                throw new Error(`Falha ao salvar fornecedor: ${err.message}`);
            }
        },
        update: async (id, updates) => {
            await requirePermission(['inventory_write']);
            const db = await getDatabase();
            const doc = await db.providers.findOne(id).exec();
            if (!doc) throw new Error("Fornecedor não encontrado");

            await doc.patch({
                ...updates,
                // Sanitize potential nulls for all fields
                cnpj: updates.cnpj !== undefined ? (updates.cnpj || '') : doc.cnpj,
                phone: updates.phone !== undefined ? (updates.phone || '') : doc.phone,
                email: updates.email !== undefined ? (updates.email || '') : doc.email,
                address: updates.address !== undefined ? (updates.address || '') : doc.address,
                seller: updates.seller !== undefined ? (updates.seller || '') : doc.seller,
                delivery_time: updates.delivery_time !== undefined ? (updates.delivery_time || '') : doc.delivery_time,
                payment_terms: updates.payment_terms !== undefined ? (updates.payment_terms || '') : doc.payment_terms,
                product_types: updates.product_types !== undefined ? (updates.product_types || '') : doc.product_types,
                order_day: updates.order_day !== undefined ? (updates.order_day || '') : doc.order_day,
                updated_at: new Date().toISOString()
            });
            return doc.toJSON();
        },
        delete: async (id) => {
            await requirePermission(['can_delete']);
            const db = await getDatabase();
            const doc = await db.providers.findOne(id).exec();
            if (doc) await doc.remove();
        }
    },

    // TEAMS (Online-first)
    teams: {
        list: async () => {
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .order('created_at');
            if (error) throw error;
            return data;
        },
        // Só o INSERT (caminho crítico, rápido). O e-mail vai numa chamada
        // separada (sendInviteEmail) que a UI dispara em background, para o
        // membro aparecer na lista na hora sem esperar a Edge Function.
        invite: async (email) => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Usuário não autenticado");

            const cleanEmail = String(email).trim().toLowerCase();

            // Regra: uma conta é DONO ou MEMBRO, nunca os dois. Bloqueia antes
            // de inserir se o e-mail já é proprietário ou membro de outra
            // equipe. (O banco também barra — defesa em profundidade.)
            try {
                const { data: status, error: rpcError } = await supabase.rpc('check_invite_email', {
                    p_email: cleanEmail,
                });
                if (!rpcError && status) {
                    if (status === 'owner') {
                        const e = new Error('OWNER'); e.inviteBlock = 'owner'; throw e;
                    }
                    if (status === 'member_elsewhere') {
                        const e = new Error('MEMBER_ELSEWHERE'); e.inviteBlock = 'member_elsewhere'; throw e;
                    }
                }
            } catch (err) {
                if (err.inviteBlock) throw err; // erro de regra: propaga
                console.warn('check_invite_email indisponível:', err?.message); // rede: segue (o banco barra)
            }

            // Novo membro começa SOMENTE LEITURA — o dono libera permissões
            // nos toggles da tela de equipe.
            const { data, error } = await supabase
                .from('team_members')
                .insert({
                    owner_id: user.id,
                    member_email: cleanEmail,
                    role: 'employee',
                    permissions: {}
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        // Dispara o e-mail de convite (Edge Function invite-member, service
        // role → auth.admin.inviteUserByEmail). Se não estiver deployada, o
        // convite continua valendo: o membro cria a conta com este e-mail.
        sendInviteEmail: async (email) => {
            const cleanEmail = String(email).trim().toLowerCase();
            try {
                const { data: fnData, error: fnError } = await supabase.functions.invoke('invite-member', {
                    body: { email: cleanEmail }
                });
                if (fnError) {
                    console.warn('invite-member indisponível:', fnError.message);
                    return { emailSent: false, alreadyRegistered: false };
                }
                return {
                    emailSent: !!fnData?.emailSent,
                    alreadyRegistered: !!fnData?.alreadyRegistered,
                };
            } catch (fnErr) {
                console.warn('invite-member indisponível:', fnErr?.message);
                return { emailSent: false, alreadyRegistered: false };
            }
        },
        updatePermissions: async (id, permissions) => {
            const { data, error } = await supabase
                .from('team_members')
                .update({ permissions })
                .eq('id', id)
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        remove: async (id) => {
            const { error } = await supabase
                .from('team_members')
                .delete()
                .eq('id', id);
            if (error) throw error;
        }
    },

    // RECIPES / FICHA TÉCNICA
    recipes: {
        list: async () => {
            const db = await getDatabase();
            if (!db) return [];

            const docs = await db.recipes.find().exec();
            const jsonDocs = docs.map(doc => doc.toJSON());

            // Retornar apenas receitas não deletadas
            return jsonDocs.filter(doc => !doc.deleted_at);
        },
        getById: async (id) => {
            if (!id) return null;
            const db = await getDatabase();
            if (!db) return null;

            const doc = await db.recipes.findOne({ selector: { id } }).exec();
            if (!doc || doc.deleted_at) return null;

            return doc.toJSON();
        },
        create: async (payload) => {
            const user = await getCurrentUser();
            if (!user || !user.id) {
                throw new Error('Usuário não autenticado. O ID do usuário é obrigatório para criar uma receita.');
            }
            assertCan(user, ['technical_sheet_write']);

            if (!payload.finished_product_id) {
                throw new Error('Produto final (finished_product_id) é obrigatório.');
            }

            const db = await getDatabase();
            if (!db) throw new Error('Banco de dados local não inicializado.');

            const ingredients = (payload.ingredients || []).map(ing => {
                if (!ing.input_product_id) {
                    throw new Error('Todos os ingredientes devem ter um produto (input_product_id).');
                }
                if (Number(ing.quantity) <= 0) {
                    throw new Error('A quantidade do ingrediente deve ser maior que zero.');
                }
                return {
                    id: ing.id || uuidv4(),
                    input_product_id: ing.input_product_id,
                    quantity: Number(ing.quantity),
                    unit: ing.unit || 'UN',
                    loss_percentage: Number(ing.loss_percentage || 0),
                    discount_from_stock: Boolean(ing.discount_from_stock)
                };
            });

            const now = new Date().toISOString();
            const newRecipe = {
                id: uuidv4(),
                finished_product_id: payload.finished_product_id,
                name: payload.name || '',
                yield_quantity: Number(payload.yield_quantity || 1),
                preparation_time_minutes: Number(payload.preparation_time_minutes || 0),
                instructions: payload.instructions || '',
                is_active: true,
                auto_production: false,
                ingredients,
                user_id: user.ownerId || user.id,
                created_at: now,
                updated_at: now
            };

            const doc = await db.recipes.insert(newRecipe);
            return doc.toJSON();
        },
        update: async (id, updates) => {
            await requirePermission(['technical_sheet_write']);
            const db = await getDatabase();
            if (!db) throw new Error('Banco de dados local não inicializado.');

            const doc = await db.recipes.findOne({ selector: { id } }).exec();
            if (!doc) throw new Error('Receita não encontrada.');

            const patchObject = { ...updates };

            // Validar e normalizar ingredientes se fornecidos
            if (updates.ingredients !== undefined) {
                patchObject.ingredients = updates.ingredients.map(ing => {
                    if (!ing.input_product_id) {
                        throw new Error('Todos os ingredientes devem ter um produto (input_product_id).');
                    }
                    if (Number(ing.quantity) <= 0) {
                        throw new Error('A quantidade do ingrediente deve ser maior que zero.');
                    }
                    return {
                        id: ing.id || uuidv4(),
                        input_product_id: ing.input_product_id,
                        quantity: Number(ing.quantity),
                        unit: ing.unit || 'UN',
                        loss_percentage: Number(ing.loss_percentage || 0),
                        discount_from_stock: Boolean(ing.discount_from_stock)
                    };
                });
            }

            patchObject.updated_at = new Date().toISOString();

            // Proteger campos imutáveis
            delete patchObject.id;
            delete patchObject.user_id;
            delete patchObject.created_at;

            await doc.incrementalPatch(patchObject);

            // Retornar documento atualizado
            const updatedDoc = await db.recipes.findOne({ selector: { id } }).exec();
            return updatedDoc.toJSON();
        },
        softDelete: async (id) => {
            await requirePermission(['can_delete']);
            const db = await getDatabase();
            if (!db) throw new Error('Banco de dados local não inicializado.');

            const doc = await db.recipes.findOne({ selector: { id } }).exec();
            if (!doc) throw new Error('Receita não encontrada.');

            await doc.incrementalPatch({
                deleted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                is_active: false,
                ingredients: []
            });
        }
    },
};
