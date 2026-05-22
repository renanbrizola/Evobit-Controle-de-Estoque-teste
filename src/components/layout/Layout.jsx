import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingBag, Tags, Tag, Users, Package, History, LogOut, LayoutDashboard, ArrowLeftRight, ClipboardList, Settings, Grid, Home, PanelLeftClose, PanelLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import clsx from 'clsx';
import Modal from '../ui/Modal';
import { useModules } from '../../contexts/ModuleContext';
import { Lock, TrendingUp, ShoppingCart, DollarSign, BarChart3, FileText, ChefHat } from 'lucide-react'; // Import icons needed

const Layout = () => {
    const { signOut, user } = useAuth();
    const { companyName } = useTheme();
    const { t } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Sidebar Collapse State
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebarCollapsed') === 'true';
    });

    const toggleSidebar = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebarCollapsed', newState);
    };
    const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
    const [isModuleConfirmOpen, setIsModuleConfirmOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    // Stock alerts count
    const [alertCount, setAlertCount] = useState(0);
    useEffect(() => {
        let mounted = true;
        const countAlerts = async () => {
            try {
                const { api } = await import('../../services/api');
                const products = await api.products.list();
                const prods = products.data || products;
                const lowStock = prods.filter(p => {
                    const current = Number(p.current_stock || 0);
                    const min = Number(p.min_stock || 0);
                    return min > 0 && current <= min;
                }).length;
                if (mounted) setAlertCount(lowStock);
            } catch (e) { /* silent */ }
        };
        countAlerts();
        const interval = setInterval(countAlerts, 60000);
        return () => { mounted = false; clearInterval(interval); };
    }, [location.pathname]); // Recount when navigating

    const handleLogoutClick = () => {
        setIsMenuOpen(false);
        setIsLogoutConfirmOpen(true);
    };

    const confirmLogout = async () => {
        setIsLogoutConfirmOpen(false);
        await signOut();
        navigate('/login');
    };

    // Lock body scroll when menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMenuOpen]);

    const { modules } = useModules(); // CONSUME MODULE CONTEXT

    // HELPER: Detect current module context from URL
    const getContextFromPath = (path) => {
        if (path.includes('/vendas') || path.includes('/clientes') || path.includes('/dashboard-vendas')) return 'sales';
        if (path.includes('/compras') || path.includes('/dashboard-compras')) return 'purchases';
        if (path.includes('/financeiro') || path.includes('/dashboard-financeiro')) return 'finance';
        if (path.includes('/dashboard') || path.includes('/estoque') || path.includes('/produtos') || path.includes('/movimentacoes') || path.includes('/fornecedores') || path.includes('/categorias') || path.includes('/historico') || path.includes('/relatorios')) return 'inventory';
        return null; // neutral pages (visao-geral, configuracoes) — keep previous context
    };

    const lastModuleContext = React.useRef('inventory');
    const detectedContext = getContextFromPath(location.pathname);
    if (detectedContext) {
        lastModuleContext.current = detectedContext;
    }
    const currentContext = lastModuleContext.current;

    // DEFINE ITEMS WITH REQUIRED MODULES AND CONTEXT
    const allNavItems = [
        // { path: '/modules', label: t('menu', 'modules'), icon: Grid, alwaysVisible: true }, // REMOVED: Replaced by specific "Back" button
        { path: '/app/visao-geral', label: 'Visão Geral', icon: Home, alwaysVisible: true },

        // --- ESTOQUE E OPERAÇÕES ---
        { path: '/app/dashboard', label: 'Dashboard', icon: BarChart3, module: 'inventory' },
        { path: '/app/estoque', label: t('menu', 'inventory'), icon: ClipboardList, module: 'inventory', badge: alertCount },
        { path: '/app/movimentacoes', label: t('menu', 'movements'), icon: ArrowLeftRight, module: 'inventory' },
        { path: '/app/historico', label: t('menu', 'history'), icon: History, module: 'inventory' },

        // --- CADASTROS (ESTOQUE) ---
        { path: '/app/produtos', label: t('menu', 'products'), icon: Tags, module: 'inventory' },
        { path: '/app/categorias', label: t('menu', 'categories'), icon: Tag, module: 'inventory' },

        { path: '/app/fornecedores', label: t('menu', 'providers'), icon: Users, module: 'inventory' },

        // --- RELATÓRIOS (ESTOQUE) ---
        { path: '/app/relatorios', label: 'Relatórios', icon: FileText, module: 'inventory' },

        // --- VENDAS ---
        { path: '/app/dashboard-vendas', label: 'Dashboard', icon: BarChart3, module: 'sales' },
        { path: '/app/vendas', label: 'Nova Venda', icon: TrendingUp, module: 'sales' },
        { path: '/app/pedidos', label: 'Pedidos / Orçamentos', icon: FileText, module: 'sales' },
        { path: '/app/clientes', label: 'Clientes', icon: Users, module: 'sales' },

        // --- COMPRAS ---
        { path: '/app/dashboard-compras', label: 'Dashboard', icon: BarChart3, module: 'purchases' },
        { path: '/app/compras', label: t('menu', 'purchases'), icon: ShoppingCart, module: 'purchases' },

        // --- FINANCEIRO ---
        { path: '/app/dashboard-financeiro', label: 'Dashboard', icon: BarChart3, module: 'finance' },
        { path: '/app/financeiro', label: t('menu', 'finance'), icon: DollarSign, module: 'finance' },

        // --- CONFIGURAÇÕES GERAIS ---
        { path: '/app/configuracoes', label: t('menu', 'settings'), icon: Settings, alwaysVisible: true },
    ];

    if (user?.role === 'admin') {
        allNavItems.push({ path: '/admin', label: t('menu', 'admin'), icon: Users, alwaysVisible: true });
    }

    // Filter items based on current context
    const navItems = allNavItems.filter(item => {
        if (item.alwaysVisible) return true;
        return item.module === currentContext;
    });

    const getContextLabel = (ctx) => {
        switch (ctx) {
            case 'sales': return 'Vendas';
            case 'purchases': return 'Compras';
            case 'finance': return 'Financeiro';
            default: return 'Estoque';
        }
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row font-sans selection:bg-brand-primary/30 transition-colors duration-500 bg-gray-50 text-gray-900">
            {/* Desktop Sidebar (Left) - Glassmorphism Floating */}
            <aside className={clsx(
                "hidden md:flex flex-col h-[calc(100vh-2rem)] sticky top-4 ml-4 rounded-[2.5rem] border border-white/20 z-50 transition-all duration-300 backdrop-blur-2xl bg-white/80 dark:bg-[#121212]/80 shadow-2xl",
                isCollapsed ? "w-24" : "w-20 lg:w-72"
            )}>
                <div className="p-6 flex flex-col items-center lg:items-start gap-1 relative">
                    {/* Toggle Button */}
                    <button
                        onClick={toggleSidebar}
                        className={clsx(
                            "absolute top-6 right-6 p-1 rounded-lg text-gray-400 hover:text-brand-primary hover:bg-gray-100 dark:hover:bg-white/5 transition-all hidden lg:flex",
                            isCollapsed && "right-auto left-1/2 -translate-x-1/2 top-4"
                        )}
                        title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
                    >
                        {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
                    </button>

                    <h1 className={clsx(
                        "text-3xl font-serif font-bold tracking-tighter text-gray-900 dark:text-white drop-shadow-sm transition-all duration-300",
                        isCollapsed ? "hidden scale-0" : "hidden lg:block scale-100"
                    )}>
                        {companyName}
                    </h1>

                    {/* Logo Icon for Collapsed/Mobile */}
                    <div className={clsx(
                        "w-12 h-12 bg-gradient-gold rounded-2xl flex items-center justify-center shadow-glow transition-all duration-300",
                        isCollapsed ? "flex scale-100 mt-8" : "lg:hidden"
                    )}>
                        <span className="font-serif font-bold text-brand-dark text-xl">EB</span>
                    </div>
                </div>

                {/* BACK TO MODULES BUTTON */}
                <div className="px-4 mb-4 flex justify-center">
                    <button
                        onClick={() => navigate('/modules')}
                        className={clsx(
                            "flex items-center gap-3 bg-gray-900 dark:bg-white text-white dark:text-black rounded-2xl hover:scale-[1.02] transition-all shadow-lg hover:shadow-xl group",
                            isCollapsed ? "p-3 w-12 justify-center" : "w-full p-3.5 px-4"
                        )}
                        title="Todos os Módulos"
                    >
                        <Grid size={20} className="text-brand-primary transition-colors shrink-0" />
                        <span className={clsx(
                            "font-bold text-sm text-brand-primary whitespace-nowrap overflow-hidden transition-all duration-300",
                            isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100 hidden lg:block"
                        )}>
                            Todos os Módulos
                        </span>
                    </button>
                </div>

                {/* Context Title */}
                <div className={clsx(
                    "px-6 pb-2 transition-all duration-300 overflow-hidden whitespace-nowrap",
                    isCollapsed ? "h-0 opacity-0" : "h-auto opacity-100 hidden lg:block"
                )}>
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        Módulo Atual
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mt-1">
                        {getContextLabel(currentContext)}
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10B981] animate-pulse"></span>
                    </h2>
                </div>

                <nav className="flex-1 px-3 py-2 flex flex-col gap-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const isLocked = item.module && !modules[item.module];

                        if (isLocked) {
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => navigate('/modules')}
                                    className={clsx(
                                        "relative group flex items-center rounded-2xl transition-all duration-300 w-full text-left text-gray-400 hover:bg-gray-100/50 cursor-not-allowed",
                                        isCollapsed ? "justify-center p-3" : "px-4 py-3.5"
                                    )}
                                >
                                    <div className="relative">
                                        <item.icon size={22} strokeWidth={2} className="opacity-50 grayscale shrink-0" />
                                        <div className="absolute -top-1 -right-1 bg-gray-200 rounded-full p-0.5">
                                            <Lock size={10} className="text-gray-500" />
                                        </div>
                                    </div>
                                    <span className={clsx(
                                        "font-medium tracking-normal opacity-60 whitespace-nowrap transition-all duration-300 overflow-hidden",
                                        isCollapsed ? "w-0 ml-0 opacity-0 hidden" : "w-auto ml-3 hidden lg:block opacity-100"
                                    )}>
                                        {item.label}
                                    </span>
                                </button>
                            );
                        }

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                    "relative group flex items-center rounded-2xl transition-all duration-300",
                                    isCollapsed ? "justify-center p-3" : "px-4 py-3.5",
                                    isActive
                                        ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20 font-bold shadow-sm"
                                        : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
                                )}
                                title={isCollapsed ? item.label : ""}
                            >
                                <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} className={clsx("transition-transform duration-300 group-hover:scale-110 shrink-0", !isActive && "group-hover:text-brand-primary")} />
                                <span className={clsx(
                                    "font-medium whitespace-nowrap transition-all duration-300 overflow-hidden",
                                    isCollapsed ? "w-0 ml-0 opacity-0 hidden" : "w-auto ml-3 hidden lg:block opacity-100",
                                    isActive ? "tracking-wide" : "tracking-normal"
                                )}>
                                    {item.label}
                                </span>
                                {/* Alert Badge */}
                                {item.badge > 0 && (
                                    <span className={clsx(
                                        "bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg animate-pulse",
                                        isCollapsed ? "absolute -top-1 -right-1 w-4 h-4" : "ml-auto w-5 h-5 hidden lg:flex"
                                    )}>
                                        {item.badge > 9 ? '9+' : item.badge}
                                    </span>
                                )}
                                {isActive && !isCollapsed && !item.badge && (
                                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-brand-primary hidden lg:block animate-pulse shadow-glow" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100 dark:border-white/5 flex flex-col items-center">
                    <button
                        onClick={handleLogoutClick}
                        className={clsx(
                            "w-full flex items-center rounded-2xl text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-all duration-300 group",
                            isCollapsed ? "justify-center p-3" : "px-4 py-3.5 justify-center lg:justify-start"
                        )}
                        title={t('menu', 'logout')}
                    >
                        <LogOut size={20} className="group-hover:-translate-x-1 transition-transform shrink-0" />
                        <span className={clsx(
                            "ml-3 font-bold hidden overflow-hidden transition-all duration-300 whitespace-nowrap",
                            !isCollapsed && "lg:block w-auto"
                        )}>{t('menu', 'logout')}</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden sticky top-0 z-40 backdrop-blur-xl border-b shadow-lg px-4 py-3 flex items-center justify-between bg-white/90 border-gray-200">
                <button onClick={() => setIsMenuOpen(true)} className="p-2 rounded-xl bg-gray-100 text-gray-700">
                    <Menu size={24} />
                </button>
                <h1 className="text-xl font-serif font-bold text-transparent bg-clip-text bg-gradient-gold">
                    {companyName}
                </h1>
                <div className="w-10" /> {/* Spacer */}
            </header>

            {/* Mobile Menu Overlay */}
            {isMenuOpen && (
                <div className="md:hidden fixed inset-0 z-[60] flex flex-col backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 bg-white/95">
                    <div className="p-6 flex justify-between items-center border-b border-gray-200">
                        <div>
                            <h2 className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-gold">Menu</h2>
                        </div>
                        <button
                            onClick={() => setIsMenuOpen(false)}
                            className="p-3 rounded-full hover:opacity-80 bg-gray-100 text-gray-700"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <nav className="flex-1 overflow-y-auto py-6 px-4 flex flex-col gap-3">
                        {navItems.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                onClick={() => setIsMenuOpen(false)}
                                className={clsx(
                                    "p-4 rounded-2xl flex items-center gap-4 text-lg font-bold transition-all",
                                    location.pathname === item.path
                                        ? "bg-gradient-gold text-white shadow-glow"
                                        : "bg-gray-50 text-gray-700 border border-gray-200"
                                )}
                            >
                                <item.icon size={24} />
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}


            {/* Main Content Area */}
            <main className="flex-1 w-full md:w-auto h-screen overflow-y-auto overflow-x-hidden relative custom-scrollbar">
                {/* Top Bar (Desktop) */}
                {/* Header Removed to allow custom page headers */}

                <div className="px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto pb-24">
                    <Outlet />
                </div>
            </main>

            {/* Logout Modal */}
            <Modal isOpen={isLogoutConfirmOpen} onClose={() => setIsLogoutConfirmOpen(false)} className="max-w-sm">
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-brand-danger/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-danger shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                        <LogOut size={40} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-gray-900">{t('menu', 'logoutTitle')}</h3>
                    <p className="text-gray-400">{t('menu', 'logoutMessage')}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setIsLogoutConfirmOpen(false)}
                        className="py-3 px-4 rounded-xl font-bold transition-colors border text-gray-600 hover:bg-gray-50 border-gray-200"
                    >
                        {t('menu', 'cancel')}
                    </button>
                    <button
                        onClick={confirmLogout}
                        className="py-3 px-4 rounded-xl font-bold text-white bg-brand-danger hover:bg-red-600 shadow-lg shadow-red-900/40 transition-all hover:scale-105"
                    >
                        {t('menu', 'confirmLogout')}
                    </button>
                </div>
            </Modal>

            {/* Module Switch Modal */}
            <Modal isOpen={isModuleConfirmOpen} onClose={() => setIsModuleConfirmOpen(false)} className="max-w-sm">
                {/* Decorative background element */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />

                <div className="text-center mb-6 relative z-10">
                    <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-primary shadow-glow">
                        <Grid size={40} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-gray-900">
                        {t('menu', 'switchModuleTitle')}
                    </h3>
                    <p className="text-gray-400">
                        {t('menu', 'switchModuleMessage')}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <button
                        onClick={() => setIsModuleConfirmOpen(false)}
                        className="py-3 px-4 rounded-xl font-bold transition-colors border text-gray-600 hover:bg-gray-50 border-gray-200"
                    >
                        {t('menu', 'cancel')}
                    </button>
                    <button
                        onClick={() => {
                            setIsModuleConfirmOpen(false);
                            navigate('/modules');
                        }}
                        className="py-3 px-4 rounded-xl font-bold text-white bg-brand-primary hover:bg-brand-secondary shadow-lg shadow-brand-primary/20 transition-all hover:scale-105"
                    >
                        {t('menu', 'confirm')}
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Layout;
