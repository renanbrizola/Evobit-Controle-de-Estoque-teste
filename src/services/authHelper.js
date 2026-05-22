import { supabase } from '../lib/supabaseClient';

/**
 * Helper centralizado para obter o usuário autenticado com fallback offline.
 * Substitui o padrão repetido de Promise.race em todos os services.
 * @returns {Promise<{id: string}|null>}
 */
export const getCurrentUser = async () => {
    try {
        const sessionRes = await Promise.race([
            supabase.auth.getSession(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 1500))
        ]);
        return sessionRes?.data?.session?.user || null;
    } catch (e) {
        console.warn("Sessão auth offline - operando localmente");
        return null;
    }
};
