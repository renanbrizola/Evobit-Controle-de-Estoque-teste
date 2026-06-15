import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Select } from '../ui/Input';
import { X, Loader2, Edit, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../services/api';

const BulkEditModal = ({ selectedIds, categories, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [field, setField] = useState('category'); // category | ...
    const [value, setValue] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!value) {
            toast.error("Selecione um valor para aplicar");
            return;
        }

        setLoading(true);
        try {
            const updates = {};
            if (field === 'category') updates.category = value;

            await api.products.bulkUpdate(selectedIds, updates);

            toast.success(`${selectedIds.length} produtos atualizados com sucesso!`);
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao atualizar produtos em massa");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <Card className="w-full max-w-md relative animate-in zoom-in-95 duration-300 border-white/10 bg-[#121212] shadow-2xl">
                <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                            <Edit size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">Edição em Massa</h3>
                            <p className="text-xs text-gray-400">{selectedIds.length} itens selecionados</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex gap-3 text-blue-300 text-xs">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <p>Você está prestes a alterar o campo abaixo para <b>{selectedIds.length}</b> produtos. Essa ação não pode ser desfeita facilmente.</p>
                    </div>

                    <div className="space-y-4">
                        <Select
                            label="Campo a Editar"
                            value={field}
                            onChange={e => setField(e.target.value)}
                        >
                            <option value="category">Categoria</option>
                            {/* Future: Provider, Brand, MinStock, etc */}
                        </Select>

                        {field === 'category' && (
                            <Select
                                label="Nova Categoria"
                                value={value}
                                onChange={e => setValue(e.target.value)}
                            >
                                <option value="">Selecione...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.name} className="dark:bg-gray-900">{cat.name}</option>
                                ))}
                            </Select>
                        )}
                    </div>

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
                            disabled={loading || !value}
                        >
                            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                            Aplicar Alterações
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default BulkEditModal;
