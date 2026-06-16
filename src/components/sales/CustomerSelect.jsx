import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, User, X, Check, Loader2 } from 'lucide-react';
import { CustomerService } from '../../services/customers';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import Modal from '../ui/Modal';
import { toast } from 'sonner';

const CustomerSelect = ({ onSelect, selectedCustomer }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // New Customer Form
    const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', cpf_cnpj: '' });
    const [creating, setCreating] = useState(false);

    const dropdownRef = useRef(null);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isOpen) loadCustomers();
        }, 500);
        return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, isOpen]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const loadCustomers = async () => {
        setLoading(true);
        try {
            const data = await CustomerService.list(search);
            setResults(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newCustomer.name) return toast.error('Nome é obrigatório');

        try {
            setCreating(true);
            const created = await CustomerService.create(newCustomer);
            onSelect(created);
            setIsOpen(false);
            setIsCreateOpen(false);
            setNewCustomer({ name: '', phone: '', cpf_cnpj: '' });
            toast.success('Cliente cadastrado!');
        } catch (err) {
            toast.error('Erro ao criar cliente: ' + err.message);
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {selectedCustomer ? (
                <div className="flex items-center justify-between p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold">
                            {selectedCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white">{selectedCustomer.name}</p>
                            <p className="text-xs text-gray-500">{selectedCustomer.cpf_cnpj || selectedCustomer.phone || 'Sem documento'}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onSelect(null)}
                        className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded-lg transition-colors"
                        title="Remover cliente"
                    >
                        <X size={18} />
                    </button>
                </div>
            ) : (
                <div
                    className="flex items-center gap-2 p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl cursor-text hover:border-brand-primary/50 transition-colors"
                    onClick={() => setIsOpen(true)}
                >
                    <Search size={20} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar Cliente (Nome, CPF, Tel)..."
                        className="bg-transparent border-none outline-none text-sm w-full text-gray-700 dark:text-gray-200"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                    />
                </div>
            )}

            {/* Dropdown Results */}
            {isOpen && !selectedCustomer && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto animate-in slide-in-from-top-2">
                    <div className="p-2 sticky top-0 bg-white dark:bg-[#1A1A1A] border-b border-gray-100 dark:border-white/5">
                        <Button
                            variant="ghost"
                            className="w-full justify-start text-brand-primary"
                            onClick={() => setIsCreateOpen(true)}
                        >
                            <Plus size={16} className="mr-2" /> Novo Cliente
                        </Button>
                    </div>

                    {loading ? (
                        <div className="p-4 text-center text-gray-400">
                            <Loader2 className="animate-spin mx-auto mb-2" size={20} />
                            Carregando...
                        </div>
                    ) : results.length > 0 ? (
                        <div className="p-2">
                            {results.map(cust => (
                                <button
                                    key={cust.id}
                                    onClick={() => {
                                        onSelect(cust);
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg flex items-center gap-3 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 group-hover:bg-brand-primary group-hover:text-white transition-colors">
                                        <User size={14} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{cust.name}</p>
                                        <p className="text-xs text-gray-400">{cust.phone || cust.email || 'Sem contato'}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-400">
                            Nenhum cliente encontrado.
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} className="max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">Novo Cliente Rápido</h3>
                    <button onClick={() => setIsCreateOpen(false)}><X size={20} /></button>
                </div>
                <div className="space-y-4">
                    <Input
                        label="Nome Completo *"
                        value={newCustomer.name}
                        onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                        autoFocus
                    />
                    <Input
                        label="CPF / CNPJ"
                        value={newCustomer.cpf_cnpj}
                        onChange={e => setNewCustomer({ ...newCustomer, cpf_cnpj: e.target.value })}
                    />
                    <Input
                        label="Telefone / WhatsApp"
                        value={newCustomer.phone}
                        onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    />
                    <Button
                        className="w-full mt-4"
                        onClick={handleCreate}
                        disabled={creating}
                    >
                        {creating ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" size={18} />}
                        Cadastrar Cliente
                    </Button>
                </div>
            </Modal>
        </div>
    );
};

export default CustomerSelect;
