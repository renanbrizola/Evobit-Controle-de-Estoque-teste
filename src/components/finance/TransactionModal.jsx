import React, { useState } from 'react';
import { X, Save, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { toast } from 'sonner';

import { FinanceService } from '../../services/finance';

const TransactionModal = ({ isOpen, onClose, onSave }) => {
    const [type, setType] = useState('expense'); // 'income' or 'expense'
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0]
    });

    const categories = type === 'income'
        ? ['Vendas', 'Serviços', 'Investimento', 'Outros']
        : ['Aluguel', 'Fornecedores', 'Funcionários', 'Marketing', 'Impostos', 'Outros'];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.description || !formData.amount) {
            toast.error('Preencha os campos obrigatórios');
            return;
        }

        const transactionData = {
            ...formData,
            type
        };

        toast.promise(
            FinanceService.create(transactionData),
            {
                loading: 'Salvando transação...',
                success: (newTransaction) => {
                    onSave(newTransaction);
                    onClose();
                    setFormData({ description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0] });
                    return 'Transação registrada com sucesso!';
                },
                error: (err) => {
                    console.error(err);
                    return 'Erro ao registrar transação: ' + err.message;
                }
            }
        );
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Nova Transação</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>
            </div>

            <div className="flex gap-4 mb-6">
                <button
                    type="button"
                    onClick={() => setType('income')}
                    className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${type === 'income'
                        ? 'bg-green-100 text-green-700 ring-2 ring-green-500 ring-offset-2'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    <ArrowUpCircle size={20} /> Receita
                </button>
                <button
                    type="button"
                    onClick={() => setType('expense')}
                    className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${type === 'expense'
                        ? 'bg-red-100 text-red-700 ring-2 ring-red-500 ring-offset-2'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                        }`}
                >
                    <ArrowDownCircle size={20} /> Despesa
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Valor (R$)</label>
                    <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        className="w-full text-3xl font-bold p-2 text-gray-800 border-b-2 border-gray-200 focus:border-brand-primary outline-none bg-transparent placeholder-gray-300"
                        value={formData.amount}
                        onChange={e => setFormData({ ...formData, amount: e.target.value })}
                        autoFocus
                    />
                </div>

                <Input
                    label="Descrição"
                    placeholder="Ex: Conta de Luz"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                />

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Categoria</label>
                        <select
                            className="w-full rounded-xl border-gray-300 border p-3 focus:ring-2 focus:ring-brand-primary outline-none bg-white"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="">Selecione...</option>
                            {categories.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <Input
                            label="Data"
                            type="date"
                            value={formData.date}
                            onChange={e => setFormData({ ...formData, date: e.target.value })}
                        />
                    </div>
                </div>

                <div className="pt-4 flex gap-3">
                    <Button variant="outline" type="button" onClick={onClose} className="flex-1">
                        Cancelar
                    </Button>
                    <Button type="submit" className={`flex-1 ${type === 'income' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                        <Save size={18} className="mr-2" /> Salvar
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default TransactionModal;
