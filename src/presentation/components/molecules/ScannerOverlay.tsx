import React from 'react';

interface ScannerOverlayProps {
  onCancel: () => void;
  title?: string;
}

export const ScannerOverlay: React.FC<ScannerOverlayProps> = ({
  onCancel,
  title = 'Alineá el código dentro del recuadro'
}) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 pointer-events-auto select-none bg-transparent">
      {/* Top Header */}
      <div className="mt-8 px-4 py-2 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-semibold rounded-full border border-white/20 shadow-lg text-center">
        {title}
      </div>

      {/* Viewfinder Target */}
      <div className="relative w-64 h-64 rounded-2xl border-2 border-indigo-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] flex items-center justify-center">
        {/* Animated Scanning Line */}
        <div className="absolute inset-x-2 h-0.5 bg-indigo-400 shadow-[0_0_8px_#6366f1] animate-pulse" />

        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg" />
      </div>

      {/* Cancel Button */}
      <div className="mb-10 w-full max-w-xs">
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-3 px-6 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-xl shadow-xl transition-all duration-150 flex items-center justify-center gap-2 text-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Cancelar Escaneo
        </button>
      </div>
    </div>
  );
};
