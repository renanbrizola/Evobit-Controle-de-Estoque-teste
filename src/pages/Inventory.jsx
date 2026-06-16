
import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { Plus, Search, Package, AlertCircle, Loader2, List, LayoutGrid, Printer, ScanBarcode, ArrowUpDown, ArrowUp, ArrowDown, X, Trash2, Target, FileText } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import ProductForm from '../components/forms/ProductForm';
import BarcodeScanner from '../components/ui/BarcodeScanner';
import StockAdjustmentModal from '../components/modals/StockAdjustmentModal';
import FloatingActionBar from '../components/ui/FloatingActionBar';
import BulkEditModal from '../components/modals/BulkEditModal';
import BlindCountModal from '../components/modals/BlindCountModal';
import XMLImporterModal from '../components/modals/XMLImporterModal';

const Inventory = () => {
    const location = useLocation();
    const { t } = useLanguage();
    const [products, setProducts] = useState([]);
    const [providers, setProviders] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [, setIsFormOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Filter State
    const [categoryFilter, setCategoryFilter] = useState('TODOS');
    const [stockFilter, setStockFilter] = useState('ALL'); // 'ALL' | 'LOW'

    // Sort State
    const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

    // Form State
    const [editingProduct, setEditingProduct] = useState(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [stockAdjustmentProduct, setStockAdjustmentProduct] = useState(null);
    const handleViewDetails = (product) => {
        setStockAdjustmentProduct(product);
    };


    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const [, setTotalItems] = useState(0);
    const [totalPages, setTotalPages] = useState(1);

    // Bulk Selection State
    const [selectedIds, setSelectedIds] = useState([]);
    const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
    const [isBlindCountOpen, setIsBlindCountOpen] = useState(false);

    // XML Importer State
    const [isXMLImporterOpen, setIsXMLImporterOpen] = useState(false);

    // Debounce Search
    const [debouncedSearch, setDebouncedSearch] = useState(search);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Providers and Categories only once or if needed, 
            // but for simplicity let's keep loading them. 
            // ideally we should separate this, but let's keep it safe.
            // Actually, to avoid flickering, let's load aux data only on mount if possible, 
            // but `loadData` is called on filter change.

            // Let's split loading:
            // 1. Aux Data (only if empty)
            if (providers.length === 0 || categories.length === 0) {
                const [provs, cats] = await Promise.all([
                    api.providers.list(),
                    api.categories.list()
                ]);
                setProviders(provs);
                setCategories(cats);
            }

            // 2. Products (Paginated)
            const result = await api.products.list({
                page: currentPage,
                limit: itemsPerPage,
                search: debouncedSearch,
                category: categoryFilter,
                stockFilter: stockFilter,
                sort: sortConfig
            });

            setProducts(result.items);
            setTotalItems(result.total);
            setTotalPages(result.totalPages);
            setTotalEquity(result.totalEquity || 0);

        } catch (error) {
            console.error(error);
            toast.error(t('common', 'error'));
        } finally {
            setLoading(false);
        }
    };

    // Bulk Actions
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const ids = products.map(p => p.id); // Select only visible page
            setSelectedIds(ids);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Deseja excluir ${selectedIds.length} produtos?`)) return;

        try {
            await api.products.bulkDelete(selectedIds);
            toast.success(`${selectedIds.length} produtos excluídos!`);
            setSelectedIds([]);
            loadData();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao excluir produtos");
        }
    };

    // Initial Load & Updates
    useEffect(() => {
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentPage, debouncedSearch, categoryFilter, stockFilter, sortConfig]);


    // Effect to handle navigation from Dashboard
    useEffect(() => {
        if (location.state?.filterStatus === 'LOW_STOCK') {
            setStockFilter('LOW');
        } else if (location.state?.filterStatus === 'EXPIRING') {
            setStockFilter('EXPIRING');
        }
    }, [location.state]);


    // Helper: Check Expiration Status
    const getExpirationStatus = (dateStr) => {
        if (!dateStr) return 'normal';
        const today = new Date();
        const expDate = new Date(dateStr);
        const diffTime = expDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'expired'; // Vencido
        if (diffDays <= 30) return 'warning'; // Vence em 30 dias
        return 'normal';
    };

    const _getProviderName = (prod) => {
        if (prod.provider_id) {
            const provider = providers.find(p => p.id === prod.provider_id);
            return provider ? provider.name : (prod.last_supplier || '-');
        }
        return prod.last_supplier || '-';
    };

    const handleScanSuccess = (decodedText) => {
        setSearch(decodedText);
        setIsScannerOpen(false);
        toast.success("Código de barras lido com sucesso!");
    };

    const handleStartBlindCount = () => {
        if (selectedIds.length === 0) {
            toast.error("Selecione pelo menos um produto para a contagem cega.");
            return;
        }
        setIsBlindCountOpen(true);
    };

    const _handleEdit = (product) => {
        setEditingProduct(product);
        setIsFormOpen(true);
    };

    const _handleSave = async (formData) => {
        try {
            setSaving(true);
            const payload = { ...formData };

            // Remove legacy field 'last_supplier' if present in formData to avoid VD2 schema error
            delete payload.last_supplier;

            if (editingProduct) {
                // UPDATE
                await api.products.update(editingProduct.id, payload);
                toast.success(t('products', 'toast.updated'));
            } else {
                // CREATE
                await api.products.create(payload);
                toast.success(t('products', 'toast.created'));
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
        setIsFormOpen(false);
    };

    // Sorting Helper
    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Reset page when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, categoryFilter, stockFilter]);

    // Use 'products' directly as it is now paginated/filtered from API
    const displayItems = products;

    // Total Inventory Estimate (Note: This currently only sums visible page if we don't fetch aggregate stats)
    // To solve this properly, API should return aggregate stats.
    // For now, let's sum visible items or ignore. 
    // Or better, let's keep it simple: Sum Visible items for now, update API later for global stats if critical.
    // Total Inventory Estimate
    const [totalEquity, setTotalEquity] = useState(0);

    // Header Component for Sorting
    const SortableHeader = ({ label, sortKey, align = 'left' }) => (
        <th
            className={`py-4 px-6 font-bold text-gray-500 uppercase tracking-wider text-xs text-${align} cursor-pointer hover:bg-gray-100 dark:hover:bg-brand-dark/5 transition-colors select-none`}
            onClick={() => handleSort(sortKey)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                {label}
                {sortConfig.key === sortKey ? (
                    sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-brand-primary" /> : <ArrowDown size={14} className="text-brand-primary" />
                ) : (
                    <ArrowUpDown size={14} className="text-gray-400" />
                )}
            </div>
        </th>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-brand-primary transition-colors duration-300">{t('inventory', 'title')}</h2>
                    <p className="text-gray-400 text-sm">{t('inventory', 'subtitle')}</p>
                </div>
                <div className="bg-brand-dark/5 px-4 py-2 rounded-xl shadow-glass border border-brand-light/10 flex items-center gap-2 backdrop-blur-md">
                    <div className="text-right">
                        <span className="block text-xs text-gray-400 font-medium">{t('dashboard', 'equity')}</span>
                        <span className="text-lg font-bold text-brand-primary">
                            {totalEquity.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </div>
            </div>

            {/* List Header / Search */}
            <Card className="p-4 flex flex-col md:flex-row gap-4 items-center bg-white/80 dark:bg-brand-dark/50 border border-gray-100 dark:border-white/5 backdrop-blur-md shadow-sm">
                <div className="flex-1 w-full flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsScannerOpen(true)}
                        className="bg-brand-dark/5 border-gray-200 dark:border-white/10 hover:bg-brand-primary/10 hover:text-brand-primary h-10 w-10 p-0 flex items-center justify-center shrink-0"
                        title="Escanear Código de Barras"
                    >
                        <ScanBarcode size={20} />
                    </Button>
                    <Input
                        icon={Search}
                        className="bg-white dark:bg-black/40 border-gray-200 dark:border-white/10 focus:border-brand-primary/50"
                        placeholder={t('inventory', 'searchPlaceholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {/* Stock Status Filter */}
                <div className="w-full md:w-48">
                    <select
                        className={clsx(
                            "w-full h-10 px-3 border rounded-xl text-sm outline-none transition-colors appearance-none cursor-pointer font-medium",
                            stockFilter === 'LOW'
                                ? "bg-red-500/10 border-red-500/30 text-red-500 font-bold"
                                : stockFilter === 'EXPIRING'
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-500 font-bold"
                                    : "bg-white dark:bg-black/40 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-brand-primary/30"
                        )}
                        value={stockFilter}
                        onChange={e => setStockFilter(e.target.value)}
                    >
                        <option value="ALL" className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-300">{t('common', 'all')}</option>
                        <option value="LOW" className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-300">âš ï¸ {t('inventory', 'status.lowStock')}</option>
                        <option value="EXPIRING" className="bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-300">â³ {t('dashboard', 'expiring')}</option>
                    </select>
                </div>

                <div className="w-full md:w-32">
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


                <div className="flex gap-2">
                    {stockFilter === 'LOW' && (
                        <Button
                            onClick={() => window.print()}
                            variant="secondary"
                            className="bg-brand-dark/5 text-gray-400 border border-brand-light/10 hover:bg-brand-dark/10 hidden md:flex"
                            title="Imprimir Relatório"
                        >
                            <Printer size={20} className="mr-2" /> <span className="hidden lg:inline">Imprimir</span>
                        </Button>
                    )}
                    <Button onClick={() => setIsXMLImporterOpen(true)} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow mr-2">
                        <FileText size={20} className="mr-2" /> <span className="hidden sm:inline">Importar NFe (XML)</span>
                    </Button>
                    <Button onClick={() => handleStartBlindCount()} className="shadow-glow bg-brand-primary text-black font-bold border-brand-primary">
                        <Target size={20} className="mr-2" /> Contagem Cega
                    </Button>
                </div>
            </Card>

            {/* Printable Content Wrapper */}
            <div id="printable-content" className="w-full">
                {/* Print Header - Visible only on print */}
                <div className="hidden print:block mb-8 text-center pt-8">
                    <h1 className="text-2xl font-bold text-black mb-2">RelatÃ³rio de Estoque</h1>
                    <p className="text-sm text-gray-600">
                        {stockFilter === 'LOW' ? 'âš ï¸ Produtos com Estoque Baixo' : 'PosiÃ§Ã£o Geral de Estoque'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Gerado em: {new Date().toLocaleDateString()} Ã s {new Date().toLocaleTimeString()}</p>
                </div>

                <div className="rounded-[2rem] shadow-glass overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white dark:bg-[#121212]/50 backdrop-blur-md border border-gray-200 dark:border-white/10">

                    {/* LIST VIEW */}
                    <div className="overflow-auto bg-white dark:bg-[#121212]/50 backdrop-blur-md rounded-[2rem] border border-gray-200 dark:border-white/10 max-h-[calc(100vh-280px)]">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="sticky top-0 z-10 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-white/10 shadow-sm">
                                <tr>
                                    <th className="py-4 px-4 w-12 text-center">
                                        <input
                                            type="checkbox"
                                            onChange={handleSelectAll}
                                            checked={displayItems.length > 0 && selectedIds.length === displayItems.length}
                                            className="w-5 h-5 rounded-md border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer accent-brand-primary text-center"
                                        />
                                    </th>
                                    <SortableHeader label={t('inventory', 'columns.product')} sortKey="name" />
                                    <SortableHeader label={t('inventory', 'columns.category')} sortKey="category" />
                                    <SortableHeader label={t('inventory', 'title')} sortKey="current_stock" align="center" />
                                    <SortableHeader label={t('inventory', 'columns.min')} sortKey="min_stock" align="center" />
                                    <th className="py-4 px-4 font-bold text-gray-500 uppercase tracking-wider text-xs text-right">Patrimônio</th>
                                    <th className="py-4 px-4 font-bold text-gray-500 uppercase tracking-wider text-xs text-center">{t('inventory', 'columns.unit')}</th>
                                    <SortableHeader label={t('products', 'form.expiration')} sortKey="expiration_date" align="center" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                {loading && !saving ? (
                                    <tr>
                                        <td colSpan="9" className="py-16 text-center text-gray-500">
                                            <Loader2 className="animate-spin inline mr-2 text-brand-primary" /> {t('common', 'loading')}
                                        </td>
                                    </tr>
                                ) : displayItems.length === 0 ? (
                                    <tr>
                                        <td colSpan="9" className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-gray-100 dark:bg-brand-dark/20 rounded-full flex items-center justify-center">
                                                    <Package size={32} className="text-gray-400" />
                                                </div>
                                                <p className="font-medium text-gray-500">{t('inventory', 'noProducts')}</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    displayItems.map((prod) => {
                                        const status = getExpirationStatus(prod.expiration_date);
                                        const isSelected = selectedIds.includes(prod.id);

                                        return (
                                            <tr key={prod.id}
                                                className={clsx(
                                                    "transition-colors group border-b border-gray-100 dark:border-white/5 last:border-0 cursor-pointer",
                                                    status === 'expired' ? 'bg-red-500/5 hover:bg-red-500/10' :
                                                        status === 'warning' ? 'bg-amber-500/5 hover:bg-amber-500/10' :
                                                            (Number(prod.current_stock) <= Number(prod.min_stock)) ? 'bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100/50' :
                                                                isSelected ? 'bg-brand-primary/5' :
                                                                    "hover:bg-gray-50 dark:hover:bg-brand-dark/5"
                                                )}
                                                onClick={() => handleViewDetails(prod)}
                                            >
                                                <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectOne(prod.id)}
                                                        className="w-5 h-5 rounded-md border-gray-300 text-brand-primary focus:ring-brand-primary cursor-pointer accent-brand-primary"
                                                    />
                                                </td>
                                                <td className="py-4 px-4 text-gray-900 dark:text-white max-w-[250px] truncate">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-base">{prod.name}</span>
                                                        {prod.barcode && (
                                                            <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                                                                <ScanBarcode size={10} /> {prod.barcode}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4">
                                                    {prod.category ? (
                                                        <span className="text-[10px] bg-brand-dark/5 text-gray-500 px-2 py-1 rounded font-bold uppercase tracking-wider border border-brand-light/10">
                                                            {prod.category}
                                                        </span>
                                                    ) : <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    <span className={clsx(
                                                        "font-bold text-base cursor-pointer hover:scale-110 transition-transform inline-block px-3 py-1 bg-white dark:bg-black/20 rounded-lg shadow-sm border border-gray-100 dark:border-white/5",
                                                        (prod.current_stock || 0) <= prod.min_stock
                                                            ? "text-red-500 ring-1 ring-red-500/50"
                                                            : "text-emerald-500"
                                                    )}
                                                        title="Ajustar"
                                                    >
                                                        {prod.current_stock || 0}
                                                        <ArrowUpDown size={12} className="inline ml-2 text-gray-400" />
                                                    </span>
                                                </td>
                                                <td className="py-4 px-4 text-orange-500 dark:text-orange-400 text-center font-medium text-xs">
                                                    {prod.min_stock}
                                                </td>
                                                <td className="py-4 px-4 text-right font-bold text-gray-900 dark:text-brand-light">
                                                    {(() => {
                                                        const cost = Number(prod.average_cost || prod.cost_price || 0);
                                                        return cost > 0
                                                            ? formatCurrency(cost * Number(prod.current_stock || 0))
                                                            : '-';
                                                    })()}
                                                </td>
                                                <td className="py-4 px-4 text-gray-600 dark:text-gray-400 text-center font-mono text-xs uppercase">
                                                    {prod.unit}
                                                </td>
                                                <td className="py-4 px-4 text-center">
                                                    {prod.expiration_date ? (
                                                        <span className={clsx(
                                                            "text-[10px] px-2 py-1 rounded-lg border font-bold uppercase tracking-wider block w-fit mx-auto",
                                                            status === 'expired' ? "text-red-400 bg-red-500/10 border-red-500/20" :
                                                                status === 'warning' ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                                                                    "text-gray-500 bg-brand-dark/5 border-brand-light/10"
                                                        )}>
                                                            {new Date(prod.expiration_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-600">-</span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8 print:hidden">
                            <Button
                                variant="outline"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                className="w-10 h-10 p-0 rounded-full"
                            >
                                ←
                            </Button>
                            <span className="text-sm font-medium text-gray-500">
                                Página <span className="text-brand-primary font-bold">{currentPage}</span> de {totalPages}
                            </span>
                            <Button
                                variant="outline"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                className="w-10 h-10 p-0 rounded-full"
                            >
                                →
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {
                isScannerOpen && (
                    <BarcodeScanner
                        onScanSuccess={handleScanSuccess}
                        onClose={() => setIsScannerOpen(false)}
                    />
                )
            }

            {/* Stock Adjustment Modal */}
            {
                stockAdjustmentProduct && (
                    <StockAdjustmentModal
                        product={stockAdjustmentProduct}
                        onClose={() => setStockAdjustmentProduct(null)}
                        onSuccess={() => {
                            setStockAdjustmentProduct(null);
                            loadData();
                        }}
                    />
                )
            }
            {/* Advanced Bulk Actions */}
            <FloatingActionBar
                selectedCount={selectedIds.length}
                onClearSelection={() => setSelectedIds([])}
                onDelete={handleBulkDelete}
                onEdit={() => setIsBulkEditOpen(true)}
                onStartCount={handleStartBlindCount}
                onPrintLabels={() => {
                    toast.info("Funcionalidade de Etiquetas em breve!");
                    // Here we would open a print modal or generate PDF
                }}
            />

            {/* XML Importer Modal */}
            {isXMLImporterOpen && (
                <XMLImporterModal
                    onClose={() => setIsXMLImporterOpen(false)}
                    onSuccess={() => {
                        setIsXMLImporterOpen(false);
                        loadData();
                    }}
                />
            )}

            {/* Bulk Edit Modal */}
            {
                isBulkEditOpen && (
                    <BulkEditModal
                        selectedIds={selectedIds}
                        categories={categories}
                        onClose={() => setIsBulkEditOpen(false)}
                        onSuccess={() => {
                            setSelectedIds([]);
                            loadData();
                        }}
                    />
                )
            }

            {/* Blind Count Modal */}
            {
                isBlindCountOpen && (
                    <BlindCountModal
                        products={products.filter(p => selectedIds.includes(p.id))}
                        onClose={() => setIsBlindCountOpen(false)}
                        onSuccess={() => {
                            setSelectedIds([]);
                            loadData();
                        }}
                    />
                )
            }
        </div >
    );
};

export default Inventory;
