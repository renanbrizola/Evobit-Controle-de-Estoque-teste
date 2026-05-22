import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { ShoppingCart, DollarSign, Users, Package, BarChart3, Calendar, Loader2, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PurchaseService } from '../services/purchases';
import { formatCurrency } from '../utils/formatters';
import { getStatusLabel } from '../utils/statusHelper';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#6366f1'];

const KPICard = ({ title, value, subtitle, icon: Icon, color, loading }) => {
    const colorMap = {
        green: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/20',
        blue: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-500/20',
        purple: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-500/20',
        amber: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-500/20',
    };

    return (
        <Card className="relative overflow-hidden group border border-gray-100 dark:border-white/10 bg-white dark:bg-[#121212]">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon size={80} strokeWidth={1.5} />
            </div>
            <div className="relative z-10 p-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${colorMap[color]} border transition-transform group-hover:scale-110 duration-500`}>
                    <Icon size={24} />
                </div>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{title}</h3>
                {loading ? (
                    <div className="h-10 w-32 bg-gray-100 dark:bg-white/10 animate-pulse rounded-lg" />
                ) : (
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">{value}</span>
                )}
                <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
            </div>
        </Card>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 p-3 rounded-xl shadow-lg">
                <p className="font-bold text-gray-900 dark:text-white mb-1">{label}</p>
                {payload.map((entry, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-gray-500">{entry.name}:</span>
                        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const PurchasesDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [purchases, setPurchases] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await PurchaseService.list();
            setPurchases(data);
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar dados de compras');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const purchasesMonth = purchases.filter(p => p.date?.startsWith(thisMonth));
        const totalMonth = purchasesMonth.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
        const totalAll = purchases.reduce((sum, p) => sum + (Number(p.total) || 0), 0);
        const avgPerPurchase = purchases.length > 0 ? totalAll / purchases.length : 0;

        // Top providers
        const providerMap = {};
        purchases.forEach(p => {
            const name = p.providerName || 'Desconhecido';
            providerMap[name] = (providerMap[name] || 0) + (Number(p.total) || 0);
        });
        const topProviders = Object.entries(providerMap)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        return {
            countMonth: purchasesMonth.length,
            totalMonth,
            totalAll,
            countAll: purchases.length,
            avgPerPurchase,
            topProviders,
        };
    }, [purchases]);

    const chartData = useMemo(() => {
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
            const dayPurchases = purchases.filter(p => p.date?.startsWith(key));
            last7.push({
                name: label,
                compras: dayPurchases.reduce((sum, p) => sum + (Number(p.total) || 0), 0),
            });
        }
        return last7;
    }, [purchases]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <ShoppingCart className="text-blue-500" size={32} />
                        Dashboard de Compras
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Acompanhe suas aquisições e fornecedores</p>
                </div>
                <div className="text-sm text-gray-400 font-mono bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Gastos no Mês"
                    value={formatCurrency(stats.totalMonth)}
                    subtitle={`${stats.countMonth} compra(s) este mês`}
                    icon={Calendar}
                    color="blue"
                    loading={loading}
                />
                <KPICard
                    title="Total de Compras"
                    value={String(stats.countAll)}
                    subtitle="Compras registradas"
                    icon={ShoppingCart}
                    color="green"
                    loading={loading}
                />
                <KPICard
                    title="Ticket Médio"
                    value={formatCurrency(stats.avgPerPurchase)}
                    subtitle="Média por compra"
                    icon={DollarSign}
                    color="purple"
                    loading={loading}
                />
                <KPICard
                    title="Total Investido"
                    value={formatCurrency(stats.totalAll)}
                    subtitle="Valor total em compras"
                    icon={TrendingDown}
                    color="amber"
                    loading={loading}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart */}
                <Card className="lg:col-span-2 p-6 bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <BarChart3 size={20} className="text-blue-500" /> Compras - Últimos 7 Dias
                    </h3>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="animate-spin text-gray-400" size={32} />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" fontSize={12} tick={{ fill: '#9ca3af' }} />
                                <YAxis fontSize={12} tick={{ fill: '#9ca3af' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="compras" name="Compras" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* Top Providers */}
                <Card className="p-6 bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Users size={20} className="text-blue-500" /> Principais Fornecedores
                    </h3>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="animate-spin text-gray-400" size={32} />
                        </div>
                    ) : stats.topProviders.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                            Sem dados disponíveis
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {stats.topProviders.map((provider, i) => {
                                const maxVal = stats.topProviders[0]?.total || 1;
                                const pct = (provider.total / maxVal) * 100;
                                return (
                                    <div key={provider.name}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[60%]">{provider.name}</span>
                                            <span className="text-sm font-bold text-gray-900 dark:text-white">{formatCurrency(provider.total)}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-white/10 rounded-full h-2">
                                            <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Card>
            </div>

            {/* Recent Purchases */}
            <Card className="overflow-hidden bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10">
                <div className="p-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 dark:text-white">Compras Recentes</h3>
                    <button onClick={() => navigate('/app/compras')} className="text-sm font-bold text-brand-primary hover:underline">
                        Ir para Compras →
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Fornecedor</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {purchases.slice(0, 10).map(purchase => (
                                <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">
                                        {new Date(purchase.date).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-4 font-bold text-gray-900 dark:text-white">{purchase.providerName}</td>
                                    <td className="p-4 text-right font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(purchase.total)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 uppercase">
                                            {getStatusLabel(purchase.status)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {purchases.length === 0 && !loading && (
                                <tr><td colSpan="4" className="p-8 text-center text-gray-400">Nenhuma compra registrada</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default PurchasesDashboard;
