import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, Usb, ScanBarcode, RefreshCw, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import Modal from './Modal';

const BarcodeScanner = ({ onScanSuccess, onClose }) => {
    const { t } = useLanguage();
    const [mode, setMode] = useState('camera'); // 'camera' | 'usb'
    const [cameraStarted, setCameraStarted] = useState(false);
    const [cameraLoading, setCameraLoading] = useState(false);
    const [cameraError, setCameraError] = useState(null);
    const [usbBuffer, setUsbBuffer] = useState('');
    const [lastScanned, setLastScanned] = useState('');
    const [facingMode, setFacingMode] = useState('environment'); // 'environment' (back) | 'user' (front)

    const html5QrCodeRef = useRef(null);
    const usbBufferRef = useRef('');
    const usbTimerRef = useRef(null);
    const scannerContainerId = 'barcode-reader-container';

    // ─── CAMERA MODE ─────────────────────────────────
    const stopCamera = useCallback(async () => {
        if (html5QrCodeRef.current) {
            try {
                const state = html5QrCodeRef.current.getState();
                if (state === 2) { // SCANNING
                    await html5QrCodeRef.current.stop();
                }
            } catch (e) {
                console.warn('Error stopping camera:', e);
            }
        }
        setCameraStarted(false);
    }, []);

    const startCamera = useCallback(async () => {
        setCameraLoading(true);
        setCameraError(null);

        try {
            // Stop if already running
            await stopCamera();

            // Small delay for DOM
            await new Promise(resolve => setTimeout(resolve, 200));

            const container = document.getElementById(scannerContainerId);
            if (!container) {
                throw new Error('Scanner container not found');
            }

            // Dynamic import to avoid crash on load
            if (!html5QrCodeRef.current) {
                const { Html5Qrcode } = await import('html5-qrcode');
                html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
            }

            const config = {
                fps: 10,
                qrbox: { width: 280, height: 160 },
                aspectRatio: 1.5,
                disableFlip: false,
            };

            await html5QrCodeRef.current.start(
                { facingMode },
                config,
                (decodedText) => {
                    // Success
                    setLastScanned(decodedText);
                    stopCamera();
                    onScanSuccess(decodedText);
                },
                () => {
                    // Error during scan (ignore - means still scanning)
                }
            );

            setCameraStarted(true);
        } catch (err) {
            console.error('Camera error:', err);
            let errorMsg = err?.message || String(err);
            if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission')) {
                errorMsg = t('scanner', 'cameraPermissionDenied') || 'Permissão da câmera negada. Verifique as configurações do navegador.';
            } else if (errorMsg.includes('NotFoundError') || errorMsg.includes('no camera')) {
                errorMsg = t('scanner', 'noCameraFound') || 'Nenhuma câmera encontrada neste dispositivo.';
            } else {
                errorMsg = (t('scanner', 'cameraError') || 'Erro ao acessar a câmera') + `: ${errorMsg}`;
            }
            setCameraError(errorMsg);
        } finally {
            setCameraLoading(false);
        }
    }, [facingMode, stopCamera, onScanSuccess, t]);

    const toggleCamera = useCallback(() => {
        setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
    }, []);

    // Restart camera when facing mode changes
    useEffect(() => {
        if (mode === 'camera' && cameraStarted) {
            startCamera();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facingMode]);

    // Cleanup when unmounting or switching away from camera
    useEffect(() => {
        return () => {
            stopCamera();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Stop camera when switching to USB mode
    useEffect(() => {
        if (mode !== 'camera') {
            stopCamera();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode]);

    // ─── USB/BLUETOOTH SCANNER MODE ──────────────────
    useEffect(() => {
        if (mode !== 'usb') return;

        const handleKeyDown = (e) => {
            // USB scanners send chars very fast, then Enter
            if (e.key === 'Enter') {
                e.preventDefault();
                const code = usbBufferRef.current.trim();
                if (code.length >= 3) {
                    setLastScanned(code);
                    setUsbBuffer('');
                    usbBufferRef.current = '';
                    onScanSuccess(code);
                }
                return;
            }

            // Only capture printable characters
            if (e.key.length === 1) {
                usbBufferRef.current += e.key;
                setUsbBuffer(usbBufferRef.current);

                // Clear buffer after 500ms of inactivity (not a scanner)
                if (usbTimerRef.current) clearTimeout(usbTimerRef.current);
                usbTimerRef.current = setTimeout(() => {
                    usbBufferRef.current = '';
                    setUsbBuffer('');
                }, 500);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (usbTimerRef.current) clearTimeout(usbTimerRef.current);
        };
    }, [mode, onScanSuccess]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current) {
                try {
                    const state = html5QrCodeRef.current.getState();
                    if (state === 2) {
                        html5QrCodeRef.current.stop().catch(() => { });
                    }
                } catch {
                    // ignore
                }
            }
        };
    }, []);

    return (
        <Modal isOpen={true} onClose={() => { stopCamera(); onClose(); }} className="max-w-md">
            {/* Header */}
            <div className="text-center mb-5">
                <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ScanBarcode size={32} className="text-brand-primary" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                    {t('scanner', 'title') || 'Escanear Código'}
                </h3>
            </div>

            {/* Mode Tabs */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-5">
                <button
                    onClick={() => setMode('camera')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === 'camera'
                        ? 'bg-white text-brand-primary shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Camera size={18} />
                    {t('scanner', 'cameraTab') || 'Câmera'}
                </button>
                <button
                    onClick={() => setMode('usb')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${mode === 'usb'
                        ? 'bg-white text-brand-primary shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    <Usb size={18} />
                    {t('scanner', 'usbTab') || 'Leitor USB'}
                </button>
            </div>

            {/* Camera Mode Content */}
            {mode === 'camera' && (
                <div>
                    <div className="relative rounded-2xl overflow-hidden bg-black mb-4" style={{ minHeight: '240px' }}>
                        <div id={scannerContainerId} className="w-full" />

                        {cameraLoading && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 text-white">
                                <Loader2 size={32} className="animate-spin text-brand-primary mb-3" />
                                <p className="text-sm">{t('scanner', 'startingCamera') || 'Iniciando câmera...'}</p>
                            </div>
                        )}

                        {!cameraStarted && !cameraLoading && !cameraError && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                                <Camera size={48} className="mb-3 text-gray-400" />
                                <button
                                    onClick={startCamera}
                                    className="bg-brand-primary text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-brand-secondary transition-colors shadow-glow"
                                >
                                    {t('scanner', 'startCamera') || 'Iniciar Câmera'}
                                </button>
                            </div>
                        )}
                    </div>

                    {cameraError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-center">
                            <p className="text-red-600 text-sm">{cameraError}</p>
                            <button
                                onClick={startCamera}
                                className="mt-2 text-red-600 text-xs font-semibold underline hover:text-red-800"
                            >
                                {t('scanner', 'tryAgain') || 'Tentar novamente'}
                            </button>
                        </div>
                    )}

                    {cameraStarted && (
                        <div className="flex gap-2">
                            <button
                                onClick={toggleCamera}
                                className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-700 font-medium transition-colors"
                            >
                                <RefreshCw size={16} />
                                {t('scanner', 'switchCamera') || 'Trocar Câmera'}
                            </button>
                        </div>
                    )}

                    <p className="text-center text-xs text-gray-400 mt-3">
                        {t('scanner', 'cameraHint') || 'Aponte a câmera para o código de barras'}
                    </p>
                </div>
            )}

            {/* USB Mode Content */}
            {mode === 'usb' && (
                <div className="text-center py-6">
                    <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <ScanBarcode size={40} className="text-brand-primary" />
                    </div>

                    <h4 className="text-gray-900 font-bold text-base mb-2">
                        {t('scanner', 'usbWaiting') || 'Aguardando leitura...'}
                    </h4>
                    <p className="text-gray-500 text-sm mb-4">
                        {t('scanner', 'usbHint') || 'Escaneie o código de barras com o leitor conectado'}
                    </p>

                    {usbBuffer && (
                        <div className="bg-gray-100 rounded-xl p-3 mb-3">
                            <p className="text-xs text-gray-400 mb-1">{t('scanner', 'reading') || 'Lendo...'}</p>
                            <p className="text-lg font-mono font-bold text-brand-primary">{usbBuffer}</p>
                        </div>
                    )}

                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left">
                        <p className="text-amber-800 text-xs font-medium">
                            💡 {t('scanner', 'usbTip') || 'Dica: Certifique-se que o leitor está configurado para enviar Enter após a leitura.'}
                        </p>
                    </div>
                </div>
            )}

            {/* Last scanned code */}
            {lastScanned && (
                <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-emerald-600 mb-1">{t('scanner', 'lastRead') || 'Último código lido'}</p>
                    <p className="text-base font-mono font-bold text-emerald-700">{lastScanned}</p>
                </div>
            )}
        </Modal>
    );
};

export default BarcodeScanner;
