// Captura tokens de convite/recuperação ANTES do supabase-js carregar.
//
// Links de e-mail do Supabase (convite de equipe, reset de senha) redirecionam
// para `<site>#access_token=...&type=invite|recovery`. O supabase-js consome o
// token do hash (detectSessionInUrl) e cria a sessão, mas o HashRouter nunca vê
// uma rota — o app cairia no fluxo normal sem mostrar a tela de definir senha.
//
// Este módulo roda como PRIMEIRO import do main.jsx (antes dos módulos que
// puxam o supabaseClient) e grava um flag; o PasswordSetupGate no App lê o
// flag e navega para /update-password.

export const PASSWORD_SETUP_FLAG = 'evobit_password_setup';

const hash = typeof window !== 'undefined' ? (window.location.hash || '') : '';
if (/access_token=/.test(hash) && /type=(invite|recovery|signup|magiclink)/.test(hash)) {
    try {
        sessionStorage.setItem(PASSWORD_SETUP_FLAG, '1');
    } catch {
        // sessionStorage indisponível — segue sem o redirect automático
    }
}
