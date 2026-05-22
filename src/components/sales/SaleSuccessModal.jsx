import React from 'react';
import { CheckCircle, Printer, FileText, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { toast } from 'sonner';

const SaleSuccessModal = ({ isOpen, onClose, onPrintReceipt, onEmitNFCe, saleId }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-[#1A1A1A] rounded-2xl shadow-2xl overflow-hidden border border-white/10 p-6 flex flex-col items-center">

                <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-4">
                    <CheckCircle size={32} />
                </div>

                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Venda Realizada!</h2>
                <p className="text-gray-500 dark:text-gray-400 text-center mb-8">
                    A venda #{saleId?.substr(0, 8)} foi salva com sucesso. <br />
                    O que deseja fazer agora?
                </p>

                <div className="w-full space-y-3">
                    <Button
                        onClick={onPrintReceipt}
                        className="w-full h-12 text-lg font-bold bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white border-0"
                    >
                        <Printer className="mr-2" size={20} />
                        Imprimir Comprovante
                    </Button>

                    <Button
                        onClick={onEmitNFCe}
                        className="w-full h-12 text-lg font-bold bg-brand-primary hover:bg-brand-primary/90 text-white shadow-lg shadow-brand-primary/20"
                    >
                        <FileText className="mr-2" size={20} />
                        Emitir NFC-e
                    </Button>
                </div>

                <button
                    onClick={onClose}
                    className="mt-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm font-medium transition-colors"
                >
                    Fechar e Iniciar Nova Venda
                </button>
            </div>
        </div>
    );
};

export default SaleSuccessModal;
