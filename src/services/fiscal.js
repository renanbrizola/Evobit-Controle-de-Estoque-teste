import { supabase } from '../lib/supabaseClient';
import { getDatabase } from '../db/database';

export const FiscalService = {
    // Validar NFe Key
    validateNFeKey: (key) => {
        if (!key) return false;
        // Basic format check (44 digits)
        return /^[0-9]{44}$/.test(key);
    },

    // Obter Status Fiscal Sefaz (Placeholder)
    checkSefazStatus: async () => {
        // TODO: Implement actual Sefaz check logic via IPC
        return { status: 'online', message: 'Serviço em operação' };
    },

    // Emitir NFC-e via Electron Main Process
    emitNFCe: async (saleId) => {
        const db = await getDatabase();
        const saleDoc = await db.sales.findOne(saleId).exec();
        if (!saleDoc) throw new Error("Venda não encontrada");

        // Fetch related data (Items, Payments) to send complete object
        const sale = saleDoc.toJSON();
        const items = await db.sale_items.find({ selector: { sale_id: saleId } }).exec();
        sale.items = items.map(i => i.toJSON());

        // Check if running in Electron
        if (window.require) {
            try {
                const { ipcRenderer } = window.require('electron');
                const result = await ipcRenderer.invoke('fiscal:emit', sale);

                if (result.success) {
                    // Update local sale with fiscal info
                    await saleDoc.patch({
                        nfe_number: result.nfe_number,
                        nfe_series: result.nfe_series,
                        nfe_key: result.nfe_key,
                        fiscal_status: 'AUTHORIZED',
                        nfe_url: result.nfe_url || ''
                    });
                    return result;
                } else {
                    throw new Error(result.message || "Erro desconhecido no backend");
                }
            } catch (error) {
                console.error("IPC Error:", error);
                throw new Error("Falha na comunicação: " + error.message);
            }
        } else {
            console.warn("Fiscal Module requires Electron environment.");
            return { success: false, message: "Ambiente não suportado (Web)" };
        }
    },

    // Calcular Impostos (Placeholder)
    calculateTaxes: (items) => {
        return items.map(item => ({
            ...item,
            taxes: {
                icms: 0,
                ipi: 0,
                pis: 0,
                cofins: 0
            }
        }));
    }
};
