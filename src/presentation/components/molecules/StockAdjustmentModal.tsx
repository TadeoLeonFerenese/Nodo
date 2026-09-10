import React, { useState, useEffect } from 'react';
import { Product } from '../../../domain/entities/Product';
import { Button } from '../atoms/Button';
import { Badge } from '../atoms/Badge';

interface StockAdjustmentModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (productId: string, type: 'IN' | 'OUT', quantity: number, reason: string) => Promise<void>;
}

export const StockAdjustmentModal: React.FC<StockAdjustmentModalProps> = ({
  product,
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('Ajuste por escaneo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setType('IN');
      setReason('Ajuste por escaneo');
      setErrorMsg(null);
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const currentStock = product.stock;
  const nextStock = type === 'IN' ? currentStock + quantity : currentStock - quantity;
  const isNegativeStock = type === 'OUT' && nextStock < 0;

  const handleQuickAdd = (amount: number) => {
    setQuantity((prev) => Math.max(1, prev + amount));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setErrorMsg('La cantidad debe ser mayor a 0');
      return;
    }
    if (isNegativeStock) {
      setErrorMsg(`Stock insuficiente. Stock actual: ${currentStock} u.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirm(product.id, type, quantity, reason || (type === 'IN' ? 'Entrada rápida' : 'Salida rápida'));
      onClose();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-xl flex flex-col gap-5 text-left">
        {/* Encabezado del Producto */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
              Cód: {product.code}
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1 truncate">{product.name}</h3>
            <span className="text-xs text-slate-500 font-mono">Precio: ${product.price.toFixed(2)}</span>
          </div>
          <div className="flex flex-col items-end shrink-0">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Stock Actual</span>
            <Badge variant={product.stock <= product.minStock ? 'warning' : 'success'}>
              {product.stock} u.
            </Badge>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl p-3 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Tipo de Operación: Entrada / Salida */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tipo de Movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('IN')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border ${
                  type === 'IN'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                Entrada (Ingreso)
              </button>

              <button
                type="button"
                onClick={() => setType('OUT')}
                className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all border ${
                  type === 'OUT'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
                </svg>
                Salida (Egreso)
              </button>
            </div>
          </div>

          {/* Cantidad / Selector de Unidades */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Unidades a {type === 'IN' ? 'Ingresar' : 'Egresar'}
            </label>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xl flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 h-12 text-center text-2xl font-bold font-mono text-slate-900 border border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="w-12 h-12 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold text-xl flex items-center justify-center active:scale-95 transition-all cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Accesos rápidos de incremento */}
            <div className="flex items-center gap-1.5 justify-center mt-1">
              {[1, 5, 10, 25, 50].map((inc) => (
                <button
                  key={inc}
                  type="button"
                  onClick={() => handleQuickAdd(inc)}
                  className="px-2.5 py-1 text-xs font-bold font-mono bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  +{inc}
                </button>
              ))}
            </div>
          </div>

          {/* Vista previa de Stock Resultante */}
          <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            isNegativeStock
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <span>Stock resultante:</span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className="line-through text-slate-400">{currentStock} u.</span>
              <span>➔</span>
              <strong className={`text-sm ${isNegativeStock ? 'text-rose-600' : 'text-indigo-600'}`}>
                {nextStock} u.
              </strong>
            </div>
          </div>

          {/* Motivo Opcional */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-slate-500">Motivo / Detalle</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Ingreso por escaneo, venta, recuento..."
              className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:border-indigo-600 focus:outline-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1" disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant={type === 'IN' ? 'primary' : 'danger'}
              className="flex-1"
              disabled={isSubmitting || isNegativeStock || quantity <= 0}
            >
              {isSubmitting ? 'Guardando...' : `Confirmar ${type === 'IN' ? 'Entrada' : 'Salida'}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
