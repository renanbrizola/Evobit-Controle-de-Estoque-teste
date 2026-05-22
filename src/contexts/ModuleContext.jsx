import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const ModuleContext = createContext({});

export const useModules = () => useContext(ModuleContext);

export const ModuleProvider = ({ children }) => {
    const { user } = useAuth();
    const [modules, setModules] = useState({
        inventory: true, // Core module, always active for now
        purchases: false,
        sales: false,
        finance: false
    });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulating data fetch or using localStorage for now
        // In the future, this will come from user_profiles or a specific licenses table
        const savedModules = localStorage.getItem('evobit_modules');
        if (savedModules) {
            try {
                const parsed = JSON.parse(savedModules);
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setModules({
                    ...modules,
                    ...parsed,
                    purchases: false,
                    sales: false,
                    finance: false
                });
            } catch (e) {
                console.error("Erro ao carregar módulos locais", e);
            }
        }
        setLoading(false);
    }, [user]);

    const updateModules = (newModules) => {
        const updated = {
            ...modules,
            ...newModules,
            purchases: false,
            sales: false,
            finance: false
        };
        setModules(updated);
        localStorage.setItem('evobit_modules', JSON.stringify(updated));
    };

    const resetModules = () => {
        const defaults = {
            inventory: true,
            purchases: false,
            sales: false,
            finance: false
        };
        setModules(defaults);
        localStorage.removeItem('evobit_modules');
        window.location.reload(); // Force reload to clear any lingering layout state
    };

    const hasModule = (moduleName) => {
        // Força o bloqueio de qualquer módulo que não seja estoque
        if (moduleName !== 'inventory') return false;
        return !!modules[moduleName];
    };

    const checkDependency = (moduleName) => {
        if ((moduleName === 'purchases' || moduleName === 'sales') && !modules.inventory) {
            return { missing: 'inventory', label: 'Estoque' };
        }
        return null;
    };

    return (
        <ModuleContext.Provider value={{ modules, loading, hasModule, updateModules, resetModules, checkDependency }}>
            {children}
        </ModuleContext.Provider>
    );
};

export default ModuleContext;
