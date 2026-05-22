import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { useModules } from '../contexts/ModuleContext';
import { Check, Shield, AlertTriangle, RefreshCw, Package } from 'lucide-react';
import { toast } from 'sonner';

const LicenseSettings = () => {
    const { modules } = useModules();
    const [checking, setChecking] = useState(false);

    // Mock data for now - in full implementation this comes from Auth/Profile
    const licenseInfo = {
        plan: 'Professional',
        maintenanceEnds: '2026-12-31',
        version: '1.2.0',
        status: 'active' // active, expired
    };

    const handleCheckUpdates = () => {
        setChecking(true);
        setTimeout(() => {
            setChecking(false);
            toast.success('Você está usando a versão mais recente (v1.2.0)');
        }, 2000);
    };

    const moduleList = [
        { key: 'inventory', label: 'Estoque (Core)' },
        { key: 'purchases', label: 'Compras & Fornecedores' },
        { key: 'sales', label: 'Vendas & Clientes' },
        { key: 'finance', label: 'Financeiro' },
    ];

    const isMaintenanceExpired = new Date(licenseInfo.maintenanceEnds) < new Date();

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Licença e Atualizações</h2>
                <p className="text-gray-500">Gerencie seus módulos contratados e status da manutenção.</p>
            </div>

            {/* License Status Card */}
            <Card className="p-6 bg-white border border-gray-200">
                <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                            <Shield size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Evobit {licenseInfo.plan}</h3>
                            <p className="text-sm text-gray-500">Licença ativa para este dispositivo.</p>

                            <div className="mt-4 flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-700">Versão instalada:</span>
                                <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600 font-mono text-xs">{licenseInfo.version}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleCheckUpdates}
                        disabled={checking}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={checking ? "animate-spin" : ""} />
                        {checking ? "Verificando..." : "Verificar atualizações"}
                    </button>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Package size={16} /> Módulos Ativos
                        </h4>
                        <div className="space-y-3">
                            {moduleList.map((mod) => (
                                <div key={mod.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-700 font-medium">{mod.label}</span>
                                    {modules[mod.key] ? (
                                        <div className="flex items-center text-emerald-600 gap-1.5 text-sm font-bold">
                                            <Check size={16} />
                                            <span>Ativo</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center text-gray-400 gap-1.5 text-sm">
                                            <Shield size={16} />
                                            <span>Não contratado</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
                            Manutenção e Suporte
                        </h4>

                        <div className={`p-4 rounded-xl border ${isMaintenanceExpired ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                            <div className="flex items-start gap-3">
                                {isMaintenanceExpired ? <AlertTriangle className="text-red-500 shrink-0" /> : <Check className="text-emerald-500 shrink-0" />}
                                <div>
                                    <p className={`font-bold ${isMaintenanceExpired ? 'text-red-900' : 'text-emerald-900'}`}>
                                        {isMaintenanceExpired ? 'Manutenção Expirada' : 'Manutenção Ativa'}
                                    </p>
                                    <p className={`text-sm mt-1 ${isMaintenanceExpired ? 'text-red-700' : 'text-emerald-700'}`}>
                                        {isMaintenanceExpired
                                            ? `Seu período de atualizações terminou em ${new Date(licenseInfo.maintenanceEnds).toLocaleDateString()}. O sistema continua funcionando, mas você não receberá novas correções.`
                                            : `Você tem direito a atualizações e correções até ${new Date(licenseInfo.maintenanceEnds).toLocaleDateString()}.`
                                        }
                                    </p>
                                </div>
                            </div>

                            {isMaintenanceExpired && (
                                <button className="mt-3 w-full py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-colors">
                                    Renovar Manutenção
                                </button>
                            )}
                        </div>

                        <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                            <h5 className="font-bold text-blue-900 text-sm mb-1">Precisa de ajuda?</h5>
                            <p className="text-xs text-blue-700 mb-3">
                                Consulte nossos guias de operação ou envie um diagnóstico em caso de problemas técnicos.
                            </p>
                            <button className="text-blue-600 text-sm font-bold hover:underline">
                                Acessar Central de Ajuda &rarr;
                            </button>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default LicenseSettings;
