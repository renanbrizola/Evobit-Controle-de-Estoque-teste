import React, { useState, useEffect } from 'react';
import { Search, Package, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { api } from '../../services/api';

const ProductGrid = ({ onAddToCart }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('Todos');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        try {
            const data = await api.products.list();
            setProducts(data);
        } catch (error) {
            console.error('Erro ao carregar produtos:', error);
            toast.error('Erro ao carregar produtos. Verifique o console.');
        } finally {
            setLoading(false);
        }
    };

    const categories = ['Todos', ...new Set(products.map(p => p.category || 'Sem Categoria'))];

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'Todos' || (product.category || 'Sem Categoria') === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (loading) return <div className="p-4 text-center text-gray-500">Carregando produtos...</div>;

    return (
        <div className="flex flex-col h-full bg-gray-50/50 rounded-2xl p-4 gap-4">
            {/* Search and Filters */}
            <div className="flex flex-col gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar produtos..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-brand-primary/50 focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${categoryFilter === cat
                                ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {filteredProducts.map(product => (
                    <Card
                        key={product.id}
                        className="group cursor-pointer hover:shadow-lg transition-all duration-300 border-2 border-transparent hover:border-brand-primary/20 overflow-hidden"
                        onClick={() => onAddToCart(product)}
                    >
                        <div className="h-32 bg-gray-200 relative overflow-hidden flex items-center justify-center">
                            {product.image ? (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                />
                            ) : (
                                <Package size={48} className="text-gray-300" />
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            <button className="absolute bottom-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                <Plus size={18} className="text-brand-primary" />
                            </button>
                            {/* Stock Badge */}
                            <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm">
                                Est: {product.current_stock || 0}
                            </div>
                        </div>
                        <div className="p-3">
                            <h3 className="font-bold text-gray-800 text-sm line-clamp-2 min-h-[2.5rem] mb-1 leading-tight">
                                {product.name}
                            </h3>
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full truncate max-w-[80px]">
                                    {product.category || 'Geral'}
                                </span>
                                <span className="font-bold text-brand-primary whitespace-nowrap">
                                    R$ {Number(product.price).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default ProductGrid;
