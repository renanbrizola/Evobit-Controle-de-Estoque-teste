import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';

// Em ambientes desktop (Electron), `navigator.locks` pode travar o
// supabase.auth.getSession() e prender o app na tela branca no boot. Como a app
// e single-window (sem concorrencia entre abas), um lock no-op evita o hang sem
// perder a sessao persistida.
const noopLock = async (_name, _acquireTimeout, fn) => fn();

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { lock: noopLock },
});
