import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useModules } from '../contexts/ModuleContext';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, TrendingUp, DollarSign, Settings, ShieldAlert, ArrowRight } from 'lucide-react';
import { Card } from '../components/ui/Card';

const GeneralDashboard = () => {
    const { companyName } = useTheme();
    const { user } = useAuth();
    const { modules } = useModules();
    const navigate = useNavigate();

    const moduleCards = [
        {
            id: 'inventory',
            title: 'Estoque',
            description: 'Gestão de produtos e inventário',
            icon: Package,
            path: '/app/estoque',
            color: 'bg-blue-500',
            active: modules.inventory
        },
        {
            id: 'sales',
            title: 'Vendas',
            description: 'PDV e gestão de clientes',
            icon: TrendingUp,
            path: '/app/vendas',
            color: 'bg-emerald-500',
            active: modules.sales
        },
        {
            id: 'purchases',
            title: 'Compras',
            description: 'Aquisição e fornecedores',
            icon: ShoppingCart,
            path: '/app/compras',
            color: 'bg-amber-500',
            active: modules.purchases
        },
        {
            id: 'finance',
            title: 'Financeiro',
            description: 'Fluxo de caixa e relatórios',
            icon: DollarSign,
            path: '/app/financeiro',
            color: 'bg-purple-500',
            active: modules.finance
        }
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">
                        Bem-vindo, {user?.name?.split(' ')[0]}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">
                        Visão geral de {companyName}
                    </p>
                </div>
                <div className="text-sm text-gray-400 font-mono bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {moduleCards.map((mod) => (
                    <div
                        key={mod.id}
                        onClick={() => mod.active ? navigate(mod.path) : null}
                        className={`
                            relative overflow-hidden rounded-2xl p-6 border transition-all duration-300
                            ${mod.active
                                ? 'bg-white dark:bg-[#121212] border-gray-200 dark:border-white/10 cursor-pointer hover:shadow-xl hover:-translate-y-1 group'
                                : 'bg-gray-50 dark:bg-white/5 border-transparent opacity-60 cursor-not-allowed grayscale'
                            }
                        `}
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${mod.active ? `${mod.color}/10 text-${mod.color.split('-')[1]}-500` : 'bg-gray-200 text-gray-400'}`}>
                            <mod.icon size={24} />
                        </div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">
                            {mod.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 h-10">
                            {mod.description}
                        </p>

                        {mod.active ? (
                            <div className="flex items-center text-sm font-bold text-gray-900 dark:text-white group-hover:gap-2 transition-all">
                                Acessar <ArrowRight size={16} className="ml-1" />
                            </div>
                        ) : (
                            <div className="flex items-center text-xs font-bold text-gray-400">
                                <ShieldAlert size={12} className="mr-1" /> Não habilitado
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Quick Stats or Alerts Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <h3 className="font-bold text-lg mb-4">Resumo do Dia</h3>
                    <div className="p-8 text-center text-gray-400 border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                        Em breve: Gráfico unificado de vendas e movimentações.
                    </div>
                </Card>
                <Card>
                    <h3 className="font-bold text-lg mb-4">Atalhos</h3>
                    <div className="space-y-2">
                        <button onClick={() => navigate('/app/configuracoes')} className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors">
                            <Settings size={18} className="text-gray-400" />
                            <span>Configurações da Empresa</span>
                        </button>
                        <button onClick={() => navigate('/modules')} className="w-full text-left p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-3 transition-colors">
                            <Package size={18} className="text-gray-400" />
                            <span>Gerenciar Módulos</span>
                        </button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default GeneralDashboard;
