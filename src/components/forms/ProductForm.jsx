import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { Package, Save, Barcode, DollarSign, Layers, Tag, Ruler, Truck, FileText, Info, MapPin } from 'lucide-react';
import { useModules } from '../../contexts/ModuleContext';
import { toast } from 'sonner';
import { Tabs } from '../ui/Tabs';


const ProductForm = ({ initialData, onSave, onCancel, saving, categories = [], providers = [] }) => {
    const { modules } = useModules();



    // Default State for all ERP fields
    const [formData, setFormData] = useState({
        // ID & Basic
        name: '',
        sku: '',
        barcode: '',
        model: '',
        brand: '',
        manufacturer: '',
        category: '',
        description: '',
        is_active: true,

        // Pricing
        price: '',
        promotional_price: '',
        cost_price: '',

        // Stock
        current_stock: '',
        min_stock: '',
        location: '',
        unit: 'UN',
        expiration_date: '',

        // Fiscal
        ncm: '',
        cest: '',
        cfop: '',
        origin: '0',
        tax_group: '00', // Simples Nacional default example

        // Logistics
        weight_gross: '',
        weight_net: '',
        width: '',
        height: '',
        depth: '',

        provider_id: ''
    });

    // Calculated fields state (Removed, will be derived)

    // Initialize Data
    useEffect(() => {
        if (initialData) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormData({
                name: initialData.name || '',
                sku: initialData.sku || '',
                barcode: initialData.barcode || '',
                model: initialData.model || '',
                brand: initialData.brand || '',
                manufacturer: initialData.manufacturer || '',
                category: initialData.category || '',
                description: initialData.description || '',
                is_active: initialData.is_active !== false,

                price: initialData.price || '',
                promotional_price: initialData.promotional_price || '',
                cost_price: initialData.cost_price || '',

                current_stock: initialData.current_stock || '',
                min_stock: initialData.min_stock || '',
                location: initialData.location || '',
                unit: initialData.unit || 'UN',
                expiration_date: initialData.expiration_date ? new Date(initialData.expiration_date).toISOString().split('T')[0] : '',

                ncm: initialData.ncm || '',
                cest: initialData.cest || '',
                cfop: initialData.cfop || '',
                origin: initialData.origin || '0',
                tax_group: initialData.tax_group || '00',

                weight_gross: initialData.weight_gross || '',
                weight_net: initialData.weight_net || '',
                width: initialData.width || '',
                height: initialData.height || '',
                depth: initialData.depth || '',

                provider_id: initialData.provider_id || ''
            });
        }
    }, [initialData]);



    // Update Markup and Margin when Cost or Price changes
    // Derived state directly in render to avoid cascading
    const avgCostValue = parseFloat(initialData?.average_cost) || 0;
    const lastCost = parseFloat(formData.cost_price) || 0;
    const costForDerived = avgCostValue > 0 ? avgCostValue : lastCost;
    const priceForDerived = parseFloat(formData.price) || 0;
    const markup = (costForDerived > 0 && priceForDerived > 0) ? ((priceForDerived - costForDerived) / costForDerived * 100).toFixed(1) : 0;
    const margin = (costForDerived > 0 && priceForDerived > 0) ? ((priceForDerived - costForDerived) / priceForDerived * 100).toFixed(1) : 0;



    const handleChange = (field, value) => {
        const preventNegativeFields = [
            'price', 'promotional_price', 'cost_price',
            'current_stock', 'min_stock',
            'weight_gross', 'weight_net', 'width', 'height', 'depth'
        ];

        if (preventNegativeFields.includes(field)) {
            // Se o valor convertido p/ string começar com '-', ignora
            if (value?.toString().startsWith('-')) {
                return;
            }
        }

        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            toast.error("O nome do produto é obrigatório");
            return;
        }

        // Prepare payload with correct types
        const payload = {
            ...formData,
            price: Number(formData.price),
            cost_price: Number(formData.cost_price),
            promotional_price: Number(formData.promotional_price),
            current_stock: Number(formData.current_stock),
            min_stock: Number(formData.min_stock),
            weight_gross: Number(formData.weight_gross),
            weight_net: Number(formData.weight_net),
            width: Number(formData.width),
            height: Number(formData.height),
            depth: Number(formData.depth),
            expiration_date: formData.expiration_date ? new Date(formData.expiration_date).toISOString() : null,
        };

        onSave(payload);
    };

    // --- TABS CONTENT ---

    const GeneralTab = (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="col-span-1 md:col-span-2">
                    <Input label="Nome do Produto *" value={formData.name} onChange={e => handleChange('name', e.target.value)} icon={Package} autoFocus />
                </div>
                <Input label="Código SKU" value={formData.sku} onChange={e => handleChange('sku', e.target.value)} placeholder="Ex: REF-001" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Código de Barras (EAN/GTIN)" value={formData.barcode} onChange={e => handleChange('barcode', e.target.value)} icon={Barcode} />
                <Select label="Categoria" value={formData.category} onChange={e => handleChange('category', e.target.value)}>
                    <option value="">Selecione...</option>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </Select>
                <Select label="Unidade" value={formData.unit} onChange={e => handleChange('unit', e.target.value)}>
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilo (KG)</option>
                    <option value="LT">Litro (LT)</option>
                    <option value="CX">Caixa (CX)</option>
                    <option value="MT">Metro (MT)</option>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input label="Marca" value={formData.brand} onChange={e => handleChange('brand', e.target.value)} />
                <Input label="Fabricante" value={formData.manufacturer} onChange={e => handleChange('manufacturer', e.target.value)} />
                <Input label="Modelo" value={formData.model} onChange={e => handleChange('model', e.target.value)} />
            </div>

            <Textarea label="Descrição Detalhada" value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={3} />

            <div className="flex items-center gap-2">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => handleChange('is_active', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">Produto Ativo</label>
            </div>
        </div>
    );



    const PricingTab = (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Cost Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/10">
                <Input
                    label="Último Custo (R$)"
                    type="number"
                    value={formData.cost_price}
                    onChange={e => handleChange('cost_price', e.target.value)}
                    icon={DollarSign}
                    min="0" step="0.01"
                />
                <div className="flex flex-col justify-center">
                    <span className="text-xs font-medium text-gray-500 mb-1">Custo Médio Ponderado</span>
                    <span className="text-xl font-bold text-gray-900 dark:text-white font-mono">
                        {avgCostValue > 0 ? `R$ ${avgCostValue.toFixed(2)}` : '—'}
                    </span>
                    {avgCostValue > 0 && <span className="text-[10px] text-gray-400 mt-0.5">Calculado automaticamente</span>}
                </div>
                {/* Margin Indicators */}
                <div className="flex flex-col gap-2 justify-center">
                    <div className="flex items-center justify-between bg-white dark:bg-black/20 p-2.5 rounded-lg border border-gray-100 dark:border-white/10">
                        <span className="text-xs font-medium text-gray-500">Markup</span>
                        <span className={`text-lg font-bold ${Number(markup) < 0 ? 'text-red-500' : Number(markup) < 15 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {markup}%
                        </span>
                    </div>
                    <div className="flex items-center justify-between bg-white dark:bg-black/20 p-2.5 rounded-lg border border-gray-100 dark:border-white/10">
                        <span className="text-xs font-medium text-gray-500">Margem</span>
                        <span className={`text-lg font-bold ${Number(margin) < 0 ? 'text-red-500' : Number(margin) < 15 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {margin}%
                        </span>
                    </div>
                </div>
            </div>

            {/* Selling Price Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                    label="Preço de Venda (R$)"
                    type="number"
                    value={formData.price}
                    onChange={e => handleChange('price', e.target.value)}
                    className="text-lg font-bold text-brand-primary"
                    min="0" step="0.01"
                />
                <Input
                    label="Preço Promocional (R$)"
                    type="number"
                    value={formData.promotional_price}
                    onChange={e => handleChange('promotional_price', e.target.value)}
                    placeholder="Opcional"
                    min="0" step="0.01"
                />
            </div>
        </div>
    );

    const StockTab = (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Estoque Atual"
                    type="number"
                    min="0" step="any"
                    value={formData.current_stock}
                    onChange={e => handleChange('current_stock', e.target.value)}
                    className={Number(formData.current_stock) <= Number(formData.min_stock) ? "text-red-500 font-bold" : "text-emerald-500 font-bold"}
                />
                <Input
                    label="Estoque Mínimo"
                    type="number"
                    min="0" step="any"
                    value={formData.min_stock}
                    onChange={e => handleChange('min_stock', e.target.value)}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Localização no Estoque"
                    value={formData.location}
                    onChange={e => handleChange('location', e.target.value)}
                    placeholder="Ex: Corredor A"
                    icon={MapPin}
                />
                <Input
                    label="Data de Validade (Opcional)"
                    type="date"
                    min="2000-01-01"
                    max="2100-12-31"
                    value={formData.expiration_date}
                    onChange={e => handleChange('expiration_date', e.target.value)}
                />
            </div>
            <Select label="Fornecedor Padrão" value={formData.provider_id} onChange={e => handleChange('provider_id', e.target.value)}>
                <option value="">Selecione...</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
        </div>
    );

    const FiscalTab = (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
                <Input label="NCM" value={formData.ncm} onChange={e => handleChange('ncm', e.target.value)} placeholder="0000.00.00" />
                <Input label="CEST" value={formData.cest} onChange={e => handleChange('cest', e.target.value)} placeholder="00.000.00" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Input label="CFOP Padrão" value={formData.cfop} onChange={e => handleChange('cfop', e.target.value)} placeholder="5.102" />
                <Select label="Origem da Mercadoria" value={formData.origin} onChange={e => handleChange('origin', e.target.value)}>
                    <option value="0">0 - Nacional</option>
                    <option value="1">1 - Estrangeira (Imp. Direta)</option>
                    <option value="2">2 - Estrangeira (Adq. no mercado interno)</option>
                </Select>
            </div>
            <Select label="Grupo Tributário" value={formData.tax_group} onChange={e => handleChange('tax_group', e.target.value)}>
                <option value="00">00 - Tributado Integralmente</option>
                <option value="40">40 - Isento</option>
                <option value="60">60 - ICMS cobrado por ST</option>
                <option value="101">101 - Simples Nacional (com permissão de crédito)</option>
                <option value="102">102 - Simples Nacional (sem permissão de crédito)</option>
            </Select>
        </div>
    );

    const LogisticsTab = (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-2 gap-4">
                <Input label="Peso Líquido (kg)" type="number" min="0" step="0.001" value={formData.weight_net} onChange={e => handleChange('weight_net', e.target.value)} />
                <Input label="Peso Bruto (kg)" type="number" min="0" step="0.001" value={formData.weight_gross} onChange={e => handleChange('weight_gross', e.target.value)} icon={Truck} />
            </div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mt-4">Dimensões (cm)</h3>
            <div className="grid grid-cols-3 gap-4">
                <Input label="Largura" type="number" min="0" step="any" value={formData.width} onChange={e => handleChange('width', e.target.value)} icon={Ruler} />
                <Input label="Altura" type="number" min="0" step="any" value={formData.height} onChange={e => handleChange('height', e.target.value)} />
                <Input label="Profundidade" type="number" min="0" step="any" value={formData.depth} onChange={e => handleChange('depth', e.target.value)} />
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <Tabs
                defaultTab="general"
                tabs={[
                    { id: 'general', label: 'Dados Gerais', icon: Info, content: GeneralTab },
                    { id: 'pricing', label: 'Preços', icon: DollarSign, content: PricingTab },
                    { id: 'stock', label: 'Estoque', icon: Layers, content: StockTab },
                    { id: 'fiscal', label: 'Fiscal', icon: FileText, content: FiscalTab },
                    { id: 'logistics', label: 'Logística', icon: Truck, content: LogisticsTab }
                ]}
            />

            {/* ACTION BUTTONS */}
            <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="w-full md:w-auto" />

                <div className="flex gap-4 w-full md:w-auto">
                    <Button
                        type="button"
                        variant="ghost"
                        className="flex-1 md:flex-none bg-white text-gray-900 hover:bg-gray-100 font-bold"
                        onClick={onCancel}
                        disabled={saving}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        className="flex-1 md:flex-none shadow-glow font-bold"
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        <Save size={18} className="mr-2" />
                        {saving ? 'Salvando...' : 'Salvar Produto'}
                    </Button>
                </div>
            </div>


        </div>
    );
};

export default ProductForm;
