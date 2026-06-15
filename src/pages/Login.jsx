import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { Lock, Mail, Loader2, ShieldCheck, Globe, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';

const Login = () => {
    const { signIn } = useAuth();
    const { t, language, setLanguage } = useLanguage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showLangMenu, setShowLangMenu] = useState(false);

    const languages = [
        { code: 'pt', label: 'Português', flag: '🇧🇷' },
        { code: 'en', label: 'English', flag: '🇺🇸' },
        { code: 'es', label: 'Español', flag: '🇪🇸' }
    ];

    const currentLang = languages.find(l => l.code === language) || languages[0];

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await signIn(formData.email, formData.password);
            toast.success("Bem-vindo de volta!");
            navigate('/');
        } catch (error) {
            console.error(error);
            toast.error("Falha no login. Verifique suas credenciais.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-brand-dark p-4 transition-colors duration-500 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-secondary/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2" />
            </div>

            {/* Language Selector - Top Right */}
            <div className="absolute top-6 right-6 z-50">
                <div className="relative">
                    <button
                        onClick={() => setShowLangMenu(!showLangMenu)}
                        className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 dark:bg-brand-dark/50 backdrop-blur-md border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-all duration-300 text-gray-700 dark:text-gray-200"
                    >
                        <span className="text-lg">{currentLang.flag}</span>
                        <span className="text-sm font-medium hidden sm:inline">{currentLang.label}</span>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${showLangMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {showLangMenu && (
                        <div className="absolute top-full right-0 mt-2 w-40 bg-white/90 dark:bg-[#18181B]/90 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 py-1">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        setLanguage(lang.code);
                                        setShowLangMenu(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${language === lang.code ? 'text-brand-primary font-bold bg-brand-primary/5' : 'text-gray-600 dark:text-gray-300'}`}
                                >
                                    <span className="text-lg">{lang.flag}</span>
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-500 relative z-10">
                <div className="text-center mb-8">
                    <div className="inline-flex p-4 bg-white dark:bg-brand-light/5 rounded-2xl shadow-sm mb-4">
                        <ShieldCheck size={48} className="text-brand-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('auth', 'loginTitle')}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t('auth', 'loginSubtitle')}</p>
                </div>

                <Card className="p-6 md:p-8 glass-card rounded-[2rem] border-t-4 border-t-brand-primary bg-white/80 dark:bg-brand-dark/50 backdrop-blur-xl">
                    <form onSubmit={handleLogin} className="space-y-6">
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

                        <div className="space-y-2">
                            <Input
                                label="Senha"
                                type="password"
                                placeholder="••••••••"
                                icon={Lock}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                required
                            />
                            <div className="flex justify-center pt-2">
                                <Link to="/forgot-password" className="text-sm text-brand-primary hover:underline font-medium">
                                    {t('auth', 'forgotPassword')}
                                </Link>
                            </div>
                        </div>

                        <Button
                            className="w-full py-6 text-lg"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : t('auth', 'enterSystem')}
                        </Button>
                    </form>
                </Card>

                <div className="text-center mt-6 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t('auth', 'noAccount')} </span>
                    <Link to="/register" className="text-brand-primary font-bold hover:underline">{t('auth', 'register')}</Link>
                </div>

                <p className="text-center mt-8 text-xs text-gray-400">
                    &copy; 2026 Evobit. Secure Environment.
                </p>
            </div>
        </div>
    );
};

export default Login;
