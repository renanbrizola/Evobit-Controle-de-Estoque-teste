import React, { useState, useEffect } from 'react';
import ProductForm from '../components/forms/ProductForm';
import ProviderForm from '../components/forms/ProviderForm';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Search, ShoppingBag, Trash2, ArrowDownCircle, ArrowUpCircle, Loader2, Eraser, X, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../services/api';
import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import BarcodeScanner from '../components/ui/BarcodeScanner';
import Modal from '../components/ui/Modal';
import { handleCurrencyChange, parseCurrency, formatCurrency } from '../utils/formatters';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
const STORAGE_KEYS = {
    CART: 'evobit-cart',
    MODE: 'evobit-mode'
};

const Movements = () => {
    const { t } = useLanguage();
    const { getCurrencySymbol } = useTheme();
    const { user } = useAuth();
    const [mode, setMode] = useState('ENTRY'); // 'EXIT' or 'ENTRY' - Default to Entry
    const [products, setProducts] = useState([]);
    const [providers, setProviders] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [cart, setCart] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Quick Provider Add State
    const [isAddingProvider, setIsAddingProvider] = useState(false);



    // Modals State
    const [isProductScannerOpen, setIsProductScannerOpen] = useState(false);
    const [showClearModal, setShowClearModal] = useState(false);

    // Form State
    const [search, setSearch] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [qty, setQty] = useState(1);
    const [reason, setReason] = useState('');
    const [price, setPrice] = useState('');
    const [provider, setProvider] = useState('');
    const [validity, setValidity] = useState('');
    const [obs, setObs] = useState('');

    // --- PERSISTENCE LOGIC ---
    // Safe parse helper
    const safeParse = (key, fallback) => {
        try {
            const item = localStorage.getItem(key);
            if (!item || item === 'undefined' || item === 'null') return fallback;
            const parsed = JSON.parse(item);
            return parsed || fallback;
        } catch (e) {
            console.warn(`Error parsing ${key}`, e);
            localStorage.removeItem(key); // Clear bad data
            return fallback;
        }
    };

    // 1. Load Data on Mount
    useEffect(() => {
        loadData();
        // Restore State from LocalStorage - SAFELY
        const savedCart = safeParse(STORAGE_KEYS.CART, []);
        const savedMode = localStorage.getItem(STORAGE_KEYS.MODE);

        if (Array.isArray(savedCart)) setCart(savedCart);
        if (savedMode) setMode(savedMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps restritas de proposito (fetch-on-mount/por-filtro; padrao legado auditado)
    }, []);

    // 2. Save Data on Change
    useEffect(() => {
        // Save Cart
        localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    }, [cart]);

    useEffect(() => {
        // Save Mode
        localStorage.setItem(STORAGE_KEYS.MODE, mode);
    }, [mode]);



    // 3. Clear Function

    const handleClearAll = () => {
        setShowClearModal(true);
    };

    const confirmClear = () => {
        // Only clear the form inputs, NOT the cart
        setSearch('');
        setSelectedProduct(null);
        setQty(1);
        setReason('');
        setPrice('');
        setProvider('');
        setValidity('');
        setObs('');

        setShowClearModal(false);
        toast.success(t('common', 'success'));
    };


    // Load Data on Mount
    const loadData = async () => {
        try {
            setLoadingData(true);
            const [prods, provs, cats] = await Promise.all([
                api.products.list(),
                api.providers.list(),
                api.categories.list()
            ]);
            setProducts(prods);
            setProviders(provs);
            setCategories(cats);
        } catch (error) {
            console.error(error);
            toast.error(t('common', 'error'));
        } finally {
            setLoadingData(false);
        }
    };

    // Product Form State in Movements
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [newProductName, setNewProductName] = useState(''); // To pre-fill

    const handleSaveProduct = async (formData) => {
        try {
            setIsSubmitting(true);

            // Check if product with same name already exists
            const existing = products.find(p => p.name.toLowerCase() === formData.name.toLowerCase());
            if (existing) {
                toast.error("Já existe um produto com este nome!"); // Should be handled by API mainly, but good check
                setIsSubmitting(false);
                return;
            }

            const data = await api.products.create(formData);

            // Refresh products list
            const updatedProducts = await api.products.list();
            setProducts(updatedProducts);

            // Auto Select
            const newProd = updatedProducts.find(p => p.id === data.id);
            if (newProd) {
                selectProduct(newProd);
            }

            setIsAddingProduct(false);
            setNewProductName(''); // Reset
            toast.success(t('products', 'toast.created'));

        } catch (error) {
            toast.error(`${t('common', 'error')}: ${error.message}`);
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Derived state for suggestions
    const suggestions = (search.length > 0 && !selectedProduct)
        ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).slice(0, 5)
        : [];

    const selectProduct = (prod) => {
        setSelectedProduct(prod);
        setSearch(prod.name);
    };

    const handleScanSuccess = (decodedText) => {
        setSearch(decodedText);
        setIsProductScannerOpen(false);
        const match = products.find(p => p.barcode === decodedText);
        if (match) {
            selectProduct(match);
            toast.success("Produto encontrado!");
        } else {
            toast.info("Produto não encontrado. Preencha os dados ou cadastre-o.");
        }
    };

    const addToCart = () => {
        if (!selectedProduct) {
            const match = products.find(p => p.name.toLowerCase() === search.toLowerCase());
            if (!match) {
                toast.error("Produto não encontrado! Cadastre-o primeiro.");
                return;
            }
            selectProduct(match);
            return;
        }

        if (parseFloat(qty) <= 0) {
            toast.error("Quantidade inválida");
            return;
        }

        if (mode === 'EXIT' && !reason) {
            toast.warning("Selecione um motivo para a saída");
            return;
        }

        // Validate exit stock before adding to cart
        if (mode === 'EXIT') {
            const currentStock = Number(selectedProduct.current_stock || 0);
            const alreadyInCart = cart
                .filter(i => i.productId === selectedProduct.id && i.type === 'Saída')
                .reduce((sum, i) => sum + Number(i.qty || 0), 0);
            if (parseFloat(qty) + alreadyInCart > currentStock) {
                toast.error(`Estoque insuficiente para "${selectedProduct.name}". Disponível: ${currentStock - alreadyInCart}`);
                return;
            }
        }

        if (mode === 'ENTRY') {
            if (!validity) {
                toast.info(t('common', 'expirationHint'), { duration: 3000 });
            }
        }

        // Price Logic
        const quantity = parseFloat(qty);
        // We handle price as string in input "1.234,56", need to parse back to number
        const numericPrice = parseCurrency(price);

        if (numericPrice < 0) {
            toast.error(t('common', 'toasts.negativeValue'));
            return;
        }

        if (mode === 'ENTRY' && numericPrice <= 0) {
            toast.warning(t('movements', 'toast.valueRequired'));
            return;
        }

        const unitPrice = (mode === 'ENTRY' && quantity > 0) ? (numericPrice / quantity) : 0;

        const item = {
            id: uuidv4(),
            productName: selectedProduct.name,
            productId: selectedProduct.id,
            qty: quantity,
            type: mode === 'EXIT' ? 'Saída' : 'Entrada',
            reason: mode === 'ENTRY' ? 'Compra' : reason,
            price: unitPrice,
            totalValue: numericPrice,
            provider: mode === 'ENTRY' ? provider : null,
            validity: mode === 'ENTRY' ? validity : null,
            obs
        };

        setCart([...cart, item]);

        // Reset form
        setSearch('');
        setSelectedProduct(null);
        setQty(1);
        setPrice('');
        setValidity('');
        setObs('');
        toast.success(t('movements', 'toast.success'));
    };




    const removeFromCart = (id) => {
        setCart(cart.filter(item => item.id !== id));
    };

    // Provider Form State
    // REMOVED providerForm state

    const handleSaveProvider = async (formData) => {
        try {
            const data = await api.providers.create(formData);
            setProviders([...providers, data]);
            setProvider(data.id); // Auto-select ID and not Name
            setIsAddingProvider(false);
            toast.success(t('providers', 'toast.created'));
        } catch (error) {
            toast.error(error.message || t('common', 'error'));
            console.error(error);
        }
    };


    const finalize = async () => {
        if (cart.length === 0) return;

        try {
            setIsSubmitting(true);

            // 1. Map cart fields to API format and Register Movements
            const apiItems = cart.map(item => ({
                id: item.id || uuidv4(),
                product_id: item.productId,
                quantity: item.qty, // FIXED: Map UI 'qty' to DB 'quantity'
                type: item.type === 'Entrada' ? 'IN' : 'OUT', // FIXED: Map UI type to DB Enum ['IN', 'OUT']
                reason: item.reason,
                price: item.price,
                cost_unit: item.price, // unitPrice = custo unitário nas entradas
                provider: item.provider,
                validity: item.validity,
                obs: item.obs,
                user_id: user?.ownerId || user?.id, // FIXED: Add user_id for Sync/RLS
                date: new Date().toISOString() // Ensure date is present
            }));
            await api.movements.createTransaction(apiItems);

            // NOTE: cost_price and average_cost are already updated by createTransaction
            // Do NOT update 'price' (selling price) here — it's a separate business decision

            toast.success(`${cart.length} ${t('movements', 'toast.success')}`);
            // Clear Cart and Storage
            setCart([]);
            localStorage.removeItem(STORAGE_KEYS.CART);

            // Reload products to update current stock
            const updatedProducts = await api.products.list();
            setProducts(updatedProducts);

        } catch (error) {
            toast.error(`${t('common', 'error')}: ${error.message || error.details}`);
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-brand-primary">{t('movements', 'title')}</h2>
                    <p className="text-gray-500 font-medium">{t('movements', 'subtitle')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* LEFT COLUMN: ACTION FORM */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Mode Selector */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setMode('ENTRY')}
                            className={clsx(
                                "p-6 rounded-3xl border flex flex-col items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden group shadow-sm",
                                mode === 'ENTRY'
                                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-glow ring-1 ring-emerald-500/20"
                                    : "bg-white dark:bg-brand-dark/20 border-gray-200 dark:border-white/5 text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:border-emerald-200 dark:hover:border-emerald-500/30 hover:text-emerald-500"
                            )}
                        >
                            <div className={clsx("p-3 rounded-full transition-colors", mode === 'ENTRY' ? "bg-emerald-500/20" : "bg-gray-100 dark:bg-black/20 group-hover:bg-emerald-500/20")}>
                                <ArrowUpCircle size={32} className={mode === 'ENTRY' ? "text-emerald-500 dark:text-emerald-400" : "text-gray-400 group-hover:text-emerald-500"} />
                            </div>
                            <span className="font-bold tracking-widest text-sm uppercase">{t('movements', 'entry')}</span>
                        </button>
                        <button
                            onClick={() => setMode('EXIT')}
                            className={clsx(
                                "p-6 rounded-3xl border flex flex-col items-center justify-center gap-3 transition-all duration-300 relative overflow-hidden group shadow-sm",
                                mode === 'EXIT'
                                    ? "bg-red-500/10 border-red-500 text-red-600 dark:text-red-400 shadow-glow ring-1 ring-red-500/20"
                                    : "bg-white dark:bg-brand-dark/20 border-gray-200 dark:border-white/5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:border-red-200 dark:hover:border-red-500/30 hover:text-red-500"
                            )}
                        >
                            <div className={clsx("p-3 rounded-full transition-colors", mode === 'EXIT' ? "bg-red-500/20" : "bg-gray-100 dark:bg-black/20 group-hover:bg-red-500/20")}>
                                <ArrowDownCircle size={32} className={mode === 'EXIT' ? "text-red-500 dark:text-red-400" : "text-gray-400 group-hover:text-red-500"} />
                            </div>
                            <span className="font-bold tracking-widest text-sm uppercase">{t('movements', 'exit')}</span>
                        </button>
                    </div>

                    <Card className="border-t-4 border-t-brand-primary/20 relative bg-white/80 dark:bg-[#121212]/50 border-gray-100 dark:border-white/10 backdrop-blur-md shadow-sm">
                        {/* Clear Button - Top Right */}
                        <div className="absolute top-4 right-4 z-10">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleClearAll}
                                className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                                title="Limpar formulário e cesta"
                            >
                                <Eraser size={16} className="mr-2" />
                                {t('common', 'clear')}
                            </Button>
                        </div>

                        <div className="relative mb-6 pt-6"> {/* Added pt-6 for clearer spacing from button */}
                            <Input
                                label={t('inventory', 'searchPlaceholder')}
                                placeholder={loadingData ? t('common', 'loading') : t('movements', 'selectProduct')}
                                icon={loadingData ? Loader2 : Search}
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    if (selectedProduct && e.target.value !== selectedProduct.name) {
                                        setSelectedProduct(null);
                                    }
                                }}
                                autoComplete="off"
                                disabled={loadingData}
                                className="bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-brand-dark dark:text-white placeholder:text-gray-400 focus:border-brand-primary/50 shadow-sm"
                            />

                            {/* PRODUCT HISTORY DISPLAY */}
                            {selectedProduct && mode === 'ENTRY' && (
                                <div className="mt-2 p-3 bg-brand-primary/10 rounded-xl border border-brand-primary/20 text-sm flex justify-between items-center animate-in fade-in">
                                    <div>
                                        <span className="text-gray-400 block text-xs">{t('movements', 'lastPurchase')}:</span>
                                        <span className="font-bold text-brand-light">
                                            {selectedProduct.last_cost_price
                                                ? formatCurrency(selectedProduct.last_cost_price)
                                                : t('common', 'noRecord')}
                                        </span>
                                    </div>
                                    {selectedProduct.last_provider_id && (
                                        <div className="text-right">
                                            <span className="text-gray-400 block text-xs">{t('movements', 'supplier')}:</span>
                                            <span className="font-bold text-brand-light">
                                                {providers.find(p => p.id === selectedProduct.last_provider_id)?.name || t('common', 'unknown')}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {(search.length > 0 && !selectedProduct) && (
                                <div className="absolute w-full bg-white dark:bg-[#1e1e1e] mt-1 rounded-xl shadow-2xl border border-gray-100 dark:border-white/10 z-10 overflow-hidden">
                                    {suggestions.map(s => (
                                        <div
                                            key={s.id}
                                            className="p-3 hover:bg-brand-primary/5 cursor-pointer border-b border-gray-100 dark:border-brand-light/5 last:border-none flex justify-between items-center transition-colors"
                                            onClick={() => selectProduct(s)}
                                        >
                                            <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>
                                            <div className="flex items-center gap-2">
                                                <span className={clsx("text-xs font-bold px-2 py-1 rounded-lg", s.current_stock < s.min_stock ? "bg-red-500/20 text-red-400" : "bg-emerald-500/20 text-emerald-400")}>
                                                    {t('movements', 'stockAbbr')}: {s.current_stock}
                                                </span>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Option to Create New Product */}
                                    {mode === 'ENTRY' && (
                                        <div
                                            className="p-3 bg-brand-primary/10 hover:bg-brand-primary/20 cursor-pointer border-t border-dashed border-brand-primary/30 flex items-center gap-2 text-brand-primary font-bold"
                                            onClick={() => {
                                                setNewProductName(search); // Pre-fill name
                                                setIsAddingProduct(true);
                                            }}
                                        >
                                            <span className="text-xl">+</span>
                                            <span>{t('common', 'registerProduct')} "{search}"</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* New Product Modal in Movements */}
                        <Modal isOpen={isAddingProduct} onClose={() => setIsAddingProduct(false)} className="max-w-3xl">
                            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                                <h3 className="text-xl font-bold text-gray-900 dark:text-brand-light">
                                    {t('products', 'newProduct')}
                                </h3>
                            </div>
                            <ProductForm
                                initialData={{ name: newProductName }}
                                categories={categories}
                                providers={providers}
                                onSave={handleSaveProduct}
                                onCancel={() => setIsAddingProduct(false)}
                                saving={isSubmitting}
                            />
                        </Modal>

                        <div className="grid grid-cols-12 gap-4 mb-4">
                            <div className={mode === 'ENTRY' ? "col-span-4" : "col-span-12"}>
                                <Input
                                    label={t('movements', 'qty')}
                                    type="number"
                                    value={qty}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === '' || Number(val) >= 0) setQty(val);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === '-' || e.key === 'e') e.preventDefault();
                                    }}
                                    min="0" className="text-center font-bold text-lg bg-white dark:bg-brand-dark/5 border-gray-200 dark:border-brand-light/10 text-brand-dark dark:text-brand-light rounded-lg shadow-sm"
                                />
                            </div>

                            {mode === 'ENTRY' && (
                                <div className="col-span-8">
                                    <Input
                                        label={`${t('common', 'total')} (${getCurrencySymbol()})`}
                                        placeholder="0,00"
                                        value={price}
                                        onChange={(e) => handleCurrencyChange(e, setPrice)}
                                        className="bg-white dark:bg-brand-dark/5 border-gray-200 dark:border-brand-light/10 text-brand-dark dark:text-brand-light placeholder:text-gray-400 shadow-sm"
                                    />
                                </div>
                            )}
                        </div>

                        {mode === 'EXIT' ? (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('movements', 'reason')}</label>
                                <select
                                    className="w-full h-[42px] px-3 bg-white dark:bg-brand-dark/5 border border-gray-200 dark:border-brand-light/10 rounded-xl text-sm text-brand-dark dark:text-brand-light focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all appearance-none shadow-sm"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                >
                                    <option value="" className="bg-white dark:bg-gray-900">{t('common', 'select')}</option>
                                    <option value="Uso em Serviço" className="bg-white dark:bg-gray-900">{t('movements', 'reasons.internal')}</option>
                                    <option value="Venda ao Cliente" className="bg-white dark:bg-gray-900">{t('movements', 'reasons.sale')}</option>
                                    <option value="Perda/Quebra" className="bg-white dark:bg-gray-900">{t('movements', 'reasons.loss')}</option>
                                    <option value="Consumo Interno" className="bg-white dark:bg-gray-900">{t('movements', 'reasons.internal')}</option>
                                    <option value="Ajuste" className="bg-white dark:bg-gray-900">{t('movements', 'reasons.adjustment')}</option>
                                </select>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <Input
                                    label={t('products', 'form.expiration')}
                                    type="date"
                                    value={validity}
                                    onChange={e => setValidity(e.target.value)}
                                    className="bg-white dark:bg-brand-dark/5 border-gray-200 dark:border-brand-light/10 text-brand-dark dark:text-brand-light placeholder:text-gray-400 shadow-sm"
                                />

                                {/* Provider Select with NEW Button */}
                                <div className="relative">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('products', 'form.supplier')}</label>
                                    <select
                                        className="w-full h-[42px] px-3 bg-white dark:bg-brand-dark/5 border border-gray-200 dark:border-brand-light/10 rounded-xl text-sm text-brand-dark dark:text-brand-light focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all appearance-none shadow-sm"
                                        value={provider}
                                        onChange={e => {
                                            if (e.target.value === 'NEW') {
                                                setIsAddingProvider(true);
                                            } else {
                                                setProvider(e.target.value);
                                            }
                                        }}
                                    >
                                        <option value="" className="bg-white dark:bg-gray-900">{t('common', 'select')}</option>
                                        <option value="NEW" className="bg-white dark:bg-gray-900 font-bold text-brand-primary">{t('providers', 'newProvider')}</option>
                                        {providers.map(p => (
                                            <option key={p.id} value={p.id} className="bg-white dark:bg-gray-900">{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <Input
                            label={t('movements', 'obs')}
                            placeholder={t('movements', 'obs')}
                            value={obs}
                            onChange={e => setObs(e.target.value)}
                            className="mb-6 bg-white dark:bg-brand-dark/5 border-gray-200 dark:border-brand-light/10 text-brand-dark dark:text-brand-light placeholder:text-gray-400 shadow-sm"
                        />

                        <Button
                            onClick={addToCart}
                            className={clsx(
                                "w-full py-4 text-lg uppercase tracking-widest font-bold shadow-glow transition-all",
                                mode === 'EXIT'
                                    ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-500/20"
                                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20"
                            )}
                            disabled={loadingData}
                        >
                            {mode === 'EXIT' ? t('movements', 'addItem') : t('movements', 'addItem')}
                        </Button>
                    </Card>
                </div>

                {/* RIGHT COLUMN: CART */}
                <div className="lg:col-span-1">
                    <div className="bg-white/80 dark:bg-[#121212]/50 backdrop-blur-md rounded-[2rem] shadow-glass border border-gray-100 dark:border-white/10 sticky top-4 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)]">
                        <div className="p-5 bg-gray-50 dark:bg-brand-dark/10 text-brand-dark dark:text-brand-light flex justify-between items-center border-b border-gray-100 dark:border-brand-light/5">
                            <div className="flex items-center gap-2">
                                <ShoppingBag size={20} className="text-brand-primary" />
                                <h3 className="text-gray-900 dark:text-brand-light font-sans text-sm font-bold uppercase tracking-widest">{t('movements', 'cart')}</h3>
                            </div>
                            <span className="bg-brand-primary text-white px-2 py-0.5 rounded-lg text-xs font-bold shadow-glow">{cart.length}</span>
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
                            {cart.length === 0 ? (
                                <div className="text-center py-10 opacity-40">
                                    <ShoppingBag size={48} className="mx-auto mb-3 text-gray-600" />
                                    <p className="font-medium text-gray-500">{t('movements', 'emptyCart')}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <AnimatePresence>
                                        {cart.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: 20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                className={clsx(
                                                    "p-3 rounded-xl border-l-[3px] shadow-sm bg-white dark:bg-brand-dark/5 flex justify-between items-start group hover:bg-gray-50 dark:hover:bg-brand-dark/10 transition-colors border-gray-100 dark:border-white/5",
                                                    item.type === 'Saída' ? "border-l-red-500" : "border-l-emerald-500"
                                                )}
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={clsx("font-bold text-lg", item.type === 'Saída' ? "text-red-400" : "text-emerald-400")}>{item.qty}x</span>
                                                        <h4 className="font-medium text-sm leading-tight text-gray-900 dark:text-brand-light">{item.productName}</h4>
                                                    </div>
                                                    <div className="flex gap-1 mt-1 flex-wrap">
                                                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 bg-black/30 text-gray-300 px-1.5 rounded border border-white/5">{item.reason}</span>
                                                        {item.validity && <span className="text-[10px] font-bold text-red-300 bg-red-500/10 px-1.5 rounded border border-red-500/20">Val: {new Date(item.validity).toLocaleDateString('pt-BR', { month: '2-digit', day: '2-digit' })}</span>}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                    disabled={isSubmitting}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="p-4 bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5 space-y-3">
                                {/* Preview Summary */}
                                <div className="bg-white dark:bg-white/5 rounded-xl p-3 border border-gray-100 dark:border-white/10 space-y-2">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Resumo da operação</h4>
                                    {(() => {
                                        const entries = cart.filter(i => i.type === 'Entrada');
                                        const exits = cart.filter(i => i.type === 'Saída');
                                        const totalQtyIn = entries.reduce((s, i) => s + Number(i.qty || 0), 0);
                                        const totalQtyOut = exits.reduce((s, i) => s + Number(i.qty || 0), 0);
                                        const totalValue = cart.reduce((s, i) => s + (Number(i.price || 0) * Number(i.qty || 0)), 0);
                                        return (
                                            <>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-gray-500">Itens no carrinho</span>
                                                    <span className="font-bold text-gray-900 dark:text-white">{cart.length}</span>
                                                </div>
                                                {entries.length > 0 && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-emerald-600">↓ Entradas</span>
                                                        <span className="font-bold text-emerald-600">+{totalQtyIn} un ({entries.length} itens)</span>
                                                    </div>
                                                )}
                                                {exits.length > 0 && (
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-red-500">↑ Saídas</span>
                                                        <span className="font-bold text-red-500">-{totalQtyOut} un ({exits.length} itens)</span>
                                                    </div>
                                                )}
                                                {totalValue > 0 && (
                                                    <div className="flex justify-between text-xs border-t border-gray-100 dark:border-white/5 pt-2">
                                                        <span className="text-gray-500">Valor total estimado</span>
                                                        <span className="font-bold text-brand-primary">{getCurrencySymbol()} {totalValue.toFixed(2)}</span>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>

                                <Button
                                    onClick={finalize}
                                    className="w-full shadow-glow font-bold tracking-wide"
                                    variant="primary"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 className="animate-spin mr-2" /> Processando...</>
                                    ) : (
                                        `${t('movements', 'finish')} (${cart.length})`
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* NEW PROVIDER MODAL */}
                <Modal isOpen={isAddingProvider} onClose={() => setIsAddingProvider(false)} className="max-w-4xl bg-[#121212] border-white/10">
                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                        <h3 className="text-xl font-serif font-bold text-brand-light">{t('providers', 'newProvider')}</h3>
                    </div>

                    <ProviderForm
                        onSave={handleSaveProvider}
                        onCancel={() => setIsAddingProvider(false)}
                    />
                </Modal>


                {/* CLEAR CONFIRMATION MODAL */}
                < Modal
                    isOpen={showClearModal}
                    onClose={() => setShowClearModal(false)}
                    className="max-w-sm"
                >
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                            <Eraser size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{t('common', 'confirm')}</h3>
                        <p className="text-gray-500">
                            {t('movements', 'clearConfirmMessage') || "Todos os dados preenchidos no formulário e a cesta serão perdidos."}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => setShowClearModal(false)}
                            className="flex-1"
                        >
                            {t('common', 'cancel')}
                        </Button>
                        <Button
                            variant="danger"
                            onClick={confirmClear}
                            className="flex-1"
                        >
                            {t('common', 'clear')}
                        </Button>
                    </div>
                </Modal >

                {/* SCANNER MODAL */}
                {
                    isProductScannerOpen && (
                        <BarcodeScanner
                            onScanSuccess={handleScanSuccess}
                            onClose={() => setIsProductScannerOpen(false)}
                        />
                    )
                }

            </div >
        </div >
    );
};

export default Movements;
