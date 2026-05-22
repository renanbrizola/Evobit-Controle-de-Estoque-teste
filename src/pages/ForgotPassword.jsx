import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Mail, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const ForgotPassword = () => {
    const { t } = useLanguage();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleReset = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Check if email exists (Security/UX tradeoff requested by user)
            const { data: exists, error: checkError } = await supabase.rpc('check_email_exists', {
                email_to_check: email
            });

            if (checkError) {
                console.error("RPC Error:", checkError);
                // Fallback: If RPC fails (e.g. permissions), proceed blindly or warn user
            }

            if (exists === false) {
                toast.error(t('auth', 'emailNotRegistered'));
                setLoading(false);
                return;
            }

            // 2. Send Reset Link (Only if exists)
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/update-password',
            });

            if (error) throw error;

            setSent(true);
            toast.success(t('auth', 'successRecovery'));
        } catch (error) {
            console.error(error);
            toast.error(`${t('common', 'error')}: ${error.message || t('common', 'unknown')}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-brand-dark p-4">
            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-white dark:bg-brand-dark/50 rounded-2xl shadow-sm mb-4 border border-gray-100 dark:border-brand-primary/20">
                        <KeyRound size={48} className="text-brand-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('auth', 'recoverPassword')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('auth', 'recoverPasswordSubtitle')}</p>
                </div>

                <Card className="p-6 md:p-8 shadow-xl border-t-4 border-t-brand-primary">
                    {!sent ? (
                        <form onSubmit={handleReset} className="space-y-6">
                            <Input
                                id="email"
                                label={t('auth', 'registeredEmail')}
                                type="email"
                                placeholder={t('auth', 'emailPlaceholder')}
                                icon={Mail}
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />

                            <Button
                                className="w-full py-6 text-lg"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin mr-2" /> : t('auth', 'sendRecoveryLink')}
                            </Button>
                        </form>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-4 rounded-lg">
                                <p className="font-medium">{t('auth', 'emailSentSuccess')}</p>
                                <p className="text-sm mt-1">{t('auth', 'checkInbox')}</p>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => setSent(false)}
                            >
                                {t('common', 'tryAnotherEmail')}
                            </Button>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-sm text-brand-primary hover:underline flex items-center justify-center gap-1">
                            <ArrowLeft size={14} /> {t('auth', 'backToLogin')}
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ForgotPassword;
