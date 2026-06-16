import React, { useState, useEffect } from 'react';
import { licenseService } from '../../services/license';
import { Button } from '../ui/Button';
import { Loader2, Lock } from 'lucide-react';

const LicenseGuard = ({ children }) => {
    const [status, setStatus] = useState('loading'); // loading, active, trial, expired
    const [licenseInfo, setLicenseInfo] = useState(null);
    const [devBypass, setDevBypass] = useState(false);



    const checkStatus = async () => {
        try {
            const result = await licenseService.checkLicense();
            if (result.active) {
                setStatus(result.type);
                setLicenseInfo(result);
            } else {
                setStatus('expired');
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        checkStatus();
    }, []);

    if (status === 'loading') {
        return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-brand-primary" size={48} /></div>;
    }

    if (status === 'expired' && !devBypass) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
                        <Lock size={32} className="text-red-500" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Acesso Expirado</h1>
                    <p className="text-gray-500 mb-6">Seu período de teste de 30 dias ou sua assinatura mensal terminou. Para continuar operando seu negócio com o Evobit, escolha um plano.</p>

                    <div className="space-y-4">
                        <Button 
                            onClick={() => {
                                // In the future, this will redirect to Stripe Checkout
                                window.open('https://wa.me/seu-numero-vendas?text=Quero%20renovar%20minha%20assinatura%20do%20Evobit', '_blank');
                            }} 
                            className="w-full bg-brand-primary"
                        >
                            Renovar Assinatura (Contatar Vendas)
                        </Button>
                    </div>

                    <div className="mt-8 text-xs text-gray-400">
                        Os dados do seu sistema estão salvos em segurança na nuvem.
                    </div>

                    {import.meta.env.DEV && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setDevBypass(true)}
                                className="text-xs text-gray-400 hover:text-gray-600 underline"
                            >
                                [DEV] Forçar Acesso (Bypass)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <>
            {status === 'trial' && (
                <div className="bg-orange-500 text-white text-xs py-1 px-4 text-center font-medium">
                    Modo de Teste - {licenseInfo?.daysLeft} dias restantes
                </div>
            )}
            {children}
        </>
    );
};

export default LicenseGuard;
