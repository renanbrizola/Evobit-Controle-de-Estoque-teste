import React, { useState, useEffect } from 'react';
import {
    Search, Plus, Filter, FileText, ShoppingCart, CheckCircle,
    Clock, XCircle, MoreVertical, Printer, Edit, Trash, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { getStatusInfo } from '../utils/statusHelper';
import { OrdersService } from '../services/orders';
import { formatCurrency, formatDate } from '../utils/formatters';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const StatusBadge = ({ status, type }) => {
    // For Quotes show a special label
    const normalized = status?.toUpperCase();
    if (type === 'QUOTE' && (normalized === 'PENDING' || normalized === 'OPEN' || normalized === 'DRAFT')) {
        return <span className="px-2 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Orçamento</span>;
    }

    const info = getStatusInfo(status);
    return (
        <span className={`px-2 py-1 rounded-full text-xs font-bold ${info.color}`}>
            {info.label}
        </span>
    );
};

const Orders = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState([]);
    const [filterType, setFilterType] = useState('ALL'); // ALL, QUOTE, SALE
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadOrders();
    }, [filterType]);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const filters = {};
            if (filterType !== 'ALL') filters.type = filterType;

            const data = await OrdersService.list(filters);
            setOrders(data);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar pedidos');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (order) => {
        // Navigate to Sales screen with order data to edit/convert
        navigate('/app/vendas', { state: { orderToEdit: order } });
    };

    const filteredOrders = orders.filter(order =>
        order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pedidos e Orçamentos</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie suas vendas e orçamentos em um só lugar</p>
                </div>
                <Button onClick={() => navigate('/app/vendas')} className="gap-2 shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5">
                    <Plus size={20} />
                    Nova Venda / Orçamento
                </Button>
            </div>

            {/* Filters */}
            <Card className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex gap-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                    <button
                        onClick={() => setFilterType('ALL')}
                        className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", filterType === 'ALL' ? "bg-white dark:bg-white/10 shadow text-brand-primary" : "text-gray-500 hover:text-gray-900 dark:hover:text-white")}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilterType('QUOTE')}
                        className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", filterType === 'QUOTE' ? "bg-white dark:bg-white/10 shadow text-brand-primary" : "text-gray-500 hover:text-gray-900 dark:hover:text-white")}
                    >
                        Orçamentos
                    </button>
                    <button
                        onClick={() => setFilterType('SALE')}
                        className={clsx("px-4 py-2 rounded-lg text-sm font-medium transition-all", filterType === 'SALE' ? "bg-white dark:bg-white/10 shadow text-brand-primary" : "text-gray-500 hover:text-gray-900 dark:hover:text-white")}
                    >
                        Vendas
                    </button>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <Input
                        placeholder="Buscar por cliente ou ID..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>

            {/* List */}
            <div className="grid gap-4">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Carregando...</div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
                        Nenhum registro encontrado
                    </div>
                ) : (
                    filteredOrders.map(order => (
                        <Card key={order.id} className="p-4 hover:border-brand-primary/30 transition-all cursor-pointer group" onClick={() => handleEdit(order)}>
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center", order.type === 'QUOTE' ? "bg-purple-100 text-purple-600 dark:bg-purple-900/20" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20")}>
                                        {order.type === 'QUOTE' ? <FileText size={24} /> : <ShoppingCart size={24} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900 dark:text-white">#{order.id.substr(0, 8)}</span>
                                            <StatusBadge status={order.status} type={order.type} />
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <Clock size={14} />
                                            {formatDate(order.created_at)}
                                            <span className="mx-1">•</span>
                                            {order.customer_name || 'Cliente Balcão'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500 uppercase">Total</div>
                                        <div className="font-bold text-lg text-gray-900 dark:text-white">{formatCurrency(order.total)}</div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="group-hover:text-brand-primary">
                                        <ArrowRight size={20} />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default Orders;
