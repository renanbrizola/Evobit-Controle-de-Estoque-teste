import { supabase } from '../lib/supabaseClient';

/**
 * Fields that exist in RxDB (embedded/denormalized) but NOT in the Supabase
 * PostgreSQL table. These must be stripped before pushing.
 */
const EXCLUDED_FIELDS_BY_TABLE = {
    recipes: ['ingredients'], // Embedded array in RxDB, stored relationally or doesn't exist in PG
};

// Helper to remove empty strings from UUID/Timestamp fields before push
// and strip fields that don't exist in the target Supabase table
const sanitizeForSupabase = (data, tableName) => {
    const sanitized = { ...data };

    // 1. Strip fields that don't exist in Supabase for this table
    const excludedFields = EXCLUDED_FIELDS_BY_TABLE[tableName] || [];
    for (const field of excludedFields) {
        delete sanitized[field];
    }

    // 2. Convert empty strings to null for UUID/date fields
    Object.keys(sanitized).forEach(key => {
        if (sanitized[key] === "") {
            if (key.endsWith('_id') || key.endsWith('_at') || key === 'date' || key === 'expiration_date' || key === 'validity') {
                sanitized[key] = null;
            }
        }
    });

    return sanitized;
};

// Sync stats tracker
let _lastSyncStats = null;

/**
 * Get the result of the last sync cycle.
 * @returns {{ success: boolean, errors: string[], pulled: number, pushed: number, timestamp: string } | null}
 */
export const getLastSyncStats = () => _lastSyncStats;

/**
 * Override the timestamp field for tables that DON'T have `updated_at`.
 * Default is 'updated_at', except for sync_events (uses 'local_timestamp')
 * and tables listed here (use 'created_at').
 */
const TIMESTAMP_FIELD_OVERRIDES = {
    sync_events: 'local_timestamp',
    order_payments: 'created_at', // Schema only has created_at, no updated_at
};

export const syncCollection = async (collection, tableName) => {
    const errors = [];
    let pulled = 0;
    let pushed = 0;

    try {
        const timestampField = TIMESTAMP_FIELD_OVERRIDES[tableName] || 'updated_at';

        // ─── 1. PULL: Fetch changes from Supabase ─────────────────────
        const lastSync = localStorage.getItem(`sync_${tableName}`) || new Date(0).toISOString();

        const { data: remoteChanges, error } = await supabase
            .from(tableName)
            .select('*')
            .gt(timestampField, lastSync);

        if (error) {
            errors.push(`[PULL ${tableName}] ${error.message}`);
            console.error(`Sync pull error ${tableName}:`, error);
            // Don't return — still try to push
        }

        if (remoteChanges?.length > 0) {
            console.log(`↓ Pulling ${remoteChanges.length} changes for ${tableName}`);
            const lastTimestamp = remoteChanges.reduce((max, item) =>
                item[timestampField] > max ? item[timestampField] : max, lastSync);

            // Filter out tombstoned items (deleted_at set)
            const activeChanges = remoteChanges.filter(item => !item.deleted_at);
            const deletedChanges = remoteChanges.filter(item => item.deleted_at);

            // Upsert active items
            if (activeChanges.length > 0) {
                try {
                    await collection.bulkUpsert(activeChanges);
                    pulled += activeChanges.length;
                } catch (upsertErr) {
                    errors.push(`[PULL-UPSERT ${tableName}] ${upsertErr.message}`);
                    console.error(`Sync pull upsert error ${tableName}:`, upsertErr);
                }
            }

            // Remove locally any items that were tombstoned remotely
            for (const deleted of deletedChanges) {
                try {
                    const localDoc = await collection.findOne(deleted.id).exec();
                    if (localDoc) {
                        await localDoc.remove();
                        pulled++;
                    }
                } catch (e) {
                    // Ignore if not found
                }
            }

            localStorage.setItem(`sync_${tableName}`, lastTimestamp);
        }

        // ─── 2. PUSH: Push local changes to Supabase ─────────────────────
        const lastPush = localStorage.getItem(`push_${tableName}`) || new Date(0).toISOString();
        const localChanges = await collection.find({
            selector: {
                [timestampField]: { $gt: lastPush }
            }
        }).exec();

        if (localChanges.length > 0) {
            console.log(`↑ Pushing ${localChanges.length} changes for ${tableName}`);

            if (tableName === 'recipes') {
                let successCount = 0;
                for (const doc of localChanges) {
                    const rawData = doc.toJSON();
                    if (!rawData.id) {
                        errors.push(`[PUSH RECIPES] Receita ignorada: ID da receita ausente.`);
                        continue;
                    }
                    
                    const ingredientsArray = rawData.ingredients || [];
                    
                    // Validação defensiva: impede envio se algum ingrediente válido estiver sem ID
                    const hasInvalidIngredient = ingredientsArray.some(ing => ing.input_product_id && !ing.id);
                    if (hasInvalidIngredient) {
                        errors.push(`[PUSH RECIPES] id=${rawData.id.substr(0, 8)}: Receita possui ingrediente(s) sem ID. Sincronização bloqueada para esta receita.`);
                        continue;
                    }
                    
                    // Remove RxDB internal fields
                    delete rawData._rev;
                    delete rawData._attachments;
                    delete rawData._deleted;
                    delete rawData._meta;
                    
                    const sanitizedRecipe = sanitizeForSupabase(rawData, tableName);
                    
                    try {
                        const { error: rpcError } = await supabase.rpc('sync_recipe_with_ingredients', {
                            p_recipe: sanitizedRecipe,
                            p_ingredients: ingredientsArray
                        });
                        
                        if (rpcError) {
                            errors.push(`[PUSH RECIPES] id=${rawData.id.substr(0, 8)}: ${rpcError.message}`);
                            console.error(`Push RPC error for recipe:`, rawData.id, rpcError);
                        } else {
                            successCount++;
                        }
                    } catch (err) {
                        errors.push(`[PUSH RECIPES] id=${rawData.id.substr(0, 8)}: ${err.message}`);
                        console.error(`Push exception for recipe:`, rawData.id, err);
                    }
                }
                
                pushed = successCount;
                if (successCount === localChanges.length) {
                    localStorage.setItem(`push_${tableName}`, new Date().toISOString());
                }
            } else {
                const itemsToPush = localChanges.map(doc => {
                    const data = doc.toJSON();
                    // Remove RxDB internal fields
                    delete data._rev;
                    delete data._attachments;
                    delete data._deleted;
                    delete data._meta;
                    return sanitizeForSupabase(data, tableName);
                });

                // Try batch push first (most efficient)
                const { error: batchError } = await supabase
                    .from(tableName)
                    .upsert(itemsToPush, { onConflict: 'id', ignoreDuplicates: false });

                if (batchError) {
                    console.warn(`Batch push failed for ${tableName}, falling back to item-by-item:`, batchError.message);

                    // Fallback: push items one by one so partial success is possible
                    let successCount = 0;
                    for (const item of itemsToPush) {
                        try {
                            const { error: itemError } = await supabase
                                .from(tableName)
                                .upsert([item], { onConflict: 'id', ignoreDuplicates: false });

                            if (itemError) {
                                errors.push(`[PUSH ${tableName}] id=${item.id?.substr(0, 8)}: ${itemError.message}`);
                                console.error(`Push item error ${tableName}:`, item.id, itemError);
                            } else {
                                successCount++;
                            }
                        } catch (itemErr) {
                            errors.push(`[PUSH ${tableName}] id=${item.id?.substr(0, 8)}: ${itemErr.message}`);
                        }
                    }
                    pushed = successCount;

                    // Only update push timestamp if ALL items succeeded
                    if (successCount === itemsToPush.length) {
                        localStorage.setItem(`push_${tableName}`, new Date().toISOString());
                    }
                } else {
                    pushed = itemsToPush.length;
                    localStorage.setItem(`push_${tableName}`, new Date().toISOString());
                }
            }
        }
    } catch (err) {
        errors.push(`[SYNC ${tableName}] ${err.message}`);
        console.error(`Sync error ${tableName}:`, err);
    }

    return { pulled, pushed, errors };
};

/**
 * Sync all collections. Continues even if individual collections fail.
 * @param {object} db - RxDB database instance
 * @returns {{ success: boolean, errors: string[], totalPulled: number, totalPushed: number }}
 */
export const syncAll = async (db) => {
    if (!navigator.onLine) {
        console.log('Offline — skipping sync');
        return { success: true, errors: [], totalPulled: 0, totalPushed: 0 };
    }

    console.log('🔄 Starting sync...');
    const startTime = Date.now();
    const allErrors = [];
    let totalPulled = 0;
    let totalPushed = 0;

    // Define all collections to sync (order matters: dependencies first)
    const collections = [
        [db.categories, 'categories'],
        [db.providers, 'providers'],
        [db.customers, 'customers'],
        [db.products, 'products'],
        [db.product_batches, 'product_batches'],
        [db.movements, 'movements'],
        [db.sales, 'sales'],
        [db.sale_items, 'sale_items'],
        [db.order_payments, 'order_payments'],
        [db.receivables, 'receivables'],
        [db.purchases, 'purchases'],
        [db.purchase_items, 'purchase_items'],
        [db.purchase_payments, 'purchase_payments'],
        [db.transactions, 'transactions'],
        [db.recipes, 'recipes'],
        [db.sync_events, 'sync_events'],
    ];

    for (const [collection, tableName] of collections) {
        try {
            const result = await syncCollection(collection, tableName);
            totalPulled += result.pulled;
            totalPushed += result.pushed;
            if (result.errors.length > 0) {
                allErrors.push(...result.errors);
            }
        } catch (err) {
            // Guard against unexpected errors in syncCollection itself
            allErrors.push(`[FATAL ${tableName}] ${err.message}`);
            console.error(`Fatal sync error for ${tableName}:`, err);
        }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const success = allErrors.length === 0;

    _lastSyncStats = {
        success,
        errors: allErrors,
        pulled: totalPulled,
        pushed: totalPushed,
        timestamp: new Date().toISOString(),
        elapsed
    };

    if (success) {
        console.log(`✅ Sync complete in ${elapsed}s — ↓${totalPulled} pulled, ↑${totalPushed} pushed`);
    } else {
        console.warn(`⚠️ Sync completed with ${allErrors.length} error(s) in ${elapsed}s:`, allErrors);
    }

    return { success, errors: allErrors, totalPulled, totalPushed };
};
