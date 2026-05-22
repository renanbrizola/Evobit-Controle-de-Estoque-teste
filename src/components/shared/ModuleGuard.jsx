import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useModules } from '../../contexts/ModuleContext';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const ModuleGuard = ({ requiredModule }) => {
    const { modules, loading, checkDependency } = useModules();
    const location = useLocation();

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center text-brand-primary">
                <Loader2 className="animate-spin" size={48} />
            </div>
        );
    }

    // Check strict dependency (e.g. Sales requires Inventory)
    const dependency = checkDependency(requiredModule);
    if (dependency) {
        // Optional: We could redirect to a specific error page or just the modules lobby
        // For now, let's redirect to lobby with a state to show a message
        return <Navigate to="/modules" replace state={{
            error: `O módulo ${requiredModule} requer o módulo ${dependency.label} ativo.`
        }} />;
    }

    if (!modules[requiredModule]) {
        return <Navigate to="/modules" replace state={{
            from: location,
            moduleLocked: requiredModule
        }} />;
    }

    return <Outlet />;
};

export default ModuleGuard;
