import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card } from '../components/ui/Card';
import { api } from '../services/api';
import { toast } from 'sonner';
import clsx from 'clsx';
import { formatCurrency } from '../utils/formatters';
import {
    FileText, Download, Loader2, AlertTriangle, Package, TrendingDown, TrendingUp,
    BarChart3, Clock, Printer, Flame, Eye, ArrowLeftRight, RotateCcw,
    ClipboardList, Calendar, Tag, DollarSign, AlertCircle, Search, ChevronRight,
    ArrowUp, ArrowDown, ShieldAlert, PackageX, Timer, ArrowUpDown, CalendarDays, Filter, PieChart as PieIcon,
    ScanLine, CheckCircle2, XCircle
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell, PieChart, Pie, AreaChart, Area, Legend
} from 'recharts';
import { useParams, useLocation } from 'react-router-dom';

// ─── Constants ───────────────────────────────────────────────
const COLORS = ['#D4AF37', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899', '#14B8A6', '#6366F1', '#F97316'];
const ABC_COLORS = { A: '#D4AF37', B: '#3B82F6', C: '#71717A' };

// ─── Custom Tooltip ──────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-3 rounded-xl shadow-lg min-w-[160px]">
                <p className="font-bold text-gray-900 dark:text-gray-100 mb-2 border-b border-gray-100 dark:border-white/10 pb-1 text-sm">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 text-sm py-0.5">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-gray-500 dark:text-gray-400 text-xs">{entry.name}:</span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums text-xs">
                            {typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR') : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const CurrencyTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-3 rounded-xl shadow-lg min-w-[160px]">
                <p className="font-bold text-gray-900 dark:text-gray-100 mb-2 border-b border-gray-100 dark:border-white/10 pb-1 text-sm">{label}</p>
                {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 text-sm py-0.5">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-gray-500 dark:text-gray-400 text-xs">{entry.name}:</span>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-gray-100 tabular-nums text-xs">
                            {formatCurrency(entry.value)}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

// ─── KPI Card ────────────────────────────────────────────────
const KPICard = ({ title, value, icon: Icon, color, subtitle }) => {
    const colorStyles = {
        emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        amber: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        red: 'bg-red-500/10 text-red-500 border-red-500/20',
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
        brand: 'bg-brand-primary/10 text-brand-primary border-brand-primary/20',
    };
    return (
        <div className="bg-white dark:bg-[#121212]/60 rounded-2xl border border-gray-100 dark:border-white/5 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 group">
            <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-3 border transition-transform group-hover:scale-110 duration-300", colorStyles[color] || colorStyles.brand)}>
                <Icon size={20} />
            </div>
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">{title}</span>
            <span className="text-2xl font-bold text-gray-900 dark:text-white block tracking-tight">{value}</span>
            {subtitle && <span className="text-xs text-gray-400 mt-1 block">{subtitle}</span>}
        </div>
    );
};

// ─── Section Header ──────────────────────────────────────────
const SectionHeader = ({ title, subtitle, onExport, onPrint, children }) => (
    <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <div className="flex gap-2 items-center">
            {children}
            {onPrint && (
                <button onClick={onPrint} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <Printer size={16} /> Imprimir
                </button>
            )}
            {onExport && (
                <button onClick={onExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors shadow-sm">
                    <Download size={16} /> Exportar
                </button>
            )}
        </div>
    </div>
);

// ─── Empty State ─────────────────────────────────────────────
const EmptyState = ({ icon: Icon, message }) => (
    <Card className="!p-10 text-center text-gray-400">
        <Icon size={44} className="mx-auto mb-3 opacity-20" />
        <p className="text-sm">{message}</p>
    </Card>
);

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
const Reports = ({ standalone = false }) => {
    const { tab } = useParams();
    const location = useLocation();
    const [products, setProducts] = useState([]);
    const [movements, setMovements] = useState([]);
    const [batches, setBatches] = useState([]);
    const [categories, setCategories] = useState([]);
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [activeTab, setActiveTab] = useState(tab || 'menu');
    const [dateRange, setDateRange] = useState('30');
    const [selectedCategory, setSelectedCategory] = useState('ALL');

    // Sub-filters
    const [criticalSubTab, setCriticalSubTab] = useState('low');
    const [movTypeFilter, setMovTypeFilter] = useState('ALL');
    const [turnoverDays, setTurnoverDays] = useState(30);
    const [movSearch, setMovSearch] = useState('');

    // Reset to menu on sidebar click (same route navigation)
    useEffect(() => {
        if (!standalone && !tab) {
            setActiveTab('menu');
        }
    }, [location.key, standalone, tab]);

    // Global Date Range Extras
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');

    const [lossSearch, setLossSearch] = useState('');
    const [lossSortBy, setLossSortBy] = useState('value'); // 'name','category','qty','value','date'
    const [lossSortDir, setLossSortDir] = useState('desc'); // 'asc','desc'
    const [lossPage, setLossPage] = useState(1);
    const LOSS_PER_PAGE = 10;

    // --- State: Inventory Counting -- 
    const [scanInput, setScanInput] = useState('');
    const [inventoryCounts, setInventoryCounts] = useState({});
    const scannerInputRef = useRef(null);

    // Initial Data Loadss pagination when filters change
    useEffect(() => { setLossPage(1); }, [dateRange, customDateFrom, customDateTo, lossSearch, lossSortBy, lossSortDir]);

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [prods, movs, bats, cats, provs] = await Promise.all([
                api.products.list(),
                api.movements.list(),
                api.batches.list(),
                api.categories.list(),
                api.providers.list()
            ]);
            setProducts(prods.data || prods);
            setMovements(movs || []);
            setBatches(bats || []);
            setCategories(cats || []);
            setProviders(provs || []);
        } catch (error) {
            console.error('Error loading reports data:', error);
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    // ─── Date Filter Logic ───────────────────────────────────
    const dateFilteredMovements = useMemo(() => {
        const now = new Date();
        let startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        if (dateRange === 'TODAY') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        else if (dateRange === 'YESTERDAY') startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        else if (dateRange === '7') startDate.setDate(startDate.getDate() - 7);
        else if (dateRange === '30') startDate.setDate(startDate.getDate() - 30);
        else if (dateRange === '90') startDate.setDate(startDate.getDate() - 90);
        else if (dateRange === 'THIS_MONTH') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        else if (dateRange === 'LAST_MONTH') startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        return movements.filter(m => {
            const d = m.date || m.created_at;
            if (!d) return false;
            const mDate = new Date(d);

            if (dateRange === 'YESTERDAY') {
                const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
                return mDate >= startDate && mDate <= end;
            }
            if (dateRange === 'LAST_MONTH') {
                const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                return mDate >= startDate && mDate <= end;
            }
            if (dateRange === 'CUSTOM') {
                if (!customDateFrom && !customDateTo) return true;
                if (customDateFrom && mDate < new Date(`${customDateFrom}T00:00:00`)) return false;
                if (customDateTo && mDate > new Date(`${customDateTo}T23:59:59`)) return false;
                return true;
            }
            return mDate >= startDate;
        });
    }, [movements, dateRange, customDateFrom, customDateTo]);

    // ─── Category Filter ─────────────────────────────────────
    const filteredProducts = useMemo(() => {
        if (selectedCategory === 'ALL') return products;
        return products.filter(p => p.category === selectedCategory);
    }, [products, selectedCategory]);

    const filteredProductIds = useMemo(() => new Set(filteredProducts.map(p => p.id)), [filteredProducts]);

    const filteredMovements = useMemo(() => {
        if (selectedCategory === 'ALL') return dateFilteredMovements;
        return dateFilteredMovements.filter(m => filteredProductIds.has(m.product_id));
    }, [dateFilteredMovements, selectedCategory, filteredProductIds]);

    // ═════════════════════════════════════════════════════════
    // COMPUTED DATA
    // ═════════════════════════════════════════════════════════

    // ─── Global KPIs ─────────────────────────────────────────
    const globalKPIs = useMemo(() => {
        const totalEquity = filteredProducts.reduce((acc, p) => {
            const cost = Number(p.average_cost || p.cost_price || 0);
            return acc + (Number(p.current_stock || 0) * cost);
        }, 0);
        const totalProducts = filteredProducts.length;
        const lowStockCount = filteredProducts.filter(p => {
            const min = Number(p.min_stock || 0);
            return min > 0 && Number(p.current_stock || 0) <= min;
        }).length;
        const zeroStockCount = filteredProducts.filter(p => Number(p.current_stock || 0) <= 0 && Number(p.min_stock || 0) > 0).length;

        // Stale value
        const now = new Date();
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const staleProducts = filteredProducts.filter(p => {
            if (Number(p.current_stock || 0) <= 0) return false;
            if (!p.last_sale_date) return true;
            return new Date(p.last_sale_date) < thirtyDaysAgo;
        });
        const staleValue = staleProducts.reduce((acc, p) => acc + Number(p.current_stock || 0) * Number(p.average_cost || p.cost_price || 0), 0);

        return { totalEquity, totalProducts, lowStockCount, zeroStockCount, staleValue, staleCount: staleProducts.length };
    }, [filteredProducts]);

    // ─── Overview Data ───────────────────────────────────────
    const overviewData = useMemo(() => {
        // Movements flow by day
        const now = new Date();
        const daysToView = dateRange === '7' ? 7 : (dateRange === '90' ? 90 : 30);
        const dateMap = {};
        for (let i = daysToView - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(now.getDate() - i);
            d.setHours(12, 0, 0, 0);
            const key = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            dateMap[key] = { name: label, ts: d.getTime(), entradas: 0, saidas: 0 };
        }
        filteredMovements.forEach(m => {
            const d = m.date || m.created_at;
            if (!d) return;
            const dateObj = new Date(d);
            dateObj.setHours(12, 0, 0, 0);
            const key = dateObj.toISOString().split('T')[0];
            if (dateMap[key]) {
                const qty = Number(m.quantity || 0);
                if (m.rawType === 'IN' || m.type === 'Entrada') dateMap[key].entradas += qty;
                else if (m.rawType === 'OUT' || m.type === 'Saída') dateMap[key].saidas += qty;
                else dateMap[key].entradas += qty;
            }
        });
        const flowData = Object.values(dateMap).sort((a, b) => a.ts - b.ts);

        // Category distribution
        const catMap = {};
        filteredProducts.forEach(p => {
            const cat = p.category || 'Sem Categoria';
            const val = Number(p.current_stock || 0) * Number(p.average_cost || p.cost_price || 0);
            catMap[cat] = (catMap[cat] || 0) + val;
        });
        const categoryData = Object.entries(catMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // Top 10 by stock value
        const topByValue = filteredProducts
            .map(p => ({
                name: p.name.length > 25 ? p.name.slice(0, 25) + '…' : p.name,
                value: Number(p.current_stock || 0) * Number(p.average_cost || p.cost_price || 0)
            }))
            .filter(p => p.value > 0)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        const totalEntradas = filteredMovements.filter(m => m.rawType === 'IN' || m.type === 'Entrada').reduce((s, m) => s + Number(m.quantity || 0), 0);
        const totalSaidas = filteredMovements.filter(m => m.rawType === 'OUT' || m.type === 'Saída').reduce((s, m) => s + Number(m.quantity || 0), 0);

        return { flowData, categoryData, topByValue, totalEntradas, totalSaidas };
    }, [filteredProducts, filteredMovements, dateRange]);

    // ─── Critical Stock ──────────────────────────────────────
    const criticalData = useMemo(() => {
        const lowStock = filteredProducts
            .filter(p => {
                const min = Number(p.min_stock || 0);
                return min > 0 && Number(p.current_stock || 0) <= min && Number(p.current_stock || 0) > 0;
            })
            .sort((a, b) => {
                const rA = Number(a.current_stock || 0) / Math.max(Number(a.min_stock || 1), 1);
                const rB = Number(b.current_stock || 0) / Math.max(Number(b.min_stock || 1), 1);
                return rA - rB;
            });

        const zeroStock = filteredProducts
            .filter(p => Number(p.current_stock || 0) <= 0 && Number(p.min_stock || 0) > 0)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        const now = new Date();
        const expiring = batches
            .filter(b => {
                if (!b.expiration_date || b.expiration_date === '') return false;
                if (b.deleted_at && b.deleted_at !== '') return false;
                if (Number(b.quantity || 0) <= 0) return false;
                if (selectedCategory !== 'ALL') {
                    if (!filteredProductIds.has(b.product_id)) return false;
                }
                const exp = new Date(b.expiration_date);
                const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                return diffDays <= 30;
            })
            .map(b => {
                const product = products.find(p => p.id === b.product_id);
                const exp = new Date(b.expiration_date);
                const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                return {
                    ...b,
                    productName: product?.name || 'Produto removido',
                    category: product?.category || '-',
                    daysLeft: diffDays,
                    expired: diffDays < 0
                };
            })
            .sort((a, b) => a.daysLeft - b.daysLeft);

        return { lowStock, zeroStock, expiring };
    }, [filteredProducts, batches, products, selectedCategory, filteredProductIds]);

    // ─── ABC Curve ───────────────────────────────────────────
    const abcData = useMemo(() => {
        const valued = filteredProducts
            .map(p => ({
                ...p,
                stockValue: Number(p.current_stock || 0) * Number(p.average_cost || p.cost_price || 0)
            }))
            .filter(p => p.stockValue > 0)
            .sort((a, b) => b.stockValue - a.stockValue);

        const totalValue = valued.reduce((acc, p) => acc + p.stockValue, 0);
        let cumulative = 0;

        const classified = valued.map(p => {
            cumulative += p.stockValue;
            const cumulativePercent = (cumulative / totalValue) * 100;
            let classification;
            if (cumulativePercent <= 80) classification = 'A';
            else if (cumulativePercent <= 95) classification = 'B';
            else classification = 'C';
            return { ...p, cumulativePercent, classification, percentOfTotal: (p.stockValue / totalValue) * 100 };
        });

        const summary = ['A', 'B', 'C'].map(cls => {
            const items = classified.filter(p => p.classification === cls);
            const value = items.reduce((s, p) => s + p.stockValue, 0);
            return { cls, items: items.length, value, percent: totalValue > 0 ? (value / totalValue * 100) : 0 };
        });

        return { classified, summary, totalValue };
    }, [filteredProducts]);

    // ─── Movements Report ────────────────────────────────────
    const movementsReport = useMemo(() => {
        let filtered = filteredMovements;
        if (movTypeFilter === 'IN') filtered = filtered.filter(m => m.rawType === 'IN' || m.type === 'Entrada');
        else if (movTypeFilter === 'OUT') filtered = filtered.filter(m => m.rawType === 'OUT' || m.type === 'Saída');

        if (movSearch) {
            const s = movSearch.toLowerCase();
            filtered = filtered.filter(m => (m.productName || '').toLowerCase().includes(s) || (m.reason || '').toLowerCase().includes(s));
        }

        // Top products by movement qty
        const moversMap = {};
        filteredMovements.forEach(m => {
            const name = m.productName || 'Desconhecido';
            moversMap[name] = (moversMap[name] || 0) + Number(m.quantity || 0);
        });
        const topMovers = Object.entries(moversMap)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, value }));

        // Exit reasons
        const reasonMap = {};
        filteredMovements.filter(m => m.rawType === 'OUT' || m.type === 'Saída').forEach(m => {
            const reason = m.reason || 'Não especificado';
            reasonMap[reason] = (reasonMap[reason] || 0) + Number(m.quantity || 0);
        });
        const exitReasons = Object.entries(reasonMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return { filtered: filtered.slice(0, 100), topMovers, exitReasons, total: filtered.length };
    }, [filteredMovements, movTypeFilter, movSearch]);

    // ─── Stock Turnover ──────────────────────────────────────
    const turnoverData = useMemo(() => {
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - turnoverDays);

        const staleProducts = filteredProducts
            .filter(p => {
                if (Number(p.current_stock || 0) <= 0) return false;
                if (!p.last_sale_date) return true;
                return new Date(p.last_sale_date) < cutoff;
            })
            .map(p => {
                const daysSince = p.last_sale_date
                    ? Math.ceil((now - new Date(p.last_sale_date)) / (1000 * 60 * 60 * 24))
                    : 999;
                const value = Number(p.current_stock || 0) * Number(p.average_cost || p.cost_price || 0);
                return { ...p, daysSince, staleValue: value };
            })
            .sort((a, b) => b.staleValue - a.staleValue);

        const totalStaleValue = staleProducts.reduce((s, p) => s + p.staleValue, 0);

        return { staleProducts, totalStaleValue };
    }, [filteredProducts, turnoverDays]);

    // ─── Losses ──────────────────────────────────────────────
    const lossData = useMemo(() => {
        // 1. Filter filteredMovements to only include Loss / Adjustments 
        // (filteredMovements already applies global Date Range and Categories)
        const allLossMovements = filteredMovements.filter(m => {
            if (!((m.type === 'Saída' || m.rawType === 'OUT') &&
                (m.reason === 'Perda/Quebra' || m.reason === 'Ajuste de Estoque' || m.reason === 'Ajuste'))) return false;
            return true;
        });

        // 3. Group by product with category info
        const productMap = {};
        products.forEach(p => { productMap[p.id] = p; });

        const byProduct = {};
        allLossMovements.forEach(m => {
            const key = m.product_id || m.productName;
            const prod = productMap[m.product_id];
            if (!byProduct[key]) {
                byProduct[key] = {
                    productId: m.product_id, // Added to find current stock later
                    productName: m.productName || prod?.name || 'Desconhecido',
                    category: prod?.category || '-',
                    totalQty: 0,
                    totalValue: 0,
                    count: 0,
                    lastDate: null,
                    firstDate: null
                };
            }
            const qty = Number(m.quantity || 0);
            const price = Number(m.cost_unit || m.price || 0);
            byProduct[key].totalQty += qty;
            byProduct[key].totalValue += qty * price;
            byProduct[key].count += 1;
            const mDate = m.date || m.created_at;
            if (mDate) {
                if (!byProduct[key].lastDate || mDate > byProduct[key].lastDate) byProduct[key].lastDate = mDate;
                if (!byProduct[key].firstDate || mDate < byProduct[key].firstDate) byProduct[key].firstDate = mDate;
            }
        });

        // 4. Apply search filter
        let ranked = Object.values(byProduct);
        if (lossSearch) {
            const s = lossSearch.toLowerCase();
            ranked = ranked.filter(r => r.productName.toLowerCase().includes(s) || r.category.toLowerCase().includes(s));
        }

        // 5. Apply sorting
        ranked.sort((a, b) => {
            let cmp = 0;
            switch (lossSortBy) {
                case 'name': cmp = (a.productName || '').localeCompare(b.productName || ''); break;
                case 'category': cmp = (a.category || '').localeCompare(b.category || ''); break;
                case 'qty': cmp = a.totalQty - b.totalQty; break;
                case 'value': cmp = a.totalValue - b.totalValue; break;
                case 'date': {
                    const dA = a.lastDate ? new Date(a.lastDate).getTime() : 0;
                    const dB = b.lastDate ? new Date(b.lastDate).getTime() : 0;
                    cmp = dA - dB;
                    break;
                }
                default: cmp = a.totalValue - b.totalValue;
            }
            return lossSortDir === 'desc' ? -cmp : cmp;
        });

        const totalQty = ranked.reduce((s, r) => s + r.totalQty, 0);
        const totalValue = ranked.reduce((s, r) => s + r.totalValue, 0);

        // 6. Build timeline data for chart
        const timelineMap = {};
        allLossMovements.forEach(m => {
            const d = m.date || m.created_at;
            if (!d) return;
            const dateObj = new Date(d);
            dateObj.setHours(12, 0, 0, 0);
            const key = dateObj.toISOString().split('T')[0];
            const label = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (!timelineMap[key]) timelineMap[key] = { name: label, ts: dateObj.getTime(), quantidade: 0, valor: 0 };
            const qty = Number(m.quantity || 0);
            const price = Number(m.cost_unit || m.price || 0);
            timelineMap[key].quantidade += qty;
            timelineMap[key].valor += qty * price;
        });
        const timeline = Object.values(timelineMap).sort((a, b) => a.ts - b.ts);

        // 7. Category breakdown for pie
        const catBreakdown = {};
        ranked.forEach(r => {
            const cat = r.category || 'Sem Categoria';
            catBreakdown[cat] = (catBreakdown[cat] || 0) + r.totalValue;
        });
        const categoryPie = Object.entries(catBreakdown)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 8. Generate Alerts for high loss ratios (lossQty / current_stock > 10%)
        const alerts = [];
        ranked.forEach(r => {
            const prod = productMap[r.productId || r.productName]; 
            if (prod && Number(prod.current_stock || 0) > 0) {
                const stock = Number(prod.current_stock || 0);
                const ratio = r.totalQty / stock;
                if (ratio >= 0.1) {
                    alerts.push({
                        ...r,
                        currentStock: stock,
                        ratioPercent: (ratio * 100).toFixed(1)
                    });
                }
            }
        });
        alerts.sort((a, b) => b.ratioPercent - a.ratioPercent);

        return { ranked, totalQty, totalValue, totalEvents: allLossMovements.length, timeline, categoryPie, alerts };
    }, [filteredMovements, products, lossSearch, lossSortBy, lossSortDir]);

    // ─── Inventory Summary (Physical Count) ──────────────────
    const inventorySummary = useMemo(() => {
        return filteredProducts
            .filter(p => Number(p.current_stock || 0) > 0 || Number(p.min_stock || 0) > 0)
            .sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || ''));
    }, [filteredProducts]);

    const handleInventoryScan = (e) => {
        if (e.key === 'Enter') {
            const code = scanInput.trim();
            if (!code) return;

            const prod = inventorySummary.find(p => p.barcode === code || p.sku === code || p.id === code);
            if (prod) {
                setInventoryCounts(prev => ({
                    ...prev,
                    [prod.id]: (prev[prod.id] || 0) + 1
                }));
                toast.success(`${prod.name} contabilizado (+1)`);
            } else {
                toast.error(`Código ${code} não encontrado na lista atual`);
            }
            setScanInput(''); // Clear input for next scan
        }
    };

    const updateManualCount = (id, val) => {
        const num = parseInt(val, 10);
        if (isNaN(num) || num < 0) return;
        setInventoryCounts(prev => ({ ...prev, [id]: num }));
    };

    const clearInventoryCounts = () => {
        setInventoryCounts({});
        toast.info("Contagem reiniciada");
    };

    // ═════════════════════════════════════════════════════════
    // EXPORT FUNCTIONS
    // ═════════════════════════════════════════════════════════
    const exportCSV = (data, headers, filename) => {
        if (data.length === 0) { toast.warning('Nenhum dado para exportar'); return; }
        const csv = [headers.join(';'), ...data.map(r => r.join(';'))].join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`${data.length} registros exportados`);
    };

    const exportCritical = () => {
        const data = criticalSubTab === 'low' ? criticalData.lowStock : criticalSubTab === 'zero' ? criticalData.zeroStock : [];
        if (criticalSubTab === 'expiring') {
            exportCSV(
                criticalData.expiring.map(b => [b.productName, b.category, b.quantity, b.daysLeft, b.expired ? 'VENCIDO' : `${b.daysLeft} dias`]),
                ['Produto', 'Categoria', 'Quantidade', 'Dias Restantes', 'Status'],
                'estoque_critico_vencimento'
            );
        } else {
            exportCSV(
                data.map(p => [p.name, p.category || '', p.current_stock, p.min_stock, Number(p.price || 0).toFixed(2)]),
                ['Produto', 'Categoria', 'Estoque Atual', 'Estoque Mínimo', 'Preço'],
                criticalSubTab === 'low' ? 'estoque_baixo' : 'estoque_zerado'
            );
        }
    };

    const exportABC = () => {
        exportCSV(
            abcData.classified.map(p => [p.name, p.classification, p.current_stock, Number(p.stockValue).toFixed(2), p.percentOfTotal.toFixed(1) + '%']),
            ['Produto', 'Classe', 'Estoque', 'Valor em Estoque', '% do Total'],
            'curva_abc'
        );
    };

    const exportMovements = () => {
        exportCSV(
            movementsReport.filtered.map(m => [
                m.productName || '', m.type, m.quantity, m.reason || '',
                m.date ? new Date(m.date).toLocaleDateString('pt-BR') : '-'
            ]),
            ['Produto', 'Tipo', 'Quantidade', 'Motivo', 'Data'],
            'movimentacoes'
        );
    };

    const exportTurnover = () => {
        exportCSV(
            turnoverData.staleProducts.map(p => [p.name, p.category || '', p.current_stock, p.daysSince === 999 ? 'Nunca vendido' : `${p.daysSince} dias`, Number(p.staleValue).toFixed(2)]),
            ['Produto', 'Categoria', 'Estoque', 'Dias Parado', 'Valor Parado'],
            'giro_estoque'
        );
    };

    const exportLosses = () => {
        exportCSV(
            lossData.ranked.map(r => [r.productName, r.category || '-', r.count, r.totalQty, r.totalValue.toFixed(2), r.lastDate ? new Date(r.lastDate).toLocaleDateString('pt-BR') : '-']),
            ['Produto', 'Categoria', 'Ocorrências', 'Qtd. Perdida', 'Valor Perdido (R$)', 'Última Perda'],
            'relatorio_perdas'
        );
    };

    const exportInventory = () => {
        exportCSV(
            inventorySummary.map(p => [p.name, p.sku || '', p.barcode || '', p.category || '', p.current_stock, p.unit || 'UN', p.location || '', '']),
            ['Produto', 'SKU', 'Código de Barras', 'Categoria', 'Estoque Sistema', 'Unidade', 'Localização', 'Contagem Física'],
            'inventario_conferencia'
        );
    };

    const handlePrintInventory = () => {
        const grouped = {};
        inventorySummary.forEach(p => {
            const cat = p.category || 'Sem Categoria';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(p);
        });

        const rows = Object.entries(grouped).map(([cat, items]) => `
            <tr><td colspan="7" style="background:#f0f0f0;font-weight:bold;padding:8px;font-size:13px;border:1px solid #ddd;">${cat} (${items.length})</td></tr>
            ${items.map(p => `<tr>
                <td style="border:1px solid #ddd;padding:5px 8px;">${p.name}</td>
                <td style="border:1px solid #ddd;padding:5px 8px;font-family:monospace;font-size:10px;">${p.sku || '-'}</td>
                <td style="border:1px solid #ddd;padding:5px 8px;font-family:monospace;font-size:10px;">${p.barcode || '-'}</td>
                <td style="border:1px solid #ddd;padding:5px 8px;text-align:center;font-weight:bold;">${p.current_stock || 0}</td>
                <td style="border:1px solid #ddd;padding:5px 8px;text-align:center;">${p.unit || 'UN'}</td>
                <td style="border:1px solid #ddd;padding:5px 8px;">${p.location || '-'}</td>
                <td style="border:1px solid #ddd;padding:5px 8px;width:100px;"></td>
            </tr>`).join('')}
        `).join('');

        const html = `<html><head><title>Inventário - Conferência</title>
        <style>body{font-family:Arial,sans-serif;font-size:11px;padding:20px;}h1{font-size:18px;margin-bottom:5px;}
        .sub{color:#666;font-size:12px;margin-bottom:15px;}table{width:100%;border-collapse:collapse;}
        th{background:#333;color:#fff;padding:8px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:0.5px;}
        @media print{body{padding:0;}}</style></head><body>
        <h1>Relatório de Inventário — Conferência Física</h1>
        <p class="sub">Data: ${new Date().toLocaleDateString('pt-BR')} | Total: ${inventorySummary.length} produtos</p>
        <table><thead><tr><th>Produto</th><th>SKU</th><th>Cód. Barras</th><th>Est. Sistema</th><th>UN</th><th>Local</th><th>Contagem</th></tr></thead>
        <tbody>${rows}</tbody></table></body></html>`;
        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        win.print();
    };

    // ═════════════════════════════════════════════════════════
    // TABS CONFIG
    // ═════════════════════════════════════════════════════════
    const tabs = [
        { id: 'overview', label: 'Visão Geral', icon: Eye, color: 'text-brand-primary' },
        { id: 'critical', label: 'Estoque Crítico', icon: ShieldAlert, count: criticalData.lowStock.length + criticalData.zeroStock.length, color: 'text-amber-500' },
        { id: 'abc', label: 'Curva ABC', icon: BarChart3, count: abcData.classified.length, color: 'text-blue-500' },
        { id: 'movements', label: 'Movimentações', icon: ArrowLeftRight, count: filteredMovements.length, color: 'text-purple-500' },
        { id: 'turnover', label: 'Giro de Estoque', icon: RotateCcw, count: turnoverData.staleProducts.length, color: 'text-orange-500' },
        { id: 'losses', label: 'Perdas', icon: Flame, count: lossData.totalEvents, color: 'text-red-500' },
        { id: 'inventory', label: 'Conferência', icon: ClipboardList, count: inventorySummary.length, color: 'text-emerald-500' },
    ];

    // ═════════════════════════════════════════════════════════
    // RENDER
    // ═════════════════════════════════════════════════════════
    if (loading) {
        return (
            <div className={clsx("flex items-center justify-center min-h-[60vh]", standalone && "min-h-screen bg-gray-50 dark:bg-[#0a0a0a]")}>
                <div className="text-center">
                    <Loader2 className="animate-spin text-brand-primary mx-auto mb-4" size={44} />
                    <p className="text-gray-400 text-sm font-medium">Carregando relatórios...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={clsx("space-y-6 animate-in fade-in duration-500", standalone && "min-h-screen bg-gray-50 dark:bg-[#0a0a0a] p-4 lg:p-6")}>
            {/* ═══ HEADER ═══ */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex items-center gap-4">
                    {activeTab === 'menu' ? (
                        <div>
                            <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <FileText className="text-brand-primary" size={28} />
                                Centro de Relatórios
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Análises completas para gestão de estoque</p>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setActiveTab('menu')}
                            className="group flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-white/5 p-2 pr-4 rounded-xl transition-colors"
                        >
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-[#121212] border border-gray-200 dark:border-white/10 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                                <ChevronRight className="rotate-180 text-gray-500" size={20} />
                            </div>
                            <div className="text-left">
                                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">Voltar ao Menu</p>
                                <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white leading-none">
                                    {tabs.find(t => t.id === activeTab)?.label || 'Relatório'}
                                </h1>
                            </div>
                        </button>
                    )}
                </div>

                {/* Global Filters & Standalone Action */}
                {activeTab !== 'menu' && (
                    <div className="flex flex-wrap items-center gap-3">

                        <div className="relative group">
                            <Tag className="absolute left-3 top-2.5 text-gray-400 group-hover:text-brand-primary transition-colors" size={16} />
                            <select
                                className="h-10 pl-9 pr-4 bg-white dark:bg-[#121212]/60 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:border-brand-primary/50 outline-none cursor-pointer font-medium appearance-none min-w-[160px]"
                                value={selectedCategory}
                                onChange={e => setSelectedCategory(e.target.value)}
                            >
                                <option value="ALL">Todas Categorias</option>
                                {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                            </select>
                        </div>
                        <div className="relative group flex items-center gap-2">
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 text-gray-400 group-hover:text-brand-primary transition-colors" size={16} />
                                <select
                                    className="h-10 pl-9 pr-4 bg-white dark:bg-[#121212]/60 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:border-brand-primary/50 outline-none cursor-pointer font-medium appearance-none min-w-[160px]"
                                    value={dateRange}
                                    onChange={e => setDateRange(e.target.value)}
                                >
                                    <option value="TODAY">Hoje</option>
                                    <option value="YESTERDAY">Ontem</option>
                                    <option value="7">Últimos 7 dias</option>
                                    <option value="30">Últimos 30 dias</option>
                                    <option value="90">Últimos 90 dias</option>
                                    <option value="THIS_MONTH">Este Mês</option>
                                    <option value="LAST_MONTH">Mês Passado</option>
                                    <option value="CUSTOM">Personalizado</option>
                                </select>
                            </div>

                            {dateRange === 'CUSTOM' && (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                                    <input
                                        type="date"
                                        value={customDateFrom}
                                        onChange={e => setCustomDateFrom(e.target.value)}
                                        className="h-10 px-3 bg-white dark:bg-[#121212]/60 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:border-brand-primary/50 font-medium outline-none"
                                    />
                                    <span className="text-gray-400 text-sm font-medium">até</span>
                                    <input
                                        type="date"
                                        value={customDateTo}
                                        onChange={e => setCustomDateTo(e.target.value)}
                                        className="h-10 px-3 bg-white dark:bg-[#121212]/60 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-300 focus:border-brand-primary/50 font-medium outline-none"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ═══ TAB CONTENT ═══ */}
            {activeTab === 'menu' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 py-4">
                    {tabs.map(t => {
                        // Extract base color (e.g., 'brand-primary' from 'text-brand-primary')
                        const baseColorClass = t.color.replace('text-', '');
                        
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className="flex flex-col items-center justify-center p-8 bg-white dark:bg-[#121212]/60 rounded-3xl border border-gray-100 dark:border-white/5 hover:border-brand-primary/30 hover:shadow-xl hover:-translate-y-1 transition-all group"
                            >
                                <div className="w-16 h-16 rounded-2xl mb-4 flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: 'white' }}>
                                    <t.icon size={32} className={t.color} />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t.label}</h3>
                                <span className="text-xs font-medium text-gray-500 text-center px-4">
                                    Visualizar gráficos e dados de {t.label.toLowerCase()}
                                </span>
                                {t.count !== undefined && t.count > 0 && (
                                    <div className="mt-4 px-3 py-1 bg-gray-50 dark:bg-white/5 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                                        {t.count > 999 ? '999+' : t.count} {t.count === 1 ? 'registro' : 'registros'}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            ) : (
                <div className="animate-in fade-in duration-300" key={activeTab}>
                    {/* ══════════ OVERVIEW ══════════ */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* KPI CARDS (Moved inside Overview) */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <KPICard title="Patrimônio Total" value={formatCurrency(globalKPIs.totalEquity)} icon={DollarSign} color="emerald" subtitle={`${globalKPIs.totalProducts} produtos`} />
                                <KPICard title="Itens em Alerta" value={globalKPIs.lowStockCount} icon={AlertTriangle} color={globalKPIs.lowStockCount > 0 ? 'amber' : 'emerald'} subtitle="abaixo do mínimo" />
                                <KPICard title="Estoque Zerado" value={globalKPIs.zeroStockCount} icon={PackageX} color={globalKPIs.zeroStockCount > 0 ? 'red' : 'emerald'} subtitle="precisam reposição" />
                                <KPICard title="Valor Parado" value={formatCurrency(globalKPIs.staleValue)} icon={Timer} color={globalKPIs.staleCount > 0 ? 'orange' : 'emerald'} subtitle={`${globalKPIs.staleCount} produto(s)`} />
                            </div>
                        {/* Mini KPIs */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="!p-4 text-center">
                                <ArrowUp className="text-emerald-500 mx-auto mb-1" size={20} />
                                <span className="text-xl font-bold text-emerald-600 block">{overviewData.totalEntradas.toLocaleString('pt-BR')}</span>
                                <span className="text-xs text-gray-500">Entradas no período</span>
                            </Card>
                            <Card className="!p-4 text-center">
                                <ArrowDown className="text-red-500 mx-auto mb-1" size={20} />
                                <span className="text-xl font-bold text-red-600 block">{overviewData.totalSaidas.toLocaleString('pt-BR')}</span>
                                <span className="text-xs text-gray-500">Saídas no período</span>
                            </Card>
                            <Card className="!p-4 text-center">
                                <TrendingUp className="text-blue-500 mx-auto mb-1" size={20} />
                                <span className="text-xl font-bold text-blue-600 block">{filteredMovements.length}</span>
                                <span className="text-xs text-gray-500">Total de movimentações</span>
                            </Card>
                            <Card className="!p-4 text-center">
                                <Package className="text-purple-500 mx-auto mb-1" size={20} />
                                <span className="text-xl font-bold text-purple-600 block">{globalKPIs.totalProducts}</span>
                                <span className="text-xs text-gray-500">Produtos cadastrados</span>
                            </Card>
                        </div>

                        {/* Flow Chart */}
                        <Card>
                            <h3 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                                <TrendingUp size={18} className="text-brand-primary" /> Fluxo de Estoque
                            </h3>
                            <p className="text-xs text-gray-500 mb-4">Entradas vs Saídas no período</p>
                            <div style={{ width: '100%', height: 300 }}>
                                <ResponsiveContainer>
                                    <AreaChart data={overviewData.flowData}>
                                        <defs>
                                            <linearGradient id="rptColorIn" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.6} />
                                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="rptColorOut" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.6} />
                                                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 11 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend formatter={(v) => <span className="text-xs font-medium text-gray-500 ml-1">{v}</span>} />
                                        <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#10B981" fillOpacity={1} fill="url(#rptColorIn)" strokeWidth={2} />
                                        <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#EF4444" fillOpacity={1} fill="url(#rptColorOut)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Category Distribution */}
                            <Card>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                                    <Tag size={18} className="text-brand-primary" /> Valor por Categoria
                                </h3>
                                <p className="text-xs text-gray-500 mb-4">Distribuição do patrimônio</p>
                                {overviewData.categoryData.length > 0 ? (
                                    <div style={{ width: '100%', height: 280 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={overviewData.categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={2} dataKey="value" stroke="none">
                                                    {overviewData.categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip content={<CurrencyTooltip />} />
                                                <Legend verticalAlign="bottom" formatter={(v) => <span className="text-xs text-gray-500">{v}</span>} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <EmptyState icon={Tag} message="Nenhum dado de categoria" />}
                            </Card>

                            {/* Top by Value */}
                            <Card>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                                    <BarChart3 size={18} className="text-brand-primary" /> Top 10 por Valor
                                </h3>
                                <p className="text-xs text-gray-500 mb-4">Produtos com mais capital investido</p>
                                {overviewData.topByValue.length > 0 ? (
                                    <div style={{ width: '100%', height: 280 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={overviewData.topByValue} layout="vertical" margin={{ left: 10, right: 30 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fill: '#71717A' }} />
                                                <Tooltip content={<CurrencyTooltip />} />
                                                <Bar dataKey="value" name="Valor" fill="#D4AF37" radius={[0, 4, 4, 0]} barSize={16} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <EmptyState icon={BarChart3} message="Nenhum produto com valor em estoque" />}
                            </Card>
                        </div>
                    </div>
                )}

                {/* ══════════ CRITICAL STOCK ══════════ */}
                {activeTab === 'critical' && (
                    <div className="space-y-4">
                        {/* Sub-tabs */}
                        <div className="flex gap-2">
                            {[
                                { id: 'low', label: 'Estoque Baixo', count: criticalData.lowStock.length, icon: AlertTriangle, color: 'amber' },
                                { id: 'zero', label: 'Estoque Zerado', count: criticalData.zeroStock.length, icon: PackageX, color: 'red' },
                                { id: 'expiring', label: 'Vencimento (30d)', count: criticalData.expiring.length, icon: Clock, color: 'orange' },
                            ].map(st => (
                                <button key={st.id} onClick={() => setCriticalSubTab(st.id)}
                                    className={clsx("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border",
                                        criticalSubTab === st.id
                                            ? `bg-${st.color}-500/10 border-${st.color}-500/30 text-${st.color}-600 dark:text-${st.color}-400`
                                            : "bg-white dark:bg-[#121212]/60 border-gray-100 dark:border-white/5 text-gray-500 hover:border-gray-300"
                                    )}>
                                    <st.icon size={14} />
                                    {st.label}
                                    <span className="text-xs bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded-full font-bold">{st.count}</span>
                                </button>
                            ))}
                        </div>

                        <SectionHeader
                            title={criticalSubTab === 'low' ? 'Produtos Abaixo do Mínimo' : criticalSubTab === 'zero' ? 'Produtos com Estoque Zerado' : 'Lotes Vencendo em 30 dias'}
                            subtitle={criticalSubTab === 'low' ? `${criticalData.lowStock.length} produto(s) precisam de reposição` : criticalSubTab === 'zero' ? `${criticalData.zeroStock.length} produto(s) sem estoque` : `${criticalData.expiring.length} lote(s) próximos do vencimento`}
                            onExport={exportCritical}
                        />

                        {/* Low Stock Table */}
                        {criticalSubTab === 'low' && (
                            criticalData.lowStock.length === 0 ? <EmptyState icon={AlertTriangle} message="Nenhum produto abaixo do estoque mínimo! 🎉" /> : (
                                <Card className="!p-0 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-white/5">
                                                <tr>
                                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Produto</th>
                                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Categoria</th>
                                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Atual</th>
                                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Mínimo</th>
                                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Falta</th>
                                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Nível</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                {criticalData.lowStock.map(p => {
                                                    const current = Number(p.current_stock || 0);
                                                    const min = Number(p.min_stock || 1);
                                                    const deficit = min - current;
                                                    const ratio = current / min;
                                                    return (
                                                        <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                                                            <td className="px-4 py-3 text-gray-500">{p.category || '-'}</td>
                                                            <td className="px-4 py-3 text-center font-bold text-red-600">{current}</td>
                                                            <td className="px-4 py-3 text-center text-gray-500">{min}</td>
                                                            <td className="px-4 py-3 text-center font-bold text-amber-600">-{deficit}</td>
                                                            <td className="px-4 py-3">
                                                                <div className="w-full max-w-[80px] mx-auto bg-gray-200 dark:bg-white/10 rounded-full h-2">
                                                                    <div className={clsx("h-2 rounded-full", ratio <= 0.25 ? "bg-red-500" : ratio <= 0.5 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(ratio * 100, 100)}%` }} />
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            )
                        )}

                        {/* Zero Stock Table */}
                        {criticalSubTab === 'zero' && (
                            criticalData.zeroStock.length === 0 ? <EmptyState icon={PackageX} message="Nenhum produto com estoque zerado! 🎉" /> : (
                                <Card className="!p-0 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-white/5">
                                                <tr>
                                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Produto</th>
                                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Categoria</th>
                                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Estoque Mín.</th>
                                                    <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Custo Unitário</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                {criticalData.zeroStock.map(p => (
                                                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                                                        <td className="px-4 py-3 text-gray-500">{p.category || '-'}</td>
                                                        <td className="px-4 py-3 text-center text-gray-500">{p.min_stock || 0}</td>
                                                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCurrency(p.cost_price || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            )
                        )}

                        {/* Expiring Batches */}
                        {criticalSubTab === 'expiring' && (
                            criticalData.expiring.length === 0 ? <EmptyState icon={Clock} message="Nenhum lote próximo do vencimento! 🎉" /> : (
                                <Card className="!p-0 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-white/5">
                                                <tr>
                                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Produto</th>
                                                    <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Categoria</th>
                                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Quantidade</th>
                                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Vencimento</th>
                                                    <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                {criticalData.expiring.map((b, i) => (
                                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{b.productName}</td>
                                                        <td className="px-4 py-3 text-gray-500">{b.category}</td>
                                                        <td className="px-4 py-3 text-center font-bold">{b.quantity}</td>
                                                        <td className="px-4 py-3 text-center text-gray-500 font-mono text-xs">{new Date(b.expiration_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={clsx("px-2 py-0.5 rounded-full text-xs font-bold", b.expired ? "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400" : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400")}>
                                                                {b.expired ? `Vencido (${Math.abs(b.daysLeft)}d)` : `${b.daysLeft} dia(s)`}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            )
                        )}
                    </div>
                )}

                {/* ══════════ ABC CURVE ══════════ */}
                {activeTab === 'abc' && (
                    <div className="space-y-4">
                        <SectionHeader title="Curva ABC — Classificação por Valor" subtitle="Análise de Pareto: 80/15/5 por valor em estoque" onExport={exportABC} />

                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            {abcData.summary.map(s => (
                                <Card key={s.cls} className="!p-5 text-center relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1 h-full" style={{ background: ABC_COLORS[s.cls] }} />
                                    <span className="text-xs font-bold uppercase tracking-wider block mb-1" style={{ color: ABC_COLORS[s.cls] }}>Classe {s.cls}</span>
                                    <span className="text-3xl font-bold text-gray-900 dark:text-white block">{s.items}</span>
                                    <span className="text-xs text-gray-500">produtos ({s.percent.toFixed(0)}% do valor)</span>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 block mt-1">{formatCurrency(s.value)}</span>
                                </Card>
                            ))}
                        </div>

                        {/* Chart */}
                        {abcData.classified.length > 0 && (
                            <Card>
                                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Top 20 Produtos por Valor em Estoque</h3>
                                <div style={{ width: '100%', height: 300 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={abcData.classified.slice(0, 20)} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                            <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#71717A' }} angle={-35} textAnchor="end" height={70} />
                                            <YAxis tick={{ fontSize: 11, fill: '#71717A' }} />
                                            <Tooltip content={<CurrencyTooltip />} />
                                            <Bar dataKey="stockValue" name="Valor em Estoque" radius={[4, 4, 0, 0]}>
                                                {abcData.classified.slice(0, 20).map((entry, i) => (
                                                    <Cell key={i} fill={ABC_COLORS[entry.classification]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        )}

                        {/* Table */}
                        <Card className="!p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-white/5">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">#</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Produto</th>
                                            <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Classe</th>
                                            <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Estoque</th>
                                            <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Valor</th>
                                            <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">% Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {abcData.classified.slice(0, 50).map((p, i) => (
                                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={clsx("px-2 py-0.5 rounded-full text-xs font-bold",
                                                        p.classification === 'A' ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400" :
                                                        p.classification === 'B' ? "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400" :
                                                        "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400"
                                                    )}>{p.classification}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">{p.current_stock}</td>
                                                <td className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">{formatCurrency(p.stockValue)}</td>
                                                <td className="px-4 py-3 text-right text-gray-500">{p.percentOfTotal.toFixed(1)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                )}

                {/* ══════════ MOVEMENTS ══════════ */}
                {activeTab === 'movements' && (
                    <div className="space-y-4">
                        <SectionHeader title="Relatório de Movimentações" subtitle={`${movementsReport.total} movimentação(ões) no período`} onExport={exportMovements}>
                            {/* Type Filter */}
                            <select value={movTypeFilter} onChange={e => setMovTypeFilter(e.target.value)}
                                className="h-9 px-3 bg-white dark:bg-[#121212]/60 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none cursor-pointer font-medium appearance-none">
                                <option value="ALL">Todos</option>
                                <option value="IN">Entradas</option>
                                <option value="OUT">Saídas</option>
                            </select>
                        </SectionHeader>

                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <input type="text" placeholder="Buscar por produto ou motivo..." value={movSearch} onChange={e => setMovSearch(e.target.value)}
                                className="w-full h-10 pl-9 pr-4 bg-white dark:bg-[#121212]/60 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-brand-primary/50" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Top Movers */}
                            <Card>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2 text-sm">
                                    <BarChart3 size={16} className="text-brand-primary" /> Produtos com Mais Movimentação
                                </h3>
                                {movementsReport.topMovers.length > 0 ? (
                                    <div style={{ width: '100%', height: 260 }}>
                                        <ResponsiveContainer>
                                            <BarChart data={movementsReport.topMovers} layout="vertical" margin={{ left: 10, right: 30 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fill: '#71717A' }} />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Bar dataKey="value" name="Qtd." fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={16} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <EmptyState icon={BarChart3} message="Sem movimentações no período" />}
                            </Card>

                            {/* Exit Reasons */}
                            <Card>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2 text-sm">
                                    <TrendingDown size={16} className="text-red-500" /> Motivos de Saída
                                </h3>
                                {movementsReport.exitReasons.length > 0 ? (
                                    <div style={{ width: '100%', height: 260 }}>
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie data={movementsReport.exitReasons} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" stroke="none" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                                    {movementsReport.exitReasons.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend verticalAlign="bottom" formatter={(v) => <span className="text-xs text-gray-500">{v}</span>} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : <EmptyState icon={TrendingDown} message="Nenhuma saída no período" />}
                            </Card>
                        </div>

                        {/* Movements Table */}
                        <Card className="!p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-white/5">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Tipo</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Produto</th>
                                            <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Qtd.</th>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Motivo</th>
                                            <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Data</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {movementsReport.filtered.length === 0 ? (
                                            <tr><td colSpan={5} className="py-10 text-center text-gray-500">Nenhuma movimentação encontrada</td></tr>
                                        ) : movementsReport.filtered.map(m => (
                                            <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border",
                                                        (m.type === 'Entrada' || m.rawType === 'IN') ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                                                    )}>
                                                        {(m.type === 'Entrada' || m.rawType === 'IN') ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                                                        {m.type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{m.productName}</td>
                                                <td className="px-4 py-3 text-center font-bold">{m.quantity}</td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">{m.reason || '-'}</td>
                                                <td className="px-4 py-3 text-right text-gray-500 text-xs font-mono">{m.dateStr} {m.timeStr}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {movementsReport.total > 100 && (
                                <div className="px-4 py-3 bg-gray-50 dark:bg-white/5 text-center text-xs text-gray-500 border-t border-gray-100 dark:border-white/5">
                                    Exibindo 100 de {movementsReport.total} resultados. Exporte para ver todos.
                                </div>
                            )}
                        </Card>
                    </div>
                )}

                {/* ══════════ STOCK TURNOVER ══════════ */}
                {activeTab === 'turnover' && (
                    <div className="space-y-4">
                        <SectionHeader title="Giro de Estoque — Produtos Parados" subtitle={`${turnoverData.staleProducts.length} produto(s) sem movimentação`} onExport={exportTurnover}>
                            <select value={turnoverDays} onChange={e => setTurnoverDays(Number(e.target.value))}
                                className="h-9 px-3 bg-white dark:bg-[#121212]/60 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-700 dark:text-gray-300 outline-none cursor-pointer font-medium appearance-none">
                                <option value={30}>Parado 30+ dias</option>
                                <option value={60}>Parado 60+ dias</option>
                                <option value={90}>Parado 90+ dias</option>
                            </select>
                        </SectionHeader>

                        {/* KPIs */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card className="!p-4 text-center">
                                <span className="text-2xl font-bold text-orange-600">{turnoverData.staleProducts.length}</span>
                                <p className="text-xs text-gray-500 mt-1">Produtos Parados</p>
                            </Card>
                            <Card className="!p-4 text-center">
                                <span className="text-2xl font-bold text-red-600">{formatCurrency(turnoverData.totalStaleValue)}</span>
                                <p className="text-xs text-gray-500 mt-1">Capital Parado</p>
                            </Card>
                            <Card className="!p-4 text-center">
                                <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">
                                    {turnoverData.staleProducts.length > 0
                                        ? Math.round(turnoverData.staleProducts.reduce((s, p) => s + (p.daysSince === 999 ? turnoverDays : p.daysSince), 0) / turnoverData.staleProducts.length)
                                        : 0
                                    }
                                </span>
                                <p className="text-xs text-gray-500 mt-1">Média de Dias Parado</p>
                            </Card>
                        </div>

                        {turnoverData.staleProducts.length === 0 ? <EmptyState icon={RotateCcw} message="Todos os produtos tiveram movimentação recente! 🎉" /> : (
                            <Card className="!p-0 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-white/5">
                                            <tr>
                                                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Produto</th>
                                                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Categoria</th>
                                                <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Estoque</th>
                                                <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Dias Parado</th>
                                                <th className="text-right px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Valor Parado</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {turnoverData.staleProducts.slice(0, 50).map(p => (
                                                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{p.name}</td>
                                                    <td className="px-4 py-3 text-gray-500">{p.category || '-'}</td>
                                                    <td className="px-4 py-3 text-center text-orange-600 font-bold">{p.current_stock}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={clsx("px-2 py-0.5 rounded-full text-xs font-bold",
                                                            p.daysSince >= 90 ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400" :
                                                            p.daysSince >= 60 ? "bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400" :
                                                            "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                                        )}>
                                                            {p.daysSince === 999 ? 'Nunca vendido' : `${p.daysSince}d`}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-gray-700 dark:text-gray-300">{formatCurrency(p.staleValue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 dark:bg-white/5">
                                            <tr>
                                                <td colSpan={4} className="px-4 py-3 font-bold text-gray-900 dark:text-white">Total Parado</td>
                                                <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(turnoverData.totalStaleValue)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>
                )}

                {/* ══════════ LOSSES ══════════ */}
                {activeTab === 'losses' && (
                    <div className="space-y-4">
                        <SectionHeader title="Relatório de Perdas & Ajustes" subtitle={`${lossData.totalEvents} registro(s) de perda/quebra`} onExport={exportLosses} />

                        {/* ── Period Filter Bar ── */}
                        <div className="flex flex-wrap items-end gap-3">
                            {/* Search */}
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Buscar produto ou categoria..."
                                    value={lossSearch}
                                    onChange={e => setLossSearch(e.target.value)}
                                    className="w-full h-9 pl-8 pr-4 bg-white dark:bg-[#121212]/60 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-red-500/50"
                                />
                            </div>
                        </div>

                        {/* Alertas de Perdas Críticas */}
                        {lossData.alerts && lossData.alerts.length > 0 && (
                            <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-4 animate-in fade-in slide-in-from-top-4">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                                    <div>
                                        <h4 className="font-bold text-red-800 dark:text-red-400 mb-2">Alertas de Perda Crítica</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {lossData.alerts.slice(0, 3).map((alert, idx) => (
                                                <div key={idx} className="bg-white dark:bg-[#121212]/80 border border-red-100 dark:border-red-500/20 p-3 rounded-lg shadow-sm">
                                                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm block truncate" title={alert.productName}>
                                                        {alert.productName}
                                                    </span>
                                                    <div className="mt-2 flex justify-between items-end">
                                                        <div>
                                                            <span className="text-xs text-gray-500 block mb-0.5">Taxa de Perda</span>
                                                            <span className="font-bold text-red-600 dark:text-red-400">{alert.ratioPercent}%</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-xs text-gray-500 block mb-0.5">Qtd Perdida</span>
                                                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{alert.totalQty} unid.</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {lossData.alerts.length > 3 && (
                                                <div className="bg-white/50 dark:bg-white/5 border border-dashed border-red-200 dark:border-red-500/20 p-3 rounded-lg flex items-center justify-center">
                                                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                                        + {lossData.alerts.length - 3} produto(s) em alerta
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* KPIs */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="!p-4 text-center">
                                <Flame className="text-red-500 mx-auto mb-1" size={20} />
                                <span className="text-2xl font-bold text-red-600">{lossData.totalEvents}</span>
                                <p className="text-xs text-gray-500 mt-1">Ocorrências</p>
                            </Card>
                            <Card className="!p-4 text-center">
                                <Package className="text-orange-500 mx-auto mb-1" size={20} />
                                <span className="text-2xl font-bold text-orange-600">{lossData.totalQty.toLocaleString('pt-BR')}</span>
                                <p className="text-xs text-gray-500 mt-1">Unid. Perdidas</p>
                            </Card>
                            <Card className="!p-4 text-center">
                                <DollarSign className="text-red-500 mx-auto mb-1" size={20} />
                                <span className="text-2xl font-bold text-red-600">{formatCurrency(lossData.totalValue)}</span>
                                <p className="text-xs text-gray-500 mt-1">Prejuízo Total</p>
                            </Card>
                            <Card className="!p-4 text-center">
                                <TrendingDown className="text-amber-500 mx-auto mb-1" size={20} />
                                <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                                    {lossData.ranked.length > 0 ? formatCurrency(lossData.totalValue / lossData.ranked.length) : formatCurrency(0)}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">Média por Produto</p>
                            </Card>
                        </div>

                        {/* Charts Row */}
                        {lossData.ranked.length > 0 && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Timeline Chart */}
                                {lossData.timeline.length > 1 && (
                                    <Card>
                                        <h3 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2 text-sm">
                                            <TrendingDown size={16} className="text-red-500" /> Perdas ao Longo do Tempo
                                        </h3>
                                        <p className="text-xs text-gray-500 mb-4">Valor perdido por dia</p>
                                        <div style={{ width: '100%', height: 260 }}>
                                            <ResponsiveContainer>
                                                <AreaChart data={lossData.timeline}>
                                                    <defs>
                                                        <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.5} />
                                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 10 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 10 }} />
                                                    <Tooltip content={<CurrencyTooltip />} />
                                                    <Area type="monotone" dataKey="valor" name="Prejuízo" stroke="#EF4444" fillOpacity={1} fill="url(#lossGrad)" strokeWidth={2} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                )}

                                {/* Top Products Bar / Category Pie */}
                                {lossData.categoryPie.length > 1 ? (
                                    <Card>
                                        <h3 className="font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-2 text-sm">
                                            <Tag size={16} className="text-red-500" /> Perdas por Categoria
                                        </h3>
                                        <p className="text-xs text-gray-500 mb-4">Distribuição de prejuízo</p>
                                        <div style={{ width: '100%', height: 260 }}>
                                            <ResponsiveContainer>
                                                <PieChart>
                                                    <Pie data={lossData.categoryPie} cx="50%" cy="50%" outerRadius={85} innerRadius={45} dataKey="value" stroke="none" label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                                        {lossData.categoryPie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                                    </Pie>
                                                    <Tooltip content={<CurrencyTooltip />} />
                                                    <Legend verticalAlign="bottom" formatter={(v) => <span className="text-xs text-gray-500">{v}</span>} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                ) : (
                                    <Card>
                                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4">Top Produtos com Mais Perdas</h3>
                                        <div style={{ width: '100%', height: 260 }}>
                                            <ResponsiveContainer>
                                                <BarChart data={lossData.ranked.slice(0, 10)} layout="vertical" margin={{ left: 10, right: 30 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                                                    <XAxis type="number" hide />
                                                    <YAxis dataKey="productName" type="category" width={120} tick={{ fontSize: 10, fill: '#71717A' }} />
                                                    <Tooltip content={<CurrencyTooltip />} />
                                                    <Bar dataKey="totalValue" name="Prejuízo" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={18} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </Card>
                                )}
                            </div>
                        )}

                        {/* Table with sortable headers */}
                        {lossData.ranked.length === 0 ? <EmptyState icon={Flame} message="Nenhuma perda registrada no período selecionado! 🎉" /> : (
                            <Card className="!p-0 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-white/5">
                                            <tr>
                                                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-10">#</th>
                                                {[
                                                    { key: 'name', label: 'Produto', align: 'text-left' },
                                                    { key: 'category', label: 'Categoria', align: 'text-left' },
                                                    { key: 'count', label: 'Ocorrências', align: 'text-center' },
                                                    { key: 'qty', label: 'Qtd. Perdida', align: 'text-center' },
                                                    { key: 'value', label: 'Prejuízo', align: 'text-right' },
                                                    { key: 'date', label: 'Última Perda', align: 'text-center' },
                                                ].map(col => (
                                                    <th
                                                        key={col.key}
                                                        className={clsx(
                                                            "px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white select-none transition-colors group",
                                                            col.align
                                                        )}
                                                        onClick={() => {
                                                            if (col.key === 'count') return; // not sortable
                                                            if (lossSortBy === col.key) {
                                                                setLossSortDir(d => d === 'desc' ? 'asc' : 'desc');
                                                            } else {
                                                                setLossSortBy(col.key);
                                                                setLossSortDir('desc');
                                                            }
                                                        }}
                                                    >
                                                        <span className="inline-flex items-center gap-1">
                                                            {col.label}
                                                            {lossSortBy === col.key ? (
                                                                lossSortDir === 'desc'
                                                                    ? <ArrowDown size={12} className="text-red-500" />
                                                                    : <ArrowUp size={12} className="text-red-500" />
                                                            ) : (
                                                                col.key !== 'count' && <ArrowUpDown size={11} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            )}
                                                        </span>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {lossData.ranked.slice((lossPage - 1) * LOSS_PER_PAGE, lossPage * LOSS_PER_PAGE).map((r, i) => (
                                                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                    <td className="px-4 py-3 text-gray-400">{(lossPage - 1) * LOSS_PER_PAGE + i + 1}</td>
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{r.productName}</td>
                                                    <td className="px-4 py-3 text-gray-500">
                                                        <span className="inline-flex items-center gap-1">
                                                            <Tag size={12} className="text-gray-400" />
                                                            {r.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">{r.count}x</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center font-bold text-orange-600">{r.totalQty}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(r.totalValue)}</td>
                                                    <td className="px-4 py-3 text-center text-gray-500 text-xs font-mono">{r.lastDate ? new Date(r.lastDate).toLocaleDateString('pt-BR') : '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-gray-50 dark:bg-white/5">
                                            <tr>
                                                <td colSpan={4} className="px-4 py-3 font-bold text-gray-900 dark:text-white">Total</td>
                                                <td className="px-4 py-3 text-center font-bold text-orange-600">{lossData.totalQty}</td>
                                                <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(lossData.totalValue)}</td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Pagination */}
                                {lossData.ranked.length > LOSS_PER_PAGE && (
                                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                                        <span className="text-xs text-gray-500">
                                            Mostrando {Math.min((lossPage - 1) * LOSS_PER_PAGE + 1, lossData.ranked.length)}-{Math.min(lossPage * LOSS_PER_PAGE, lossData.ranked.length)} de {lossData.ranked.length} produtos
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setLossPage(p => Math.max(1, p - 1))}
                                                disabled={lossPage === 1}
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                ← Anterior
                                            </button>
                                            <span className="text-xs text-gray-500 font-mono">
                                                {lossPage}/{Math.ceil(lossData.ranked.length / LOSS_PER_PAGE)}
                                            </span>
                                            <button
                                                onClick={() => setLossPage(p => Math.min(Math.ceil(lossData.ranked.length / LOSS_PER_PAGE), p + 1))}
                                                disabled={lossPage >= Math.ceil(lossData.ranked.length / LOSS_PER_PAGE)}
                                                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                            >
                                                Próxima →
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        )}
                    </div>
                )}

                {/* ══════════ PHYSICAL COUNT ══════════ */}
                {activeTab === 'inventory' && (
                    <div className="space-y-4">
                        <SectionHeader
                            title="Inventário — Conferência Física"
                            subtitle={`${inventorySummary.length} produto(s) para conferência`}
                            onExport={exportInventory}
                            onPrint={handlePrintInventory}
                        >
                            <button
                                onClick={clearInventoryCounts}
                                className="h-9 px-3 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20 rounded-xl text-sm font-semibold hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center gap-2"
                            >
                                <RotateCcw size={14} />
                                Limpar Contagem
                            </button>
                        </SectionHeader>

                        {/* Scanner Bar */}
                        <div className="bg-white dark:bg-[#121212]/80 border border-gray-200 dark:border-white/10 rounded-xl p-4 flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <ScanLine size={24} />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">Modo Leitor de Código de Barras</h4>
                                <p className="text-xs text-gray-500">Conecte seu leitor, clique no campo abaixo e bipe os produtos.</p>
                            </div>
                            <div className="flex-1 max-w-md relative">
                                <input
                                    ref={scannerInputRef}
                                    type="text"
                                    value={scanInput}
                                    onChange={(e) => setScanInput(e.target.value)}
                                    onKeyDown={handleInventoryScan}
                                    placeholder="Scannear ou digitar código..."
                                    className="w-full h-12 pl-4 pr-4 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-emerald-500 ring-4 ring-transparent focus:ring-emerald-500/10 transition-all font-mono"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {inventorySummary.length === 0 ? <EmptyState icon={ClipboardList} message="Nenhum produto para conferir" /> : (
                            <Card className="!p-0 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 dark:bg-white/5">
                                            <tr>
                                                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Produto</th>
                                                <th className="text-left px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">SKU / Cód. Barras</th>
                                                <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Est. Sistema</th>
                                                <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 w-32">Contagem</th>
                                                <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Diferença</th>
                                                <th className="text-center px-4 py-3 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                            {inventorySummary.map(p => {
                                                const counted = inventoryCounts[p.id];
                                                const hasCount = counted !== undefined;
                                                const diff = hasCount ? counted - (p.current_stock || 0) : 0;
                                                
                                                return (
                                                    <tr key={p.id} className={clsx("transition-colors", hasCount ? 'bg-emerald-50/30 dark:bg-emerald-500/5 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/10' : 'hover:bg-gray-50 dark:hover:bg-white/5')}>
                                                        <td className="px-4 py-3">
                                                            <span className="font-medium text-gray-900 dark:text-white block">{p.name}</span>
                                                            <span className="text-xs text-gray-500 block">{p.category || 'Sem categoria'} • {p.location || 'Sem local'}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                                                            {p.sku && <div>SKU: {p.sku}</div>}
                                                            {p.barcode && <div>CB: {p.barcode}</div>}
                                                            {!p.sku && !p.barcode && '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">
                                                            {p.current_stock || 0}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <input 
                                                                type="number" 
                                                                min="0"
                                                                value={hasCount ? counted : ''}
                                                                onChange={(e) => updateManualCount(p.id, e.target.value)}
                                                                placeholder="-"
                                                                className="w-20 h-8 px-2 text-center bg-white dark:bg-[#121212]/60 border border-gray-300 dark:border-white/20 rounded-md font-bold focus:border-emerald-500 outline-none"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {hasCount ? (
                                                                <span className={clsx("font-bold", 
                                                                    diff > 0 ? "text-emerald-600" :
                                                                    diff < 0 ? "text-red-500" :
                                                                    "text-gray-400"
                                                                )}>
                                                                    {diff > 0 ? `+${diff}` : diff}
                                                                </span>
                                                            ) : <span className="text-gray-300">-</span>}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            {hasCount ? (
                                                                diff === 0 
                                                                    ? <div className="flex justify-center"><CheckCircle2 className="text-emerald-500" size={18} /></div>
                                                                    : <div className="flex justify-center"><XCircle className="text-red-500" size={18} /></div>
                                                            ) : <span className="text-xs text-gray-400">Pendente</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {Object.keys(inventoryCounts).length > 0 && (
                                            <tfoot className="bg-gray-50 dark:bg-white/5">
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-3 text-xs text-gray-500 text-center">
                                                        {Object.keys(inventoryCounts).length} de {inventorySummary.length} produtos conferidos. (Nenhuma alteração é salva no banco automaticamente por esta tela, use Ajuste de Estoque para confirmar).
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </div>
            )}
        </div>
    );
};

export default Reports;
