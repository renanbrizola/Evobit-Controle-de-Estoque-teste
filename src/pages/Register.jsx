import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Lock, Mail, Loader2, UserPlus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const { signUp } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: ''
    });

    const handleRegister = async (e) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast.error("As senhas não coincidem!");
            return;
        }

        if (formData.password.length < 8) {
            toast.error("A senha deve ter pelo menos 8 caracteres.");
            return;
        }

        const hasUpperCase = /[A-Z]/.test(formData.password);
        const hasLowerCase = /[a-z]/.test(formData.password);
        const hasNumbers = /[0-9]/.test(formData.password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);

        if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecial) {
            toast.error("A senha deve conter: maiúscula, minúscula, número e caractere especial.");
            return;
        }

        setLoading(true);

        try {
            await signUp(formData.email, formData.password);
            toast.success("Conta criada com sucesso! Faça login.");
            navigate('/login');
        } catch (error) {
            console.error(error);
            toast.error("Erro ao criar conta. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-brand-dark p-4 transition-colors duration-500">
            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-white dark:bg-brand-light/5 rounded-2xl shadow-sm mb-4">
                        <UserPlus size={48} className="text-brand-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('auth', 'createAccount')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('auth', 'joinEvobit')}</p>
                </div>

                <div className="mb-6 flex justify-end">
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-transparent text-sm font-bold text-brand-primary outline-none cursor-pointer"
                    >
                        <option value="pt">🇧🇷 PT</option>
                        <option value="en">🇺🇸 EN</option>
                        <option value="es">🇪🇸 ES</option>
                    </select>
                </div>

                <Card className="p-6 md:p-8 glass-card rounded-[2rem] border-t-4 border-t-brand-primary bg-white/80 dark:bg-brand-dark/50 backdrop-blur-xl">
                    <form onSubmit={handleRegister} className="space-y-6">
                        <Input
                            id="email"
                            label={t('auth', 'emailLabel')}
                            type="email"
                            placeholder="seu@email.com"
                            icon={Mail}
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                        />

                        <Input
                            id="password"
                            label={t('auth', 'passwordLabel')}
                            type="password"
                            placeholder="••••••••"
                            icon={Lock}
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            required
                        />

                        <Input
                            id="confirmPassword"
                            label={t('auth', 'confirmPassword')}
                            type="password"
                            placeholder="••••••••"
                            icon={Lock}
                            value={formData.confirmPassword}
                            onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                        />

                        <Button
                            className="w-full py-6 text-lg"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : t('auth', 'createAccount')}
                        </Button>
                    </form>

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

export default Register;
