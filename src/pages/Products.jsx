
import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { Plus, Search, Package, AlertCircle, Loader2, Pencil, Trash2, ScanBarcode, LayoutGrid, List, ArrowUpDown, ArrowUp, ArrowDown, ArrowRight, ArrowLeft, X, Download, Filter } from 'lucide-react';
import Modal from '../components/ui/Modal'; // Added import
import { formatCurrency } from '../utils/formatters';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import clsx from 'clsx';
import ProductForm from '../components/forms/ProductForm';

import { useLanguage } from '../contexts/LanguageContext';
import DataImporter from '../components/shared/DataImporter';
import { usePagination, PaginationBar } from '../components/shared/TablePagination';

const Products = () => {
    const { t } = useLanguage();
    const [searchParams, setSearchParams] = useSearchParams();
    const tipo = searchParams.get('tipo');
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    // 'grid' | 'list' — lista é o padrão (preferência do usuário, persistida)
    const [viewMode, setViewModeState] = useState(() => {
        try { return localStorage.getItem('evobit_products_view') || 'list'; } catch { return 'list'; }
    });
    const setViewMode = (mode) => {
        setViewModeState(mode);
        try { localStorage.setItem('evobit_products_view', mode); } catch { /* noop */ }
    };
    const [search, setSearch] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

    // Form State
    const [editingProduct, setEditingProduct] = useState(null);
    const [viewingProduct, setViewingProduct] = useState(null);
    const [productFormDefaults, setProductFormDefaults] = useState(null);

    // Auto-open form if intent is creating an insumo
    useEffect(() => {
        if (tipo === 'insumo') {
            setProductFormDefaults({ is_raw_material: true });
            setIsFormOpen(true);
            
            // Clean up the URL so it doesn't reopen if the user closes it
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('tipo');
            setSearchParams(newSearchParams, { replace: true });
        }
    }, [tipo, searchParams, setSearchParams]);

    const handleViewDetails = (product) => {
        setViewingProduct(product);
    };

    const getProviderName = (prod) => {
        if (prod.provider_id) {
            const provider = providers.find(p => p.id === prod.provider_id);
            return provider ? provider.name : (prod.last_supplier || '-');
        }
        return prod.last_supplier || '-';
    };

    const productTemplate = [
        { header: 'Nome do Produto', key: 'name', required: true },
        { header: 'Marca', key: 'brand' },
        { header: 'Código de Barras', key: 'barcode' },
        { header: 'Categoria', key: 'category' },
        { header: 'Unidade (UN, KG, LT, CX)', key: 'unit' },
        { header: 'Preço de Venda', key: 'price', type: 'number' },
        { header: 'Estoque Mínimo', key: 'min_stock', type: 'number' },
        { header: 'Estoque Atual', key: 'current_stock', type: 'number' }
    ];

    useEffect(() => {
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps restritas de proposito (fetch-on-mount/por-filtro; padrao legado auditado)
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [prods, cats, provs] = await Promise.all([
                api.products.list(),
                api.categories.list(),
                api.providers.list()
            ]);
            setProducts(prods);
            setCategories(cats);
            setProviders(provs);
        } catch (error) {
            console.error(error);
            toast.error(t('common', 'error'));
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (data) => {
        try {
            setLoading(true);
            await api.products.import(data);
            toast.success(t('products', 'toast.imported'));
            loadData();
            setIsImporting(false);
        } catch (error) {
            console.error(error);
            toast.error(t('common', 'error'));
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(t('common', 'deleteConfirm', { name }))) {
            try {
                await api.products.delete(id);
                setProducts(products.filter(p => p.id !== id));
                toast.success(t('common', 'success'));
            } catch (error) {
                console.error(error);
                toast.error(t('common', 'error'));
            }
        }
    };

    // Derived state for categories (loaded in loadData)

    const handleSave = async (formData) => {
        // ProductForm already validates name and parses numbers
        try {
            setSaving(true);

            if (editingProduct) {
                // UPDATE
                await api.products.update(editingProduct.id, formData);
                if (formData.is_raw_material) {
                    toast.success("Produto atualizado! Ele já aparecerá em Ficha Técnica → Insumos.");
                } else {
                    toast.success(t('products', 'toast.updated'));
                }
            } else {
                // CREATE
                await api.products.create(formData);
                if (formData.is_raw_material) {
                    toast.success("Produto salvo! Ele já aparecerá em Ficha Técnica → Insumos.");
                } else {
                    toast.success(t('products', 'toast.created'));
                }
            }

            loadData();
            handleCloseForm();
        } catch (error) {
            console.error(error);
            if (error.code === '23505') {
                if (error.details?.includes('barcode')) {
                    toast.error("Código de barras já cadastrado!");
                } else {
                    toast.error("Produto já cadastrado com esse nome!");
                }
            } else {
                toast.error(`Erro ao salvar: ${error.message || error.details || 'Erro desconhecido'} `);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleCloseForm = () => {
        setEditingProduct(null);
        setProductFormDefaults(null);
        setIsFormOpen(false);
    };

    // Removed handleScanSuccess, isScannerOpen logic


    const [categoryFilter, setCategoryFilter] = useState('TODOS');

    // Sorting Helper
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedProducts = useMemo(() => {
        let items = products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.barcode && p.barcode.includes(search)) ||
                (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()));
            const matchesCategory = categoryFilter === 'TODOS' || p.category === categoryFilter;

            return matchesSearch && matchesCategory;
        });

        if (sortConfig.key) {
            items.sort((a, b) => {
                let aValue, bValue;

                if (sortConfig.key === 'total') {
                    aValue = (Number(a.price) || 0) * (Number(a.current_stock) || 0);
                    bValue = (Number(b.price) || 0) * (Number(b.current_stock) || 0);
                } else {
                    aValue = a[sortConfig.key];
                    bValue = b[sortConfig.key];
                }

                // Handle numbers
                if (['min_stock', 'price', 'current_stock', 'total'].includes(sortConfig.key)) {
                    aValue = Number(aValue || 0);
                    bValue = Number(bValue || 0);
                }
                // Handle text
                else {
                    aValue = (aValue || '').toString().toLowerCase();
                    bValue = (bValue || '').toString().toLowerCase();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return items;
    }, [products, search, categoryFilter, sortConfig]);

    // Máx. 15 itens por página nas visualizações (export/impressão seguem completos)
    const pagination = usePagination(sortedProducts);

    // Header Component for Sorting
    const SortableHeader = ({ label, sortKey, align = 'left' }) => (
        <th
            className={`py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-xs text-${align} cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors select-none`}
            onClick={() => handleSort(sortKey)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                {label}
                {sortConfig.key === sortKey ? (
                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-brand-primary" /> : <ArrowDown size={14} className="text-brand-primary" />
                ) : (
                    <ArrowUpDown size={14} className="text-gray-300" />
                )}
            </div>
        </th>
    );
    const handleExport = () => {
        const dataToExport = sortedProducts.map(p => ({
            "Nome": p.name,
            "Marca": p.brand || '',
            "Código de Barras": p.barcode || '',
            "Categoria": p.category || '',
            "Unidade": p.unit || '',
            "Preço": p.price || 0,
            "Estoque Atual": p.current_stock || 0,
            "Estoque Mínimo": p.min_stock || 0
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Produtos");
        XLSX.writeFile(wb, "produtos_estoque.xlsx");
    };


    return (
        <div className="space-y-6 print:space-y-0">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
                <div>
                    <h2 className="text-2xl font-bold text-brand-primary">{t('products', 'title')}</h2>
                    <p className="text-brand-dark/60 text-sm">{t('products', 'subtitle')}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsPrintPreviewOpen(true)}>
                        <Filter size={20} className="mr-2" /> PDF / Imprimir
                    </Button>
                    <Button variant="outline" onClick={() => setIsImporting(true)}>
                        <ArrowUp size={20} className="mr-2 rotate-180" /> {t('common', 'import')}
                    </Button>
                    <Button onClick={() => { setEditingProduct(null); setIsFormOpen(true); }}>
                        <Plus size={20} className="mr-2" /> {t('products', 'newProduct')}
                    </Button>
                </div>
            </div>

            {/* List Header / Search */}
            <Card className="p-4 flex flex-col md:flex-row gap-4 items-center bg-white/80 dark:bg-brand-dark/50 border border-gray-100 dark:border-white/5 backdrop-blur-md shadow-sm print:hidden">
                <div className="flex-1 w-full flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            icon={Search}
                            className="bg-white dark:bg-black/40 border-gray-200 dark:border-white/10 focus:border-brand-primary/50 w-full"
                            placeholder={t('inventory', 'searchPlaceholder')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="w-full md:w-48">
                    <select
                        className="w-full h-10 px-3 bg-white dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-600 dark:text-gray-300 focus:border-brand-primary/50 outline-none hover:border-brand-primary/30 transition-all appearance-none cursor-pointer font-medium"
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                    >
                        <option value="TODOS" className="bg-white dark:bg-gray-900">{t('inventory', 'columns.category')}</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.name} className="bg-white dark:bg-gray-900">{cat.name}</option>
                        ))}
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

            {loading && !saving ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-brand-primary" size={40} />
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        // GRID VIEW
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {pagination.pageItems.map((prod) => (
                                <div key={prod.id} className="glass-card p-5 group cursor-pointer" onClick={() => handleViewDetails(prod)}>
                                    {/* Actions Overlay */}
                                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleEdit(prod)}
                                            className="p-2 text-brand-light bg-white/10 hover:bg-brand-primary hover:text-white rounded-lg transition-all backdrop-blur-md"
                                            title="Editar"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(prod.id, prod.name)}
                                            className="p-2 text-red-400 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg transition-all backdrop-blur-md"
                                            title="Excluir"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-colors duration-300 shadow-glow">
                                            <Package size={24} />
                                        </div>
                                        <span className="text-[10px] font-bold bg-white/5 text-gray-400 px-2 py-1 rounded-lg uppercase tracking-wider border border-white/5">
                                            {prod.unit}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg mb-1 pr-16 truncate text-gray-900 dark:text-white" title={prod.name}>{prod.name}</h3>
                                    <span className="text-xs text-gray-400 block mb-3 h-4">{prod.brand}</span>

                                    {prod.barcode && (
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-3 font-mono bg-black/30 px-2 py-1.5 rounded-lg w-fit border border-white/5">
                                            <ScanBarcode size={12} className="text-brand-primary" />
                                            <span>{prod.barcode}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center text-sm text-gray-400 border-t border-white/5 pt-3 mt-1 mb-2">
                                        <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] uppercase font-bold tracking-wider">{prod.category || 'SEM CATEGORIA'}</span>
                                        <span className="text-[10px] px-2 py-0.5 bg-black/20 rounded font-medium border border-white/5">
                                            {prod.unit}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 p-3 bg-black/20 rounded-xl text-xs border border-white/5">
                                        <div>
                                            <span className="block text-gray-500 mb-0.5 font-medium uppercase tracking-wider text-[10px]">Custo Médio</span>
                                            <span className="font-medium text-sm text-gray-300 font-mono">
                                                {formatCurrency(Number(prod.average_cost || prod.cost_price || 0))}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-gray-500 mb-0.5 font-medium uppercase tracking-wider text-[10px]">{t('inventory', 'columns.price')}</span>
                                            <span className="font-bold text-lg text-emerald-400 font-mono tracking-tight leading-none">
                                                {formatCurrency(prod.price)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex justify-between items-center bg-gray-50 dark:bg-brand-dark/10 px-3 py-2 rounded-lg border border-gray-100 dark:border-white/5">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-gray-400 font-semibold uppercase">Markup</span>
                                            {(() => {
                                                const cost = Number(prod.average_cost || prod.cost_price || 0);
                                                const price = Number(prod.price || 0);
                                                if (cost > 0 && price > 0) {
                                                    const mkp = ((price - cost) / cost * 100).toFixed(1);
                                                    return <span className={clsx("font-bold text-xs", Number(mkp) >= 30 ? "text-emerald-500" : Number(mkp) >= 15 ? "text-amber-500" : "text-red-500")}>{mkp}%</span>;
                                                }
                                                return <span className="text-xs text-gray-500">-</span>;
                                            })()}
                                        </div>
                                        <span className="text-xs font-medium text-gray-500 truncate max-w-[50%]" title={getProviderName(prod)}>
                                            {getProviderName(prod)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // LIST VIEW
                        <div className="rounded-[2rem] shadow-glass border border-gray-200 dark:border-white/10 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white/80 dark:bg-[#121212]/50 backdrop-blur-md">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50/80 dark:bg-black/20 border-b border-gray-200 dark:border-white/10">
                                        <tr>
                                            <SortableHeader label={t('inventory', 'columns.product')} sortKey="name" />
                                            <SortableHeader label={t('inventory', 'columns.category')} sortKey="category" />
                                            <SortableHeader label="Preço Custo" sortKey="cost_price" align="right" />
                                            <SortableHeader label={t('inventory', 'columns.price')} sortKey="price" align="right" />
                                            <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">Markup</th>
                                            <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-xs text-right">Margem</th>
                                            <th className="py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">{t('common', 'actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {sortedProducts.length === 0 ? (
                                            <tr>
                                                <td colSpan="8" className="py-10 text-center text-gray-500">
                                                    {t('dashboard', 'noActivity')}
                                                </td>
                                            </tr>
                                        ) : (
                                            pagination.pageItems.map((prod) => (
                                                <tr key={prod.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group border-b border-gray-100 dark:border-white/5 last:border-0 cursor-pointer" onClick={() => handleViewDetails(prod)}>
                                                    <td className="py-4 px-6 font-medium text-gray-900 dark:text-white">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-base">{prod.name}</span>
                                                            {prod.barcode && (
                                                                <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                                                                    <ScanBarcode size={10} /> {prod.barcode}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        {prod.category ? (
                                                            <span className="text-[10px] bg-white/5 text-gray-300 px-2 py-1 rounded font-bold uppercase tracking-wider border border-white/5">
                                                                {prod.category}
                                                            </span>
                                                        ) : <span className="text-gray-400">-</span>}
                                                    </td>
                                                    <td className="py-4 px-6 font-mono text-gray-400 font-medium text-right">
                                                        {formatCurrency(Number(prod.average_cost || prod.cost_price || 0))}
                                                    </td>
                                                    <td className="py-4 px-6 font-mono font-bold text-emerald-400 text-right">
                                                        {prod.price ? formatCurrency(prod.price) : '-'}
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        {(() => {
                                                            const cost = Number(prod.average_cost || prod.cost_price || 0);
                                                            const price = Number(prod.price || 0);
                                                            if (cost > 0 && price > 0) {
                                                                const m = ((price - cost) / cost * 100).toFixed(1);
                                                                return (
                                                                    <span className={clsx(
                                                                        "text-xs font-bold px-2 py-1 rounded-lg border",
                                                                        Number(m) >= 30 ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                                                                            Number(m) >= 15 ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                                                                                "bg-red-500/10 text-red-500 border-red-500/20"
                                                                    )}>{m}%</span>
                                                                );
                                                            }
                                                            return <span className="text-gray-500 text-xs">—</span>;
                                                        })()}
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        {(() => {
                                                            const cost = Number(prod.average_cost || prod.cost_price || 0);
                                                            const price = Number(prod.price || 0);
                                                            if (cost > 0 && price > 0) {
                                                                const m = ((price - cost) / price * 100).toFixed(1);
                                                                return (
                                                                    <span className={clsx(
                                                                        "text-xs font-bold px-2 py-1 rounded-lg",
                                                                        Number(m) >= 30 ? "bg-emerald-500/10 text-emerald-500" :
                                                                            Number(m) >= 15 ? "bg-amber-500/10 text-amber-500" :
                                                                                "bg-red-500/10 text-red-500"
                                                                    )}>{m}%</span>
                                                                );
                                                            }
                                                            return <span className="text-gray-500 text-xs">—</span>;
                                                        })()}
                                                    </td>
                                                    <td className="py-4 px-6 text-center" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex justify-center gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => handleEdit(prod)}
                                                                className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(prod.id, prod.name)}
                                                                className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
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
                    <PaginationBar pagination={pagination} />
                </>
            )}

            {/* Modal-like Form */}
            <Modal
                isOpen={isFormOpen}
                onClose={handleCloseForm}
                className="max-w-4xl"
                title={editingProduct ? 'Editar Produto' : (productFormDefaults?.is_raw_material ? 'Novo Insumo/Produto' : 'Novo Produto')}
            >
                <ProductForm
                    initialData={editingProduct || productFormDefaults || {}}
                    categories={categories}
                    onSave={handleSave}
                    onCancel={handleCloseForm}
                    saving={saving}
                />
            </Modal>

            {/* handleExport definition moved here */}

            {/* handleExport definition moved here */}
            {/* Import Modal */}
            {
                isImporting && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="w-full max-w-2xl relative animate-in zoom-in-95 duration-200">
                            <div className="absolute top-2 right-2 z-10">
                                <button onClick={() => setIsImporting(false)} className="bg-white rounded-full p-2 hover:bg-gray-100">
                                    <X size={20} />
                                </button>
                            </div>
                            <DataImporter
                                type="products"
                                onImport={handleImport}
                                onExportData={handleExport}
                                templates={{ products: productTemplate }}
                            />
                        </div>
                    </div>
                )
            }

            {/* Product Details Modal */}
            {viewingProduct && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                        onClick={() => setViewingProduct(null)}
                    />
                    <div className="relative w-full max-w-5xl bg-[#F8FAFC] dark:bg-[#09090b] rounded-[2.5rem] shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300 border border-white/10 custom-scrollbar">

                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-[#F8FAFC]/80 dark:bg-[#09090b]/80 backdrop-blur-md px-8 py-6 border-b border-gray-200 dark:border-white/5 flex justify-between items-start rounded-t-[2.5rem]">
                            <div className="flex items-center gap-5">
                                <div className="p-4 bg-brand-primary/10 rounded-2xl text-brand-primary shadow-sm">
                                    <Package size={32} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-3xl font-bold text-gray-900 dark:text-brand-light tracking-tight">{viewingProduct.name}</h3>
                                        <span className="text-sm font-bold bg-gray-100 dark:bg-brand-dark/20 text-gray-500 px-2.5 py-1 rounded-lg uppercase tracking-wider border border-gray-200 dark:border-white/10">
                                            {viewingProduct.unit}
                                        </span>
                                    </div>
                                    <span className="text-lg text-gray-500 dark:text-gray-400 font-medium">{viewingProduct.brand || 'Marca não informada'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={clsx(
                                    "text-sm px-4 py-1.5 rounded-full border font-bold flex items-center shadow-sm",
                                    (viewingProduct.current_stock || 0) <= viewingProduct.min_stock
                                        ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                                        : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                                )}>
                                    {(viewingProduct.current_stock || 0) <= viewingProduct.min_stock ? 'ESTOQUE BAIXO' : 'ESTOQUE OK'}
                                </span>
                                <button
                                    onClick={() => setViewingProduct(null)}
                                    className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-gray-500"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Section 1: Identification & Stock */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2 mb-2">
                                        <ScanBarcode size={18} /> Identificação
                                    </h4>
                                    <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/5 space-y-5 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Código de Barras</span>
                                                <span className="font-mono text-lg text-gray-900 dark:text-gray-200 font-semibold tracking-tight block truncate" title={viewingProduct.barcode}>
                                                    {viewingProduct.barcode || '-'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Categoria</span>
                                                <span className="text-lg text-gray-900 dark:text-gray-200 font-semibold">{viewingProduct.category || '-'}</span>
                                            </div>
                                        </div>
                                        <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-2">Descrição / Observações</span>
                                            <p className="text-base text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                                                {viewingProduct.description || <span className="text-gray-400 italic">Sem descrição.</span>}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2 mb-2">
                                        <LayoutGrid size={18} /> Estoque
                                    </h4>
                                    <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow h-full flex flex-col justify-center">
                                        <div className="grid grid-cols-2 gap-6 text-center">
                                            <div className="bg-brand-primary/5 p-4 rounded-xl border border-brand-primary/10">
                                                <span className="text-sm font-bold text-brand-primary uppercase mb-1 block">Atual</span>
                                                <span className="text-4xl font-bold text-gray-900 dark:text-white block">{viewingProduct.current_stock || 0}</span>
                                            </div>
                                            <div className="bg-red-500/5 p-4 rounded-xl border border-red-500/10">
                                                <span className="text-sm font-bold text-red-500 uppercase mb-1 block">Mínimo</span>
                                                <span className="text-4xl font-bold text-gray-900 dark:text-white block">{viewingProduct.min_stock || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Financial & Supplier */}
                            <div className="space-y-4">
                                <h4 className="text-sm font-bold text-brand-primary uppercase tracking-wider flex items-center gap-2 mb-2">
                                    <List size={18} /> Financeiro & Fornecedor
                                </h4>
                                <div className="bg-white dark:bg-white/5 rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                        {/* Valores */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Preço de Venda</span>
                                                <span className="text-2xl text-emerald-600 dark:text-emerald-400 font-bold tracking-tight">
                                                    {viewingProduct.price ? formatCurrency(viewingProduct.price) : '-'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Último Custo</span>
                                                <span className="text-xl text-gray-900 dark:text-gray-200 font-mono font-medium">
                                                    {viewingProduct.cost_price ? formatCurrency(viewingProduct.cost_price) : '-'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Custo Médio</span>
                                                <span className="text-xl text-gray-900 dark:text-gray-200 font-mono font-medium">
                                                    {viewingProduct.average_cost ? formatCurrency(viewingProduct.average_cost) : '-'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Margens e Fornecedor */}
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-3 gap-3">
                                                {(() => {
                                                    const cost = Number(viewingProduct.average_cost || viewingProduct.cost_price || 0);
                                                    const price = Number(viewingProduct.price || 0);
                                                    const mkp = cost > 0 && price > 0 ? ((price - cost) / cost * 100).toFixed(1) : null;
                                                    const mgn = cost > 0 && price > 0 ? ((price - cost) / price * 100).toFixed(1) : null;
                                                    return (
                                                        <>
                                                            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5 text-center flex flex-col justify-center">
                                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase block mb-1">Markup</span>
                                                                <span className={clsx("text-lg font-bold block",
                                                                    mkp && Number(mkp) >= 30 ? "text-emerald-500" : mkp && Number(mkp) >= 15 ? "text-amber-500" : "text-red-500"
                                                                )}>{mkp ? `${mkp}%` : '—'}</span>
                                                            </div>
                                                            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5 text-center flex flex-col justify-center">
                                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase block mb-1">Margem</span>
                                                                <span className={clsx("text-lg font-bold block",
                                                                    mgn && Number(mgn) >= 30 ? "text-emerald-500" : mgn && Number(mgn) >= 15 ? "text-amber-500" : "text-red-500"
                                                                )}>{mgn ? `${mgn}%` : '—'}</span>
                                                            </div>
                                                        </>
                                                    );
                                                })()}
                                                <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5 text-center flex flex-col justify-center">
                                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase block mb-1 leading-tight">Patrimônio<br />Total</span>
                                                    <span className="text-md text-brand-primary font-bold block truncate">
                                                        {formatCurrency(Number(viewingProduct.average_cost || viewingProduct.cost_price || 0) * Number(viewingProduct.current_stock || 0))}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Último Fornecedor integrado */}
                                            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Último Fornecedor:</span>
                                                <span className="text-sm font-bold text-gray-900 dark:text-white text-right max-w-[60%] truncate" title={getProviderName(viewingProduct)}>
                                                    {getProviderName(viewingProduct)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>


                            {/* Section 3: Expiration (if applicable) */}
                            {viewingProduct.expiration_date && (
                                <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 flex items-center gap-4 shadow-sm">
                                    <div className={clsx(
                                        "p-3 rounded-xl",
                                        (() => {
                                            const today = new Date();
                                            const expDate = new Date(viewingProduct.expiration_date);
                                            const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
                                            if (diffDays < 0) return "bg-red-100 text-red-600";
                                            if (diffDays <= 30) return "bg-amber-100 text-amber-600";
                                            return "bg-gray-100 text-gray-600";
                                        })()
                                    )}>
                                        <AlertCircle size={24} />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold uppercase tracking-wider block mb-0.5 text-gray-600 dark:text-gray-400">
                                            Validade
                                        </span>
                                        <span className="text-lg font-mono font-medium text-gray-900 dark:text-white">
                                            {new Date(viewingProduct.expiration_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="sticky bottom-0 bg-[#F8FAFC] dark:bg-[#09090b] p-6 border-t border-gray-200 dark:border-white/5 flex justify-end gap-3 rounded-b-[2.5rem]">
                            <Button variant="ghost" onClick={() => setViewingProduct(null)} className="hover:bg-gray-100 dark:hover:bg-white/5">Fechar</Button>



                            <Button onClick={() => {
                                setViewingProduct(null);
                                handleEdit(viewingProduct);
                            }} className="shadow-lg hover:shadow-xl transition-shadow bg-brand-primary hover:bg-brand-primary/90 text-white">
                                <Pencil size={18} className="mr-2" /> Editar Produto
                            </Button>
                        </div>
                    </div>


                </div>
            )}

            {/* Print Preview Modal */}
            {isPrintPreviewOpen && (
                <div className="fixed inset-0 z-[70] flex flex-col bg-gray-100 dark:bg-gray-900">
                    {/* Print-only styles */}
                    <style>{`
                        @media print {
                            body * {
                                visibility: hidden !important;
                            }
                            #print-preview-content, #print-preview-content * {
                                visibility: visible !important;
                            }
                            #print-preview-content {
                                position: absolute !important;
                                left: 0 !important;
                                top: 0 !important;
                                width: 100% !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                background: white !important;
                            }
                            .no-print {
                                display: none !important;
                            }
                            table {
                                font-size: 10px !important;
                                width: 100% !important;
                                border-collapse: collapse !important;
                            }
                            th, td {
                                border: 1px solid #d1d5db !important;
                                padding: 4px 6px !important;
                                color: #111 !important;
                                background: white !important;
                            }
                            th {
                                background: #f3f4f6 !important;
                                font-weight: bold !important;
                            }
                            @page {
                                size: landscape;
                                margin: 10mm;
                            }
                        }
                    `}</style>

                    {/* Toolbar */}
                    <div className="no-print flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-center gap-3">
                            <Package size={24} className="text-brand-primary" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pré-visualização de Impressão</h2>
                            <span className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                                {sortedProducts.length} produto{sortedProducts.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setIsPrintPreviewOpen(false)}
                                className="hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                <X size={18} className="mr-2" /> Fechar
                            </Button>
                            <Button
                                onClick={() => window.print()}
                                className="bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg"
                            >
                                <Download size={18} className="mr-2" /> Imprimir / PDF
                            </Button>
                        </div>
                    </div>

                    {/* Print Content */}
                    <div className="flex-1 overflow-auto p-6">
                        <div id="print-preview-content" className="bg-white dark:bg-white rounded-2xl shadow-lg mx-auto max-w-[1200px] p-8">
                            {/* Print Header */}
                            <div className="mb-6 border-b-2 border-gray-200 pb-4">
                                <h1 className="text-2xl font-bold text-gray-900">Relatório de Produtos</h1>
                                <p className="text-sm text-gray-500 mt-1">
                                    Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    {categoryFilter !== 'TODOS' && ` • Categoria: ${categoryFilter}`}
                                    {search && ` • Busca: "${search}"`}
                                </p>
                            </div>

                            {/* Simple Clean Table */}
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 text-xs uppercase">#</th>
                                        <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 text-xs uppercase">Produto</th>
                                        <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 text-xs uppercase">Marca</th>
                                        <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 text-xs uppercase">Cód. Barras</th>
                                        <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 text-xs uppercase">Categoria</th>
                                        <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 text-xs uppercase">Un.</th>
                                        <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 text-xs uppercase text-right">Preço</th>
                                        <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 text-xs uppercase text-center">Estoque</th>
                                        <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 text-xs uppercase text-center">Mín.</th>
                                        <th className="border border-gray-300 px-3 py-2 font-bold text-gray-700 text-xs uppercase text-right">Valor Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedProducts.map((prod, index) => {
                                        const isLowStock = (Number(prod.current_stock) || 0) <= (Number(prod.min_stock) || 0);
                                        return (
                                            <tr key={prod.id} className={isLowStock ? 'bg-red-50' : (index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50')}>
                                                <td className="border border-gray-300 px-3 py-2 text-gray-500 text-xs">{index + 1}</td>
                                                <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">{prod.name}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-gray-600">{prod.brand || '-'}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-gray-600 font-mono text-xs">{prod.barcode || '-'}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-gray-600">{prod.category || '-'}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-gray-600 text-center">{prod.unit || '-'}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-gray-900 text-right font-mono">
                                                    {prod.price ? formatCurrency(prod.price) : '-'}
                                                </td>
                                                <td className={clsx(
                                                    "border border-gray-300 px-3 py-2 text-center font-bold",
                                                    isLowStock ? "text-red-600" : "text-gray-900"
                                                )}>
                                                    {prod.current_stock || 0}
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2 text-center text-orange-600 font-medium">{prod.min_stock || 0}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-right font-bold text-gray-900 font-mono">
                                                    {formatCurrency(Number(prod.price || 0) * Number(prod.current_stock || 0))}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-100 font-bold">
                                        <td colSpan="6" className="border border-gray-300 px-3 py-2 text-right text-gray-700 uppercase text-xs">Totais</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-900 font-mono">-</td>
                                        <td className="border border-gray-300 px-3 py-2 text-center text-gray-900">
                                            {sortedProducts.reduce((sum, p) => sum + (Number(p.current_stock) || 0), 0)}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-center text-gray-500">-</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right text-gray-900 font-mono">
                                            {formatCurrency(sortedProducts.reduce((sum, p) => sum + (Number(p.price || 0) * Number(p.current_stock || 0)), 0))}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>

                            {/* Footer */}
                            <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-400 flex justify-between">
                                <span>ERP Evobit • {sortedProducts.length} produtos listados</span>
                                <span>Pág. 1</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Products;
