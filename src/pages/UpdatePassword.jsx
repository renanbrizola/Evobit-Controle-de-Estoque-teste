import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useLanguage } from '../contexts/LanguageContext'; // Added import
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Lock, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const UpdatePassword = () => {
    const navigate = useNavigate();
    const { t } = useLanguage(); // Added useLanguage hook
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        // Check if we have a session (magic link should have created one)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                toast.error(t('updatePassword', 'invalidLink'));
                navigate('/forgot-password');
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [navigate]);

    const handleUpdate = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error(t('updatePassword', 'mismatch'));
            return;
        }

        if (password.length < 8) {
            toast.error(t('updatePassword', 'tooShort'));
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;

            // Force Logout for security
            await supabase.auth.signOut();

            setSuccess(true);
            toast.success(t('updatePassword', 'success'));

            setTimeout(() => {
                navigate('/login');
            }, 3000);

        } catch (error) {
            console.error(error);
            toast.error(t('updatePassword', 'error'));
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="w-full max-w-md p-8 text-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="inline-flex p-4 bg-green-50 rounded-full text-green-600 mb-4">
                        <CheckCircle size={48} />
                    </div>
                    <h2 className="text-2xl font-bold text-brand-dark mb-2">{t('updatePassword', 'successTitle')}</h2>
                    <p className="text-gray-500 mb-6">{t('updatePassword', 'successMessage')}</p>
                    <Button onClick={() => navigate('/login')} className="w-full">
                        {t('auth', 'backToLogin')}
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-white rounded-2xl shadow-sm mb-4">
                        <Lock size={48} className="text-brand-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-brand-dark mb-2">{t('auth', 'resetPassword')}</h1>
                    <p className="text-gray-500">{t('auth', 'createSecurePassword')}</p>
                </div>

                <Card className="p-6 md:p-8 shadow-xl border-t-4 border-t-brand-primary">
                    <form onSubmit={handleUpdate} className="space-y-6">
                        <Input
                            label={t('auth', 'newPassword')}
                            type="password"
                            placeholder="••••••••"
                            icon={Lock}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                            autoFocus
                        />

                        <Input
                            label={t('auth', 'confirmPassword')}
                            type="password"
                            placeholder="••••••••"
                            icon={Lock}
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                        />

                        <Button
                            className="w-full py-6 text-lg"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : t('common', 'save')}
                        </Button>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default UpdatePassword;
