import React from 'react';
import { ShoppingCart, Trash2, Minus, Plus, CreditCard, Banknote, QrCode } from 'lucide-react';
import { Button } from '../ui/Button';

const Cart = ({ items, onUpdateQuantity, onRemoveItem }) => {
    const subtotal = items.reduce((acc, item) => acc + ((item.unit_price || item.price || 0) * item.quantity), 0);
    const total = subtotal; // Can add tax/discount logic here

    return (
        <div className="flex flex-col h-full bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-white/5 overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-800 dark:text-white">
                    <ShoppingCart size={20} className="text-brand-primary" />
                    <span className="font-bold text-lg">Carrinho</span>
                </div>
                <span className="bg-brand-primary/10 text-brand-primary text-xs font-bold px-2 py-1 rounded-full">
                    {items.length} itens
                </span>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 space-y-4 opacity-50">
                        <ShoppingCart size={64} />
                        <p className="font-medium">Seu carrinho está vazio</p>
                    </div>
                ) : (
                    items.map(item => (
                        <div key={item.id} className="flex gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-white/10 group">
                            {/* Image Placeholder if missing */}
                            <div className="w-16 h-16 bg-gray-200 dark:bg-white/10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center text-gray-400">
                                {item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <ShoppingCart size={24} opacity={0.5} />
                                )}
                            </div>

                            <div className="flex-1 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-sm text-gray-800 dark:text-white line-clamp-2">{item.name}</h4>
                                    <button
                                        onClick={() => onRemoveItem(item.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div className="flex items-center bg-gray-100 dark:bg-white/5 rounded-lg p-1">
                                        <button
                                            onClick={() => onUpdateQuantity(item.id, -1)}
                                            className="w-6 h-6 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 rounded-md transition-shadow"
                                            disabled={item.quantity <= 1}
                                        >
                                            <Minus size={14} />
                                        </button>
                                        <span className="w-8 text-center text-sm font-bold dark:text-white">{item.quantity}</span>
                                        <button
                                            onClick={() => onUpdateQuantity(item.id, 1)}
                                            className="w-6 h-6 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-white/10 rounded-md transition-shadow"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                    <span className="font-bold text-brand-primary">
                                        R$ {((item.unit_price || item.price || 0) * item.quantity).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer / Totals */}
            {items.length > 0 && (
                <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-white/5">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                            <span>Subtotal</span>
                            <span>R$ {subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-black text-gray-900 dark:text-white pt-2 border-t border-gray-200/60 dark:border-white/10">
                            <span>Total</span>
                            <span>R$ {total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Cart;
