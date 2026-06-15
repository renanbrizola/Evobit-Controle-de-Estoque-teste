import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/Button';

const DebugAuth = () => {
    const [logs, setLogs] = useState([]);

    const log = (msg, data = null) => {
        const timestamp = new Date().toLocaleTimeString();
        const entry = `${timestamp}: ${msg} ${data ? JSON.stringify(data, null, 2) : ''}`;
        setLogs(prev => [...prev, entry]);
        console.log("DEBUG:", msg, data);
    };

    const runTests = async () => {
        setLogs([]);
        log("Starting RPC Tests...");

        const { data: { session } } = await supabase.auth.getSession();
        log("Session User ID:", session?.user?.id);

        if (!session) {
            log("❌ No Session found. Please login first.");
            return;
        }

        try {
            log("Calling 'get_active_store_owner'...");
            const { data: ownerId, error: ownerError } = await supabase.rpc('get_active_store_owner');
            if (ownerError) log("❌ Error get_active_store_owner:", ownerError);
            else log("✅ Success get_active_store_owner:", ownerId);

            log("Calling 'get_my_team_role'...");
            const { data: role, error: roleError } = await supabase.rpc('get_my_team_role');
            if (roleError) log("❌ Error get_my_team_role:", roleError);
            else log("✅ Success get_my_team_role:", role);

        } catch (error) {
            log("CRITICAL FAILURE:", error);
        }
    };

    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Diagnóstico de Backend</h1>
            <p className="mb-4">Use esta tela para verificar se o banco de dados está respondendo corretamente.</p>

            <Button onClick={runTests} className="mb-6">
                Rodar Testes de RPC
            </Button>

            <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-xs overflow-auto h-96 whitespace-pre-wrap">
                {logs.length === 0 ? "Aguardando..." : logs.join('\n')}
            </div>
        </div>
    );
};

export default DebugAuth;
