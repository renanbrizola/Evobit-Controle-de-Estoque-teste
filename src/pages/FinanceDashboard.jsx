import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, BarChart3, Calendar, Loader2, PieChart as PieIcon } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FinanceService } from '../services/finance';
import { formatCurrency } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import clsx from 'clsx';

const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#6366f1'];

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

const FinanceDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState([]);
    const [balance, setBalance] = useState({ balance: 0, income: 0, expense: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [txList, bal] = await Promise.all([
                FinanceService.list(),
                FinanceService.getBalance(),
            ]);
            setTransactions(txList);
            setBalance(bal);
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar dados financeiros');
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        const now = new Date();
        const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        const monthTx = transactions.filter(t => t.date?.startsWith(thisMonth));
        const incomeMonth = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const expenseMonth = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

        // Category breakdown
        const categoryMap = {};
        transactions.forEach(t => {
            const cat = t.category || 'Outros';
            if (!categoryMap[cat]) categoryMap[cat] = { income: 0, expense: 0 };
            if (t.type === 'income') categoryMap[cat].income += Number(t.amount) || 0;
            else categoryMap[cat].expense += Number(t.amount) || 0;
        });

        const categoryData = Object.entries(categoryMap).map(([name, vals]) => ({
            name,
            value: vals.income + vals.expense,
            income: vals.income,
            expense: vals.expense,
        })).sort((a, b) => b.value - a.value).slice(0, 6);

        return { incomeMonth, expenseMonth, balanceMonth: incomeMonth - expenseMonth, categoryData };
    }, [transactions]);

    const chartData = useMemo(() => {
        const last30 = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            const dayTx = transactions.filter(t => t.date?.startsWith(key));
            const income = dayTx.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
            const expense = dayTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

            last30.push({
                name: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                receitas: income,
                despesas: expense,
            });
        }
        return last30;
    }, [transactions]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <DollarSign className="text-amber-500" size={32} />
                        Dashboard Financeiro
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Controle de receitas, despesas e fluxo de caixa</p>
                </div>
                <div className="text-sm text-gray-400 font-mono bg-gray-100 dark:bg-white/5 px-3 py-1 rounded-full">
                    {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Saldo Total */}
                <Card className="relative overflow-hidden group bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl border-0">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    <div className="relative z-10 p-6">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-white/10 border border-white/20">
                            <Wallet size={24} />
                        </div>
                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-1">Saldo em Caixa</h3>
                        {loading ? (
                            <div className="h-10 w-32 bg-white/10 animate-pulse rounded-lg" />
                        ) : (
                            <span className={clsx("text-3xl font-bold", balance.balance >= 0 ? "text-emerald-400" : "text-red-400")}>
                                {formatCurrency(balance.balance)}
                            </span>
                        )}
                        <p className="text-xs text-gray-500 mt-2">Receitas - Despesas</p>
                    </div>
                </Card>

                {/* Receitas Mês */}
                <Card className="relative overflow-hidden group border border-gray-100 dark:border-white/10 bg-white dark:bg-[#121212]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ArrowUpRight size={80} strokeWidth={1.5} />
                    </div>
                    <div className="relative z-10 p-6">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-emerald-500/10 text-emerald-600 border border-emerald-200 dark:border-emerald-500/20">
                            <ArrowUpRight size={24} />
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Receitas no Mês</h3>
                        {loading ? (
                            <div className="h-10 w-32 bg-gray-100 dark:bg-white/10 animate-pulse rounded-lg" />
                        ) : (
                            <span className="text-3xl font-bold text-emerald-600">{formatCurrency(stats.incomeMonth)}</span>
                        )}
                        <p className="text-xs text-gray-400 mt-2">Entradas no período</p>
                    </div>
                </Card>

                {/* Despesas Mês */}
                <Card className="relative overflow-hidden group border border-gray-100 dark:border-white/10 bg-white dark:bg-[#121212]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ArrowDownRight size={80} strokeWidth={1.5} />
                    </div>
                    <div className="relative z-10 p-6">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-red-500/10 text-red-600 border border-red-200 dark:border-red-500/20">
                            <ArrowDownRight size={24} />
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Despesas no Mês</h3>
                        {loading ? (
                            <div className="h-10 w-32 bg-gray-100 dark:bg-white/10 animate-pulse rounded-lg" />
                        ) : (
                            <span className="text-3xl font-bold text-red-600">{formatCurrency(stats.expenseMonth)}</span>
                        )}
                        <p className="text-xs text-gray-400 mt-2">Saídas no período</p>
                    </div>
                </Card>

                {/* Resultado Mês */}
                <Card className="relative overflow-hidden group border border-gray-100 dark:border-white/10 bg-white dark:bg-[#121212]">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <BarChart3 size={80} strokeWidth={1.5} />
                    </div>
                    <div className="relative z-10 p-6">
                        <div className={clsx(
                            "w-12 h-12 rounded-xl flex items-center justify-center mb-4 border",
                            stats.balanceMonth >= 0
                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-500/20"
                                : "bg-red-500/10 text-red-600 border-red-200 dark:border-red-500/20"
                        )}>
                            {stats.balanceMonth >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                        </div>
                        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Resultado do Mês</h3>
                        {loading ? (
                            <div className="h-10 w-32 bg-gray-100 dark:bg-white/10 animate-pulse rounded-lg" />
                        ) : (
                            <span className={clsx("text-3xl font-bold", stats.balanceMonth >= 0 ? "text-emerald-600" : "text-red-600")}>
                                {formatCurrency(stats.balanceMonth)}
                            </span>
                        )}
                        <p className="text-xs text-gray-400 mt-2">{stats.balanceMonth >= 0 ? 'Lucro' : 'Prejuízo'} no mês</p>
                    </div>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Area Chart - Cash Flow */}
                <Card className="lg:col-span-2 p-6 bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <BarChart3 size={20} className="text-amber-500" /> Fluxo de Caixa — Últimos 30 Dias
                    </h3>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="animate-spin text-gray-400" size={32} />
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" fontSize={10} tick={{ fill: '#9ca3af' }} interval={4} />
                                <YAxis fontSize={12} tick={{ fill: '#9ca3af' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#10b981" strokeWidth={2} fill="url(#colorIncome)" />
                                <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" strokeWidth={2} fill="url(#colorExpense)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </Card>

                {/* Pie Chart - Categories */}
                <Card className="p-6 bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10">
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <PieIcon size={20} className="text-amber-500" /> Por Categoria
                    </h3>
                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <Loader2 className="animate-spin text-gray-400" size={32} />
                        </div>
                    ) : stats.categoryData.length === 0 ? (
                        <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                            Sem dados disponíveis
                        </div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie data={stats.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                                        {stats.categoryData.map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val) => formatCurrency(val)} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2 mt-2">
                                {stats.categoryData.map((item, i) => (
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

            {/* Recent Transactions */}
            <Card className="overflow-hidden bg-white dark:bg-[#121212] border border-gray-100 dark:border-white/10">
                <div className="p-4 border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 dark:text-white">Transações Recentes</h3>
                    <button onClick={() => navigate('/app/financeiro')} className="text-sm font-bold text-brand-primary hover:underline">
                        Ir para Financeiro →
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="p-4">Descrição</th>
                                <th className="p-4">Categoria</th>
                                <th className="p-4">Data</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 text-center">Tipo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {transactions.slice(0, 10).map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-bold text-gray-900 dark:text-white">{t.description}</td>
                                    <td className="p-4 text-gray-500">
                                        <span className="bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-xs font-medium">{t.category}</span>
                                    </td>
                                    <td className="p-4 text-gray-500 dark:text-gray-400">
                                        {new Date(t.date).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className={clsx("p-4 text-right font-bold", t.type === 'income' ? "text-emerald-600" : "text-red-600")}>
                                        {t.type === 'income' ? '+' : '-'} {formatCurrency(t.amount)}
                                    </td>
                                    <td className="p-4 text-center">
                                        {t.type === 'income' ? (
                                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto">
                                                <ArrowUpRight size={16} />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
                                                <ArrowDownRight size={16} />
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {transactions.length === 0 && !loading && (
                                <tr><td colSpan="5" className="p-8 text-center text-gray-400">Nenhuma transação registrada</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default FinanceDashboard;
