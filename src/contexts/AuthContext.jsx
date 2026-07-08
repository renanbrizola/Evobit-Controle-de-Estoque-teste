 
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { resolveTeamMembership, readCachedMembership } from '../services/authHelper';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

// Grava os campos de equipe no objeto de usuário (mutação in-place).
const applyMembership = (user, membership) => {
    const m = membership || { ownerId: user.id, teamRole: 'owner', permissions: {} };
    user.ownerId = m.ownerId || user.id;
    user.isTeamMember = user.ownerId !== user.id;
    user.teamRole = m.teamRole || 'owner';
    user.teamPermissions = m.permissions || {};
    return user;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function initSession() {
            try {
                // Protege o boot: se getSession travar (ex.: navigator.locks no
                // Electron), segue sem sessao em vez de ficar preso na tela branca.
                const { data: { session }, error } = await Promise.race([
                    supabase.auth.getSession(),
                    new Promise((resolve) =>
                        setTimeout(() => resolve({ data: { session: null }, error: null }), 4000)
                    ),
                ]);
                if (error) throw error;

                if (mounted) {
                    if (session?.user) {
                        // FETCH USER PROFILE STATUS
                        const { data: profile } = await supabase
                            .from('user_profiles')
                            .select('*')
                            .eq('id', session.user.id)
                            .maybeSingle();

                        if (profile) {
                            session.user.status = profile.status;
                            session.user.role = profile.role; // Override role from profile
                        }

                        // MODO EQUIPE: aplica o membership do CACHE na hora (sem
                        // esperar rede) — é o que destrava o boot. Se não houver
                        // cache ainda, assume dono da própria loja. O valor real
                        // é confirmado em background logo abaixo.
                        applyMembership(session.user, readCachedMembership(session.user.id));
                    }
                    setUser(session?.user ?? null);

                    // Refresh do membership em background: não bloqueia a tela.
                    if (session?.user) {
                        resolveTeamMembership(session.user.id, { forceRefresh: true })
                            .then((membership) => {
                                if (!mounted) return;
                                setUser((prev) => (prev ? applyMembership({ ...prev }, membership) : prev));
                            })
                            .catch(() => { /* mantém o valor do cache */ });
                    }
                }
            } catch (error) {
                console.error("Auth Init Error:", error);
            } finally {
                if (mounted) setLoading(false);
            }
        }

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;

            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
                if (session?.user) {
                    // FETCH USER PROFILE STATUS (On Login/Update)
                    const { data: profile } = await supabase
                        .from('user_profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .maybeSingle();

                    if (profile) {
                        session.user.status = profile.status;
                        session.user.role = profile.role;
                    }

                    // Login/refresh: cache primeiro (instantâneo) + confirmação
                    // em background, mesmo padrão do boot.
                    applyMembership(session.user, readCachedMembership(session.user.id));
                    setUser(session.user);

                    resolveTeamMembership(session.user.id, { forceRefresh: true })
                        .then((membership) => {
                            if (!mounted) return;
                            setUser((prev) => (prev ? applyMembership({ ...prev }, membership) : prev));
                        })
                        .catch(() => { /* mantém o valor do cache */ });
                    return;
                }
                setUser(session?.user ?? null);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signIn = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const signUp = async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
    };

    const signOut = async () => {
        try {
            // Prevent hanging: Race Supabase signOut with a short timeout
            await Promise.race([
                supabase.auth.signOut(),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);
        } catch (error) {
            console.error("Error signing out:", error);
        } finally {
            setUser(null);
            localStorage.removeItem('sb-access-token');
            localStorage.removeItem('sb-refresh-token');

            // Hard reload to clear any in-memory state/cache and force login screen.
            // HashRouter: recarregar em '/' caía no LicenseGuard sem sessão e
            // mostrava "Acesso Expirado" — recarrega direto no #/login.
            window.location.hash = '#/login';
            window.location.reload();
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
