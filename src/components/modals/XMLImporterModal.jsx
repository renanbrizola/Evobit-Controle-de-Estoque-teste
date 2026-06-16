import { useState, useRef } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { X, UploadCloud, FileText, CheckCircle, AlertTriangle, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { parseNFeXML } from '../../utils/xmlParser';
import { api } from '../../services/api';

const XMLImporterModal = ({ onClose, onSuccess }) => {
    const [step, setStep] = useState(1); // 1: Upload, 2: Preview & Confirm, 3: Processing
    const [loading, setLoading] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [analysis, setAnalysis] = useState(null); // Data about matched/new items

    const fileInputRef = useRef(null);

    const handleFileUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'text/xml' && !file.name.endsWith('.xml')) {
            toast.error("Por favor, selecione um arquivo XML válido de NF-e.");
            return;
        }

        setLoading(true);
        try {
            const text = await file.text();
            const data = parseNFeXML(text);
            setParsedData(data);
            await analyzeData(data);
            setStep(2);
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Erro ao processar arquivo XML.");
            if (fileInputRef.current) fileInputRef.current.value = '';
        } finally {
            setLoading(false);
        }
    };

    const analyzeData = async (data) => {
        // Fetch all providers and products to find matches
        const existingProviders = await api.providers?.list() || [];
        // The api might not directly expose list() without args, let's assume it fetches all
        const existingProductsResp = await api.products.list({ limit: 999999, category: 'TODOS', sort: { key: 'name', direction: 'asc' } });
        const existingProducts = existingProductsResp.items || [];

        // Check Provider Match
        const cleanCNPJ = data.provider.cnpj.replace(/\D/g, '');
        const matchedProvider = existingProviders.find(p => p.cnpj?.replace(/\D/g, '') === cleanCNPJ);

        // Check Product Matches
        const analyzedProducts = data.products.map(prod => {
            let match = null;
            let matchType = 'none'; // 'barcode', 'name', 'none'

            if (prod.barcode) {
                match = existingProducts.find(ep => ep.barcode === prod.barcode);
                if (match) matchType = 'barcode';
            }

            if (!match && prod.name) {
                // Try exact name match (case insensitive)
                match = existingProducts.find(ep => ep.name.toLowerCase() === prod.name.toLowerCase());
                if (match) matchType = 'name';
            }

            return {
                ...prod,
                match,
                matchType,
                willBeCreated: !match
            };
        });

        setAnalysis({
            provider: {
                data: data.provider,
                match: matchedProvider,
                willBeCreated: !matchedProvider
            },
            products: analyzedProducts,
            newProductsCount: analyzedProducts.filter(p => !p.match).length,
            matchedProductsCount: analyzedProducts.filter(p => p.match).length
        });
    };

    const handleConfirmImport = async () => {
        setStep(3);
        setLoading(true);

        try {
            let finalProviderId = null;

            // 1. Handle Provider
            if (analysis.provider.willBeCreated) {
                const newProvider = await api.providers.create(analysis.provider.data);
                finalProviderId = newProvider.id;
            } else {
                finalProviderId = analysis.provider.match.id;
            }

            // 2. Handle Products and Entries
            const adjustments = []; // To hold the movements

            for (const item of analysis.products) {
                let finalProductId = null;

                if (item.willBeCreated) {
                    // Create basic product
                    const newProdData = {
                        name: item.name,
                        barcode: item.barcode,
                        sku: item.sku,
                        ncm: item.ncm,
                        cest: item.cest,
                        cfop: item.cfop,
                        unit: item.unit,
                        provider_id: finalProviderId,
                        cost_price: item.unit_cost,
                        average_cost: item.unit_cost,
                        is_active: true,
                        category: 'Não Categorizado', // Default
                        is_raw_material: false,
                        is_service: false,
                        price: null // Needs pricing later by the user
                    };
                    const newProd = await api.products.create(newProdData);
                    finalProductId = newProd.id;
                } else {
                    finalProductId = item.match.id;

                    // Update the product cost and provider if it didn't have one? 
                    // Usually we don't overwrite blindly, but maybe update last_cost.
                }

                if (item.quantity > 0) {
                    adjustments.push({
                        product_id: finalProductId,
                        type: 'Entrada', // IN movement
                        quantity: item.quantity,
                        cost_unit: item.unit_cost,
                        lot_number: item.lot_number,
                        expiration_date: item.expiration_date ? new Date(item.expiration_date).toISOString() : null,
                        nfe_number: parsedData.nfeNumber,
                        reason: `Entrada via XML NF-e ${parsedData.nfeNumber}`
                    });
                }
            }

            // 3. Register Movements (This will also trigger average cost calculation if implemented in createTransaction)
            if (adjustments.length > 0) {
                await api.movements.createTransaction(adjustments);
            }

            toast.success(`Fornecedor, produtos e estoque atualizados com sucesso via NF-e ${parsedData.nfeNumber}!`);
            onSuccess();
            onClose();

        } catch (error) {
            console.error("Erro na importação:", error);
            toast.error("Ocorreu um erro ao gravar os dados. Verifique a conexão.");
            setStep(2); // Go back to review
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-300 border-white/10 bg-[#121212] shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 shadow-glow">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Importação de NF-e (XML)</h3>
                            <p className="text-sm text-gray-400">Automatize o cadastro e entrada de estoque</p>
                        </div>
                    </div>
                    {step !== 3 && (
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">

                    {/* STEP 1: UPLOAD */}
                    {step === 1 && (
                        <div className="flex flex-col items-center justify-center py-12">
                            {loading ? (
                                <div className="text-center">
                                    <Loader2 className="animate-spin text-emerald-500 mx-auto mb-4" size={48} />
                                    <h3 className="text-lg font-medium text-white">Lendo arquivo XML...</h3>
                                </div>
                            ) : (
                                <div
                                    className="border-2 border-dashed border-gray-600 dark:border-white/20 rounded-2xl p-12 w-full max-w-md text-center hover:bg-white/5 transition-colors cursor-pointer group"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <UploadCloud size={64} className="mx-auto text-gray-400 group-hover:text-emerald-400 transition-colors mb-4" />
                                    <h3 className="text-xl font-bold text-white mb-2">Selecione o arquivo XML</h3>
                                    <p className="text-gray-400 text-sm mb-6">Arraste para cá ou clique para buscar no computador</p>
                                    <Button className="bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-glow pointer-events-none">
                                        Procurar Arquivo
                                    </Button>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                        accept=".xml, text/xml"
                                        className="hidden"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: PREVIEW */}
                    {step === 2 && analysis && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
                                    <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Nota Fiscal</p>
                                    <p className="text-white font-bold text-lg">Nº {parsedData.nfeNumber}</p>
                                    <p className="text-sm text-gray-400">Total: R$ {parsedData.totalValue.toFixed(2)}</p>
                                </div>
                                <div className={`border p-4 rounded-xl ${analysis.provider.willBeCreated ? 'bg-amber-500/10 border-amber-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                                    <p className={`text-xs uppercase tracking-wider mb-1 ${analysis.provider.willBeCreated ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        Fornecedor ({analysis.provider.willBeCreated ? 'Novo Cadastro' : 'Existente'})
                                    </p>
                                    <p className="text-white font-bold">{analysis.provider.data.name}</p>
                                    <p className="text-sm text-gray-400">CNPJ: {analysis.provider.data.cnpj}</p>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col justify-center">
                                    <div className="flex justify-between items-center text-sm mb-1">
                                        <span className="text-gray-400">Novos Produtos:</span>
                                        <span className="text-amber-400 font-bold">{analysis.newProductsCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-400">Produtos Vinculados:</span>
                                        <span className="text-emerald-400 font-bold">{analysis.matchedProductsCount}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Products Table */}
                            <h4 className="text-white font-bold text-lg border-b border-white/10 pb-2 mt-6 mb-4">Itens da Nota ({analysis.products.length})</h4>
                            <div className="overflow-x-auto rounded-xl border border-white/10">
                                <table className="w-full text-left text-sm text-gray-300">
                                    <thead className="bg-white/5 text-gray-400 font-medium">
                                        <tr>
                                            <th className="px-4 py-3">Produto NF-e</th>
                                            <th className="px-4 py-3">Código/EAN</th>
                                            <th className="px-4 py-3 text-right">Qtd</th>
                                            <th className="px-4 py-3 text-right">Custo Un.</th>
                                            <th className="px-4 py-3 text-center">Status no Banco</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {analysis.products.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-gray-100">{item.name}</p>
                                                    <p className="text-xs text-gray-500">NCM: {item.ncm} | UND: {item.unit}</p>
                                                </td>
                                                <td className="px-4 py-3 text-gray-400">{item.barcode || item.sku || '-'}</td>
                                                <td className="px-4 py-3 text-right font-medium text-white">{item.quantity}</td>
                                                <td className="px-4 py-3 text-right">R$ {item.unit_cost.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    {item.willBeCreated ? (
                                                        <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-1 rounded text-xs font-medium">
                                                            <AlertTriangle size={12} /> Auto-Cadastrar
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded text-xs font-medium" title={`Vinculado por ${item.matchType}`}>
                                                            <CheckCircle size={12} /> {item.match.name}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: PROCESSING */}
                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <Loader2 className="animate-spin text-emerald-500 mb-6" size={64} />
                            <h3 className="text-2xl font-bold text-white mb-2">Importando Dados...</h3>
                            <p className="text-gray-400 max-w-sm">Cadastrando fornecedores, produtos e gravando movimentos no diário de estoque imutável de forma segura e local.</p>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                {step === 2 && (
                    <div className="p-6 border-t border-white/5 bg-black/20 shrink-0 flex justify-end gap-4">
                        <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-8 shadow-glow"
                            onClick={handleConfirmImport}
                        >
                            Confirmar Importação <ArrowRight size={18} className="ml-2" />
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default XMLImporterModal;
