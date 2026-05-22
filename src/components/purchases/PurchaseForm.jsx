import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, X, Upload, FileText, Calendar, DollarSign } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from 'sonner';
import { api } from '../../services/api';
import { PurchaseService } from '../../services/purchases';
import { parseNFe } from '../../utils/nfeParser';

const PurchaseForm = ({ onCancel, onSave }) => {
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
        providerId: '',
        date: new Date().toISOString().split('T')[0], // Data de Entrada
        issue_date: new Date().toISOString().split('T')[0], // Data Emissão
        nfe_key: '',
        items: [],

        // Financials
        subtotal: 0,
        discount: 0,
        freight: 0,
        insurance: 0,
        other_expenses: 0,
        total: 0,

        installments: []
    });

    const [currentItem, setCurrentItem] = useState({
        productId: '',
        quantity: 1,
        cost: 0,
        match_note: '' // Helper to show if it came from XML
    });

    const [providers, setProviders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    // Recalculate Total whenever components change
    useEffect(() => {
        const itemsTotal = formData.items.reduce((acc, item) => acc + item.total, 0);
        const finalTotal = itemsTotal
            + Number(formData.freight || 0)
            + Number(formData.insurance || 0)
            + Number(formData.other_expenses || 0)
            - Number(formData.discount || 0);

        setFormData(prev => ({
            ...prev,
            subtotal: itemsTotal,
            total: Math.max(0, finalTotal)
        }));
    }, [formData.items, formData.freight, formData.insurance, formData.other_expenses, formData.discount]);

    const loadData = async () => {
        try {
            const [providersData, productsData] = await Promise.all([
                api.providers.list(),
                api.products.list()
            ]);
            setProviders(providersData);
            setProducts(productsData.data || productsData); // Handle paginated response if any
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            toast.error('Erro ao carregar fornecedores e produtos');
        } finally {
            setLoadingData(false);
        }
    };

    const handleAddItem = () => {
        if (!currentItem.productId || currentItem.quantity <= 0) return;

        const product = products.find(p => p.id === currentItem.productId);

        setFormData(prev => ({
            ...prev,
            items: [...prev.items, {
                ...currentItem,
                productName: product.name,
                total: currentItem.quantity * currentItem.cost
            }]
        }));

        setCurrentItem({ productId: '', quantity: 1, cost: 0, match_note: '' });
    };

    const handleRemoveItem = (index) => {
        setFormData(prev => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== index)
        }));
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const toastId = toast.loading('Processando NFe...');
        try {
            const nfe = await parseNFe(file);

            // 1. Match Provider (by CNPJ)
            const cnpj = nfe.provider.cnpj.replace(/\D/g, '');
            const foundProvider = providers.find(p => p.cnpj && p.cnpj.replace(/\D/g, '') === cnpj);

            let providerId = '';
            if (foundProvider) {
                providerId = foundProvider.id;
                toast.success(`Fornecedor encontrado: ${foundProvider.name}`);
            } else {
                toast.warning(`Fornecedor não encontrado (CNPJ: ${cnpj}). Selecione manualmente.`);
            }

            // 2. Map Items
            const newItems = [];
            nfe.items.forEach(nfeItem => {
                // Try match by exact code or EAN
                // Note: Logic here is simple, robust ERPs allow "Mapping Table"
                const foundProduct = products.find(p =>
                    (p.code && p.code === nfeItem.code) ||
                    (p.barcode && p.barcode === nfeItem.ean)
                );

                if (foundProduct) {
                    newItems.push({
                        productId: foundProduct.id,
                        productName: foundProduct.name,
                        quantity: nfeItem.quantity,
                        cost: nfeItem.unit_price,
                        total: nfeItem.total_product,
                        ipi_percent: 0, // Extract from nfeItem if needed
                        icms_percent: 0
                    });
                } else {
                    // Add as incomplete item for user to fix
                    toast.warning(`Produto "${nfeItem.name}" não vinculado. Adicione manualmente.`);
                }
            });

            // 3. Financials
            setFormData(prev => ({
                ...prev,
                providerId,
                date: new Date().toISOString().split('T')[0], // Entry Date = Now
                issue_date: nfe.nfeData.issue_date ? nfe.nfeData.issue_date.split('T')[0] : prev.issue_date,
                nfe_key: nfe.nfeData.key,

                // Values
                freight: nfe.financial.amount_freight,
                insurance: nfe.financial.amount_insurance,
                discount: nfe.financial.amount_discount,
                other_expenses: nfe.financial.amount_other,

                // Existing items + matched items
                items: [...prev.items, ...newItems],

                // Installments (Map to standard format)
                installments: nfe.installments.map(inst => ({
                    number: inst.number,
                    due_date: inst.due_date ? inst.due_date.split('T')[0] : '', // Ensure YYYY-MM-DD
                    amount: inst.amount,
                    method: 'boleto' // Default assumption
                }))
            }));

            toast.dismiss(toastId);
            toast.success('XML processado com sucesso!');

        } catch (error) {
            console.error(error);
            toast.dismiss(toastId);
            toast.error('Erro ao ler XML: ' + error.message);
        } finally {
            e.target.value = ''; // Reset input
        }
    };

    // Auto-generate installments wizard
    const generateInstallments = (count, interval = 30) => {
        const parts = [];
        const baseDate = new Date(formData.issue_date || formData.date);
        const amountPerPart = formData.total / count;

        for (let i = 1; i <= count; i++) {
            const date = new Date(baseDate);
            date.setDate(baseDate.getDate() + (i * interval));
            parts.push({
                number: i.toString(),
                due_date: date.toISOString().split('T')[0],
                amount: parseFloat(amountPerPart.toFixed(2)),
                method: 'boleto'
            });
        }

        // Adjust round error on last
        const sum = parts.reduce((a, b) => a + b.amount, 0);
        const diff = formData.total - sum;
        if (Math.abs(diff) > 0.001) {
            parts[parts.length - 1].amount += diff;
        }

        setFormData(prev => ({ ...prev, installments: parts }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.items.length === 0) return toast.error('Adicione produtos.');
        if (!formData.providerId) return toast.error('Selecione o fornecedor.');

        // Validate installments
        const instTotal = formData.installments.reduce((acc, i) => acc + Number(i.amount), 0);
        if (Math.abs(instTotal - formData.total) > 0.1 && formData.installments.length > 0) {
            if (!confirm(`O total das parcelas (R$ ${instTotal.toFixed(2)}) difere do total da nota (R$ ${formData.total.toFixed(2)}). Deseja continuar mesmo assim?`)) {
                return;
            }
        }

        const purchaseData = {
            ...formData,
            items: formData.items.map(item => ({
                product_id: item.productId,
                quantity: item.quantity,
                cost: item.cost,
                total: item.total,
                ipi_percent: item.ipi_percent,
                icms_percent: item.icms_percent
            }))
        };

        toast.promise(
            PurchaseService.create(purchaseData),
            {
                loading: 'Salvando...',
                success: (p) => {
                    onSave(p);
                    return 'Compra salva com sucesso!';
                },
                error: (e) => 'Erro: ' + e.message
            }
        );
    };

    if (loadingData) return <div>Carregando...</div>;

    return (
        <Card className="max-w-5xl mx-auto p-0 bg-white shadow-xl overflow-hidden animate-in slide-in-from-bottom-2">

            {/* Toolbar */}
            <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText size={20} className="text-brand-primary" />
                    Nova Compra / Entrada
                </h2>
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".xml"
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="border-brand-primary text-brand-primary hover:bg-brand-primary/5">
                        <Upload size={18} className="mr-2" /> Importar XML (NFe)
                    </Button>
                    <button onClick={onCancel} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                        <X size={24} />
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">

                {/* 1. Header Data */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5">
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Fornecedor</label>
                        <select
                            className="w-full rounded-lg border-gray-300 border p-2.5 focus:ring-2 focus:ring-brand-primary outline-none bg-white"
                            value={formData.providerId}
                            onChange={e => setFormData({ ...formData, providerId: e.target.value })}
                            required
                        >
                            <option value="">Selecione...</option>
                            {providers.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.cnpj || 'S/ CPF'})</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Emissão</label>
                        <input
                            type="date"
                            className="w-full rounded-lg border-gray-300 border p-2.5"
                            value={formData.issue_date}
                            onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Entrada</label>
                        <input
                            type="date"
                            className="w-full rounded-lg border-gray-300 border p-2.5"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                    <div className="md:col-span-3">
                        <Input
                            label="Chave NFe"
                            value={formData.nfe_key}
                            onChange={e => setFormData({ ...formData, nfe_key: e.target.value })}
                            placeholder="44 dígitos..."
                            className="text-xs"
                        />
                    </div>
                </div>

                {/* 2. Items Section */}
                <div className="border rounded-xl overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-100">
                        <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                            <Plus size={16} /> Itens da Nota
                        </h3>
                    </div>

                    {/* Add Item Form */}
                    <div className="p-4 bg-gray-50/50 grid grid-cols-12 gap-3 items-end border-b border-gray-100">
                        <div className="col-span-5">
                            <label className="text-xs font-bold text-gray-400 block mb-1">PRODUTO</label>
                            <select
                                className="w-full rounded border-gray-300 p-2 text-sm"
                                value={currentItem.productId}
                                onChange={e => {
                                    const prod = products.find(p => p.id === e.target.value);
                                    if (prod) setCurrentItem(prev => ({ ...prev, productId: prod.id }));
                                }}
                            >
                                <option value="">Buscar Produto...</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-gray-400 block mb-1">QTD</label>
                            <input
                                type="number"
                                className="w-full rounded border-gray-300 p-2 text-sm"
                                value={currentItem.quantity}
                                onChange={e => setCurrentItem({ ...currentItem, quantity: Number(e.target.value) })}
                            />
                        </div>
                        <div className="col-span-3">
                            <label className="text-xs font-bold text-gray-400 block mb-1">CUSTO UNIT.</label>
                            <input
                                type="number"
                                step="0.01"
                                className="w-full rounded border-gray-300 p-2 text-sm"
                                value={currentItem.cost}
                                onChange={e => setCurrentItem({ ...currentItem, cost: Number(e.target.value) })}
                            />
                        </div>
                        <div className="col-span-2">
                            <Button size="sm" type="button" onClick={handleAddItem} className="w-full">
                                Adicionar
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full text-sm">
                        <thead className="bg-gray-100 text-gray-600 text-xs font-bold uppercase">
                            <tr>
                                <th className="p-3 text-left">Produto</th>
                                <th className="p-3 text-center">Qtd</th>
                                <th className="p-3 text-right">Unit.</th>
                                <th className="p-3 text-right">Total</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {formData.items.map((item, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="p-3">{item.productName}</td>
                                    <td className="p-3 text-center">{item.quantity}</td>
                                    <td className="p-3 text-right">R$ {item.cost.toFixed(2)}</td>
                                    <td className="p-3 text-right font-medium">R$ {item.total.toFixed(2)}</td>
                                    <td className="p-3 text-right">
                                        <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600">
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 3. Totals & Financials */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left: Additional Costs */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-gray-700 border-b pb-2">Custos Adicionais / Descontos</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Frete (R$)"
                                type="number"
                                value={formData.freight}
                                onChange={e => setFormData({ ...formData, freight: e.target.value })}
                            />
                            <Input
                                label="Seguro (R$)"
                                type="number"
                                value={formData.insurance}
                                onChange={e => setFormData({ ...formData, insurance: e.target.value })}
                            />
                            <Input
                                label="Outras Desp. (R$)"
                                type="number"
                                value={formData.other_expenses}
                                onChange={e => setFormData({ ...formData, other_expenses: e.target.value })}
                            />
                            <Input
                                label="Desconto (-R$)"
                                type="number"
                                className="text-red-600 font-medium"
                                value={formData.discount}
                                onChange={e => setFormData({ ...formData, discount: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Right: Payment Schedule */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h4 className="font-bold text-gray-700">Financeiro (Contas a Pagar)</h4>
                            <div className="flex gap-2">
                                <Button size="xs" variant="outline" type="button" onClick={() => generateInstallments(1)}>À Vista</Button>
                                <Button size="xs" variant="outline" type="button" onClick={() => generateInstallments(3, 30)}>3x (30/60/90)</Button>
                            </div>
                        </div>

                        <div className="bg-yellow-50 rounded-xl p-4 max-h-48 overflow-y-auto custom-scrollbar border border-yellow-100">
                            {formData.installments.length === 0 && (
                                <p className="text-center text-xs text-yellow-600 py-2">Nenhuma parcela gerada (Será lançado como À Vista no débito)</p>
                            )}
                            {formData.installments.map((inst, i) => (
                                <div key={i} className="flex gap-2 mb-2 items-center">
                                    <span className="text-xs font-bold text-gray-500 w-6">{i + 1}x</span>
                                    <input
                                        type="date"
                                        className="rounded border p-1 text-xs w-28"
                                        value={inst.due_date}
                                        onChange={e => {
                                            const newInst = [...formData.installments];
                                            newInst[i].due_date = e.target.value;
                                            setFormData({ ...formData, installments: newInst });
                                        }}
                                    />
                                    <input
                                        type="number"
                                        className="rounded border p-1 text-xs flex-1 font-bold text-right"
                                        value={inst.amount}
                                        onChange={e => {
                                            const newInst = [...formData.installments];
                                            newInst[i].amount = e.target.value;
                                            setFormData({ ...formData, installments: newInst });
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Total */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                        <span className="block">Itens: {formData.items.length}</span>
                        <span className="block">Volume: {formData.items.reduce((a, b) => a + b.quantity, 0)} un</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-gray-500 text-sm font-medium mb-1">TOTAL DA NOTA</span>
                        <span className="block text-4xl font-black text-brand-primary tracking-tighter">
                            R$ {formData.total.toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="ghost" type="button" onClick={onCancel} className="text-gray-500">Cancelar</Button>
                    <Button type="submit" size="lg" className="px-8 shadow-xl shadow-brand-primary/20">
                        <Save size={20} className="mr-2" /> Finalizar Entrada
                    </Button>
                </div>

            </form>
        </Card>
    );
};

export default PurchaseForm;
