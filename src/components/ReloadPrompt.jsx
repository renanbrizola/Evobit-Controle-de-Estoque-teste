import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { Button } from './ui/Button';

export default function ReloadPrompt() {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            console.log('SW Registered: ' + r);
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = React.useCallback(() => {
        setOfflineReady(false);
        setNeedRefresh(false);
    }, [setOfflineReady, setNeedRefresh]);

    React.useEffect(() => {
        if (offlineReady) {
            toast.success("App pronto para uso offline!");
        }
    }, [offlineReady]);

    React.useEffect(() => {
        if (needRefresh) {
            toast.info(
                <div className="flex flex-col gap-2">
                    <span>Nova versão disponível!</span>
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateServiceWorker(true)}>Atualizar</Button>
                        <Button size="sm" variant="ghost" onClick={close}>Fechar</Button>
                    </div>
                </div>,
                { duration: Infinity, id: 'pwa-update-toast' } // Persistent toast
            );
        }
    }, [needRefresh, updateServiceWorker, close]);

    return null; // The toast handles the UI
}
