import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CustomerService } from '../services/customers';
import { Plus, Search, User, Phone, MapPin, Pencil, Trash2, Loader2, Mail } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { toast } from 'sonner';

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        cpf_cnpj: '',
        phone: '',
        email: '',
        address: ''
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await CustomerService.list(search);
            setCustomers(data);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao carregar clientes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps restritas de proposito (fetch-on-mount/por-filtro; padrao legado auditado)
    }, [search]);

    const handleEdit = (customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            cpf_cnpj: customer.cpf_cnpj || '',
            phone: customer.phone || '',
            email: customer.email || '',
            address: customer.address || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
        try {
            await CustomerService.delete(id);
            toast.success('Cliente excluído');
            loadData();
        } catch {
            toast.error('Erro ao excluir');
        }
    };

    const handleSave = async () => {
        if (!formData.name) return toast.error('Nome é obrigatório');

        setSaving(true);
        try {
            if (editingCustomer) {
                await CustomerService.update(editingCustomer.id, formData);
                toast.success('Cliente atualizado');
            } else {
                await CustomerService.create(formData);
                toast.success('Cliente criado');
            }
            setIsModalOpen(false);
            setEditingCustomer(null);
            setFormData({ name: '', cpf_cnpj: '', phone: '', email: '', address: '' });
            loadData();
        } catch (error) {
            toast.error('Erro ao salvar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setIsModalOpen(false);
        setEditingCustomer(null);
        setFormData({ name: '', cpf_cnpj: '', phone: '', email: '', address: '' });
    };

    return (
        <div className="space-y-6 p-4 md:p-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <User className="text-brand-primary" /> Clientes
                    </h2>
                    <p className="text-gray-500 text-sm">Gerencie sua base de clientes</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)}>
                    <Plus size={20} className="mr-2" /> Novo Cliente
                </Button>
            </div>

            <Card className="p-4 bg-white/80 dark:bg-brand-dark/50 backdrop-blur-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        className="w-full pl-10 h-10 bg-transparent border-b border-gray-200 dark:border-white/10 focus:border-brand-primary outline-none text-gray-900 dark:text-white transition-colors"
                        placeholder="Buscar por nome, CPF ou telefone..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </Card>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="animate-spin text-brand-primary" size={40} />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customers.map((cust) => (
                        <div key={cust.id} className="relative group p-5 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/5 rounded-2xl hover:shadow-lg transition-all duration-300">
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleEdit(cust)} className="p-2 text-brand-primary hover:bg-brand-primary/10 rounded-lg"><Pencil size={16} /></button>
                                <button onClick={() => handleDelete(cust.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 size={16} /></button>
                            </div>

                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold text-lg">
                                    {cust.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white truncate pr-16">{cust.name}</h3>
                                    <p className="text-xs text-brand-primary bg-brand-primary/5 px-2 py-0.5 rounded-full w-fit mt-1">
                                        {cust.cpf_cnpj || 'Sem documento'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-2">
                                    <Phone size={14} /> {cust.phone || '-'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail size={14} /> {cust.email || '-'}
                                </div>
                                <div className="flex items-center gap-2 truncate" title={cust.address}>
                                    <MapPin size={14} /> {cust.address || '-'}
                                </div>
                            </div>
                        </div>
                    ))}
                    {customers.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400">
                            Nenhum cliente encontrado.
                        </div>
                    )}
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={handleClose} className="max-w-lg">
                <h3 className="text-xl font-bold mb-6">{editingCustomer ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <div className="space-y-4">
                    <Input label="Nome Completo *" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} autoFocus />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="CPF / CNPJ" value={formData.cpf_cnpj} onChange={e => setFormData({ ...formData, cpf_cnpj: e.target.value })} />
                        <Input label="Telefone / WhatsApp" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                    </div>
                    <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    <Input label="Endereço" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />

                    <div className="flex gap-3 pt-4">
                        <Button variant="outline" className="flex-1" onClick={handleClose}>Cancelar</Button>
                        <Button className="flex-1" onClick={handleSave} disabled={saving}>
                            {saving ? <Loader2 className="animate-spin mr-2" /> : null} Salvar
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Customers;
