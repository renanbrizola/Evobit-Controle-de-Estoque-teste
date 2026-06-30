import { supabase } from '../lib/supabaseClient';
import { env } from '../config/env';

/**
 * Helper centralizado para obter o usuário autenticado com fallback offline.
 * Substitui o padrão repetido de Promise.race em todos os services.
 * @returns {Promise<{id: string}|null>}
 */
export const getCurrentUser = async () => {
    try {
        const sessionRes = await Promise.race([
            supabase.auth.getSession(),
            // Aumentado para 5000ms. No ambiente Docker/Local, a latência de cold start
            // ou refresh pode superar os 1500ms, causando falso-positivos de "offline".
            new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000))
        ]);
        return sessionRes?.data?.session?.user || null;
    } catch {
        console.warn("Sessão auth offline ou timeout - operando com fallback estrito");
        
        try {
            // Derivando a chave exata do ambiente atual para não pegar token cruzado (GoTrue logic)
            const url = new URL(env.supabaseUrl);
            const projectId = url.hostname.split('.')[0];
            const storageKey = `sb-${projectId}-auth-token`;
            
            const rawToken = localStorage.getItem(storageKey);
            if (rawToken) {
                const sessionData = JSON.parse(rawToken);
                if (sessionData && sessionData.user) {
                    // Justificativa para ignorar expiração estrita:
                    // Em um app offline-first, se a internet cair e o token expirar,
                    // o usuário ainda deve conseguir criar produtos locais no RxDB.
                    // O PostgREST do Supabase lidará com a autorização durante o Sync (Push).
                    if (sessionData.expires_at) {
                        const isExpired = (Date.now() / 1000) > sessionData.expires_at;
                        if (isExpired) {
                            console.warn("Auth Fallback: Token local expirado, mas permitindo operação offline-first.");
                        }
                    }
                    return sessionData.user;
                }
            }
        } catch (fallbackErr) {
            console.error("Erro ao ler fallback do LocalStorage:", fallbackErr);
        }
        
        return null;
    }
};

/**
 * Garante que a instância do Supabase Client tenha a sessão autenticada injetada
 * antes de operações de sync. Se getSession falhar, lê o token bruto e força o setSession.
 */
export const ensureSupabaseSession = async () => {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) return session;

        // Fallback: carregar manualmente
        const url = new URL(env.supabaseUrl);
        const projectId = url.hostname.split('.')[0];
        const storageKey = `sb-${projectId}-auth-token`;

        const rawToken = localStorage.getItem(storageKey);
        if (rawToken) {
            const sessionData = JSON.parse(rawToken);
            // Só conseguimos forçar o client se tivermos o access_token explícito
            if (sessionData && sessionData.access_token && sessionData.refresh_token) {
                const { data, error } = await supabase.auth.setSession({
                    access_token: sessionData.access_token,
                    refresh_token: sessionData.refresh_token
                });
                if (!error && data.session) {
                    console.log("Sessão Supabase injetada via LocalStorage fallback.");
                    return data.session;
                }
            }
        }
    } catch (err) {
        console.error("Erro ao forçar sessão no client do Supabase:", err);
    }
    return null;
};
