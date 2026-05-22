import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { ArrowUpRight, ArrowDownLeft, Calendar, Search, Loader2, Download, ChevronLeft, ChevronRight, Filter, X, Clock, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import clsx from 'clsx';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency } from '../utils/formatters';

const ITEMS_PER_PAGE = 20;

const History = () => {
    const { t } = useLanguage();
    const { getCurrencySymbol } = useTheme();
    const [movements, setMovements] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'Entrada', 'Saída'
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);

    useEffect(() => {
        loadData();
    }, []);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [search, typeFilter, dateFrom, dateTo]);

    const getReasonLabel = (reason) => {
        if (!reason) return '';
        const map = {
            'Compra': 'purchase',
            'Uso em Serviço': 'internal',
            'Venda ao Cliente': 'sale',
            'Perda/Quebra': 'loss',
            'Consumo Interno': 'internal',
            'Ajuste': 'adjustment',
            'Ajuste de Estoque': 'adjustment'
        };
        const key = map[reason] || 'internal';
        return t('movements', `reasons.${key}`) || reason;
    };

    const getTypeLabel = (type) => {
        if (type === 'Entrada') return t('movements', 'entry') || 'Entrada';
        if (type === 'Saída') return t('movements', 'exit') || 'Saída';
        return type;
    };

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await api.movements.list();
            setMovements(data);
        } catch (error) {
            console.error(error);
            toast.error(t('common', 'error'));
        } finally {
            setLoading(false);
        }
    };

    const handleReverse = async (mov) => {
        const confirmed = window.confirm(
            `Deseja estornar esta movimentação?\n\n` +
            `Produto: ${mov.productName}\n` +
            `Tipo: ${mov.type} → será revertido como ${mov.type === 'Entrada' ? 'Saída' : 'Entrada'}\n` +
            `Quantidade: ${mov.qty || mov.quantity}\n\n` +
            `O estoque será ajustado automaticamente.`
        );
        if (!confirmed) return;

        try {
            await api.movements.reverse(mov.id);
            toast.success('Movimentação estornada com sucesso!');
            loadData(); // Reload to show the new reversal
        } catch (error) {
            toast.error(error.message || 'Erro ao estornar movimentação');
        }
    };

    // Apply all filters
    const filtered = useMemo(() => {
        return movements.filter(m => {
            // Text search
            if (search.trim()) {
                const q = search.toLowerCase();
                const matchText = (m.productName || '').toLowerCase().includes(q) ||
                    (m.type || '').toLowerCase().includes(q) ||
                    (m.reason || '').toLowerCase().includes(q);
                if (!matchText) return false;
            }

            // Type filter
            if (typeFilter !== 'all' && m.type !== typeFilter) return false;

            // Date range
            if (dateFrom) {
                // Use ISO date property if available, otherwise fallback (less robust)
                const rawDate = m.date || m.created_at || '';
                const movDate = rawDate.substring(0, 10); // YYYY-MM-DD
                if (movDate < dateFrom) return false;
            }
            if (dateTo) {
                const rawDate = m.date || m.created_at || '';
                const movDate = rawDate.substring(0, 10);
                if (movDate > dateTo) return false;
            }

            return true;
        });
    }, [movements, search, typeFilter, dateFrom, dateTo]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // Stats
    const stats = useMemo(() => {
        const entries = filtered.filter(m => m.type === 'Entrada');
        const exits = filtered.filter(m => m.type === 'Saída');
        return {
            total: filtered.length,
            entries: entries.length,
            exits: exits.length,
        };
    }, [filtered]);

    const hasActiveFilters = search || typeFilter !== 'all' || dateFrom || dateTo;

    const clearFilters = () => {
        setSearch('');
        setTypeFilter('all');
        setDateFrom('');
        setDateTo('');
    };

    // Export CSV
    const handleExport = () => {
        if (filtered.length === 0) {
            toast.warning('Nenhum dado para exportar');
            return;
        }

        const headers = ['Data', 'Hora', 'Produto', 'Tipo', 'Quantidade', 'Preço Unit.', 'Total', 'Motivo', 'Observação'];
        const rows = filtered.map(m => [
            m.dateStr || '',
            m.timeStr || '',
            m.productName || '',
            m.type || '',
            m.qty || 0,
            Number(m.price || 0).toFixed(2),
            (Number(m.price || 0) * Number(m.qty || 0)).toFixed(2),
            m.reason || '',
            m.obs || ''
        ]);

        const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historico_movimentacoes_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success(`${filtered.length} registros exportados`);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Clock className="text-brand-primary" size={28} />
                        {t('history', 'title')}
                    </h2>
                    <p className="text-gray-500 dark:text-brand-light/60 text-sm mt-1">{t('history', 'subtitle')}</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={filtered.length === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary text-white font-medium hover:bg-brand-primary/90 transition-colors disabled:opacity-50 text-sm"
                >
                    <Download size={16} /> Exportar CSV
                </button>
            </div>

            {/* Stats */}
            {!loading && (
                <div className="grid grid-cols-3 gap-4">
                    <Card className="!p-4 text-center">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</span>
                        <p className="text-xs text-gray-500 mt-1">Total</p>
                    </Card>
                    <Card className="!p-4 text-center">
                        <span className="text-2xl font-bold text-emerald-600">{stats.entries}</span>
                        <p className="text-xs text-gray-500 mt-1">Entradas</p>
                    </Card>
                    <Card className="!p-4 text-center">
                        <span className="text-2xl font-bold text-red-600">{stats.exits}</span>
                        <p className="text-xs text-gray-500 mt-1">Saídas</p>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card className="!p-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1">
                        <Input
                            icon={Search}
                            className="bg-white dark:bg-black/40 border-gray-200 dark:border-white/10 focus:border-brand-primary/50"
                            placeholder={t('history', 'filterPlaceholder')}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            disabled={loading}
                        />
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        {/* Type filter buttons */}
                        {['all', 'Entrada', 'Saída'].map(type => (
                            <button
                                key={type}
                                onClick={() => setTypeFilter(type)}
                                className={clsx(
                                    "px-3 py-2 rounded-xl text-sm font-medium transition-all border",
                                    typeFilter === type
                                        ? type === 'Entrada'
                                            ? "bg-emerald-500 text-white border-emerald-500"
                                            : type === 'Saída'
                                                ? "bg-red-500 text-white border-red-500"
                                                : "bg-brand-primary text-white border-brand-primary"
                                        : "bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-brand-primary/50"
                                )}
                            >
                                {type === 'all' ? 'Todos' : type === 'Entrada' ? '↓ Entradas' : '↑ Saídas'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date range */}
                <div className="flex flex-col md:flex-row gap-3 mt-3 items-center">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar size={14} /> Período:
                    </div>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />
                    <span className="text-gray-400 text-sm">até</span>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/40 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                    />

                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors ml-auto"
                        >
                            <X size={14} /> Limpar filtros
                        </button>
                    )}
                </div>
            </Card>

            {/* Movements List */}
            {loading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="animate-spin text-brand-primary" size={32} />
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {paginated.length === 0 ? (
                            <Card className="!p-0">
                                <div className="text-center py-10 text-gray-400">
                                    <Clock size={40} className="mx-auto mb-3 opacity-30" />
                                    <p>{hasActiveFilters ? 'Nenhuma movimentação encontrada com esses filtros' : t('history', 'noMovements')}</p>
                                </div>
                            </Card>
                        ) : (
                            paginated.map((mov) => (
                                <div
                                    key={mov.id}
                                    className="bg-white dark:bg-[#121212]/80 p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm flex items-center justify-between hover:shadow-md hover:border-gray-200 dark:hover:border-white/10 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={clsx(
                                            "p-3 rounded-xl shadow-sm",
                                            mov.type === 'Entrada' ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20" : "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20"
                                        )}>
                                            {mov.type === 'Entrada' ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold text-gray-900 dark:text-gray-100">{mov.productName}</span>
                                                <span className={clsx("text-xs px-2 py-0.5 rounded-full font-bold uppercase",
                                                    mov.type === 'Entrada' ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400"
                                                )}>
                                                    {getTypeLabel(mov.type)}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                <span className="flex items-center gap-1">
                                                    <Calendar size={12} /> {mov.dateStr} às {mov.timeStr}
                                                </span>
                                                {mov.reason && <span>• {getReasonLabel(mov.reason)}</span>}
                                                {mov.provider && <span>• {t('history', 'providerPrefix')}{mov.provider}</span>}
                                                {mov.obs && <span className="italic text-gray-400 dark:text-gray-500">• "{mov.obs}"</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right min-w-[90px] shrink-0 flex flex-col items-end gap-1">
                                        <span className={clsx(
                                            "text-xl font-bold block",
                                            mov.type === 'Entrada' ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                        )}>
                                            {mov.type === 'Entrada' ? '+' : '-'}{mov.qty}
                                        </span>
                                        {mov.price > 0 && (
                                            <span className="text-xs text-gray-400 dark:text-gray-500 block">
                                                {formatCurrency(Number(mov.price))} × {mov.qty}
                                            </span>
                                        )}
                                        {!(mov.reason || '').includes('[ESTORNO') && (
                                            <button
                                                onClick={() => handleReverse(mov)}
                                                className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 transition-colors px-2 py-1 rounded-lg hover:bg-orange-500/10 border border-transparent hover:border-orange-500/20"
                                                title="Estornar esta movimentação"
                                            >
                                                <RotateCcw size={12} /> Estornar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-2">
                            <span className="text-sm text-gray-500">
                                {filtered.length} resultado(s) • Página {page} de {totalPages}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>

                                {/* Page numbers */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (page <= 3) {
                                        pageNum = i + 1;
                                    } else if (page >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = page - 2 + i;
                                    }
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={clsx(
                                                "w-9 h-9 rounded-xl text-sm font-medium transition-colors",
                                                page === pageNum
                                                    ? "bg-brand-primary text-white"
                                                    : "border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                                            )}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}

                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="p-2 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default History;
