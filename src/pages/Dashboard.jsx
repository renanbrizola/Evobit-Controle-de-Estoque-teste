import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { api } from '../services/api';
import { Package, TrendingUp, AlertTriangle, DollarSign, Activity, ArrowUp, ArrowDown, Filter, PieChart as PieIcon, BarChart3, Clock, Calendar, Tag } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, PieChart, Pie, Cell } from 'recharts';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, parseCurrency } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';

const KPICard = ({ title, value, subtitle, icon: Icon, color, loading, onClick, className = '' }) => {
    const gradients = {
        primary: "bg-gradient-gold text-brand-dark shadow-glow",
        success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        danger: "bg-red-500/10 text-red-400 border border-red-500/20",
        info: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
        purple: "bg-purple-500/10 text-purple-400 border border-purple-500/20"
    };

    const style = gradients[color] || gradients.primary;

    return (
        <Card
            className={`relative overflow-hidden group cursor-pointer border-brand-primary/10 hover:border-brand-primary/30 ${className}`}
            onClick={onClick}
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                <Icon size={80} strokeWidth={1.5} />
            </div>

            <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${style} transition-transform group-hover:scale-110 duration-500`}>
                    <Icon size={24} strokeWidth={2} />
                </div>

                <h3 className="text-gray-500 dark:text-brand-light/70 font-medium text-sm mb-1 uppercase tracking-wider">{title}</h3>

                {loading ? (
                    <div className="h-10 w-32 bg-brand-light/10 animate-pulse rounded-lg" />
                ) : (
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl md:text-4xl font-serif font-bold text-brand-dark dark:text-brand-light tracking-tight drop-shadow-sm">{value}</span>
                    </div>
                )}

                <p className="text-xs text-brand-light/60 font-medium mt-3 flex items-center gap-1">
                    {subtitle.includes('!') ? (
                        <span className="text-brand-danger font-bold bg-brand-danger/10 px-2 py-0.5 rounded-full border border-brand-danger/20 animate-pulse">{subtitle}</span>
                    ) : (
                        subtitle
                    )}
                </p>
            </div>
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-secondary opacity-0 group-hover:opacity-10 blur transition duration-500" />
        </Card>
    );
};

// Standard Colors for Charts - Premium Palette
const COLORS = ['#D4AF37', '#A16207', '#E5E5E5', '#52525B', '#27272A', '#CA8A04'];

// Custom Tooltip Component for Charts
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-3 rounded-xl shadow-lg min-w-[150px]">
                <p className="font-bold text-gray-900 dark:text-gray-100 mb-2 border-b border-gray-100 dark:border-white/10 pb-1">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 text-sm py-1">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-2.5 h-2.5 rounded-full ring-2 ring-white/10"
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-gray-600 dark:text-gray-400 font-medium capitalize">
                                {entry.name}:
                            </span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums">
                            {typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR') : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const Dashboard = () => {
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const { currency } = useTheme();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);

    // Filters State
    const [dateRange, setDateRange] = useState('30'); // '7', '30', '90', 'THIS_MONTH', 'LAST_MONTH'
    const [selectedCategory, setSelectedCategory] = useState('ALL');

    const [rawData, setRawData] = useState({
        products: [],
        movements: [],
        batches: [],
        categories: []
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [products, movements, batches, categories, expiringBatches] = await Promise.all([
                api.products.list(),
                api.movements.list(),
                api.batches.list(),
                api.categories.list(),
                api.batches.listExpiring(30)
            ]);
            setRawData({ products, movements, batches, categories });

            // Alerta Automático de Validade (Feature 10)
            if (!sessionStorage.getItem('evobit-expiry-alert-shown') && expiringBatches.length > 0) {
                sessionStorage.setItem('evobit-expiry-alert-shown', 'true');
                toast(
                    <div className="flex flex-col gap-1">
                        <span className="font-bold text-amber-600 flex items-center gap-2">
                            <Clock size={16} /> Lotes Próximos do Vencimento
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                            Há <strong>{expiringBatches.length} lote(s)</strong> vencendo nos próximos 30 dias.
                        </span>
                    </div>,
                    { 
                        duration: 10000, 
                        style: { background: 'var(--bg-card)', borderColor: 'rgb(245, 158, 11)', borderWidth: 1 } 
                    }
                );
            }

        } catch (error) {
            console.error("Erro ao carregar dashboard:", error);
            toast.error(t('common', 'error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        (async () => {
            await loadData();
        })();
    }, [loadData]);

    const _handleGenerateTestData = async () => {
        if (!user || !user.id) {
            toast.error("Usuário não identificado para gerar dados.");
            return;
        }

        try {
            setLoading(true);
            const db = await getDatabase();
            const now = new Date();

            // 1. Create Test Product
            const productId = uuidv4();
            await db.products.insert({
                id: productId,
                name: 'Produto Teste Dashboard',
                barcode: 'TEST-' + Math.floor(Math.random() * 1000),
                price: 100,
                cost_price: 50,
                current_stock: 50,
                min_stock: 10,
                category: 'Testes',
                user_id: user.id, // REQUIRED FOR SYNC
                updated_at: now.toISOString()
            });

            // 2. Create Movements (IN/OUT/ADJUSTMENT)
            const movements = [];
            const types = ['IN', 'OUT', 'ADJUSTMENT'];

            for (let i = 0; i < 5; i++) {
                const date = new Date(now);
                date.setDate(date.getDate() - i); // Today, yesterday, etc.
                const type = types[i % 3];
                const qty = 10 * (i + 1);

                movements.push({
                    id: uuidv4(),
                    product_id: productId,
                    type: type, // Raw type
                    quantity: qty, // FIXED: Schema expects 'quantity'
                    date: date.toISOString(),
                    reason: 'Teste Automático',
                    user_id: user.id, // REQUIRED FOR SYNC
                    updated_at: date.toISOString()
                });
            }

            await db.movements.bulkInsert(movements);
            toast.success("Dados de teste gerados! Atualizando...");
            // Assuming fetchDashboardData is a function that reloads data, similar to loadData
            // If not, you might need to call loadData() directly or define fetchDashboardData
            loadData();
        } catch (error) {
            console.error("ERRO DETALHADO AO GERAR DADOS:", error);
            // Log RxDB specific errors if available
            if (error.rxdb) {
                console.error("RxDB Error:", error.parameters);
            }
            toast.error(`Erro ao gerar dados: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Filter Logic and Stats Calculation (Memoized)
    const stats = useMemo(() => {
        const { products, movements } = rawData;
        let filteredProducts = products;
        let filteredMovements = movements;
        const now = new Date();

        // 1. Category Filter
        if (selectedCategory !== 'ALL') {
            filteredProducts = products.filter(p => p.category === selectedCategory);
            // Also filter movements for products in this category
            // (Assuming movements have productId, we check against the filtered products list ids)
            const allowedProductIds = new Set(filteredProducts.map(p => p.id));
            filteredMovements = movements.filter(m => allowedProductIds.has(m.product_id));
        }

        // 2. Date Range Filter (Applies ONLY to Movements-based stats)
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0); // Normalize to start of day

        if (dateRange === '7') startDate.setDate(startDate.getDate() - 7);
        if (dateRange === '30') startDate.setDate(startDate.getDate() - 30);
        if (dateRange === '90') startDate.setDate(startDate.getDate() - 90);
        if (dateRange === 'THIS_MONTH') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        if (dateRange === 'LAST_MONTH') {
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        }

        const statsMovements = filteredMovements.filter(m => {
            const dateToParse = m.date || m.created_at; // Fallback to created_at
            if (!dateToParse) return false;
            const mDate = new Date(dateToParse);
            if (dateRange === 'LAST_MONTH') {
                const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                return mDate >= start && mDate <= end;
            }
            return mDate >= startDate;
        });


        // --- CALCULATIONS ---

        // KPI 1 & 2: Stock Snapshot (Current State - filtered by category only)
        const totalProducts = filteredProducts.length;
        const totalStockItems = filteredProducts.reduce((acc, p) => acc + parseCurrency(p.current_stock), 0);
        const lowStockCount = filteredProducts.filter(p => parseCurrency(p.current_stock) <= parseCurrency(p.min_stock)).length;
        // KPI: Total Investment (Patrimônio) based on average cost or cost price
        const totalInvestment = filteredProducts.reduce((acc, p) => {
            const qty = parseCurrency(p.current_stock) || 0;
            const cost = parseCurrency(p.average_cost) || parseCurrency(p.cost_price) || 0;
            return acc + (qty * cost);
        }, 0);

        // KPI 3: Expiring Batches
        const filteredProductIds = new Set(filteredProducts.map(p => p.id));
        const relevantBatches = (rawData.batches || []).filter(b =>
            filteredProductIds.has(b.product_id) &&
            (!b.deleted_at || b.deleted_at === '') &&
            b.quantity > 0
        );

        const today = new Date();
        const expiringCount = relevantBatches.filter(b => {
            if (!b.expiration_date || b.expiration_date === '') return false;
            const expDate = new Date(b.expiration_date);
            const diffTime = expDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays <= 30;
        }).length;

        // Chart 1: Movements Flow (grouped by date within range)
        const dateMap = {};
        const daysToView = dateRange === '7' ? 7 : (dateRange === '90' ? 90 : 30); // Default to 30 for others

        // 1. Initialize map with ALL dates in range
        for (let i = daysToView - 1; i >= 0; i--) {
            // Normalize to Noon to avoid timezone rollover issues
            const d = new Date();
            d.setDate(now.getDate() - i);
            d.setHours(12, 0, 0, 0);
            const key = d.toISOString().split('T')[0];
            // Display Label: DD/MM
            const label = d.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit' });

            dateMap[key] = {
                name: label,
                timestamp: d.getTime(),
                entradas: 0,
                saidas: 0
            };
        }

        // 2. Populate with actual data
        statsMovements.forEach(m => {
            const dateToParse = m.date || m.created_at; // Fallback to created_at
            if (!dateToParse) return;
            // Normalize to Noon to avoid timezone rollover issues
            const dateObj = new Date(dateToParse);
            dateObj.setHours(12, 0, 0, 0);
            const key = dateObj.toISOString().split('T')[0];

            if (dateMap[key]) {
                const safeQty = parseCurrency(m.quantity); // FIXED: Use 'quantity'

                if (m.rawType === 'IN' || m.type === 'Entrada') {
                    dateMap[key].entradas += safeQty;
                } else if (m.rawType === 'OUT' || m.type === 'Saída') {
                    dateMap[key].saidas += safeQty;
                } else if (m.rawType === 'ADJUSTMENT' || m.type === 'Ajuste') {
                    // Logic: Positive adjustment = IN, Negative (if supported) = OUT, but typically adjustments are absolute corrections.
                    // Assuming positive qty in movement means "added", but if it's a correction we need to know direction.
                    // For now, let's assume specific business logic:
                    // If we don't have direction, we might skip or assume IN if positive.
                    // Let's treat it as IN for positive, OUT for 'Saída' equivalent if we had it.
                    // However, in this system, adjustments might just be 'changes'.
                    // Let's map it:
                    dateMap[key].entradas += safeQty; // Simplified for visibility, verifying data flow
                }
            }
        });

        const movementsData = Object.values(dateMap).sort((a, b) => a.timestamp - b.timestamp);


        // Chart 2: Category Distribution (Snapshot of Stock)
        const catMap = {};
        filteredProducts.forEach(p => {
            const cat = p.category || t('common', 'categories.others');
            catMap[cat] = (catMap[cat] || 0) + parseCurrency(p.current_stock);
        });
        const categoryData = Object.keys(catMap).map(key => ({ name: key, value: catMap[key] }));

        // Chart 3: Exit Reasons
        const reasonMap = {};
        statsMovements.filter(m => m.rawType === 'OUT' || m.type === 'Saída').forEach(m => {
            const reason = m.reason || 'Não especificado';
            reasonMap[reason] = (reasonMap[reason] || 0) + parseCurrency(m.quantity);
        });
        const exitReasonsData = Object.keys(reasonMap).map(key => ({ name: key, value: reasonMap[key] }));

        // Chart 4: Top Movers
        const moversMap = {};
        statsMovements.forEach(m => {
            const prodName = m.productName || 'Desconhecido';
            moversMap[prodName] = (moversMap[prodName] || 0) + parseCurrency(m.quantity);
        });
        const topMoversData = Object.entries(moversMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, value]) => ({ name, value }));

        // Recent Activity
        const recentActivity = statsMovements.slice(0, 7);

        return {
            totalProducts,
            totalStockItems,
            lowStockCount,
            totalInvestment,
            expiringCount,
            movementsData,
            categoryData,
            exitReasonsData,
            topMoversData,
            recentActivity
        };

    }, [rawData, dateRange, selectedCategory, t, language]);

    return (
        <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-10">
            {/* Header with Filters */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white/80 dark:bg-brand-dark/5 border border-gray-100 dark:border-brand-light/10 p-6 rounded-[2rem] shadow-glass backdrop-blur-md">
                <div>
                    <h2 className="text-3xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">Dashboard</h2>
                    <p className="text-gray-500 dark:text-brand-light/60 font-medium">{t('dashboard', 'subtitle')}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                    {/* <Button onClick={handleGenerateTestData} variant="outline" className="h-11 border-dashed">
                        🛠️ Gerar Dados Teste
                    </Button> */}
                    {/* Category Filter */}
                    <div className="relative min-w-[200px] group">
                        <Tag className="absolute left-3 top-3 text-brand-primary/60 group-hover:text-brand-primary transition-colors" size={16} />
                        <select
                            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-brand-dark/5 border border-gray-200 dark:border-brand-light/10 rounded-xl text-sm text-brand-dark dark:text-white focus:border-brand-primary/50 focus:shadow-glow outline-none appearance-none cursor-pointer transition-all shadow-sm font-bold"
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                        >
                            <option value="ALL" className="bg-white dark:bg-brand-dark text-gray-800 dark:text-white">{t('dashboard', 'allCategories')}</option>
                            {(rawData.categories || []).map(cat => (
                                <option key={cat.id} value={cat.name} className="bg-white dark:bg-brand-dark text-gray-800 dark:text-white">{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Date Range Filter */}
                    <div className="relative min-w-[200px] group">
                        <Calendar className="absolute left-3 top-3 text-brand-primary/60 group-hover:text-brand-primary transition-colors" size={16} />
                        <select
                            className="w-full h-11 pl-10 pr-4 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-brand-dark dark:text-white focus:border-brand-primary/50 focus:shadow-glow outline-none appearance-none cursor-pointer transition-all shadow-sm font-bold"
                            value={dateRange}
                            onChange={e => setDateRange(e.target.value)}
                        >
                            <option value="7" className="bg-white dark:bg-brand-dark text-black dark:text-white">{t('dashboard', 'last7days')}</option>
                            <option value="30" className="bg-white dark:bg-brand-dark text-black dark:text-white">{t('dashboard', 'last30days')}</option>
                            <option value="90" className="bg-white dark:bg-brand-dark text-black dark:text-white">{t('dashboard', 'last90days')}</option>
                            <option value="THIS_MONTH" className="bg-white dark:bg-brand-dark text-black dark:text-white">{t('dashboard', 'thisMonth')}</option>
                            <option value="LAST_MONTH" className="bg-white dark:bg-brand-dark text-black dark:text-white">{t('dashboard', 'lastMonth')}</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* KPI Grid - Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div onClick={() => navigate('/app/produtos')} className="relative overflow-hidden group cursor-pointer border-brand-primary/10 hover:border-brand-primary/30 bg-white dark:bg-black/20 backdrop-blur-md rounded-[2rem] border p-6 transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1">
                    <div className="relative z-10 text-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mx-auto group-hover:scale-110 transition-transform duration-500">
                            <DollarSign size={24} strokeWidth={2} />
                        </div>
                        <h3 className="text-gray-500 dark:text-gray-400 font-bold text-xs mb-2 uppercase tracking-wider">{t('dashboard', 'equity')}</h3>
                        {loading ? (
                            <div className="h-10 w-32 bg-gray-200 dark:bg-white/5 animate-pulse rounded-lg mx-auto" />
                        ) : (
                            <span className="text-3xl md:text-4xl font-serif font-bold text-emerald-500 dark:text-emerald-400 tracking-tight drop-shadow-sm block">
                                {formatCurrency(stats.totalInvestment, currency)}
                            </span>
                        )}
                        <p className="text-xs text-gray-400 dark:text-white/40 font-medium mt-2">{t('dashboard', 'baseValue')}</p>
                    </div>
                </div>

                <div onClick={() => navigate('/app/estoque', { state: { filterStatus: 'EXPIRING' } })} className="relative overflow-hidden group cursor-pointer border-brand-primary/10 hover:border-brand-primary/30 bg-white dark:bg-black/20 backdrop-blur-md rounded-[2rem] border p-6 transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1">
                    <div className="relative z-10 text-center">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-500 ${stats.expiringCount > 0 ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"}`}>
                            <Clock size={24} strokeWidth={2} />
                        </div>
                        <h3 className="text-gray-500 dark:text-gray-400 font-bold text-xs mb-2 uppercase tracking-wider">{t('dashboard', 'expiring')}</h3>
                        {loading ? (
                            <div className="h-10 w-32 bg-gray-200 dark:bg-white/5 animate-pulse rounded-lg mx-auto" />
                        ) : (
                            <span className={`text-3xl md:text-4xl font-serif font-bold tracking-tight drop-shadow-sm block ${stats.expiringCount > 0 ? "text-red-500 dark:text-red-400" : "text-blue-500 dark:text-blue-400"}`}>
                                {stats.expiringCount}
                            </span>
                        )}
                        <p className="text-xs text-brand-light/60 font-medium mt-2">
                            {stats.expiringCount > 0 ? <span className="text-red-500 font-bold">{t('dashboard', 'itemsExpiring')}</span> : t('dashboard', 'noRisk')}
                        </p>
                    </div>
                </div>

                <div onClick={() => navigate('/app/estoque', { state: { filterStatus: 'LOW_STOCK' } })} className="relative overflow-hidden group cursor-pointer border-brand-primary/10 hover:border-brand-primary/30 bg-white dark:bg-black/20 backdrop-blur-md rounded-[2rem] border p-6 transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1">
                    <div className="relative z-10 text-center">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-500 ${stats.lowStockCount > 0 ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"}`}>
                            <AlertTriangle size={24} strokeWidth={2} />
                        </div>
                        <h3 className="text-gray-500 dark:text-gray-400 font-bold text-xs mb-2 uppercase tracking-wider">{t('dashboard', 'stockAlert')}</h3>
                        {loading ? (
                            <div className="h-10 w-32 bg-gray-200 dark:bg-white/5 animate-pulse rounded-lg mx-auto" />
                        ) : (
                            <span className={`text-3xl md:text-4xl font-serif font-bold tracking-tight drop-shadow-sm block ${stats.lowStockCount > 0 ? "text-amber-500 dark:text-amber-400" : "text-emerald-500 dark:text-emerald-400"}`}>
                                {stats.lowStockCount}
                            </span>
                        )}
                        <p className="text-xs text-brand-light/60 font-medium mt-2">
                            {stats.lowStockCount > 0 ? <span className="text-amber-500 font-bold">{t('dashboard', 'itemsLow')}</span> : t('dashboard', 'stockHealthy')}
                        </p>
                    </div>
                </div>

                <div onClick={() => navigate('/app/historico')} className="relative overflow-hidden group cursor-pointer border-brand-primary/10 hover:border-brand-primary/30 bg-white dark:bg-black/20 backdrop-blur-md rounded-[2rem] border p-6 transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1">
                    <div className="relative z-10 text-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-purple-500/10 text-purple-400 border border-purple-500/20 mx-auto group-hover:scale-110 transition-transform duration-500">
                            <Activity size={24} strokeWidth={2} />
                        </div>
                        <h3 className="text-gray-500 dark:text-gray-400 font-bold text-xs mb-2 uppercase tracking-wider">{t('dashboard', 'movements')}</h3>
                        {loading ? (
                            <div className="h-10 w-32 bg-gray-200 dark:bg-white/5 animate-pulse rounded-lg mx-auto" />
                        ) : (
                            <span className="text-3xl md:text-4xl font-serif font-bold text-purple-500 dark:text-purple-400 tracking-tight drop-shadow-sm block">
                                {stats.movementsData.reduce((acc, d) => acc + d.entradas + d.saidas, 0)}
                            </span>
                        )}
                        <p className="text-xs text-gray-400 dark:text-white/40 font-medium mt-2">{t('dashboard', 'inPeriod')}</p>
                    </div>
                </div>
            </div>

            {/* Row 2: Flow & Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Flow Chart */}
                <Card className="lg:col-span-2 min-h-[400px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-brand-light text-lg flex items-center gap-2">
                                <TrendingUp size={20} className="text-brand-primary" />
                                {t('dashboard', 'stockFlow')}
                            </h3>
                            <p className="text-sm text-gray-400 dark:text-brand-light/40">{t('dashboard', 'inOutPeriod')}</p>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: 300, minHeight: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.movementsData}>
                                <defs>
                                    <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#A16207" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#A16207" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717A', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#71717A', fontSize: 12 }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend
                                    wrapperStyle={{ paddingTop: '20px' }}
                                    formatter={(value) => <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-1">{value}</span>}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="entradas"
                                    name="Entrada"
                                    stroke="#D4AF37"
                                    fillOpacity={1}
                                    fill="url(#colorEntradas)"
                                    strokeWidth={2}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#D4AF37' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="saidas"
                                    name="Saída"
                                    stroke="#A16207"
                                    fillOpacity={1}
                                    fill="url(#colorSaidas)"
                                    strokeWidth={2}
                                    activeDot={{ r: 6, strokeWidth: 0, fill: '#A16207' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Categories Donut */}
                <Card className="flex flex-col">
                    <h3 className="font-bold text-gray-900 dark:text-brand-light text-lg mb-2 flex items-center gap-2">
                        <PieIcon size={20} className="text-brand-secondary" />
                        {t('dashboard', 'byCategory')}
                    </h3>
                    <p className="text-sm text-gray-400 dark:text-brand-light/40 mb-6">{t('dashboard', 'distribution')}</p>

                    <div className="flex-1 min-h-[250px] relative" style={{ minHeight: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={75}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {stats.categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E4E4E7', color: '#18181B' }} itemStyle={{ color: '#18181B' }} />
                                <Legend verticalAlign="bottom" height={36} formatter={(value) => <span style={{ color: '#A1A1AA' }}>{value}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Center Text */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center z-10 pointer-events-none">
                                <span className="text-3xl font-serif font-bold text-black dark:text-white block">{stats.totalStockItems}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('dashboard', 'total')}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Row 3: Top Movers & Exit Reasons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Movers Bar Chart */}
                <Card>
                    <h3 className="font-bold text-gray-900 dark:text-brand-light text-lg mb-2 flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-400" />
                        {t('dashboard', 'topMovers')}
                    </h3>
                    <p className="text-sm text-gray-400 dark:text-brand-light/40 mb-6">{t('dashboard', 'top5')}</p>
                    <div style={{ width: '100%', height: 300, minHeight: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.topMoversData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: '#A1A1AA' }} />
                                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E4E4E7', color: '#18181B' }} itemStyle={{ color: '#18181B' }} />
                                <Bar dataKey="value" fill="#D4AF37" radius={[0, 4, 4, 0]} barSize={20} name={t('dashboard', 'qty')} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Exit Reasons List/Chart */}
                <Card>
                    <h3 className="font-bold text-gray-900 dark:text-brand-light text-lg mb-2 flex items-center gap-2">
                        <Activity size={20} className="text-brand-danger" />
                        {t('dashboard', 'stockDestiny')}
                    </h3>
                    <p className="text-sm text-gray-400 dark:text-brand-light/40 mb-6">{t('dashboard', 'exitReasons')}</p>

                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="w-full md:w-1/2" style={{ height: 300, minHeight: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.exitReasonsData.length > 0 ? stats.exitReasonsData : [{ name: 'Sem dados', value: 1 }]}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={55}
                                        innerRadius={30}
                                        fill="#8884d8"
                                        dataKey="value"
                                        stroke="none"
                                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                                    >
                                        {stats.exitReasonsData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderRadius: '8px', border: '1px solid #E4E4E7', color: '#18181B' }} itemStyle={{ color: '#18181B' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 space-y-3 pr-2">
                            {stats.exitReasonsData.map((item, index) => (
                                <div key={index} className="flex justify-between items-center p-2 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-500">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-brand-dark dark:text-brand-light">{item.value}</span>
                                </div>
                            ))}
                            {stats.exitReasonsData.length === 0 && (
                                <p className="text-center text-gray-500 italic">{t('dashboard', 'noExits')}</p>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* Recent Activity Feed */}
            <Card>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-lg mb-6 flex items-center gap-2">
                    <Clock size={20} className="text-gray-400" />
                    {t('dashboard', 'recentActivity')}
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-white/10 text-gray-400 dark:text-brand-light/40 uppercase text-xs tracking-wider">
                                <th className="pb-4 pl-2 font-medium">{t('dashboard', 'type')}</th>
                                <th className="pb-4 font-medium">{t('dashboard', 'product')}</th>
                                <th className="pb-4 text-center font-medium">{t('dashboard', 'qty')}</th>
                                <th className="pb-4 font-medium">{t('dashboard', 'detail')}</th>
                                <th className="pb-4 text-right pr-2 font-medium">{t('dashboard', 'dateTime')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {stats.recentActivity.map((m) => (
                                <tr key={m.id} className="hover:bg-brand-primary/5 transition-colors group">
                                    <td className="py-4 pl-2">
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${m.type === 'Entrada' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {m.type === 'Entrada' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                                            {m.type === 'Entrada' ? t('movements', 'entry') : t('movements', 'exit')}
                                        </span>
                                    </td>
                                    <td className="py-4 font-medium text-gray-900 dark:text-gray-100 group-hover:text-brand-primary transition-colors">
                                        {m.productName}
                                    </td>
                                    <td className="py-4 text-center font-bold text-gray-700 dark:text-brand-light/80">
                                        {m.qty}
                                    </td>
                                    <td className="py-4 text-gray-500 text-xs">
                                        {m.type === 'Entrada' ? (m.provider || 'Fornecedor não inf.') : m.reason}
                                    </td>
                                    <td className="py-4 text-right pr-2 text-gray-500 text-xs font-mono">
                                        {m.dateStr} <span className="opacity-50">|</span> {m.timeStr}
                                    </td>
                                </tr>
                            ))}
                            {stats.recentActivity.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="py-12 text-center text-gray-500">
                                        {t('dashboard', 'noActivity')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div >
    );
};

export default Dashboard;
