import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, LogOut, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useLanguage } from '../contexts/LanguageContext';

const AccessDenied = () => {
    const { signOut, user } = useAuth();
    const { t } = useLanguage();

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center space-y-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                    <Lock className="text-red-600" size={32} />
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('auth', 'accessDenied')}</h1>
                    <p className="text-gray-500">
                        {t('auth', 'accountNotActive', { email: user?.email }) || (
                            <>A conta <strong>{user?.email}</strong> ainda não está ativa.</>
                        )}
                    </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg text-left text-sm text-blue-800 space-y-2">
                    <div className="flex items-start gap-2">
                        <Mail className="shrink-0 mt-0.5" size={16} />
                        <p>
                            {t('auth', 'approvalMessage')}
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex flex-col gap-3">
                    <Button
                        onClick={signOut}
                        variant="ghost"
                        className="w-full text-gray-600 hover:bg-gray-100"
                    >
                        <LogOut size={16} className="mr-2" />
                        {t('menu', 'logout')}
                    </Button>
                </div>
            </div>

            <p className="mt-8 text-xs text-gray-400">
                &copy; {new Date().getFullYear()} Evobit App. {t('common', 'rightsReserved')}
            </p>
        </div>
    );
};

export default AccessDenied;
