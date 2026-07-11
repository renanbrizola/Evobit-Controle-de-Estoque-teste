import { supabase } from '../lib/supabaseClient';
import { env } from '../config/env';

// ─── Modo equipe: membership do usuário logado ───────────────────────────────
// Se o usuário foi convidado para uma equipe (team_members.member_id), todo
// dado que ele cria pertence ao DONO da loja (owner_id) — é assim que a RLS de
// equipe compartilha os registros — e o que ele PODE fazer vem de
// team_members.permissions (liberado pelo dono no TeamSettings). Quem não é
// membro é dono da própria loja, com acesso total. O resultado fica em cache
// (memória + localStorage) para não custar uma query por operação e para
// funcionar offline.
let _membershipCache = null; // { userId, ownerId, teamRole, permissions }
const _refreshInFlight = {}; // userId -> Promise, evita refresh duplicado

const membershipStorageKey = (userId) => `evobit_membership_${userId}`;

const ownerDefault = (userId) => ({ userId, ownerId: userId, teamRole: 'owner', permissions: {} });

/**
 * Lê o membership do cache (memória → localStorage) de forma SÍNCRONA, sem
 * rede. É o que destrava o boot do app na hora: nada espera a query do
 * Supabase. Retorna null se não houver nada em cache ainda.
 */
export const readCachedMembership = (userId) => {
    if (!userId) return null;
    if (_membershipCache?.userId === userId) return _membershipCache;
    try {
        const raw = localStorage.getItem(membershipStorageKey(userId));
        if (raw) {
            _membershipCache = { ...JSON.parse(raw), userId };
            return _membershipCache;
        }
    } catch { /* cache corrompido — ignora */ }
    return null;
};

/** Busca o membership na nuvem (com timeout) e atualiza os caches. */
const fetchMembership = async (userId) => {
    if (_refreshInFlight[userId]) return _refreshInFlight[userId];

    const promise = (async () => {
        const res = await Promise.race([
            supabase
                .from('team_members')
                .select('owner_id, role, permissions')
                .eq('member_id', userId)
                .limit(1)
                .maybeSingle(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Membership lookup timeout')), 4000)),
        ]);
        if (res.error) throw res.error;
        const membership = {
            userId,
            ownerId: res.data?.owner_id || userId,
            teamRole: res.data ? (res.data.role || 'employee') : 'owner',
            permissions: res.data?.permissions || {},
        };
        _membershipCache = membership;
        try { localStorage.setItem(membershipStorageKey(userId), JSON.stringify(membership)); } catch { /* quota */ }
        return membership;
    })();

    _refreshInFlight[userId] = promise;
    try {
        return await promise;
    } finally {
        delete _refreshInFlight[userId];
    }
};

/**
 * Resolve o membership. Se já houver cache, retorna na hora e dispara um
 * refresh em background (não bloqueia). Sem cache, faz UMA query (com timeout)
 * e cai para "dono da própria loja" se a rede falhar.
 */
export const resolveTeamMembership = async (userId, { forceRefresh = false } = {}) => {
    if (!userId) return null;

    const cached = readCachedMembership(userId);
    if (cached && !forceRefresh) {
        fetchMembership(userId).catch(() => { /* background: mantém o cache atual */ });
        return cached;
    }

    try {
        return await fetchMembership(userId);
    } catch (err) {
        console.warn('Membership lookup offline/falhou — usando cache/local:', err?.message);
        return cached || ownerDefault(userId);
    }
};

export const resolveActiveOwnerId = async (userId) => {
    const membership = await resolveTeamMembership(userId);
    return membership?.ownerId ?? userId;
};

/**
 * Permissão de equipe: dono tem tudo; membro precisa de ao menos uma das
 * chaves liberadas pelo dono (inventory_write | technical_sheet_write |
 * can_delete). Aceita string ou array de chaves.
 */
export const canTeamMember = (user, perms) => {
    if (!user) return false;
    if (!user.isTeamMember) return true;
    const keys = Array.isArray(perms) ? perms : [perms];
    return keys.some((key) => user.teamPermissions?.[key] === true);
};

/** Anexa os dados de equipe ao objeto de usuário retornado por getCurrentUser. */
const withMembership = async (user) => {
    const membership = await resolveTeamMembership(user.id);
    return {
        ...user,
        ownerId: membership.ownerId,
        isTeamMember: membership.ownerId !== user.id,
        teamRole: membership.teamRole,
        teamPermissions: membership.permissions || {},
    };
};

/**
 * Helper centralizado para obter o usuário autenticado com fallback offline.
 * Substitui o padrão repetido de Promise.race em todos os services.
 * O objeto retornado inclui `ownerId` (dono ativo da loja — ver acima).
 * @returns {Promise<{id: string, ownerId: string}|null>}
 */
export const getCurrentUser = async () => {
    try {
        const sessionRes = await Promise.race([
            supabase.auth.getSession(),
            // Aumentado para 5000ms. No ambiente Docker/Local, a latência de cold start
            // ou refresh pode superar os 1500ms, causando falso-positivos de "offline".
            new Promise((_, reject) => setTimeout(() => reject(new Error('Auth timeout')), 5000))
        ]);
        const user = sessionRes?.data?.session?.user || null;
        if (!user) return null;
        return await withMembership(user);
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
                    return await withMembership(sessionData.user);
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
