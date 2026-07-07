import React, { useState, useEffect } from 'react';
import { X, DollarSign, CreditCard, Banknote, QrCode, Calculator, ArrowRight, Wallet, Trash2, FileText, Calendar, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatCurrency } from '../../utils/formatters';
import clsx from 'clsx';
import { toast } from 'sonner';

const PaymentModal = ({ isOpen, onClose, total, onConfirm }) => {

    // State
    const [payments, setPayments] = useState([]);
    const [currentMethod, setCurrentMethod] = useState('cash'); // 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'credit'
    const [currentAmount, setCurrentAmount] = useState('');
    const [installments, setInstallments] = useState(1);
    const [dueDate, setDueDate] = useState(''); // YYYY-MM-DD

    const [discountType, setDiscountType] = useState('value');
    const [discountValue, setDiscountValue] = useState('');

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
             
            // eslint-disable-next-line react-hooks/set-state-in-effect -- init/reset sincrono de estado no effect e intencional (padrao legado auditado)
            setPayments([]);
            setCurrentMethod('cash');
            setDiscountType('value');
            setDiscountValue('');
            setCurrentAmount(total.toFixed(2));
            setInstallments(1);
            setDueDate(new Date().toISOString().split('T')[0]);
        }
    }, [isOpen, total]);

    // Calculations
    const subtotal = Number(total) || 0;

    let discountAmount = 0;
    if (discountValue) {
        // Handle comma/dot conversion safely
        const val = Number(discountValue.toString().replace('.', '').replace(',', '.'));
        if (!isNaN(val) && val >= 0) {
            if (discountType === 'value') {
                discountAmount = val;
            } else {
                discountAmount = (subtotal * val) / 100;
            }
        }
    }

    const finalTotal = Math.max(0, subtotal - discountAmount);
    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const remaining = Math.max(0, finalTotal - totalPaid);
    const change = Math.max(0, totalPaid - finalTotal);

    // Auto-fill amount logic
    useEffect(() => {
        if (isOpen) {
            // Format with comma for Brazilian users
             
            // eslint-disable-next-line react-hooks/set-state-in-effect -- init/reset sincrono de estado no effect e intencional (padrao legado auditado)
            setCurrentAmount(remaining.toFixed(2).replace('.', ','));
        }
    }, [payments, discountAmount, isOpen, remaining]);

    const handleAddPayment = () => {
        // Simplified parsing: replace comma with dot
        const parsedAmount = Number(currentAmount.replace('.', '').replace(',', '.'));

        if (!parsedAmount || parsedAmount <= 0) return toast.warning('Digite um valor válido');
        if (parsedAmount > remaining + 0.01 && currentMethod !== 'cash') {
            return toast.warning('Valor excede o restante a pagar');
        }

        if (currentMethod === 'credit' && !dueDate) {
            return toast.warning('Selecione uma data de vencimento para a 1ª parcela');
        }

        // Generate Installments Logic
        if (currentMethod === 'credit' && installments > 1) {
            const installmentValue = parsedAmount / installments;
            const newPayments = [];
            let currentDate = new Date(dueDate);

            for (let i = 0; i < installments; i++) {
                // Clone date to avoid reference issues
                const date = new Date(currentDate);

                newPayments.push({
                    id: Date.now().toString() + i,
                    method: currentMethod,
                    amount: installmentValue,
                    installment: i + 1,
                    installments_total: installments,
                    due_date: date.toISOString().split('T')[0]
                });

                // Add 1 month for next installment
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
            setPayments([...payments, ...newPayments]);
        } else {
            // Single Payment
            const newPayment = {
                id: Date.now().toString(),
                method: currentMethod,
                amount: parsedAmount,
                installment: 1, // For credit card logic
                installments_total: installments, // Metadata for card
                due_date: currentMethod === 'credit' ? dueDate : null
            };
            setPayments([...payments, newPayment]);
        }

        setInstallments(1);
    };

    const handleRemovePayment = (id) => {
        setPayments(prev => prev.filter(p => p.id !== id));
    };

    const handleConfirm = () => {
        if (remaining > 0.01) {
            return toast.warning(`Faltam ${formatCurrency(remaining)} para fechar a venda.`);
        }

        onConfirm({
            subtotal,
            discount: discountAmount,
            total: finalTotal,
            payments: payments,
            amount_paid: totalPaid,
            change: change
        });
    };

    // Helper to validate currency input (positive only)
    const handleCurrencyInput = (value, setter) => {
        // Allow digit, comma, and only one comma
        // Block minus sign
        if (value === '' || /^[0-9]*([,][0-9]{0,2})?$/.test(value)) {
            setter(value);
        }
    };

    if (!isOpen) return null;

    const methods = [
        { id: 'cash', label: 'Dinheiro', icon: Banknote, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-200' },
        { id: 'credit_card', label: 'Crédito', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-200' },
        { id: 'debit_card', label: 'Débito', icon: CreditCard, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-200' },
        { id: 'pix', label: 'PIX', icon: QrCode, color: 'text-teal-500', bg: 'bg-teal-500/10', border: 'border-teal-200' },
        { id: 'credit', label: 'Crediário', icon: FileText, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-200' },
    ];

    const getMethodLabel = (id) => methods.find(m => m.id === id)?.label || id;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-5xl bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl overflow-hidden border border-white/10 flex h-[85vh] flex-col md:flex-row">

                {/* Left Side: Summary & Discount */}
                <div className="w-full md:w-1/3 bg-gray-50 dark:bg-black/20 border-r border-gray-100 dark:border-white/5 p-6 flex flex-col relative overflow-hidden">
                    {/* Background Decorative Circle */}
                    <div className="absolute -top-20 -left-20 w-60 h-60 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />

                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white mb-8 relative z-10">
                        <Wallet className="text-brand-primary" />
                        Resumo do Pagamento
                    </h2>

                    <div className="space-y-6 flex-1 relative z-10">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 text-sm font-medium">Subtotal</span>
                            <div className="text-xl font-bold text-gray-900 dark:text-gray-300">{formatCurrency(subtotal)}</div>
                        </div>

                        {/* Discount Card */}
                        <div className="bg-white dark:bg-white/5 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-white/5">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block flex justify-between items-center">
                                Desconto
                                <div className="flex bg-gray-100 dark:bg-black/50 rounded-lg p-1 gap-1">
                                    <button
                                        onClick={() => setDiscountType('value')}
                                        className={clsx(
                                            "w-8 h-6 flex items-center justify-center text-xs font-bold rounded-md transition-all",
                                            discountType === 'value' ? "bg-white dark:bg-white/10 shadow text-brand-primary" : "text-gray-400 hover:text-gray-600"
                                        )}
                                    >
                                        R$
                                    </button>
                                    <button
                                        onClick={() => setDiscountType('percent')}
                                        className={clsx(
                                            "w-8 h-6 flex items-center justify-center text-xs font-bold rounded-md transition-all",
                                            discountType === 'percent' ? "bg-white dark:bg-white/10 shadow text-brand-primary" : "text-gray-400 hover:text-gray-600"
                                        )}
                                    >
                                        %
                                    </button>
                                </div>
                            </label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <Input
                                    value={discountValue}
                                    onChange={(e) => handleCurrencyInput(e.target.value.replace('.', ','), setDiscountValue)}
                                    placeholder="0,00"
                                    className="h-11 pl-9 text-right font-bold text-lg"
                                />
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50 dark:border-white/5">
                                    <span className="text-xs text-gray-500">Valor do desconto</span>
                                    <span className="text-sm font-bold text-green-500">-{formatCurrency(discountAmount)}</span>
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-gray-200 dark:border-white/10 space-y-4">
                            <div className="flex flex-col gap-1">
                                <span className="text-gray-500 text-xs uppercase tracking-wide font-bold">Total a Pagar</span>
                                <div className="text-4xl font-black text-brand-primary tracking-tight">{formatCurrency(finalTotal)}</div>
                            </div>

                            <div className="bg-gray-200 dark:bg-white/10 h-px w-full" />

                            <div className="flex justify-between items-end">
                                <span className="text-gray-500 text-sm font-medium mb-1">Restante</span>
                                <span className={clsx("text-2xl font-bold", remaining > 0 ? "text-red-500" : "text-green-500")}>
                                    {formatCurrency(remaining)}
                                </span>
                            </div>

                            {change > 0 && (
                                <div className="flex justify-between items-center bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                                    <span className="text-emerald-700 dark:text-emerald-400 text-sm font-bold flex items-center gap-2">
                                        <Banknote size={16} /> Troco
                                    </span>
                                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(change)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Payment Methods & List */}
                <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1A1A1A] relative">
                    {/* Header */}
                    <div className="p-6 pb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Selecione a forma de pagamento</h3>
                        {/* Method Selection Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                            {methods.map((m) => {
                                const isSelected = currentMethod === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => setCurrentMethod(m.id)}
                                        className={clsx(
                                            "relative flex flex-col items-center justify-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 group h-24",
                                            isSelected
                                                ? `border-current ${m.color} ${m.bg}`
                                                : "border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400"
                                        )}
                                    >
                                        <m.icon size={24} className={clsx("transition-transform group-hover:scale-110", isSelected && "scale-110")} />
                                        <span className="font-bold text-xs">{m.label}</span>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-current" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col p-6 pt-2">
                        {/* Input Area */}
                        <div className="bg-gray-50 dark:bg-white/5 p-5 rounded-2xl border border-gray-100 dark:border-white/5 mb-6 flex flex-col sm:flex-row items-end gap-3 shadow-sm">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Valor ({getMethodLabel(currentMethod)})</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">R$</span>
                                    <Input
                                        type="text"
                                        inputMode="decimal"
                                        value={currentAmount}
                                        onChange={(e) => handleCurrencyInput(e.target.value.replace('.', ','), setCurrentAmount)}
                                        placeholder="0,00"
                                        className="text-2xl font-bold pl-10 h-14 bg-white dark:bg-black/20"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleAddPayment();
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Crediário Due Date */}
                            {currentMethod === 'credit' && (
                                <div className="w-full sm:w-48">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vencimento (1ª)</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                        <Input
                                            type="date"
                                            value={dueDate}
                                            onChange={(e) => setDueDate(e.target.value)}
                                            className="h-14 pl-10"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Installments Input (Credit Card & Crediário) */}
                            {(currentMethod === 'credit_card' || currentMethod === 'credit') && (
                                <div className="w-full sm:w-32">
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Parcelas</label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={installments}
                                        onChange={(e) => setInstallments(Number(e.target.value))}
                                        className="h-14 text-center font-bold"
                                    />
                                </div>
                            )}

                            <Button onClick={handleAddPayment} className="h-14 px-8 font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg shadow-brand-primary/20 shrink-0 w-full sm:w-auto">
                                <Check size={20} className="mr-2" />
                                Adicionar
                            </Button>
                        </div>

                        {/* Payments List */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Pagamentos Registrados</h3>

                            <div className="space-y-2">
                                {payments.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-300 dark:text-gray-600 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-xl">
                                        <Wallet size={48} className="mb-3 opacity-50" />
                                        <p className="font-medium">Nenhum pagamento registrado</p>
                                    </div>
                                )}
                                {payments.map((p) => (
                                    <div key={p.id} className="flex justify-between items-center bg-white dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5 hover:border-brand-primary/30 transition-colors group shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className={clsx("w-10 h-10 rounded-full flex items-center justify-center",
                                                p.method === 'cash' ? "bg-emerald-100 text-emerald-600" :
                                                    p.method === 'pix' ? "bg-teal-100 text-teal-600" :
                                                        "bg-blue-100 text-blue-600"
                                            )}>
                                                {p.method === 'credit' ? <FileText size={18} /> :
                                                    p.method === 'pix' ? <QrCode size={18} /> :
                                                        p.method === 'cash' ? <Banknote size={18} /> : <CreditCard size={18} />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900 dark:text-white">{getMethodLabel(p.method)}</div>
                                                <div className="flex gap-2 items-center text-sm text-gray-500">
                                                    {p.method === 'credit' && <span className="text-orange-500 font-medium">Venc: {p.due_date ? p.due_date.split('-').reverse().join('/') : '-'}</span>}
                                                    {p.installments_total > 1 && <span className="font-mono bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-xs">{p.installment}/{p.installments_total}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <span className="font-bold text-lg text-gray-900 dark:text-white">{formatCurrency(p.amount)}</span>
                                            <button
                                                onClick={() => handleRemovePayment(p.id)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 flex gap-3 justify-end items-center">
                        <Button variant="ghost" onClick={onClose} size="lg" className="hover:bg-gray-200 dark:hover:bg-white/10">Cancelar</Button>
                        <Button
                            onClick={handleConfirm}
                            size="lg"
                            className="px-8 font-bold h-12 text-md shadow-xl shadow-brand-primary/20"
                            disabled={remaining > 0.01}
                        >
                            Confirmar Pagamento
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
