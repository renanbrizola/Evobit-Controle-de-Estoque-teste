import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, Loader2, Target, ScanBarcode, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const BlindCountModal = ({ products = [], onClose, onSuccess }) => {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [countResults, setCountResults] = useState([]);

    // Auto-focus logic for rapid counting
    const inputRef = React.useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [currentIndex]);

    if (!products || products.length === 0) {
        toast.error("Nenhum produto selecionado para contagem.");
        onClose();
        return null;
    }

    const currentProduct = products[currentIndex];
    const [countedQty, setCountedQty] = useState('');

    const handleNext = () => {
        if (countedQty === '' || isNaN(countedQty) || Number(countedQty) < 0) {
            toast.error("Informe uma quantidade válida contada fisicamente.");
            return;
        }

        const newResult = {
            product: currentProduct,
            counted: Number(countedQty),
            expected: Number(currentProduct.current_stock || 0)
        };

        const updatedResults = [...countResults, newResult];
        setCountResults(updatedResults);

        // Next item
        if (currentIndex < products.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setCountedQty('');
        } else {
            // Process the divergence and sync
            processDivergences(updatedResults);
        }
    };

    const handleSkip = () => {
        if (currentIndex < products.length - 1) {
            setCurrentIndex(currentIndex + 1);
            setCountedQty('');
        } else {
            processDivergences(countResults);
        }
    }

    const processDivergences = async (results) => {
        setLoading(true);
        try {
            const adjustments = [];

            for (const res of results) {
                const diff = res.counted - res.expected;

                if (diff !== 0) {
                    const type = diff > 0 ? 'Entrada' : 'Saída'; // Se contou mais do que o sistema acha, é sobra (Entrada).
                    adjustments.push({
                        product_id: res.product.id,
                        type: type,
                        quantity: Math.abs(diff),
                        reason: `Contagem Cega - Inventário de Rotina`,
                        cost_unit: res.product.cost_price || 0
                    });
                }
            }

            if (adjustments.length > 0) {
                await api.movements.createTransaction(adjustments);
                toast.success(`${adjustments.length} divergências de estoque corrigidas e salvas!`);
            } else {
                toast.success("Contagem concluída sem divergências! Estoque 100% correto.");
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao aplicar o inventário.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <Card className="w-full max-w-lg relative animate-in zoom-in-95 duration-300 border-white/10 bg-[#121212] shadow-2xl">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary shadow-glow">
                            <Target size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Contagem Cega</h3>
                            <p className="text-xs text-gray-400">Produto {currentIndex + 1} de {products.length}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {!loading ? (
                    <div className="space-y-6">
                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                            {currentProduct.barcode && (
                                <div className="flex items-center gap-1 text-xs font-mono text-brand-primary mb-3 bg-brand-primary/10 px-2 py-1 rounded border border-brand-primary/20">
                                    <ScanBarcode size={14} /> {currentProduct.barcode}
                                </div>
                            )}
                            <h2 className="text-2xl font-bold text-gray-100 mb-1">{currentProduct.name}</h2>
                            <p className="text-gray-400">{currentProduct.brand} &bull; {currentProduct.category}</p>

                            <div className="mt-8 w-full max-w-xs">
                                <label className="block text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider">
                                    Quantidade Física Contada ({currentProduct.unit})
                                </label>
                                <input
                                    ref={inputRef}
                                    type="number"
                                    min="0"
                                    step="any"
                                    className="w-full bg-black/50 border-2 border-brand-primary/50 rounded-xl px-4 py-4 text-center text-3xl font-bold text-brand-primary focus:outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/20 transition-all font-mono"
                                    value={countedQty}
                                    onChange={(e) => {
                                        if (e.target.value?.toString().startsWith('-')) return;
                                        setCountedQty(e.target.value);
                                    }}
                                    placeholder="0"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleNext();
                                    }}
                                />
                                <div className="text-center mt-3 text-xs text-gray-500 bg-black/40 p-2 rounded-lg border border-red-500/10 text-red-400 flex items-center justify-center gap-2">
                                    <Target size={12} />
                                    <span>Não verifique o sistema. Insira o que vê na prateleira.</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-2">
                            <Button variant="ghost" className="text-gray-400 hover:text-gray-200" onClick={handleSkip}>
                                Pular Produto
                            </Button>
                            <Button className="shadow-brand-glow text-lg py-6 px-8 rounded-xl" onClick={handleNext}>
                                {currentIndex === products.length - 1 ? 'Concluir Inventário' : 'Gravar e Próximo'} <ArrowRight size={20} className="ml-2" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                        <Loader2 className="animate-spin text-brand-primary mb-4" size={48} />
                        <h3 className="text-xl font-bold text-white mb-2">Processando Divergências...</h3>
                        <p className="text-gray-400">Gravando os eventos de ajuste no diário (Event Sourcing).</p>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default BlindCountModal;
