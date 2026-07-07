import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { api } from '../services/api';
import { toast } from 'sonner';
import { Plus, Trash2, Tag, Loader2, Pencil, Check, X, Package, AlertTriangle, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { usePagination, PaginationBar } from '../components/shared/TablePagination';

const Categories = () => {
    const { t } = useLanguage();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [filter, setFilter] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    useEffect(() => {
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps restritas de proposito (fetch-on-mount/por-filtro; padrao legado auditado)
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [cats, prods] = await Promise.all([
                api.categories.list(),
                api.products.list()
            ]);
            setCategories(cats);
            setProducts(prods.data || prods);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error(t('common', 'error'));
        } finally {
            setLoading(false);
        }
    };

    // Count products per category
    const productCountMap = useMemo(() => {
        const map = {};
        (products || []).forEach(p => {
            const cat = (p.category || '').trim().toLowerCase();
            if (cat) map[cat] = (map[cat] || 0) + 1;
        });
        return map;
    }, [products]);

    const getProductCount = (categoryName) => {
        return productCountMap[(categoryName || '').trim().toLowerCase()] || 0;
    };

    // Filtered categories
    const filtered = useMemo(() => {
        if (!filter.trim()) return categories;
        const q = filter.toLowerCase();
        return categories.filter(c => c.name.toLowerCase().includes(q));
    }, [categories, filter]);

    const catsPagination = usePagination(filtered);

    const handleAdd = async () => {
        const trimmed = newName.trim();
        if (!trimmed) return;

        if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
            toast.warning(t('categoriesPage', 'alreadyExists'));
            return;
        }

        try {
            setIsSubmitting(true);
            await api.categories.create(trimmed);
            setNewName('');
            await loadData();
            toast.success(t('common', 'toasts.success'));
        } catch (error) {
            console.error('Error creating category:', error);
            toast.error(error.message || t('common', 'error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStartEdit = (cat) => {
        setEditingId(cat.id);
        setEditName(cat.name);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleSaveEdit = async (id) => {
        const trimmed = editName.trim();
        if (!trimmed) return;

        if (categories.some(c => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
            toast.warning(t('categoriesPage', 'alreadyExists'));
            return;
        }

        try {
            setIsSubmitting(true);
            await api.categories.update(id, trimmed);
            setEditingId(null);
            setEditName('');
            await loadData();
            toast.success('Categoria renomeada');
        } catch (error) {
            console.error('Error updating category:', error);
            toast.error(error.message || t('common', 'error'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditKeyDown = (e, id) => {
        if (e.key === 'Enter') handleSaveEdit(id);
        if (e.key === 'Escape') handleCancelEdit();
    };

    const handleDeleteRequest = (cat) => {
        const count = getProductCount(cat.name);
        if (count > 0) {
            setDeleteConfirm(cat);
        } else {
            handleDelete(cat.id);
        }
    };

    const handleDelete = async (id) => {
        try {
            await api.categories.delete(id);
            setDeleteConfirm(null);
            await loadData();
            toast.success(t('common', 'toasts.success'));
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error(error.message || t('common', 'error'));
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <Tag className="text-brand-primary" size={28} />
                    {t('categoriesPage', 'title')}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    {t('categoriesPage', 'subtitle')}
                </p>
            </div>

            {/* Add Form */}
            <Card className="!p-0 overflow-hidden">
                <div className="p-4 flex gap-3">
                    <Input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('categoriesPage', 'addPlaceholder')}
                        className="flex-1"
                        maxLength={50}
                    />
                    <Button
                        onClick={handleAdd}
                        disabled={!newName.trim() || isSubmitting}
                        className="flex items-center gap-2 bg-brand-primary hover:bg-brand-primary/90 text-white px-4 py-2 rounded-xl font-medium transition-all disabled:opacity-50 shrink-0"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin" size={18} />
                        ) : (
                            <Plus size={18} />
                        )}
                        {t('categoriesPage', 'addButton')}
                    </Button>
                </div>
            </Card>

            {/* Search */}
            {categories.length > 5 && (
                <Input
                    icon={Search}
                    placeholder="Buscar categoria..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="bg-white dark:bg-black/40"
                />
            )}

            {/* Stats */}
            {!loading && categories.length > 0 && (
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-medium">{categories.length} categoria(s)</span>
                    <span>•</span>
                    <span>{products.length} produto(s) cadastrados</span>
                </div>
            )}

            {/* Categories List */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-brand-primary" size={32} />
                </div>
            ) : categories.length === 0 ? (
                <Card>
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <Tag size={48} className="mx-auto mb-3 opacity-30" />
                        <p>{t('categoriesPage', 'empty')}</p>
                    </div>
                </Card>
            ) : (
                <Card className="!p-0 overflow-hidden">
                    <div className="divide-y divide-gray-100 dark:divide-white/5">
                        {catsPagination.pageItems.map((cat) => {
                            const count = getProductCount(cat.name);
                            const isEditing = editingId === cat.id;

                            return (
                                <div
                                    key={cat.id}
                                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center shrink-0">
                                            <Tag size={18} className="text-brand-primary" />
                                        </div>

                                        {isEditing ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={e => setEditName(e.target.value)}
                                                    onKeyDown={e => handleEditKeyDown(e, cat.id)}
                                                    className="flex-1 px-3 py-1.5 rounded-lg border border-brand-primary/50 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
                                                    autoFocus
                                                    maxLength={50}
                                                />
                                                <button
                                                    onClick={() => handleSaveEdit(cat.id)}
                                                    disabled={isSubmitting || !editName.trim()}
                                                    className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                                    title="Salvar"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={handleCancelEdit}
                                                    className="p-1.5 rounded-lg bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-300 dark:hover:bg-white/20 transition-colors"
                                                    title="Cancelar"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 min-w-0">
                                                <span className="font-medium text-gray-900 dark:text-white block truncate">
                                                    {cat.name}
                                                </span>
                                                <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Package size={12} />
                                                    {count} {count === 1 ? 'produto' : 'produtos'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {!isEditing && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleStartEdit(cat)}
                                                className="p-2 text-gray-400 hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-all"
                                                title="Editar"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteRequest(cat)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {filtered.length === 0 && filter && (
                            <div className="p-6 text-center text-gray-400">
                                Nenhuma categoria encontrada para "{filter}"
                            </div>
                        )}
                    </div>
                    <PaginationBar pagination={catsPagination} className="px-4 pb-4" />
                </Card>
            )}

            {/* Delete Confirmation Modal (for categories with products) */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center">
                                <AlertTriangle className="text-amber-600" size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Atenção</h3>
                                <p className="text-sm text-gray-500">Categoria com produtos vinculados</p>
                            </div>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 mb-2">
                            A categoria <strong className="text-gray-900 dark:text-white">"{deleteConfirm.name}"</strong> possui{' '}
                            <strong className="text-amber-600">{getProductCount(deleteConfirm.name)} produto(s)</strong> vinculados.
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Ao excluir, os produtos permanecerão cadastrados mas ficarão sem categoria.
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirm.id)}
                                className="px-4 py-2 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={16} /> Excluir mesmo assim
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Categories;
