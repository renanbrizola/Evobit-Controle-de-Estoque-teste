import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useModules } from '../contexts/ModuleContext';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, ArrowRight, Lock, Package, ShoppingCart, TrendingUp, DollarSign } from 'lucide-react';
import Modal from '../components/ui/Modal';
import clsx from 'clsx';
import { toast } from 'sonner';

const Modules = () => {
    const { modules, hasModule, updateModules, resetModules } = useModules();
    const { signOut, user } = useAuth();
    const { companyName } = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [selectedModule, setSelectedModule] = useState(null);
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);

    // Define moduleCards BEFORE useEffect so it can be used inside it
    const moduleCards = [
        {
            key: 'inventory',
            name: 'Estoque',
            description: 'Controle total de produtos, fornecedores e inventário.',
            icon: Package,
            active: hasModule('inventory'),
            price: 147,
            path: '/app/dashboard',
            color: 'bg-blue-500',
            textColor: 'text-blue-500'
        },
        {
            key: 'purchases',
            name: 'Compras',
            description: 'Gestão de pedidos de compra e relacionamento com fornecedores.',
            icon: ShoppingCart,
            active: false,
            comingSoon: true,
            path: '/app/dashboard-compras',
            color: 'bg-emerald-500',
            textColor: 'text-emerald-500'
        },
        {
            key: 'sales',
            name: 'Vendas',
            description: 'Frente de caixa, pedidos de venda e clientes.',
            icon: TrendingUp,
            active: false,
            comingSoon: true,
            path: '/app/dashboard-vendas',
            color: 'bg-purple-500',
            textColor: 'text-purple-500'
        },
        {
            key: 'finance',
            name: 'Financeiro',
            description: 'Contas a pagar, receber e fluxo de caixa.',
            icon: DollarSign,
            active: false,
            comingSoon: true,
            path: '/app/dashboard-financeiro',
            color: 'bg-amber-500',
            textColor: 'text-amber-500'
        }
    ];

    // Handle redirect from ModuleGuard
    useEffect(() => {
        if (location.state?.moduleLocked) {
            const moduleKey = location.state.moduleLocked;
            const module = moduleCards.find(m => m.key === moduleKey);
            if (module) {
                if (module.comingSoon) {
                    toast.info(`O módulo ${module.name} está em desenvolvimento e estará disponível em breve.`);
                } else {
                    setSelectedModule(module);
                    setIsBuyModalOpen(true);
                }
                // Optional: Clear state to prevent reopening on refresh
                window.history.replaceState({}, document.title);
            }
        }
    }, [location.state]); // Depend on location.state
    // Note: moduleCards is not in dependency array to avoid loops, 
    // effectively it's constant per render but reconstructed. 
    // Since we only care about location.state trigger, this is fine.

    const handleModuleClick = (module) => {
        if (module.comingSoon) {
            toast.info(`O módulo ${module.name} está em desenvolvimento e estará disponível em breve!`);
            return;
        }
        if (module.active) {
            navigate(module.path);
        } else {
            setSelectedModule(module);
            setIsBuyModalOpen(true);
        }
    };

    const handleBuyModule = () => {
        // Simulação de compra
        toast.promise(
            new Promise((resolve) => setTimeout(resolve, 1500)),
            {
                loading: 'Processando pagamento...',
                success: () => {
                    // Ativa o módulo localmente
                    updateModules({ [selectedModule.key]: true });
                    setIsBuyModalOpen(false);
                    return `Módulo ${selectedModule.name} ativado com sucesso!`;
                },
                error: 'Erro ao processar pagamento'
            }
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/30">
                        <span className="font-serif font-bold text-white text-xl">EB</span>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{companyName}</h1>
                        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Módulos</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <p className="text-sm font-bold text-gray-900">{user?.email}</p>
                        <p className="text-xs text-gray-500">{user?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
                    </div>

                    {/* DEV BUTTON */}
                    <button
                        onClick={resetModules}
                        className="p-2 border border-red-200 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                        title="Dev: Resetar Módulos"
                    >
                        RESET
                    </button>

                    <button
                        onClick={signOut}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                        title="Sair"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="flex-1 container mx-auto px-4 py-8 md:py-12 max-w-6xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Bem-vindo ao Evobit</h2>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Selecione um módulo para acessar ou ative novas funcionalidades para expandir seu negócio.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {moduleCards.map((module) => (
                        <div
                            key={module.key}
                            onClick={() => handleModuleClick(module)}
                            className={clsx(
                                "relative group cursor-pointer transition-all duration-300 transform hover:-translate-y-1",
                                "bg-white rounded-2xl border-2 p-6 flex flex-col h-full",
                                module.active
                                    ? "border-transparent shadow-lg hover:shadow-xl ring-1 ring-black/5"
                                    : "border-gray-200 hover:border-brand-primary/30 opacity-90 hover:opacity-100"
                            )}
                        >
                            <div className={clsx(
                                "w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300",
                                module.active ? `${module.color} text-white shadow-lg` : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                            )}>
                                {module.active ? <module.icon size={28} /> : <Lock size={28} />}
                            </div>

                            <h3 className={clsx("text-xl font-bold mb-2 flex items-center justify-between", module.active ? "text-gray-900" : "text-gray-500")}>
                                {module.name}
                                {module.comingSoon && (
                                    <span className="text-[10px] bg-brand-primary/10 text-brand-primary px-2.5 py-1 rounded-full uppercase tracking-wider font-bold shrink-0">
                                        Em breve
                                    </span>
                                )}
                            </h3>

                            <p className="text-sm text-gray-500 mb-8 flex-1 leading-relaxed">
                                {module.description}
                            </p>

                            <div className="mt-auto">
                                {module.comingSoon ? (
                                    <div className="w-full py-2 rounded-lg bg-gray-100 text-gray-400 font-bold text-center text-sm cursor-not-allowed border border-gray-200">
                                        Em desenvolvimento
                                    </div>
                                ) : module.active ? (
                                    <div className="flex items-center text-sm font-bold text-brand-primary group-hover:translate-x-1 transition-transform">
                                        Acessar <ArrowRight size={16} className="ml-2" />
                                    </div>
                                ) : (
                                    <div className="w-full py-2 rounded-lg bg-gray-50 text-gray-600 font-bold text-center text-sm group-hover:bg-brand-primary group-hover:text-white transition-colors">
                                        Ativar por R$ {module.price}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pacote Completo Banner - Oculto Temporariamente devido a módulos em desenvolvimento */}
            </main>

            {/* Buy Modal */}
            <Modal isOpen={isBuyModalOpen} onClose={() => setIsBuyModalOpen(false)} className="max-w-md">
                {selectedModule && (
                    <div>
                        <div className={`w-16 h-16 rounded-2xl ${selectedModule.color} text-white flex items-center justify-center mx-auto mb-6 shadow-xl`}>
                            <selectedModule.icon size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-center mb-2">
                            Ativar {selectedModule.name}
                        </h3>
                        <p className="text-center text-gray-500 mb-8">
                            Desbloqueie todas as funcionalidades do módulo {selectedModule.name} agora mesmo.
                        </p>

                        <div className="bg-gray-50 rounded-xl p-4 mb-8 border border-gray-100">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600">Valor do módulo</span>
                                <span className="font-bold text-lg">R$ {selectedModule.price},00</span>
                            </div>
                            <div className="text-xs text-gray-400 text-center border-t border-gray-200 mt-2 pt-2">
                                Pagamento único • Acesso vitalício à versão atual
                            </div>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleBuyModule}
                                className="w-full py-3.5 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20 hover:scale-[1.02]"
                            >
                                Confirmar Compra
                            </button>
                            <button
                                onClick={() => setIsBuyModalOpen(false)}
                                className="w-full py-3.5 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Modules;
