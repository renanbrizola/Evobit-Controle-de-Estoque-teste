import React from 'react';
import { Trash2, Edit, Tag, X, CheckSquare, Target } from 'lucide-react';
import { Button } from './Button';
import clsx from 'clsx';

const FloatingActionBar = ({
    selectedCount,
    onClearSelection,
    onDelete,
    onEdit,
    onPrintLabels,
    onStartCount
}) => {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-full max-w-2xl px-4 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="bg-white/90 dark:bg-[#121212] border border-gray-200 dark:border-white/10 shadow-2xl rounded-2xl p-3 flex items-center justify-between gap-4 backdrop-blur-xl">

                <div className="flex items-center gap-3 pl-2">
                    <div className="bg-brand-primary text-brand-dark font-bold rounded-lg w-8 h-8 flex items-center justify-center text-sm">
                        {selectedCount}
                    </div>
                    <span className="text-gray-700 dark:text-white font-medium text-sm hidden sm:inline">
                        selecionado{selectedCount > 1 ? 's' : ''}
                    </span>
                    <button
                        onClick={onClearSelection}
                        className="text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors text-xs flex items-center gap-1 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md ml-2"
                    >
                        <X size={12} /> Cancelar
                    </button>
                </div>

                <div className="h-8 w-[1px] bg-gray-200 dark:bg-white/10 hidden sm:block"></div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                    {onStartCount && (
                        <Button
                            onClick={onStartCount}
                            className="bg-brand-primary text-black font-bold hover:bg-brand-primary/90 h-9 px-4 text-xs sm:text-sm whitespace-nowrap shadow-brand-glow mr-2"
                        >
                            <Target size={16} className="mr-2" /> Contagem Cega
                        </Button>
                    )}

                    <Button
                        onClick={onEdit}
                        variant="ghost"
                        className="text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 h-9 px-3 text-xs sm:text-sm whitespace-nowrap"
                    >
                        <Edit size={16} className="mr-2 text-blue-500 dark:text-blue-400" /> Editar
                    </Button>

                    <Button
                        onClick={onPrintLabels}
                        variant="ghost"
                        className="text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 h-9 px-3 text-xs sm:text-sm whitespace-nowrap"
                    >
                        <Tag size={16} className="mr-2 text-amber-500 dark:text-amber-400" /> Etiquetas
                    </Button>

                    <div className="h-6 w-[1px] bg-gray-200 dark:bg-white/10"></div>

                    <Button
                        onClick={onDelete}
                        variant="ghost"
                        className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300 h-9 px-3 text-xs sm:text-sm whitespace-nowrap"
                    >
                        <Trash2 size={16} className="mr-2" /> Excluir
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default FloatingActionBar;
