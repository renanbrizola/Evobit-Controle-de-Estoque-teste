import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Search, Users, Phone, Building2, Loader2, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Trash2, MessageCircle, Calendar as CalendarIcon, ExternalLink, X, Download, Filter, Link as LinkIcon, Upload, Info, MapPin, DollarSign, Package } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { toast } from 'sonner';
import clsx from 'clsx';
import * as XLSX from 'xlsx';
import DataImporter from '../components/shared/DataImporter';
import { useLanguage } from '../contexts/LanguageContext';
import ProviderForm from '../components/forms/ProviderForm';

const Providers = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingProvider, setEditingProvider] = useState(null);
    const [viewingProvider, setViewingProvider] = useState(null);

    // View & Filter State
    const [viewMode, setViewMode] = useState('list'); // 'grid' | 'list'
    const [filterOrderDay, setFilterOrderDay] = useState('TODOS');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
    const [allProducts, setAllProducts] = useState([]);
    const [allMovements, setAllMovements] = useState([]);

    const providerTemplate = {
        example: {
            name: 'Atacadão Exemplo S.A.',
            cnpj: '12345678000199',
            seller: 'João Silva',
            phone: '11999998888',
            delivery_time: '2 dias',
            payment_terms: '30 dias',
            product_types: 'Bebidas, Limpeza',
            order_day: 'Segunda-feira'
        },
        rules: {
            required: ['name'],
            numbers: []
        }
    };

    const handleImport = async (data) => {
        setIsImporting(false);
        setLoading(true);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const item of data) {
                try {
                    await api.providers.create({
                        name: item.name,
                        cnpj: item.cnpj ? String(item.cnpj) : '',
                        seller: item.seller || '',
                        phone: item.phone ? String(item.phone) : '',
                        delivery_time: item.delivery_time || '',
                        payment_terms: item.payment_terms || '',
                        product_types: item.product_types || '',
                        order_day: item.order_day || ''
                    });
                    successCount++;
                } catch (err) {
                    console.error("Erro ao importar item:", item, err);
                    errorCount++;
                }
            }

            if (successCount > 0) toast.success(`${successCount} fornecedores importados!`);
            if (errorCount > 0) toast.warning(`${errorCount} falharam na importação.`);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Erro fatal na importação.");
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const dataToExport = sortedProviders.map(p => ({
            "Nome": p.name,
            "CNPJ": p.cnpj || '',
            "Vendedor": p.seller || '',
            "Telefone": p.phone || '',
            "Dia do Pedido": p.order_day || '',
            "Prazo Entrega": p.delivery_time || '',
            "Pagamento": p.payment_terms || '',
            "Tipos de Produtos": p.product_types || ''
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Fornecedores");
        XLSX.writeFile(wb, "fornecedores.xlsx");
    };

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.providers.list();
            setProviders(data);
            // Load products and movements for linked products section
            try {
                const [prods, movs] = await Promise.all([api.products.list(), api.movements.list()]);
                setAllProducts(prods.data || prods);
                setAllMovements(movs);
            } catch { /* silent */ }
        } catch (error) {
            console.error(error);
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

    const handleEdit = (provider) => {
        setEditingProvider(provider);
        setIsFormOpen(true);
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Tem certeza que deseja excluir "${name}" ? `)) return;

        try {
            setLoading(true);
            await api.providers.delete(id);
            toast.success(t('products', 'toast.deleted'));
            loadData();
        } catch (error) {
            console.error(error);
            toast.error(`Erro: ${error.message || error.details || "Não foi possível excluir"} `);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseForm = () => {
        setEditingProvider(null);
        setIsFormOpen(false);
    };

    const handleViewDetails = (provider) => {
        setViewingProvider(provider);
    };

    const handleSave = async (formData) => {
        try {
            setSaving(true);

            if (editingProvider) {
                await api.providers.update(editingProvider.id, formData);
                toast.success(t('products', 'toast.updated'));
            } else {
                await api.providers.create(formData);
                toast.success(t('products', 'toast.created'));
            }

            loadData();
            handleCloseForm();
        } catch (error) {
            console.error(error);
            if (error.code === '23505') {
                toast.error("Fornecedor já cadastrado!");
            } else {
                toast.error(`Erro: ${error.message || error.details || "Erro ao salvar"} `);
            }
        } finally {
            setSaving(false);
        }
    };

    // Helper: WhatsApp Link
    const getWhatsappLink = (phone) => {
        if (!phone) return '#';
        const numbers = phone.replace(/\D/g, '');
        return `https://wa.me/55${numbers}`;
    };

    // Helper: Google Calendar Link
    const getCalendarLink = (providerName, weekDay) => {
        if (!weekDay || weekDay === 'Variável' || weekDay === 'TODOS') return '#';

        const dayMap = {
            'Domingo': 0, 'Segunda-feira': 1, 'Terça-feira': 2, 'Quarta-feira': 3,
            'Quinta-feira': 4, 'Sexta-feira': 5, 'Sábado': 6
        };

        const targetDay = dayMap[weekDay];
        if (targetDay === undefined) return '#';

        const date = new Date();
        const currentDay = date.getDay();
        let daysUntil = targetDay - currentDay;
        if (daysUntil <= 0) daysUntil += 7; // Next occurrence

        date.setDate(date.getDate() + daysUntil);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}${mm}${dd}`;

        const title = encodeURIComponent(`Fazer Pedido: ${providerName}`);
        const details = encodeURIComponent(`Lembrete para realizar pedido com o fornecedor ${providerName}.`);

        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}`;
    };

    // Sorting Helper
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedProviders = useMemo(() => {
        let items = providers.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.product_types && p.product_types.toLowerCase().includes(search.toLowerCase()));

            const matchesOrderDay = filterOrderDay === 'TODOS' || p.order_day === filterOrderDay;

            return matchesSearch && matchesOrderDay;
        });

        if (sortConfig.key) {
            items.sort((a, b) => {
                let aValue = (a[sortConfig.key] || '').toString().toLowerCase();
                let bValue = (b[sortConfig.key] || '').toString().toLowerCase();

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return items;
    }, [providers, search, filterOrderDay, sortConfig]);

    // Header Component for Sorting
    const SortableHeader = ({ label, sortKey, align = 'left' }) => (
        <th
            className={`py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-xs text-${align} cursor-pointer hover:bg-brand-dark/5 transition-colors select-none`}
            onClick={() => handleSort(sortKey)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                {label}
                {sortConfig.key === sortKey ? (
                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-brand-primary" /> : <ArrowDown size={14} className="text-brand-primary" />
                ) : (
                    <ArrowUpDown size={14} className="text-gray-600" />
                )}
            </div>
        </th>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div></div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsImporting(true)} className="border-brand-light/10 text-gray-500 hover:bg-brand-dark/5 hover:text-brand-light">
                        <ArrowUp size={20} className="mr-2 rotate-180" /> {t('common', 'import')}
                    </Button>
                    <Button onClick={() => setIsFormOpen(true)} className="shadow-glow">
                        <Plus size={20} className="mr-2" /> {t('providers', 'newProvider')}
                    </Button>
                </div>
            </div>

            <Card className="p-4 flex flex-col md:flex-row gap-4 items-center bg-white/80 dark:bg-brand-dark/50 border border-gray-100 dark:border-white/5 backdrop-blur-md shadow-sm">
                {/* ... existing search code ... */}
                <div className="flex-1 w-full">
                    <Input
                        icon={Search}
                        className="bg-white dark:bg-black/40 border-gray-200 dark:border-white/10 focus:border-brand-primary/50"
                        placeholder={t('providers', 'searchPlaceholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Filter Order Day */}
                <div className="w-full md:w-48">
                    <select
                        className="w-full h-10 px-3 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-600 dark:text-gray-300 focus:border-brand-primary/50 outline-none hover:border-brand-primary/30 transition-all appearance-none cursor-pointer font-medium"
                        value={filterOrderDay}
                        onChange={e => setFilterOrderDay(e.target.value)}
                    >
                        <option value="TODOS" className="bg-white dark:bg-gray-900">{t('common', 'all')}</option>
                        <option value="Segunda-feira" className="bg-white dark:bg-gray-900">{t('common', 'weekdays.monday')}</option>
                        <option value="Terça-feira" className="bg-white dark:bg-gray-900">{t('common', 'weekdays.tuesday')}</option>
                        <option value="Quarta-feira" className="bg-white dark:bg-gray-900">{t('common', 'weekdays.wednesday')}</option>
                        <option value="Quinta-feira" className="bg-white dark:bg-gray-900">{t('common', 'weekdays.thursday')}</option>
                        <option value="Sexta-feira" className="bg-white dark:bg-gray-900">{t('common', 'weekdays.friday')}</option>
                        <option value="Sábado" className="bg-white dark:bg-gray-900">{t('common', 'weekdays.saturday')}</option>
                        <option value="Domingo" className="bg-white dark:bg-gray-900">{t('common', 'weekdays.sunday')}</option>
                        <option value="Variável" className="bg-white dark:bg-gray-900">{t('providers', 'variable')}</option>
                    </select>
                </div>

                {/* View Toggle */}
                <div className="flex bg-white dark:bg-black/40 p-1 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={clsx(
                            "p-2 rounded-lg transition-all",
                            viewMode === 'grid' ? "bg-brand-primary text-brand-dark shadow-sm" : "text-gray-400 hover:text-brand-primary"
                        )}
                        title={t('common', 'viewGrid')}
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={clsx(
                            "p-2 rounded-lg transition-all",
                            viewMode === 'list' ? "bg-brand-primary text-brand-dark shadow-sm" : "text-gray-400 hover:text-brand-primary"
                        )}
                        title={t('common', 'viewList')}
                    >
                        <List size={20} />
                    </button>
                </div>
            </Card>

            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-brand-primary" size={32} />
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {sortedProviders.map((prov) => (
                                <div
                                    key={prov.id}
                                    className="glass-card p-5 group relative cursor-pointer hover:border-brand-primary/30 hover:scale-[1.01] transition-all duration-300"
                                    onClick={() => handleViewDetails(prov)}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300 shadow-glow">
                                            <Building2 size={24} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-lg text-gray-900 dark:text-brand-light">{prov.name}</h3>
                                                    {prov.cnpj && <p className="text-xs text-gray-400 mb-2">CNPJ: {prov.cnpj}</p>}
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(prov); }}
                                                        className="p-2 rounded-lg hover:bg-white/10 text-brand-primary transition-colors"
                                                        title="Editar"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                    {(user?.role === 'admin' || user?.role === 'owner') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleDelete(prov.id, prov.name); }}
                                                            className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 mt-3">
                                                {prov.seller && (
                                                    <span className="text-xs bg-black/30 px-2 py-1 rounded-lg flex items-center gap-1 text-gray-300 border border-white/5">
                                                        <Users size={12} /> {prov.seller}
                                                    </span>
                                                )}
                                                {prov.phone && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs bg-black/30 px-2 py-1 rounded-lg flex items-center gap-1 text-gray-300 border border-white/5">
                                                            <Phone size={12} /> {prov.phone}
                                                        </span>
                                                        <a
                                                            href={getWhatsappLink(prov.phone)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 p-1.5 rounded-lg transition-colors border border-emerald-500/20"
                                                            title="Abrir WhatsApp"
                                                        >
                                                            <MessageCircle size={14} />
                                                        </a>
                                                    </div>
                                                )}
                                                {prov.order_day && (
                                                    <a
                                                        href={getCalendarLink(prov.name, prov.order_day)}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/20 font-medium flex items-center gap-1 transition-colors group cursor-pointer"
                                                        title="Adicionar à Agenda"
                                                    >
                                                        <CalendarIcon size={12} />
                                                        {prov.order_day}
                                                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </a>
                                                )}
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400 border-t border-white/5 pt-2">
                                                <div>
                                                    <span className="block font-semibold text-gray-500">{t('providers', 'columns.delivery')}</span>
                                                    {prov.delivery_time || '-'}
                                                </div>
                                                <div>
                                                    <span className="block font-semibold text-gray-500">{t('providers', 'columns.payment')}</span>
                                                    {prov.payment_terms || '-'}
                                                </div>
                                            </div>

                                            {prov.product_types && (
                                                <div className="mt-3 pt-2 border-t border-white/5">
                                                    <span className="text-xs font-semibold text-gray-500 block mb-1">{t('providers', 'columns.products')}</span>
                                                    <div className="flex flex-wrap gap-1">
                                                        {prov.product_types.split(',').map((tag, i) => (
                                                            <span key={i} className="text-[10px] bg-brand-dark/5 text-gray-500 px-1.5 py-0.5 rounded border border-brand-light/10">
                                                                {tag.trim()}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // LIST VIEW TABLE
                        <div className="rounded-[2rem] shadow-glass border border-gray-200 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white/80 dark:bg-[#121212]/50 backdrop-blur-md">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50/80 dark:bg-black/20 border-b border-gray-200 dark:border-white/10">
                                        <tr>
                                            <SortableHeader label={t('providers', 'columns.provider')} sortKey="name" />
                                            <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-xs">CNPJ</th>
                                            <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-xs">{t('providers', 'columns.contact')}</th>
                                            <SortableHeader label={t('providers', 'columns.orderDay')} sortKey="order_day" />
                                            <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-xs">{t('providers', 'columns.delivery')}</th>
                                            <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-xs">{t('providers', 'columns.products')}</th>
                                            <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-xs text-right w-[120px]">{t('common', 'actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {sortedProviders.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="py-10 text-center text-gray-500">
                                                    {t('dashboard', 'noActivity')}
                                                </td>
                                            </tr>
                                        ) : (
                                            sortedProviders.map((prov) => (
                                                <tr
                                                    key={prov.id}
                                                    className="hover:bg-gray-50 dark:hover:bg-brand-dark/5 transition-colors border-b border-gray-100 dark:border-white/5 last:border-0 cursor-pointer group"
                                                    onClick={() => handleViewDetails(prov)}
                                                >
                                                    <td className="py-4 px-6 font-medium text-gray-900 dark:text-brand-light">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-1.5 bg-brand-primary/10 rounded-lg text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300">
                                                                <Building2 size={16} />
                                                            </div>
                                                            {prov.name}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-gray-400 font-mono text-xs">
                                                        {prov.cnpj || '-'}
                                                    </td>
                                                    <td className="py-4 px-6 text-gray-400">
                                                        <div className="flex flex-col gap-1">
                                                            {prov.seller && (
                                                                <span className="flex items-center gap-1 text-xs">
                                                                    <Users size={12} /> {prov.seller}
                                                                </span>
                                                            )}
                                                            {prov.phone && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="flex items-center gap-1 text-xs text-brand-primary">
                                                                        <Phone size={12} /> {prov.phone}
                                                                    </span>
                                                                    <a
                                                                        href={getWhatsappLink(prov.phone)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 rounded-lg p-0.5 transition-colors"
                                                                        title="WhatsApp"
                                                                    >
                                                                        <MessageCircle size={14} />
                                                                    </a>
                                                                </div>
                                                            )}
                                                            {!prov.seller && !prov.phone && '-'}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        {prov.order_day ? (
                                                            <a
                                                                href={getCalendarLink(prov.name, prov.order_day)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="text-xs bg-blue-500/10 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 px-2 py-1 rounded-lg border border-blue-500/20 font-medium flex items-center gap-1 w-fit transition-colors"
                                                                title="Agendar Pedido"
                                                            >
                                                                {prov.order_day}
                                                                <ExternalLink size={10} />
                                                            </a>
                                                        ) : (
                                                            <span className="text-gray-600">-</span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 px-6 text-xs text-gray-400">
                                                        <div>
                                                            <span className="text-gray-500">{t('providers', 'columns.delivery')}:</span> {prov.delivery_time || '-'}
                                                        </div>
                                                        <div>
                                                            <span className="text-gray-500">{t('providers', 'columns.payment')}:</span> {prov.payment_terms || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                            {prov.product_types ? (
                                                                prov.product_types.split(',').map((tag, i) => (
                                                                    <span key={i} className="text-[10px] bg-brand-dark/5 text-gray-500 px-1.5 py-0.5 rounded border border-brand-light/10">
                                                                        {tag.trim()}
                                                                    </span>
                                                                ))
                                                            ) : (
                                                                <span className="text-gray-600">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleEdit(prov); }}
                                                                className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-brand-primary hover:bg-brand-primary/10 transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDelete(prov.id, prov.name); }}
                                                                className="h-8 w-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                                                title="Excluir"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            {isImporting && (
                <Modal isOpen={isImporting} onClose={() => setIsImporting(false)} className="max-w-2xl bg-[#121212] border-white/10">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Upload size={20} className="text-brand-primary" />
                            {t('providers', 'importTitle')}
                        </h3>
                    </div>
                    <DataImporter
                        type="providers"
                        onImport={handleImport}
                        onExportData={handleExport}
                        templates={{ providers: providerTemplate }}
                    />
                </Modal>
            )}

            <Modal isOpen={isFormOpen} onClose={handleCloseForm} className="max-w-4xl bg-[#121212] border-brand-light/10">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                    <h3 className="text-xl font-serif font-bold text-brand-light">
                        {editingProvider ? t('common', 'edit') : t('providers', 'newProvider')}
                    </h3>
                    <div className="flex gap-2">
                        {editingProvider && (
                            <span className="text-xs bg-brand-primary/10 text-brand-primary px-2 py-1 rounded border border-brand-primary/20">
                                {editingProvider.is_active ? 'ATIVO' : 'INATIVO'}
                            </span>
                        )}
                    </div>
                </div>

                <ProviderForm
                    initialData={editingProvider}
                    onSave={handleSave}
                    onCancel={handleCloseForm}
                    saving={saving}
                />
            </Modal>

            {/* Provider Details Modal */}
            {viewingProvider && (
                <Modal isOpen={!!viewingProvider} onClose={() => setViewingProvider(null)} className="max-w-5xl bg-[#F8FAFC] dark:bg-[#09090b] border-brand-light/10">
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200 dark:border-white/5">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-brand-primary/10 rounded-2xl text-brand-primary shadow-sm">
                                <Building2 size={32} />
                            </div>
                            <div>
                                <h3 className="text-3xl font-bold text-gray-900 dark:text-brand-light tracking-tight">{viewingProvider.name}</h3>
                                {viewingProvider.trade_name && <p className="text-lg text-gray-500 dark:text-gray-400 font-medium">{viewingProvider.trade_name}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mr-12">
                            <span className={clsx("text-sm px-4 py-1.5 rounded-full border font-bold flex items-center shadow-sm", viewingProvider.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20" : "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20")}>
                                {viewingProvider.is_active ? 'ATIVO' : 'INATIVO'}
                            </span>
                        </div>
                    </div>

                    <div key={viewingProvider.id} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300 pr-1">
                        {/* Section 1: Info & Address */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2 mb-2">
                                    <Info size={18} /> Dados Cadastrais
                                </h4>
                                <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/5 space-y-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">CNPJ</span>
                                            <span className="font-mono text-lg text-gray-900 dark:text-gray-200 font-semibold tracking-tight">{viewingProvider.cnpj || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Inscrição Estadual</span>
                                            <span className="text-lg text-gray-900 dark:text-gray-200 font-semibold">{viewingProvider.ie || '-'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">Tipos de Produtos</span>
                                        <div className="flex flex-wrap gap-2">
                                            {viewingProvider.product_types ? viewingProvider.product_types.split(',').map((t, i) => (
                                                <span key={i} className="text-sm font-medium bg-gray-50 dark:bg-brand-dark/30 border border-gray-200 dark:border-white/10 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-300">{t.trim()}</span>
                                            )) : <span className="text-gray-400">-</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2 mb-2">
                                    <MapPin size={18} /> Endereço
                                </h4>
                                <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-center">
                                    <p className="text-lg text-gray-900 dark:text-gray-200 leading-relaxed font-medium">
                                        {viewingProvider.street ? (
                                            <>
                                                {viewingProvider.street}, {viewingProvider.number} {viewingProvider.complement && `(${viewingProvider.complement})`}
                                                <br />
                                                {viewingProvider.neighborhood} - {viewingProvider.city}/{viewingProvider.state}
                                                <br />
                                                <span className="text-gray-500 dark:text-gray-400 font-mono text-base mt-2 block flex items-center gap-2">CEP: {viewingProvider.cep}</span>
                                            </>
                                        ) : (
                                            viewingProvider.address || <span className="text-gray-400 italic">Endereço não cadastrado</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Contact */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2 mb-2">
                                <Phone size={18} /> Contato
                            </h4>
                            <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm hover:shadow-md transition-shadow">
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Vendedor / Representante</span>
                                    <span className="text-lg text-gray-900 dark:text-gray-200 font-semibold">{viewingProvider.seller || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Telefone</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg text-gray-900 dark:text-gray-200 font-medium">{viewingProvider.phone || '-'}</span>
                                        {viewingProvider.phone && (
                                            <a href={getWhatsappLink(viewingProvider.phone)} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 p-1 hover:bg-emerald-50 rounded-full transition-colors">
                                                <MessageCircle size={20} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Celular</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg text-gray-900 dark:text-gray-200 font-medium">{viewingProvider.mobile_phone || '-'}</span>
                                        {viewingProvider.mobile_phone && (
                                            <a href={getWhatsappLink(viewingProvider.mobile_phone)} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-600 dark:text-emerald-400 dark:hover:text-emerald-300 p-1 hover:bg-emerald-50 rounded-full transition-colors">
                                                <MessageCircle size={20} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-1">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Email Comercial</span>
                                    <span className="text-base text-gray-900 dark:text-gray-200 font-medium break-all">{viewingProvider.email || '-'}</span>
                                </div>
                                <div className="md:col-span-1">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Email NFe</span>
                                    <span className="text-base text-gray-900 dark:text-gray-200 font-medium break-all">{viewingProvider.email_nfe || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Website</span>
                                    {viewingProvider.website ? (
                                        <a href={viewingProvider.website.startsWith('http') ? viewingProvider.website : `https://${viewingProvider.website}`} target="_blank" rel="noopener noreferrer" className="text-base text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium">
                                            {viewingProvider.website} <ExternalLink size={14} />
                                        </a>
                                    ) : <span className="text-gray-400">-</span>}
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Financial */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2 mb-2">
                                <DollarSign size={18} /> Dados Comerciais & Financeiros
                            </h4>
                            <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-4 gap-6 shadow-sm hover:shadow-md transition-shadow">
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Dia do Pedido</span>
                                    <span className="text-lg text-brand-primary font-bold tracking-tight">{viewingProvider.order_day || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Prazo de Entrega</span>
                                    <span className="text-lg text-gray-900 dark:text-gray-200 font-medium">{viewingProvider.delivery_time || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Condições de Pagamento</span>
                                    <span className="text-lg text-gray-900 dark:text-gray-200 font-medium">{viewingProvider.payment_terms || '-'}</span>
                                </div>
                                <div>
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Limite de Crédito</span>
                                    <span className="text-xl text-emerald-600 dark:text-emerald-400 font-mono font-bold tracking-tight">
                                        {viewingProvider.credit_limit ? Number(viewingProvider.credit_limit).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                                    </span>
                                </div>
                                <div className="md:col-span-4 mt-2 pt-6 border-t border-gray-100 dark:border-white/5">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-3">Dados Bancários / Observações</span>
                                    <div className="bg-gray-50 dark:bg-black/20 p-5 rounded-xl border border-gray-200 dark:border-white/5">
                                        <p className="text-base text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                                            {viewingProvider.bank_info || 'Sem informações bancárias registradas.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Linked Products */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2 mb-2">
                                <Package size={18} /> Produtos Vinculados
                            </h4>
                            {(() => {
                                const provId = viewingProvider.id;
                                const provName = (viewingProvider.name || '').trim().toLowerCase();
                                
                                // Strategy 1: Products directly linked by provider_id
                                const directLinkedProducts = allProducts.filter(p => p.provider_id === provId);
                                
                                // Strategy 2: Movements linked by provider name (fallback for legacy data)
                                const linkedMovements = allMovements.filter(m =>
                                    m.type === 'Entrada' && (m.provider || '').trim().toLowerCase() === provName
                                );
                                
                                const productMap = {};
                                // Add direct linked products first
                                directLinkedProducts.forEach(p => {
                                    productMap[p.id] = { name: p.name, qty: Number(p.current_stock || 0), count: 0, isDirect: true };
                                });
                                // Enrich with movement data
                                linkedMovements.forEach(m => {
                                    if (!productMap[m.product_id]) {
                                        productMap[m.product_id] = { name: m.productName, qty: 0, count: 0, isDirect: false };
                                    }
                                    productMap[m.product_id].qty += Number(m.qty || m.quantity || 0);
                                    productMap[m.product_id].count += 1;
                                });
                                const linkedProducts = Object.entries(productMap)
                                    .sort(([, a], [, b]) => b.qty - a.qty);

                                if (linkedProducts.length === 0) {
                                    return (
                                        <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/5 text-center text-gray-400">
                                            <Package size={32} className="mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">Nenhum produto vinculado por movimentações</p>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="bg-white dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-white/5">
                                                <tr>
                                                    <th className="text-left px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Produto</th>
                                                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Entradas</th>
                                                    <th className="text-center px-4 py-2.5 font-semibold text-gray-600 dark:text-gray-400">Qtd Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                {linkedProducts.map(([id, data]) => (
                                                    <tr key={id} className="hover:bg-gray-50 dark:hover:bg-white/5">
                                                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{data.name}</td>
                                                        <td className="px-4 py-2.5 text-center text-gray-500">{data.count}x</td>
                                                        <td className="px-4 py-2.5 text-center font-bold text-emerald-600">{data.qty} un</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-gray-200 dark:border-white/5 flex justify-end gap-3 sticky bottom-0 bg-[#F8FAFC] dark:bg-[#09090b] py-2">
                        <Button variant="ghost" onClick={() => setViewingProvider(null)} className="hover:bg-gray-100 dark:hover:bg-white/5">Fechar</Button>
                        <Button onClick={() => {
                            setViewingProvider(null);
                            handleEdit(viewingProvider);
                        }} className="shadow-lg hover:shadow-xl transition-shadow bg-brand-primary hover:bg-brand-primary/90 text-white">
                            <Pencil size={18} className="mr-2" /> Editar Fornecedor
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Providers;


