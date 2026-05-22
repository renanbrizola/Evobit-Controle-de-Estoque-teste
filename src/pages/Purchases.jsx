import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { ShoppingCart, Plus, Calendar, FileText, CheckCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import PurchaseForm from '../components/purchases/PurchaseForm';

import { PurchaseService } from '../services/purchases';
import { getStatusLabel } from '../utils/statusHelper';
import { toast } from 'sonner';

const Purchases = () => {
    const [isCreating, setIsCreating] = useState(false);
    const [purchases, setPurchases] = useState([]);
    const [stats, setStats] = useState({ total: 0, count: 0 });



    const loadPurchases = async () => {
        try {
            const data = await PurchaseService.list();
            setPurchases(data);

            // Calculate stats
            const total = data.reduce((acc, p) => acc + p.total, 0);
            setStats({ total, count: data.length });
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar compras');
        }
    };

    useEffect(() => {
        loadPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleSavePurchase = (newPurchase) => {
        // Reload list to get updated data (providers names etc)
        loadPurchases();
        setIsCreating(false);
    };

    if (isCreating) {
        return (
            <div className="container mx-auto max-w-5xl py-6">
                <PurchaseForm onCancel={() => setIsCreating(false)} onSave={handleSavePurchase} />
            </div>
        );
    }

    return (
        <div className="space-y-6 container mx-auto max-w-6xl py-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingCart className="text-brand-primary" /> Gestão de Compras
                    </h1>
                    <p className="text-gray-500">Gerencie suas aquisições e entrada de estoque</p>
                </div>
                <Button onClick={() => setIsCreating(true)} className="shadow-lg shadow-brand-primary/20">
                    <Plus size={20} className="mr-2" /> Nova Compra
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6 bg-white border-l-4 border-l-blue-500 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Gastos no Mês</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">R$ 1.700,50</h3>
                        </div>
                        <div className="p-2 bg-blue-50 text-blue-500 rounded-lg">
                            <Calendar size={20} />
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-white border-l-4 border-l-green-500 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Compras Realizadas</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">{purchases.length}</h3>
                        </div>
                        <div className="p-2 bg-green-50 text-green-500 rounded-lg">
                            <CheckCircle size={20} />
                        </div>
                    </div>
                </Card>
                <Card className="p-6 bg-white border-l-4 border-l-amber-500 shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-gray-500">Aguardando Entrega</p>
                            <h3 className="text-2xl font-bold text-gray-800 mt-1">0</h3>
                        </div>
                        <div className="p-2 bg-amber-50 text-amber-500 rounded-lg">
                            <FileText size={20} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* List */}
            <Card className="overflow-hidden bg-white shadow-sm border border-gray-100">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-bold text-gray-700">Histórico de Compras</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                            <tr>
                                <th className="p-4">Data</th>
                                <th className="p-4">Fornecedor</th>
                                <th className="p-4 text-center">Itens</th>
                                <th className="p-4 text-right">Total</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {purchases.map((purchase) => (
                                <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-gray-700">
                                        {new Date(purchase.date).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 font-bold text-gray-800">{purchase.providerName}</td>
                                    <td className="p-4 text-center">
                                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-bold">
                                            {purchase.itemsCount} itens
                                        </span>
                                    </td>
                                    <td className="p-4 text-right font-bold text-gray-900">
                                        R$ {purchase.total.toFixed(2)}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200 uppercase tracking-wide">
                                            {getStatusLabel(purchase.status)}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        <Button variant="ghost" size="sm" className="text-brand-primary h-8 px-2">
                                            Detalhes
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Purchases;
