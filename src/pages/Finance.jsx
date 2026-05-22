import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { DollarSign, TrendingUp, TrendingDown, Plus, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import TransactionModal from '../components/finance/TransactionModal';
import clsx from 'clsx';

import { FinanceService } from '../services/finance';
import { toast } from 'sonner';

const Finance = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [balanceData, setBalanceData] = useState({ balance: 0, income: 0, expense: 0 });



    const loadData = async () => {
        try {
            const list = await FinanceService.list();
            setTransactions(list);

            // Calculate balance directly from list or use service
            const income = list.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
            const expense = list.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
            setBalanceData({ balance: income - expense, income, expense });
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar dados financeiros');
        }
    };

    useEffect(() => {
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSaveTransaction = (newTransaction) => {
        loadData();
    };

    const { balance, income: totalIncome, expense: totalExpense } = balanceData;

    return (
        <div className="space-y-6 container mx-auto max-w-6xl py-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <DollarSign className="text-brand-primary" /> Financeiro
                    </h1>
                    <p className="text-gray-500">Fluxo de caixa e controle de contas</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="shadow-lg shadow-brand-primary/20">
                    <Plus size={20} className="mr-2" /> Nova Transação
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl"></div>
                    <div className="relative z-10">
                        <p className="text-sm font-medium text-gray-400 mb-1">Saldo em Caixa</p>
                        <h3 className="text-3xl font-bold flex items-center gap-2">
                            R$ {balance.toFixed(2)}
                        </h3>
                        <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400 bg-emerald-400/10 w-fit px-2 py-1 rounded-lg">
                            <TrendingUp size={16} />
                            <span>Fluxo positivo</span>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 bg-white border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-4 top-4 p-2 bg-green-50 text-green-600 rounded-lg group-hover:scale-110 transition-transform">
                        <ArrowUpRight size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Receitas</p>
                        <h3 className="text-2xl font-bold text-gray-800">R$ {totalIncome.toFixed(2)}</h3>
                        <div className="mt-2 text-xs text-gray-400">Total de entradas no período</div>
                    </div>
                </Card>

                <Card className="p-6 bg-white border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute right-4 top-4 p-2 bg-red-50 text-red-600 rounded-lg group-hover:scale-110 transition-transform">
                        <ArrowDownRight size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 mb-1">Despesas</p>
                        <h3 className="text-2xl font-bold text-gray-800">R$ {totalExpense.toFixed(2)}</h3>
                        <div className="mt-2 text-xs text-gray-400">Total de saídas no período</div>
                    </div>
                </Card>
            </div>

            {/* List */}
            <Card className="overflow-hidden bg-white shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-700">FluxoRecente</h2>
                    <Button variant="ghost" size="sm" className="text-brand-primary">Ver Tudo</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="p-4">Descrição</th>
                                <th className="p-4">Categoria</th>
                                <th className="p-4">Data</th>
                                <th className="p-4 text-right">Valor</th>
                                <th className="p-4 text-center">Tipo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {transactions.map((t) => (
                                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-bold text-gray-800">{t.description}</td>
                                    <td className="p-4 text-gray-500">
                                        <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">
                                            {t.category}
                                        </span>
                                    </td>
                                    <td className="p-4 text-gray-500">
                                        {new Date(t.date).toLocaleDateString()}
                                    </td>
                                    <td className={clsx("p-4 text-right font-bold", t.type === 'income' ? "text-green-600" : "text-red-600")}>
                                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        {t.type === 'income' ? (
                                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
                                                <ArrowUpRight size={16} />
                                            </div>
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                                                <ArrowDownRight size={16} />
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card >

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveTransaction}
            />
        </div >
    );
};

export default Finance;
