import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useSyncStore } from '../../../application/stores/useSyncStore';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { ScannerOverlay } from './ScannerOverlay';

export const WifiSyncCard: React.FC = () => {
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
  const {
    serverUrl,
    isSyncing,
    isServerOnline,
    pendingCount,
    lastSyncAt,
    localServerIp,
    error,
    setServerUrl,
    syncNow,
    refreshPendingCount,
  } = useSyncStore();

  const [showQr, setShowQr] = useState(false);
  const [manualIp, setManualIp] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  // Scanner hook for Android to scan the QR code from the PC monitor
  const { isScanning, triggerCameraScan, stopScan } = useBarcodeScanner(async (code) => {
    if (code.startsWith('http://') || code.startsWith('https://')) {
      const ok = await setServerUrl(code);
      if (ok) {
        setFeedbackMsg('¡Vinculado con éxito a la PC!');
      }
    } else {
      setFeedbackMsg('El código escaneado no es una URL de Nodo válida.');
    }
  });

  const handleManualConnect = async () => {
    if (!manualIp.trim()) return;
    let url = manualIp.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }
    const ok = await setServerUrl(url);
    if (ok) {
      setFeedbackMsg('¡Conexión manual exitosa!');
      setShowManualInput(false);
      setManualIp('');
    }
  };

  const handleSyncClick = async () => {
    const result = await syncNow();
    if (result.success) {
      setFeedbackMsg(`Sincronización completada (${result.pushed} registros enviados).`);
    }
  };

  return (
    <>
      {isScanning && <ScannerOverlay onCancel={stopScan} />}

      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            <h3 className="font-bold text-slate-900 text-sm">
              {isTauri ? 'Servidor Wi-Fi (Nodo Central)' : 'Sincronización con PC'}
            </h3>
          </div>
          {isTauri ? (
            <Badge variant="success">Servidor Activo</Badge>
          ) : isServerOnline ? (
            <Badge variant="success">Conectado a PC</Badge>
          ) : serverUrl ? (
            <Badge variant="warning">Buscando PC...</Badge>
          ) : (
            <Badge variant="info">Sin vincular</Badge>
          )}
        </div>

        {/* WINDOWS TAURI VIEW */}
        {isTauri && (
          <div className="flex flex-col gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs flex flex-col gap-1">
              <span className="text-slate-500 font-semibold">Dirección de enlace Wi-Fi:</span>
              <span className="font-mono text-indigo-600 font-bold select-all text-sm">
                {localServerIp || 'Obteniendo IP local...'}
              </span>
              <span className="text-slate-400 text-[11px] mt-1">
                Puerto 4545 abierto para recibir los escaneos de los celulares en la misma red.
              </span>
            </div>

            <Button
              variant="secondary"
              onClick={() => setShowQr(!showQr)}
              className="w-full text-xs"
            >
              {showQr ? 'Ocultar Código QR' : 'Mostrar Código QR para Vincular Celular'}
            </Button>

            {showQr && localServerIp && (
              <div className="flex flex-col items-center justify-center p-4 bg-white border border-indigo-100 rounded-xl shadow-inner gap-3">
                <div className="p-3 bg-white rounded-lg shadow-xs border border-slate-100">
                  <QRCodeSVG value={localServerIp} size={180} level="M" />
                </div>
                <p className="text-[11px] text-slate-500 text-center max-w-xs">
                  Abrí Nodo en el celular y tocá <strong>"Escanear QR de PC"</strong> para emparejar automáticamente.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ANDROID / MOBILE VIEW */}
        {!isTauri && (
          <div className="flex flex-col gap-3 text-xs">
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-semibold">PC Vinculada:</span>
              <span className="font-mono text-slate-800 font-bold truncate max-w-[200px]">
                {serverUrl || 'Ninguna'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-semibold">Buzón de cambios pendientes:</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded-md ${
                pendingCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
              }`}>
                {pendingCount} registro{pendingCount !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-semibold">Última sincronización:</span>
              <span className="text-slate-700 font-medium">
                {lastSyncAt || 'Aún no sincronizado'}
              </span>
            </div>

            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {error}
              </div>
            )}

            {feedbackMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs">
                {feedbackMsg}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                variant="primary"
                onClick={triggerCameraScan}
                disabled={isSyncing}
                className="flex-1 text-xs flex items-center justify-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                Escanear QR de PC
              </Button>

              <Button
                variant="secondary"
                onClick={handleSyncClick}
                disabled={isSyncing || !serverUrl}
                className="flex-1 text-xs"
              >
                {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
              </Button>
            </div>

            <button
              onClick={() => setShowManualInput(!showManualInput)}
              className="text-[11px] text-slate-400 hover:text-indigo-600 self-center underline mt-1"
            >
              {showManualInput ? 'Ocultar conexión manual' : '¿Problemas con la cámara? Conectar por IP'}
            </button>

            {showManualInput && (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  placeholder="ej. 192.168.1.50:4545"
                  value={manualIp}
                  onChange={(e) => setManualIp(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
                <Button variant="secondary" onClick={handleManualConnect} className="text-xs">
                  Conectar
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
