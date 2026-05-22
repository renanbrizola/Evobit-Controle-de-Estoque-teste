import { supabase } from '../lib/supabaseClient';

const TRIAL_DAYS = 30;

export const licenseService = {
    async checkLicense() {
        try {
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                return { active: false, type: 'expired', daysLeft: 0, reason: 'unauthenticated' };
            }

            const userId = session.user.id;

            // Fetch authoritative profile data from Supabase
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (profileError) throw profileError;

            if (!profile) {
                // If no profile yet, assume just created.
                return { active: true, type: 'trial', daysLeft: TRIAL_DAYS };
            }

            // 1. Check Paid Subscription Status
            const subStatus = profile.subscription_status || 'none';
            if (['active', 'trialing'].includes(subStatus)) {
                return { active: true, type: 'pro', details: profile };
            }

            // 2. Check 30-Day Trial based on Account Creation Date
            // Use trial_starts_at if available, otherwise fallback to created_at
            const startDate = profile.trial_starts_at ? new Date(profile.trial_starts_at) : new Date(profile.created_at);
            const now = new Date();
            
            const diffTime = now.getTime() - startDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const daysLeft = Math.max(0, TRIAL_DAYS - diffDays);

            if (daysLeft > 0) {
                return { active: true, type: 'trial', daysLeft };
            }

            // Expired Trial and No Active Subscription
            return { active: false, type: 'expired', daysLeft: 0 };
        } catch (error) {
            console.error("Erro ao checar assinatura:", error);
            return { active: false, type: 'error', daysLeft: 0 };
        }
    },

    // Placeholder for future Stripe integration
    async getStripeCheckoutUrl() {
        // Will be implemented later via Edge Function
        // const { data } = await supabase.functions.invoke('create-checkout-session');
        // return data.url;
        throw new Error("Integração do Stripe em desenvolvimento.");
    }
};
