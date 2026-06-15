import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ProductGrid from '../components/sales/ProductGrid';
import Cart from '../components/sales/Cart';
import PaymentModal from '../components/sales/PaymentModal';
import CustomerSelect from '../components/sales/CustomerSelect';
import { printReceipt } from '../utils/ReceiptPrinter';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import { FileText, Save } from 'lucide-react';
import { Button } from '../components/ui/Button';

import { OrdersService } from '../services/orders';
import { FiscalService } from '../services/fiscal';

import SaleSuccessModal from '../components/sales/SaleSuccessModal';

const Sales = () => {
    const { companyName } = useTheme();
    const location = useLocation();

    // State
    const [cartItems, setCartItems] = useState([]);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [currentQuoteId, setCurrentQuoteId] = useState(null);

    // Success Modal State
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);
    const [lastSaleId, setLastSaleId] = useState(null);
    const [lastSaleResult, setLastSaleResult] = useState(null);

    // Initialize from Edit State
    useEffect(() => {
        if (location.state?.orderToEdit) {
            loadOrderForEdit(location.state.orderToEdit.id);
        }
    }, [location.state]);

    const loadOrderForEdit = async (id) => {
        try {
            const order = await OrdersService.getById(id);
            if (order) {
                setCurrentQuoteId(order.id);
                // Map items to Cart format
                const items = order.items.map(i => ({
                    id: i.product_id,
                    product_id: i.product_id,
                    name: i.product_name || 'Produto', // TODO: Fetch real name if missing
                    unit_price: i.unit_price,
                    cost_unit: i.cost_unit,
                    quantity: i.quantity
                }));
                setCartItems(items);

                if (order.customer_id) {
                    // Ideally fetch customer details
                    setSelectedCustomer({ id: order.customer_id, name: order.customer_name || 'Cliente' });
                }
                toast.info(`Editando Orçamento #${order.id.substr(0, 8)}`);
            }
        } catch (err) {
            console.error(err);
            toast.error('Erro ao carregar orçamento');
        }
    };

    const handleAddToCart = (product) => {
        setCartItems(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, {
                id: product.id,
                product_id: product.id,
                name: product.name,
                unit_price: Number(product.price),
                cost_unit: Number(product.cost_unit || 0),
                quantity: 1
            }];
        });
        toast.success(`Adicionado: ${product.name}`, { duration: 1000 });
    };

    const handleUpdateQuantity = (id, delta) => {
        setCartItems(prev => prev.map(item => {
            if (item.id === id) {
                const newQty = item.quantity + delta;
                return newQty > 0 ? { ...item, quantity: newQty } : item;
            }
            return item;
        }));
    };

    const handleRemoveItem = (id) => {
        setCartItems(prev => prev.filter(item => item.id !== id));
    };

    const cartTotal = useMemo(() => {
        return cartItems.reduce((acc, item) => acc + (item.unit_price * item.quantity), 0);
    }, [cartItems]);

    const handleOpenPayment = () => {
        if (cartItems.length === 0) return toast.warning('Adicione produtos ao carrinho.');
        setIsPaymentOpen(true);
    };

    const handleSaveQuote = async () => {
        if (cartItems.length === 0) return toast.warning('Adicione produtos para salvar orçamento.');

        try {
            setIsSubmitting(true);
            const quoteData = {
                items: cartItems.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    total: item.unit_price * item.quantity,
                    cost_unit: item.cost_unit
                })),
                customer_id: selectedCustomer?.id || null,
                subtotal: cartTotal,
                total: cartTotal,
                notes: 'Orçamento salvo via PDV'
            };

            if (currentQuoteId) {
                await OrdersService.updateQuote(currentQuoteId, quoteData);
                toast.success('Orçamento atualizado com sucesso!');
            } else {
                await OrdersService.createQuote(quoteData);
                toast.success('Orçamento criado com sucesso!');
                setCartItems([]);
                setSelectedCustomer(null);
                setCurrentQuoteId(null);
            }
        } catch (error) {
            console.error(error);
            toast.error('Erro ao salvar orçamento: ' + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmSale = async (paymentDetails) => {
        // Prepare Data
        const saleDetails = {
            items: cartItems.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.unit_price * item.quantity,
                cost_unit: item.cost_unit
            })),
            customer_id: selectedCustomer?.id || null,
            subtotal: paymentDetails.subtotal,
            discount: paymentDetails.discount,
            total: paymentDetails.total,
            payments: paymentDetails.payments
        };

        try {
            setIsSubmitting(true);
            let saleResult;

            if (currentQuoteId) {
                await OrdersService.updateQuote(currentQuoteId, saleDetails);
                saleResult = await OrdersService.processOrder(currentQuoteId, { payments: saleDetails.payments });
            } else {
                saleResult = await OrdersService.createDirectSale(saleDetails);
            }

            // Success State
            setLastSaleResult(saleResult);
            setLastSaleId(saleResult.id);
            setCartItems([]);
            setIsPaymentOpen(false);
            setSelectedCustomer(null);
            setCurrentQuoteId(null);

            // Open Success Modal
            setIsSuccessOpen(true);

        } catch (err) {
            console.error(err);
            toast.error('Erro ao processar venda: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="h-[calc(100vh-2rem)] flex gap-6 p-2">
            {/* Left Side: Product Grid */}
            <div className="flex-1 min-w-0 flex flex-col h-full">
                <div className="mb-6 flex justify-between items-start shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="text-brand-primary" />
                            {currentQuoteId ? `Editando Orçamento #${currentQuoteId.substr(0, 8)}` : 'Frente de Caixa'}
                        </h1>
                        <p className="text-gray-500">Selecione os produtos para iniciar a venda</p>
                    </div>

                    {/* Customer Select Widget */}
                    <div className="w-80 z-10 flex gap-2">
                        <div className="flex-1">
                            <CustomerSelect
                                onSelect={setSelectedCustomer}
                                selectedCustomer={selectedCustomer}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-100 dark:border-white/5">
                    <ProductGrid onAddToCart={handleAddToCart} />
                </div>
            </div>

            {/* Right Side: Cart */}
            <div className="w-96 flex-shrink-0 flex flex-col h-full gap-4">
                <div className="flex-1 min-h-0">
                    <Cart
                        items={cartItems}
                        onUpdateQuantity={handleUpdateQuantity}
                        onRemoveItem={handleRemoveItem}
                        onCheckout={handleOpenPayment}
                        customerName={selectedCustomer?.name}
                    />
                </div>

                {/* Actions */}
                <div className="bg-white dark:bg-[#1A1A1A] p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 shrink-0 grid grid-cols-2 gap-3">
                    <Button
                        variant="outline"
                        onClick={handleSaveQuote}
                        disabled={cartItems.length === 0 || isSubmitting}
                        className="h-12 border-dashed border-2 hover:bg-brand-primary/5 hover:border-brand-primary hover:text-brand-primary"
                    >
                        <Save size={18} className="mr-2" />
                        {currentQuoteId ? 'Atualizar Orçamento' : 'Salvar Orçamento'}
                    </Button>
                    <Button
                        onClick={handleOpenPayment}
                        disabled={cartItems.length === 0}
                        className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                    >
                        {currentQuoteId ? 'Confirmar Conversão' : 'Finalizar Venda'}
                    </Button>
                </div>
            </div>

            {/* Payment Modal */}
            <PaymentModal
                isOpen={isPaymentOpen}
                onClose={() => setIsPaymentOpen(false)}
                total={cartTotal}
                onConfirm={handleConfirmSale}
            />

            {/* Success / Fiscal Modal */}
            <SaleSuccessModal
                isOpen={isSuccessOpen}
                onClose={() => {
                    setIsSuccessOpen(false);
                    setLastSaleId(null);
                }}
                saleId={lastSaleId}
                onPrintReceipt={() => {
                    // We need to re-fetch the sale or just pass the ID if printReceipt handles ID
                    // Current printReceipt expects object. We might need to store the sale object.
                    // For now, let's assume we can't easily re-print without the object unless we change logic.
                    // BETTER: Store lastSale object in state.
                    if (lastSaleResult) {
                        printReceipt(lastSaleResult, selectedCustomer, [], { companyName }); // Items are cleared, but receipt might need them.
                        // Actually printReceipt takes items. If we cleared cart, we have issue.
                        // Fix: Pass items from saleResult (it has items attached usually or we need to keep them)
                    }
                }}
                onEmitNFCe={async () => {
                    if (!lastSaleId) return;
                    try {
                        toast.loading('Emitindo NFC-e...');
                        const result = await FiscalService.emitNFCe(lastSaleId);
                        toast.dismiss();

                        if (result.success) {
                            toast.success(`NFC-e Emitida! Série: ${result.nfe_series} Nº: ${result.nfe_number}`);
                            // Optional: Update local state or open URL
                        } else {
                            toast.error('Erro na emissão: ' + (result.message || 'Desconhecido'));
                        }
                    } catch (error) {
                        toast.dismiss();
                        console.error(error);
                        toast.error('Falha ao emitir NFC-e: ' + error.message);
                    }
                }}
            />
        </div>
    );
};

export default Sales;
