import React from 'react';
import { ChefHat } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const TechnicalSheetProvisional = () => {
    const location = useLocation();
    
    return (
        <div className="flex-1 h-full p-8 bg-gray-50 flex items-center justify-center">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center">
                <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <ChefHat size={32} />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Módulo Ficha Técnica</h1>
                <p className="text-gray-500 mb-6">Você acessou a rota:<br/><strong className="text-orange-600">{location.pathname}</strong></p>
                
                <div className="text-sm text-gray-400 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    A integração visual completa do ecossistema do projeto externo ocorrerá nas próximas fases.
                </div>
            </div>
        </div>
    );
};

export default TechnicalSheetProvisional;
