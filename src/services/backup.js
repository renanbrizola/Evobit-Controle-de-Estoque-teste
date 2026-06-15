import { getDatabase } from '../db/database';
import { toast } from 'sonner';

export const backupService = {
    /**
     * Exports all local data to a JSON file
     */
    async exportData() {
        try {
            const db = await getDatabase();
            if (!db) throw new Error("Banco de dados não inicializado");

            const products = await db.products.find().exec();
            const movements = await db.movements.find().exec();
            const providers = await db.providers.find().exec();
            const batches = await db.product_batches.find().exec();
            const categories = await db.categories.find().exec();
            // Add other collections here as needed

            const backupData = {
                version: 1,
                timestamp: new Date().toISOString(),
                data: {
                    products: products.map(doc => doc.toJSON()),
                    movements: movements.map(doc => doc.toJSON()),
                    providers: providers.map(doc => doc.toJSON()),
                    product_batches: batches.map(doc => doc.toJSON()),
                    categories: categories.map(doc => doc.toJSON())
                }
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `evobit_backup_${new Date().toISOString().slice(0, 10)}.json`);
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();

            toast.success("Backup exportado com sucesso!");
            return true;
        } catch (error) {
            console.error("Erro ao exportar backup:", error);
            toast.error("Erro ao exportar backup.");
            return false;
        }
    },

    /**
     * Imports data from a JSON file object
     * @param {File} file 
     */
    async importData(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    const backupData = JSON.parse(event.target.result);

                    if (!backupData.data || !backupData.version) {
                        throw new Error("Formato de arquivo inválido");
                    }

                    // Import Logic using upsert based on ID
                    const db = await getDatabase();
                    if (db) {
                        const { products, movements, providers, product_batches, categories } = backupData.data;

                        // Bulk Upsert - RxDB supports bulkInsert, but for restore we might want upsert.
                        // For simplicity in this version, we'll try to insert and catch errors or use upsert if available/configured.
                        // RxDB's bulkUpsert is strictly atomic.

                        if (products?.length > 0) await db.products.bulkUpsert(products);
                        if (movements?.length > 0) await db.movements.bulkUpsert(movements);
                        if (providers?.length > 0) await db.providers.bulkUpsert(providers);
                        if (product_batches?.length > 0) await db.product_batches.bulkUpsert(product_batches);
                        if (categories?.length > 0) await db.categories.bulkUpsert(categories);

                        toast.success("Dados restaurados com sucesso!");
                        resolve(true);
                    } else {
                        throw new Error("Banco de dados indisponível");
                    }
                } catch (error) {
                    console.error("Erro ao importar:", error);
                    toast.error("Erro ao importar arquivo: " + error.message);
                    reject(error);
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }
};
