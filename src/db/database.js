import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { productSchema, providerSchema, movementSchema, batchSchema, categorySchema, saleSchema, saleItemSchema, purchaseSchema, purchaseItemSchema, transactionSchema, customerSchema, orderPaymentSchema, receivableSchema, purchasePaymentSchema, syncEventSchema, recipeSchema } from './schema';
import { RxDBDevModePlugin, disableWarnings } from 'rxdb/plugins/dev-mode';
import { RxDBUpdatePlugin } from 'rxdb/plugins/update';
import { RxDBQueryBuilderPlugin } from 'rxdb/plugins/query-builder';

import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv'; // Optional validation

import { RxDBMigrationPlugin } from 'rxdb/plugins/migration-schema';
import { v4 as uuidv4 } from 'uuid';

// Enable plugins
addRxPlugin(RxDBUpdatePlugin);
addRxPlugin(RxDBQueryBuilderPlugin);
addRxPlugin(RxDBMigrationPlugin);

if (import.meta.env.DEV) {
    addRxPlugin(RxDBDevModePlugin);
    disableWarnings();
}



const createDatabase = async () => {
    let storage = getRxStorageDexie();
    if (import.meta.env.DEV) {
        storage = wrappedValidateAjvStorage({
            storage: getRxStorageDexie()
        });
    }

    const db = await createRxDatabase({
        name: 'evobitdb_debug_v3', // Forced bump to v3 to wipe zombie collections
        storage: storage,
        ignoreDuplicate: true,
        multiInstance: false // Electron usually runs single instance
    });

    if (db.collections && db.collections.products) {
        return db;
    }
    try {

        // Specific migrations for V2 collections
        // Keys must be the TARGET version (1 = v0->v1, 2 = v1->v2)
        const productMigration = {
            1: function (doc) { return doc; }, // v0 -> v1
            2: function (doc) { // v1 -> v2
                doc.average_cost = doc.cost_price || 0;
                return doc;
            },
            3: function (doc) { // v2 -> v3 (ERP Expansion)
                doc.sku = doc.sku || '';
                doc.model = doc.model || '';
                doc.manufacturer = doc.brand || ''; // Default manufacturer to brand
                doc.is_active = true;
                doc.promotional_price = doc.price || 0;
                doc.location = '';
                doc.ncm = '';
                doc.cest = '';
                doc.cfop = '';
                doc.origin = '0';
                doc.tax_group = '';
                doc.weight_gross = 0;
                doc.weight_net = 0;
                doc.width = 0;
                doc.height = 0;
                doc.depth = 0;
                return doc;
            },
            4: function (doc) { // v3 -> v4 (Fase 0 - Event Sourcing / Services)
                doc.is_raw_material = doc.is_raw_material || false;
                doc.is_service = doc.is_service || false;
                doc.available_stock = Number(doc.current_stock) || 0;
                return doc;
            },
            5: function (doc) { // v4 -> v5 (Null Tolerance)
                return doc;
            },
            6: function (doc) { // v5 -> v6 (Optional Selling Price)
                return doc;
            },
            7: function (doc) { // v6 -> v7 (last_sale_date)
                doc.last_sale_date = doc.last_sale_date || null;
                return doc;
            }
        };
        const salesMigration = {
            1: function (doc) { return doc; }, // v0 -> v1
            2: function (doc) { // v1 -> v2
                doc.payment_method = doc.payment_method || 'cash';
                doc.customer_id = doc.customer_id || '';
                return doc;
            },
            3: function (doc) { // v2 -> v3 (ERP Expansion)
                doc.type = 'SALE'; // Assume existing are finished Sales
                doc.shipping_cost = 0;
                doc.other_costs = 0;
                doc.notes = '';
                // Status mapping if needed, but existing 'status' field likely compatible
                return doc;
            },
            4: function (doc) { // v3 -> v4 (NFC-e fields)
                doc.fiscal_status = 'PENDING';
                doc.nfe_key = '';
                doc.nfe_number = 0;
                doc.nfe_series = 0;
                doc.nfe_url = '';
                return doc;
            }
        };
        const itemsMigration = {
            1: function (doc) { return doc; }, // v0 -> v1
            2: function (doc) { // v1 -> v2
                doc.cost_unit = doc.cost_unit || 0;
                return doc;
            },
            3: function (doc) { // v2 -> v3 (ERP Expansion)
                doc.discount = 0;
                doc.notes = '';
                return doc;
            }
        };

        // Purchase Migration (v1 -> v2)
        const purchaseMigration = {
            1: function (doc) { return doc; },
            2: function (doc) {
                // Initialize ERP fields
                doc.subtotal = doc.total || 0;
                doc.discount = 0;
                doc.freight = 0;
                doc.insurance = 0;
                doc.other_expenses = 0;
                doc.status = doc.status === 'completed' ? 'COMPLETED' : 'DRAFT';
                doc.nfe_key = '';
                doc.nfe_xml = '';
                doc.issue_date = doc.date || '';
                return doc;
            }
        };

        const purchaseItemsMigrationV3 = {
            1: function (doc) { return doc; },
            2: function (doc) { // v1 -> v2 (Legacy)
                doc.cost_unit = doc.cost_unit || 0;
                return doc;
            },
            3: function (doc) { // v2 -> v3 (ERP Features)
                doc.ipi_percent = 0;
                doc.icms_percent = 0;
                return doc;
            }
        };

        const providerMigration = {
            1: function (doc) { return doc; }, // v0 -> v1
            2: function (doc) { // v1 -> v2
                doc.seller = doc.seller || '';
                doc.delivery_time = doc.delivery_time || '';
                doc.payment_terms = doc.payment_terms || '';
                doc.product_types = doc.product_types || '';
                doc.order_day = doc.order_day || '';
                doc.cnpj = doc.cnpj || '';
                doc.phone = doc.phone || '';
                doc.email = doc.email || '';
                doc.address = doc.address || '';
                return doc;
            },
            3: function (doc) { // v2 -> v3 (ERP Expansion)
                doc.trade_name = doc.name || '';
                doc.ie = '';
                doc.im = '';
                doc.mobile_phone = '';
                doc.email_nfe = doc.email || '';
                doc.website = '';
                doc.cep = '';
                doc.street = doc.address || ''; // Try to map legacy address
                doc.number = '';
                doc.complement = '';
                doc.neighborhood = '';
                doc.city = '';
                doc.state = '';
                doc.bank_info = '';
                doc.credit_limit = 0;
                doc.is_active = true;
                return doc;
            }
        };

        const simpleMigration = {
            1: function (doc) { return doc; }
        };

        const recipeMigration = {
            1: function (doc) { return doc; },
            2: function (doc) {
                doc.ingredients = doc.ingredients || [];
                return doc;
            },
            3: function (doc) {
                // v2 -> v3: Added discount_from_stock flag to ingredients and auto_production
                // We don't need to loop ingredients here strictly unless we want to patch old ones,
                // but setting a default in the schema usually handles reads/writes without full document mutation for simple flags.
                doc.auto_production = doc.auto_production || false;
                if (Array.isArray(doc.ingredients)) {
                    doc.ingredients.forEach(i => {
                        if (i.discount_from_stock === undefined) {
                            i.discount_from_stock = true;
                        }
                    });
                }
                return doc;
            },
            4: function (doc) {
                // v3 -> v4: Inject stable IDs into existing ingredients
                if (Array.isArray(doc.ingredients)) {
                    doc.ingredients.forEach(i => {
                        if (!i.id) {
                            i.id = uuidv4();
                        }
                    });
                }
                return doc;
            },
            5: function (doc) {
                // v4 -> v5: custos adicionais do lote (embalagens/mao de obra/equipamentos)
                doc.packaging_entries = doc.packaging_entries || [];
                doc.labor_entries = doc.labor_entries || [];
                doc.equipment_entries = doc.equipment_entries || [];
                return doc;
            }
        };

        await db.addCollections({
            products: { schema: productSchema, migrationStrategies: productMigration },
            providers: { schema: providerSchema, migrationStrategies: providerMigration },
            sales: { schema: saleSchema, migrationStrategies: salesMigration },
            sale_items: { schema: saleItemSchema, migrationStrategies: itemsMigration },

            // Updated migration for purchases
            purchases: { schema: purchaseSchema, migrationStrategies: purchaseMigration },
            purchase_items: { schema: purchaseItemSchema, migrationStrategies: purchaseItemsMigrationV3 },

            // New ERP Collections
            order_payments: { schema: orderPaymentSchema, migrationStrategies: simpleMigration },
            receivables: { schema: receivableSchema, migrationStrategies: simpleMigration },

            // NEW: Accounts Payable
            purchase_payments: { schema: purchasePaymentSchema, migrationStrategies: simpleMigration },

            // Collections on Version 1 now explicitly need migration strategies
            movements: { schema: movementSchema, migrationStrategies: simpleMigration },
            product_batches: { schema: batchSchema, migrationStrategies: simpleMigration },
            categories: { schema: categorySchema, migrationStrategies: simpleMigration },
            transactions: { schema: transactionSchema, migrationStrategies: simpleMigration },
            customers: { schema: customerSchema, migrationStrategies: simpleMigration },
            recipes: { schema: recipeSchema, migrationStrategies: recipeMigration },

            // NOVO: Event Sourcing Sync Queue
            sync_events: {
                schema: syncEventSchema,
                migrationStrategies: {
                    1: function (doc) { return doc; },
                    2: function (doc) { return doc; } // v1 -> v2 (added created_at, deleted_at)
                }
            }
        });

        // CRITICAL: If we just created collections, it means the DB is fresh/empty.
        // We MUST clear the sync timestamps from localStorage to force a full pull from Supabase.
        // Otherwise, sync.js will see old timestamps and think we are up to date.
        const collections = [
            'products', 'providers', 'movements', 'product_batches',
            'categories', 'sales', 'sale_items', 'purchases',
            'purchase_items', 'transactions', 'customers',
            'order_payments', 'receivables', 'sync_events', 'recipes'
        ];
        collections.forEach(table => {
            localStorage.removeItem(`sync_${table}`);
        });
    } catch (err) {
        console.error('Erro ao criar coleções:', err);
        // CRITICAL: Destroy the DB instance if setup fails, otherwise it leaks and hits the 16 collection limit
        if (db && typeof db.destroy === 'function') {
            try {
                await db.destroy();
            } catch (destroyErr) {
                console.error("Failed to destroy leaked DB:", destroyErr);
            }
        }
        throw err;
    }


    return db;
};

// HMR & Singleton Management
export const getDatabase = async () => {
    // If a promise already exists (creation in progress or done), return it
    if (window.evobitDbPromise) {
        const db = await window.evobitDbPromise;
        // If the DB resolved but is destroyed (race condition), fall through to recreate
        if (db && !db.destroyed) {
            return db;
        }
    }
    // NUCLEAR MUTEX using a primitive on window to survive module reloads
    const acquireLock = async () => {
        let attempts = 0;
        while (window.evobitDbLocked && attempts < 50) { // Wait up to 5s
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
        window.evobitDbLocked = true;
    };

    const releaseLock = () => {
        window.evobitDbLocked = false;
    };

    // Define creation logic wrapper
    const initDB = async (retryCount = 0) => {
        try {
            await acquireLock();

            // 1. REUSE: If an instance exists and is healthy, USE IT.
            // Do not destroy it. This prevents the "Zombie Collections" leak on HMR.
            if (window.evobitDbInstance && !window.evobitDbInstance.destroyed) {
                releaseLock();
                return window.evobitDbInstance;
            }

            // If we have a reference but it's destroyed, clear it
            if (window.evobitDbInstance) {
                window.evobitDbInstance = null;
            }

            // 2. Create new instance
            const db = await createDatabase();

            releaseLock();
            return db;

        } catch (err) {
            releaseLock();

            // 3. Handle COL23 (Collection Limit) by retrying
            // 3. Handle COL23 (Collection Limit) - DO NOT RETRY BLINDLY
            if (err?.code === 'COL23' || err?.message?.includes('limited to 16')) {
                console.error("🔴 COL23 detected. This usually means 'Zombie' database instances from HMR.");
                console.warn("⚠️ PLEASE REFRESH THE PAGE (F5) to clear the database connection pool.");
                // We cannot recover from this automatically without a full reload
                throw new Error("Database Collection Limit Reached. Please refresh the page.");
            }

            console.error("DB Creation Failed:", err);
            throw err;
        }
    };

    // Assign promise globally to prevent concurrent creations
    if (!window.evobitDbPromise) {
        window.evobitDbPromise = initDB()
            .then(db => {
                window.evobitDbInstance = db;
                return db;
            })
            .catch(err => {
                console.error("Critical DB Init Error:", err);
                window.evobitDbPromise = null; // Reset for next external attempt
                throw err;
            });
    }

    return window.evobitDbPromise;
};

// Vite HMR Cleanup - DISABLED DESTRUCTION
// We intentionally keep the DB alive during HMR to avoid the 16-collection limit.
// Users must refresh (F5) to apply schema changes.
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        // Just clear the promise/lock wrappers so new module can re-attach
        // But LEAVE the DbInstance alive for reuse.
        window.evobitDbPromise = null;
        window.evobitDbLocked = false;
    });
}
