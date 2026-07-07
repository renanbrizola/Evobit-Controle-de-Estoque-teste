import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingBag, Tags, Tag, Users, Package, History, LogOut, LayoutDashboard, ArrowLeftRight, ClipboardList, Settings, Grid, Home, PanelLeftClose, PanelLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import clsx from 'clsx';
import Modal from '../ui/Modal';
import { useModules } from '../../contexts/ModuleContext';
import { Lock, TrendingUp, ShoppingCart, DollarSign, BarChart3, FileText, ChefHat, Cpu } from 'lucide-react'; // Import icons needed

const Layout = () => {
    const { signOut, user } = useAuth();
    const { companyName } = useTheme();
    const { t } = useLanguage();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            } catch { /* silent */ }
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
        if (path.includes('/ficha-tecnica')) return 'technical_sheet';
        if (path.includes('/vendas') || path.includes('/clientes') || path.includes('/dashboard-vendas')) return 'sales';
        if (path.includes('/compras') || path.includes('/dashboard-compras')) return 'purchases';
        if (path.includes('/financeiro') || path.includes('/dashboard-financeiro')) return 'finance';
        if (path.includes('/dashboard') && !path.includes('-vendas') && !path.includes('-compras') && !path.includes('-financeiro')) return 'inventory';
        if (path.includes('/estoque') || path.includes('/produtos') || path.includes('/movimentacoes') || path.includes('/fornecedores') || path.includes('/categorias') || path.includes('/historico') || path.includes('/relatorios')) return 'inventory';
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

        // --- FICHA TÉCNICA ---
        { path: '/app/ficha-tecnica/dashboard', label: 'Início', icon: BarChart3, module: 'technical_sheet' },
        // Produção
        { path: '/app/ficha-tecnica/insumos', label: 'Insumos', icon: Package, module: 'technical_sheet' },
        { path: '/app/ficha-tecnica/insumos/cadastro', label: 'Cadastro de Insumos', icon: Package, module: 'technical_sheet', indent: true },
        { path: '/app/ficha-tecnica/insumos/compostos', label: 'Insumos Compostos', icon: Package, module: 'technical_sheet', indent: true },
        { path: '/app/ficha-tecnica/equipamentos', label: 'Equipamentos', icon: Cpu, module: 'technical_sheet' },
        { path: '/app/ficha-tecnica/fichas', label: 'Fichas Técnicas', icon: ShoppingBag, module: 'technical_sheet' },
        // Financeiro
        { path: '/app/ficha-tecnica/despesas', label: 'Despesas', icon: FileText, module: 'technical_sheet' },
        { path: '/app/ficha-tecnica/precificacao', label: 'Precificação', icon: Tag, module: 'technical_sheet' },
        // Administração
        { path: '/app/ficha-tecnica/funcionarios', label: 'Funcionários', icon: Users, module: 'technical_sheet' },
        { path: '/app/ficha-tecnica/configuracoes', label: 'Configurações da Ficha', icon: Settings, module: 'technical_sheet' },

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
        allNavItems.push({ path: '/app/admin', label: t('menu', 'admin'), icon: Users, alwaysVisible: true });
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
            case 'technical_sheet': return 'Ficha Técnica';
            default: return 'Estoque';
        }
    };

    const groups = [
        {
            group: 'Principal',
            items: navItems.filter(i => i.alwaysVisible && i.path.includes('visao-geral'))
        },
        {
            group: getContextLabel(currentContext),
            items: navItems.filter(i => !i.alwaysVisible)
        },
        {
            group: 'Administração',
            items: navItems.filter(i => i.alwaysVisible && !i.path.includes('visao-geral'))
        }
    ].filter(g => g.items.length > 0);

    const SidebarContent = () => (
        <div className="flex h-full flex-col font-sans">
            <div className="border-b border-[var(--sidebar-line)] px-5 py-5">
                <div className="rounded-[14px] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-white/15 bg-white/10 text-xs font-bold tracking-[0.18em] text-[#C9A84C]">
                            EV
                        </div>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--sidebar-text-strong)]">{companyName}</p>
                            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-[var(--sidebar-text)]">
                                precisão produtiva
                            </p>
                        </div>
                    </div>
                    <div className="mt-4 border-t border-[var(--sidebar-line)] pt-3">
                        <button
                            onClick={() => navigate('/modules')}
                            className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-white/10 px-3 py-2 text-[12px] font-medium text-[var(--sidebar-text-strong)] transition-colors hover:bg-white/15"
                        >
                            <Grid size={14} className="text-[var(--sidebar-text)]" />
                            Trocar Módulo
                        </button>
                    </div>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar">
                <div className="space-y-5">
                    {groups.map((group) => (
                        <div key={group.group}>
                            <p className="px-2 pb-2 font-mono text-[10px] font-medium uppercase tracking-[0.22em] text-[var(--sidebar-text)]">
                                {group.group}
                            </p>
                            <div className="space-y-1">
                                {group.items.map((item) => {
                                    const active = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
                                    const isLocked = item.module && !modules[item.module];

                                    return (
                                        <div key={item.path}>
                                            <Link
                                                to={isLocked ? '#' : item.path}
                                                onClick={(e) => {
                                                    if (isLocked) {
                                                        e.preventDefault();
                                                        navigate('/modules');
                                                    } else {
                                                        setIsMenuOpen(false);
                                                    }
                                                }}
                                                className={clsx(
                                                    'relative flex items-center gap-3 rounded-[12px] border px-3 py-3 text-[13px] font-medium transition-all duration-150',
                                                    active
                                                        ? 'border-white/12 bg-white/10 text-[var(--sidebar-text-strong)]'
                                                        : 'border-transparent text-[var(--sidebar-text)] hover:border-white/8 hover:bg-white/6 hover:text-[var(--sidebar-text-strong)]',
                                                    isLocked && 'opacity-50 hover:bg-transparent cursor-not-allowed'
                                                )}
                                            >
                                                <span
                                                    className={clsx(
                                                        'absolute inset-y-2 left-0 w-[3px] rounded-r-full transition-opacity',
                                                        active ? 'opacity-100' : 'opacity-0',
                                                    )}
                                                    style={{ backgroundColor: 'var(--color-secondary)' }}
                                                />
                                                {item.indent ? (
                                                    <span className="flex h-5 w-5 shrink-0 items-center justify-center ml-1.5 text-sm text-[var(--sidebar-text)]">
                                                        <ChevronRight size={12} />
                                                    </span>
                                                ) : (
                                                    <span
                                                        className={clsx(
                                                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border text-sm transition-colors',
                                                            active
                                                                ? 'border-white/12 bg-black/10 text-[#f2dfbf]'
                                                                : 'border-white/8 bg-black/5 text-[var(--sidebar-text)]',
                                                        )}
                                                    >
                                                        <item.icon size={16} />
                                                    </span>
                                                )}
                                                <span className={clsx("min-w-0 flex-1 truncate leading-none", item.indent && 'text-[12px]')}>{item.label}</span>
                                                
                                                {isLocked && <Lock size={14} className="text-[var(--sidebar-text)] shrink-0 ml-2" />}
                                                
                                                {item.badge > 0 && !isLocked && (
                                                    <span className="ml-auto inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/30">
                                                        {item.badge > 9 ? '9+' : item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </nav>

            <div className="border-t border-[var(--sidebar-line)] px-4 py-4">
                <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-secondary)] text-[11px] font-bold uppercase text-white">
                            {(user?.name ?? 'DM').slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-[var(--sidebar-text-strong)]">
                                {user?.name ?? 'Usuário'}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-[var(--sidebar-text)]">
                                {user?.role ?? 'Gestor'}
                            </p>
                        </div>
                        <button
                            onClick={handleLogoutClick}
                            title={t('menu', 'logout')}
                            className="rounded-[10px] border border-white/8 bg-black/10 p-2 text-[var(--sidebar-text)] transition-colors hover:border-white/14 hover:text-[var(--sidebar-text-strong)]"
                        >
                            <LogOut size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-[var(--bg-app)] font-sans text-[var(--text-strong)] overflow-hidden">
            <aside
                className="hidden w-[272px] shrink-0 border-r border-[var(--sidebar-line)] lg:flex lg:flex-col"
                style={{ backgroundColor: 'var(--sidebar-bg)' }}
            >
                <SidebarContent />
            </aside>

            {isMenuOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 transition-opacity"
                        onClick={() => setIsMenuOpen(false)}
                        aria-hidden="true"
                    />
                    <aside
                        className="absolute inset-y-0 left-0 flex w-[272px] flex-col border-r border-[var(--sidebar-line)] shadow-[var(--shadow-overlay)] transition-transform duration-300"
                        style={{ backgroundColor: 'var(--sidebar-bg)' }}
                    >
                        <SidebarContent />
                    </aside>
                </div>
            )}

            <div className="flex flex-1 flex-col min-w-0 h-screen overflow-hidden">
                <header className="sticky top-0 z-20 border-b border-[var(--line-soft)] bg-[var(--bg-app)]">
                    <div className="flex items-start gap-4 px-4 py-3 lg:px-6">
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            aria-label="Abrir menu"
                            className="rounded-[10px] border border-[var(--line-soft)] bg-white p-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-subtle)] hover:text-[var(--text-strong)] lg:hidden"
                        >
                            <Menu size={18} />
                        </button>

                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                                    Evobit
                                </span>
                            </div>
                            <div className="mt-1 flex min-w-0 flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-4">
                                <h1 className="truncate text-xl font-semibold leading-tight text-[var(--text-strong)]">
                                    {navItems.find(i => location.pathname === i.path || location.pathname.startsWith(`${i.path}/`))?.label || companyName}
                                </h1>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('/app/produtos')}
                                className="hidden sm:flex items-center gap-1.5 rounded-[10px] border border-[var(--line-soft)] bg-white px-3 py-1.5 text-[12px] font-semibold text-[var(--text-strong)] shadow-sm transition-colors hover:bg-[var(--bg-subtle)]"
                                title="Acessar o Cadastro Mestre de Produtos"
                            >
                                <Package size={14} className="text-[var(--text-muted)]" />
                                Produtos
                            </button>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-8 custom-scrollbar relative">
                    <div className="max-w-7xl mx-auto pb-24">
                        <Outlet />
                    </div>
                </main>
            </div>

            <Modal isOpen={isLogoutConfirmOpen} onClose={() => setIsLogoutConfirmOpen(false)} className="max-w-sm">
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
                        <LogOut size={40} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-gray-900">{t('menu', 'logoutTitle')}</h3>
                    <p className="text-gray-500">{t('menu', 'logoutMessage')}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => setIsLogoutConfirmOpen(false)}
                        className="btn-cta btn-cta--secondary text-sm"
                    >
                        <span>{t('menu', 'cancel')}</span>
                    </button>
                    <button
                        onClick={confirmLogout}
                        className="btn-cta btn-cta--danger text-sm"
                    >
                        <span>{t('menu', 'confirmLogout')}</span>
                    </button>
                </div>
            </Modal>

            <Modal isOpen={isModuleConfirmOpen} onClose={() => setIsModuleConfirmOpen(false)} className="max-w-sm">
                <div className="text-center mb-6 relative z-10">
                    <div className="w-20 h-20 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center mx-auto mb-4 text-[var(--color-primary)]">
                        <Grid size={40} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2 text-gray-900">
                        {t('menu', 'switchModuleTitle')}
                    </h3>
                    <p className="text-gray-500">
                        {t('menu', 'switchModuleMessage')}
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <button
                        onClick={() => setIsModuleConfirmOpen(false)}
                        className="btn-cta btn-cta--secondary text-sm"
                    >
                        <span>{t('menu', 'cancel')}</span>
                    </button>
                    <button
                        onClick={() => {
                            setIsModuleConfirmOpen(false);
                            navigate('/modules');
                        }}
                        className="btn-cta btn-cta--primary text-sm"
                    >
                        <span>{t('menu', 'confirm')}</span>
                    </button>
                </div>
            </Modal>
        </div>
    );
};

export default Layout;
