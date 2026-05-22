import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { TrendingUp, DollarSign, ShoppingBag, Users, BarChart3, Calendar, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { OrdersService } from '../services/orders';
import { formatCurrency } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#6366f1'];

const KPICard = ({ title, value, subtitle, icon: Icon, color, loading }) => {
    // ... (KPICard content unchanged)
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

const SalesDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [sales, setSales] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // Filter only completed Sales, exclude Quotes
            const data = await OrdersService.list({ type: 'SALE' });
            setSales(data);
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar dados de vendas');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const salesToday = sales.filter(s => s.date?.startsWith(today));
        const salesMonth = sales.filter(s => s.date?.startsWith(thisMonth));

        const totalToday = salesToday.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const totalMonth = salesMonth.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        const ticketMedio = salesMonth.length > 0 ? totalMonth / salesMonth.length : 0;

        return {
            countToday: salesToday.length,
            totalToday,
            countMonth: salesMonth.length,
            totalMonth,
            ticketMedio,
            totalAll: sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
        };
    }, [sales]);

    const chartData = useMemo(() => {
        const last7 = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const label = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
            const daySales = sales.filter(s => s.date?.startsWith(key));
            last7.push({
                name: label,
                vendas: daySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
                qtd: daySales.length,
            });
        }
        return last7;
    }, [sales]);

    const paymentMethodData = useMemo(() => {
        const methods = {};
        const labelMap = { cash: 'Dinheiro', credit_card: 'Crédito', debit_card: 'Débito', pix: 'Pix' };
        sales.forEach(s => {
            const method = labelMap[s.payment_method] || s.payment_method || 'Outro';
            methods[method] = (methods[method] || 0) + (Number(s.total) || 0);
        });
        return Object.entries(methods).map(([name, value]) => ({ name, value }));
    }, [sales]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <TrendingUp className="text-emerald-500" size={32} />
                        Dashboard de Vendas
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Acompanhe o desempenho das suas vendas</p>
                </div>
                <div className="text-sm text-gray-400 font-mono bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Vendas Hoje"
                    value={formatCurrency(stats.totalToday)}
                    subtitle={`${stats.countToday} venda(s) hoje`}
                    icon={DollarSign}
                    color="green"
                    loading={loading}
                />
                <KPICard
                    title="Vendas no Mês"
                    value={formatCurrency(stats.totalMonth)}
                    subtitle={`${stats.countMonth} venda(s) este mês`}
                    icon={Calendar}
                    color="blue"
                    loading={loading}
                />
                <KPICard
                    title="Ticket Médio"
                    value={formatCurrency(stats.ticketMedio)}
                    subtitle="Média por venda no mês"
                    icon={ShoppingBag}
                    color="purple"
                    loading={loading}
                />
                <KPICard
                    title="Total Geral"
                    value={formatCurrency(stats.totalAll)}
                    subtitle={`${sales.length} vendas no total`}
                    icon={TrendingUp}
                    color="amber"
                    loading={loading}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Bar Chart */}
                <Card className="lg:col-span-2 p-6 bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <BarChart3 size={20} className="text-emerald-500" /> Vendas - Últimos 7 Dias
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
                                <Bar dataKey="vendas" name="Vendas" fill="#10b981" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* Pie Chart - Payment Methods */}
                <Card className="p-6 bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">
                        Formas de Pagamento
                    </h3>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="animate-spin text-gray-400" size={32} />
                        </div>
                    ) : paymentMethodData.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                            Sem dados disponíveis
                        </div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={paymentMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                                        {paymentMethodData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val) => formatCurrency(val)} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 mt-2">
                                {paymentMethodData.map((item, i) => (
                                    <div key={item.name} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                            <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                                        </div>
                                        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </Card>
            </div>

            {/* Recent Sales */}
            <Card className="overflow-hidden bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10">
                <div className="p-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 dark:text-white">Vendas Recentes</h3>
                    <button onClick={() => navigate('/app/vendas')} className="text-sm font-bold text-brand-primary hover:underline">
                        Ir para Vendas →
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-center">Pagamento</th>
                                <th className="p-4 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {sales.slice(0, 10).map(sale => (
                                <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-gray-700 dark:text-gray-300 font-medium">
                                        {new Date(sale.date).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="p-4 text-right font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(sale.total)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2 py-1 rounded text-xs font-medium uppercase">
                                            {sale.payment_method === 'cash' ? 'Dinheiro' : sale.payment_method === 'credit_card' ? 'Crédito' : sale.payment_method === 'pix' ? 'Pix' : sale.payment_method || '-'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">
                                            Concluída
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {sales.length === 0 && !loading && (
                                <tr><td colSpan="4" className="p-8 text-center text-gray-400">Nenhuma venda registrada</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default SalesDashboard;
