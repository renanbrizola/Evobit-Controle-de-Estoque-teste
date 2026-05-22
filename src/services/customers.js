import { getDatabase } from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentUser } from './authHelper';

export const CustomerService = {
    list: async (search = '') => {
        const db = await getDatabase();

        if (search) {
            const allDocs = await db.customers.find().exec();
            const lowerSearch = search.toLowerCase();
            return allDocs
                .filter(doc =>
                    doc.name.toLowerCase().includes(lowerSearch) ||
                    (doc.cpf_cnpj && doc.cpf_cnpj.includes(lowerSearch)) ||
                    (doc.phone && doc.phone.includes(lowerSearch))
                )
                .map(doc => doc.toJSON());
        }

        const docs = await db.customers.find().exec();
        return docs.map(doc => doc.toJSON());
    },

    create: async (data) => {
        const user = await getCurrentUser();
        const db = await getDatabase();
        const now = new Date().toISOString();

        const newCustomer = {
            id: uuidv4(),
            name: data.name,
            cpf_cnpj: data.cpf_cnpj || '',
            phone: data.phone || '',
            email: data.email || '',
            address: data.address || '',
            user_id: user?.id || '',
            updated_at: now
        };

        if (!newCustomer.name) throw new Error("Nome é obrigatório");

        await db.customers.insert(newCustomer);
        return newCustomer;
    },

    update: async (id, data) => {
        const db = await getDatabase();
        const doc = await db.customers.findOne(id).exec();
        if (!doc) throw new Error("Cliente não encontrado");

        const updateData = {
            ...data,
            // Sanitize
            cpf_cnpj: data.cpf_cnpj !== undefined ? (data.cpf_cnpj || '') : doc.cpf_cnpj,
            phone: data.phone !== undefined ? (data.phone || '') : doc.phone,
            email: data.email !== undefined ? (data.email || '') : doc.email,
            address: data.address !== undefined ? (data.address || '') : doc.address,
            updated_at: new Date().toISOString()
        };
        // Remove id from update data to avoid primary key modification errors
        delete updateData.id;

        await doc.patch(updateData);
        return doc.toJSON();
    },

    delete: async (id) => {
        const db = await getDatabase();
        const doc = await db.customers.findOne(id).exec();
        if (!doc) return; // Already deleted

        // Soft delete? Or hard delete?
        // For sync logic usually we soft delete or rely on sync mechanism to handle deletions.
        // Our sync.js handles deletion if we hard delete in RxDB but we need to propagate 'deleted_at' if we want soft delete.
        // Current sync logic: "Remove locally any items that were tombstoned remotely".
        // It doesn't explicitly handle local Hard Deletes propagating as remote Soft Deletes unless we implement it.
        // For now, let's just hard delete locally. Note: This might not sync deletion to other devices properly 
        // without a 'deleted_at' field mechanism in the UI/Service.
        // Ideally: doc.patch({ deleted_at: now })

        // Let's check schema: Customer schema doesn't have deleted_at. 
        // We will hard delete for now.
        await doc.remove();
    }
};
