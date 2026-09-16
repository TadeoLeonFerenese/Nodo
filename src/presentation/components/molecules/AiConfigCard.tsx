import React, { useState } from 'react';
import { useAiStore } from '../../../application/stores/useAiStore';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';

export const AiConfigCard: React.FC = () => {
  const {
    apiKey,
    activeModel,
    isValidating,
    validationStatus,
    validationMessage,
    setApiKey,
    clearApiKey,
    validateConnection,
  } = useAiStore();

  const [inputKey, setInputKey] = useState(apiKey);
  const [showPassword, setShowPassword] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(false);
    await setApiKey(inputKey);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleClear = () => {
    clearApiKey();
    setInputKey('');
    setSavedSuccess(false);
  };

  const handleTest = async () => {
    setSavedSuccess(false);
    await validateConnection(inputKey);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Motor de IA (Google Gemini)</h3>
            <p className="text-xs text-slate-500">Extracción inteligente de items en fotos de remitos</p>
          </div>
        </div>
      </div>

      {/* Estado del Motor */}
      <div className="flex flex-col gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div className="flex justify-between items-center">
          <span className="text-slate-500 font-semibold">Estado de la Conexión:</span>
          {apiKey ? (
            validationStatus === 'invalid' ? (
              <Badge variant="danger">Error de Validación</Badge>
            ) : (
              <Badge variant="success">Clave Configurada</Badge>
            )
          ) : (
            <Badge variant="warning">Sin Configurar</Badge>
          )}
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500 font-semibold">Modelo Activo:</span>
          <span className="font-mono font-bold text-slate-700">{activeModel}</span>
        </div>
      </div>

      {/* Formulario de API Key */}
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase">
              API Key de Gemini
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline transition-colors"
            >
              <span>Obtener clave gratis</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          <div className="relative flex items-center">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="AIzaSy..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full pl-3 pr-20 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mensaje de feedback / validación */}
        {validationMessage && (
          <div
            className={`p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
              validationStatus === 'valid'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {validationStatus === 'valid' ? (
              <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span>{validationMessage}</span>
          </div>
        )}

        {savedSuccess && !validationMessage && (
          <div className="p-2.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-medium flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <span>Clave guardada correctamente.</span>
          </div>
        )}

        {/* Botones de Acción */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="submit"
            variant="primary"
            disabled={isValidating || !inputKey.trim()}
            className="flex-1 py-2 text-xs"
          >
            {isValidating ? 'Verificando...' : 'Guardar Clave'}
          </Button>

          {inputKey.trim() && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleTest}
              disabled={isValidating}
              className="py-2 text-xs"
            >
              Probar
            </Button>
          )}

          {apiKey && (
            <Button
              type="button"
              variant="danger"
              onClick={handleClear}
              disabled={isValidating}
              className="py-2 text-xs"
            >
              Limpiar
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};
