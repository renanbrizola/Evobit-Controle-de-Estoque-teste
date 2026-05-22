import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { Loader2, User, Phone, Truck, Calendar, FileText, MapPin, Building, Globe, Mail, DollarSign, Save, Info, CreditCard } from 'lucide-react';
import { Tabs } from '../ui/Tabs';
import { maskCNPJ, maskPhone, maskZip } from '../../utils/masks';
import { toast } from 'sonner';

const ProviderForm = ({ initialData, onSave, onCancel, saving }) => {

    // Form State
    const [formData, setFormData] = useState({
        // ID & Basic
        name: '', // Razão Social
        trade_name: '', // Nome Fantasia
        cnpj: '',
        ie: '',
        im: '',
        is_active: true,

        // Address
        cep: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        address: '', // Legacy/Full address maintenance

        // Contact
        phone: '',
        mobile_phone: '',
        email: '',
        email_nfe: '',
        website: '',
        seller: '', // Contact Person

        // Commercial / Financial
        delivery_time: '',
        payment_terms: '',
        product_types: '',
        order_day: '',
        bank_info: '',
        credit_limit: ''
    });

    // Initialize Data
    useEffect(() => {
        if (initialData) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFormData({
                name: initialData.name || '',
                trade_name: initialData.trade_name || '',
                cnpj: initialData.cnpj ? maskCNPJ(initialData.cnpj) : '',
                ie: initialData.ie || '',
                im: initialData.im || '',
                is_active: initialData.is_active !== false,

                cep: initialData.cep ? maskZip(initialData.cep) : '',
                street: initialData.street || '',
                number: initialData.number || '',
                complement: initialData.complement || '',
                neighborhood: initialData.neighborhood || '',
                city: initialData.city || '',
                state: initialData.state || '',
                address: initialData.address || '',

                phone: initialData.phone ? maskPhone(initialData.phone) : '',
                mobile_phone: initialData.mobile_phone ? maskPhone(initialData.mobile_phone) : '',
                email: initialData.email || '',
                email_nfe: initialData.email_nfe || '',
                website: initialData.website || '',
                seller: initialData.seller || '',

                delivery_time: initialData.delivery_time || '',
                payment_terms: initialData.payment_terms || '',
                product_types: initialData.product_types || '',
                order_day: initialData.order_day || '',
                bank_info: initialData.bank_info || '',
                credit_limit: initialData.credit_limit || ''
            });
        }
    }, [initialData]);

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.name || formData.name.length < 3) {
            toast.error("Razão Social inválida");
            return;
        }

        // Clean masks before sending if needed, or send masked. 
        // Current implementation usually sends masked string for display consistency, 
        // but robust backends prefer unmasked. We'll keep consistent with current app behavior.
        const payload = {
            ...formData,
            credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
            // Construct full address string for legacy support if needed
            address: formData.street ? `${formData.street}, ${formData.number} - ${formData.neighborhood}, ${formData.city}/${formData.state}` : formData.address
        };

        onSave(payload);
    };

    // --- TABS ---

    const GeneralTab = (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="CNPJ" value={formData.cnpj} onChange={e => handleChange('cnpj', maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" maxLength={18} autoFocus />
                <div className="flex items-center gap-2 mt-6">
                    <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => handleChange('is_active', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary" />
                    <label htmlFor="is_active" className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer">Fornecedor Ativo</label>
                </div>
            </div>

            <Input label="Razão Social *" value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="Ex: Ambev S.A." icon={Building} className="font-bold text-lg" />
            <Input label="Nome Fantasia" value={formData.trade_name} onChange={e => handleChange('trade_name', e.target.value)} placeholder="Ex: Ambev Distribuidora" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <Input
                        label="Inscrição Estadual (IE)"
                        value={formData.ie}
                        onChange={e => handleChange('ie', e.target.value)}
                        placeholder="000.000.000.000"
                        disabled={formData.ie === 'ISENTO'}
                    />
                    <div className="absolute right-0 top-0 flex items-center gap-2 mt-1 mr-1">
                        <input
                            type="checkbox"
                            id="ie_isento"
                            checked={formData.ie === 'ISENTO'}
                            onChange={(e) => handleChange('ie', e.target.checked ? 'ISENTO' : '')}
                            className="w-4 h-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                        />
                        <label htmlFor="ie_isento" className="text-xs font-medium text-gray-500 cursor-pointer select-none">Isento</label>
                    </div>
                </div>
                <Input label="Inscrição Municipal (IM)" value={formData.im} onChange={e => handleChange('im', e.target.value)} placeholder="000000" />
            </div>

            <Input label="Tipos de Produto" value={formData.product_types} onChange={e => handleChange('product_types', e.target.value)} placeholder="Ex: Bebidas, Limpeza..." icon={Loader2} />
        </div>
    );

    const AddressTab = (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="grid grid-cols-3 gap-4">
                <Input label="CEP" value={formData.cep} onChange={e => handleChange('cep', maskZip(e.target.value))} placeholder="00000-000" maxLength={9} icon={MapPin} />
            </div>
            <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                    <Input label="Logradouro" value={formData.street} onChange={e => handleChange('street', e.target.value)} placeholder="Rua, Av..." />
                </div>
                <Input label="Número" value={formData.number} onChange={e => handleChange('number', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Complemento" value={formData.complement} onChange={e => handleChange('complement', e.target.value)} placeholder="Apto, Sala, Galpão" />
                <Input label="Bairro" value={formData.neighborhood} onChange={e => handleChange('neighborhood', e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    <Input label="Cidade" value={formData.city} onChange={e => handleChange('city', e.target.value)} />
                </div>
                <Input label="UF" value={formData.state} onChange={e => handleChange('state', e.target.value)} maxLength={2} placeholder="SP" />
            </div>
        </div>
    );

    const ContactTab = (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Telefone Fixo" value={formData.phone} onChange={e => handleChange('phone', maskPhone(e.target.value))} placeholder="(00) 0000-0000" icon={Phone} />
                <Input label="Celular / WhatsApp" value={formData.mobile_phone} onChange={e => handleChange('mobile_phone', maskPhone(e.target.value))} placeholder="(00) 00000-0000" icon={Phone} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Email Comercial" value={formData.email} onChange={e => handleChange('email', e.target.value)} icon={Mail} />
                <Input label="Email para NFe" value={formData.email_nfe} onChange={e => handleChange('email_nfe', e.target.value)} placeholder="XML da nota" icon={Mail} />
            </div>
            <Input label="Website" value={formData.website} onChange={e => handleChange('website', e.target.value)} placeholder="www.fornecedor.com.br" icon={Globe} />
            <Input label="Vendedor / Contato Principal" value={formData.seller} onChange={e => handleChange('seller', e.target.value)} placeholder="Nome do representante" icon={User} />
        </div>
    );

    const CommercialTab = (
        <div className="space-y-4 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select label="Dia do Pedido" value={formData.order_day} onChange={e => handleChange('order_day', e.target.value)}>
                    <option value="">Selecione...</option>
                    {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'].map(d => (
                        <option key={d} value={d}>{d}</option>
                    ))}
                </Select>
                <Input label="Prazo de Entrega" value={formData.delivery_time} onChange={e => handleChange('delivery_time', e.target.value)} placeholder="Ex: 2 dias úteis" icon={Truck} />
            </div>

            <Input label="Condições de Pagamento" value={formData.payment_terms} onChange={e => handleChange('payment_terms', e.target.value)} placeholder="Ex: Boleto 30/60/90 dias" icon={FileText} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="Limite de Crédito (R$)" type="number" value={formData.credit_limit} onChange={e => handleChange('credit_limit', e.target.value)} icon={DollarSign} />
                {/* Placeholder for Bank Info - could be structured later */}
            </div>
            <Textarea label="Dados Bancários" value={formData.bank_info} onChange={e => handleChange('bank_info', e.target.value)} rows={3} placeholder="Banco, Agência, Conta, Chave PIX..." />
        </div>
    );

    return (
        <div className="space-y-6">
            <Tabs
                defaultTab="general"
                tabs={[
                    { id: 'general', label: 'Dados Gerais', icon: Building, content: GeneralTab },
                    { id: 'address', label: 'Endereço', icon: MapPin, content: AddressTab },
                    { id: 'contact', label: 'Contatos', icon: Phone, content: ContactTab },
                    { id: 'commercial', label: 'Financeiro', icon: DollarSign, content: CommercialTab }
                ]}
            />

            <div className="mt-8 flex gap-4">
                <Button
                    variant="ghost"
                    className="flex-1 bg-white text-gray-900 hover:bg-gray-100 hover:text-gray-900 border-none transition-colors shadow-sm font-bold"
                    onClick={onCancel}
                    disabled={saving}
                >
                    Cancelar
                </Button>
                <Button
                    className="flex-1 shadow-glow"
                    onClick={handleSubmit}
                    disabled={saving}
                >
                    <Save size={18} className="mr-2" />
                    {saving ? 'Salvando...' : 'Salvar Fornecedor'}
                </Button>
            </div>
        </div >
    );
};

export default ProviderForm;
