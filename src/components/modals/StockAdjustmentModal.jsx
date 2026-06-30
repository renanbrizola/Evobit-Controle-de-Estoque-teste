import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { X, ArrowRightLeft, Loader2, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { maskCurrency } from '../../utils/masks';

const StockAdjustmentModal = ({ product, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState('Entrada'); // Entrada | Saída | Ajuste
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [cost, setCost] = useState(product?.cost_price ? maskCurrency(String(product.cost_price * 100)) : '');
    const [providerId, setProviderId] = useState(product?.provider_id || '');
    const [providers, setProviders] = useState([]);

    useEffect(() => {
        const fetchProviders = async () => {
            try {
                const provs = await api.providers.list();
                setProviders(provs);
            } catch (err) {
                console.error("Erro ao carregar fornecedores", err);
            }
        };
        fetchProviders();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!quantity || Number(quantity) <= 0) {
            toast.error("Quantidade inválida");
            return;
        }

        if ((type === 'Saída' || type === 'Ajuste') && Number(quantity) > Number(product.current_stock)) {
            toast.error("Estoque insuficiente para esta operação");
            return;
        }

        setLoading(true);
        try {
            await api.movements.createTransaction([{
                product_id: product.id,
                type: type === 'Ajuste' ? 'Saída' : type, // Ajuste = saída de estoque (perda/quebra)
                quantity: Number(quantity),
                reason: reason || (type === 'Ajuste' ? 'Perda/Quebra' : `Ajuste Rápido - ${type}`),
                cost_unit: type === 'Entrada' ? (Number(cost.replace(/\D/g, '')) / 100) : product.cost_price,
                provider: type === 'Entrada' ? providerId : ''
            }]);

            toast.success("Estoque atualizado com sucesso!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Erro ao atualizar estoque");
        } finally {
            setLoading(false);
        }
    };

    if (!product) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <Card className="w-full max-w-md relative animate-in zoom-in-95 duration-300 border-white/10 bg-[#121212] shadow-2xl">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                            <ArrowRightLeft size={20} />
                        </div>
                        <div className="flex-1 overflow-hidden ml-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Ajuste Rápido de Estoque</p>
                            <h3 className="text-xl font-bold text-white truncate pr-4" title={product.name}>{product.name}</h3>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="bg-brand-dark/5 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                        <span className="text-sm text-gray-400">Estoque Atual:</span>
                        <span className={`text-xl font-bold ${Number(product.current_stock) <= Number(product.min_stock) ? 'text-red-500' : 'text-emerald-500'}`}>
                            {product.current_stock} <span className="text-xs text-gray-500">{product.unit}</span>
                        </span>
                    </div>

                    <Select
                        label="Tipo de Movimento"
                        value={type}
                        onChange={e => setType(e.target.value)}
                    >
                        <option value="Entrada">📥 Entrada (Compra/Devolução)</option>
                        <option value="Saída">📤 Saída (Venda/Consumo)</option>
                        <option value="Ajuste">⚠️ Ajuste (Perda/Quebra/Correção)</option>
                    </Select>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Quantidade"
                            type="number"
                            min="0.001"
                            step="any"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            placeholder="0.00"
                            autoFocus
                        />
                        {type === 'Entrada' && (
                            <Input
                                label="Custo Unit. (R$)"
                                value={cost}
                                onChange={e => setCost(maskCurrency(e.target.value))}
                                placeholder="0,00"
                            />
                        )}
                    </div>

                    {type === 'Entrada' && (
                        <Select
                            label="Fornecedor (Obrigatório para Entradas)"
                            value={providerId}
                            onChange={e => setProviderId(e.target.value)}
                            required
                        >
                            <option value="">Selecione o Fornecedor...</option>
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </Select>
                    )}

                    <Input
                        label="Motivo / Observação"
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder={type === 'Ajuste' ? "Ex: Validade vencida, Quebra..." : "Opcional"}
                    />

                    {type === 'Ajuste' && (
                        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-xs">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <p>Ajustes de perda/quebra não geram receita. Isso será registrado como prejuízo operacional.</p>
                        </div>
                    )}

                    <div className="pt-4 flex gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            className="flex-1"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 shadow-glow"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : <CheckIcon size={18} className="mr-2" />}
                            Confirmar
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

// CheckIcon definition just for this file or import from lucide-react if available globally in imports
const CheckIcon = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

export default StockAdjustmentModal;
