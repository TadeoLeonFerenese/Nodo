import React, { useState, useEffect } from 'react';
import { Product } from '../../../domain/entities/Product';
import { useProductStore } from '../../../application/stores/useProductStore';
import { useStockStore } from '../../../application/stores/useStockStore';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { GeminiReceiptParser } from '../../../infrastructure/ai/GeminiReceiptParser';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Badge } from '../../components/atoms/Badge';
import { ScannerOverlay } from '../../components/molecules/ScannerOverlay';
import { StockAdjustmentModal } from '../../components/molecules/StockAdjustmentModal';

export const HomePage: React.FC = () => {
  const { products, loadProducts, createProduct, deleteProduct, isLoading: loadingProducts } = useProductStore();
  const { movements, lowStockProducts, loadMovements, loadLowStockAlerts, recordMovement } = useStockStore();

  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'stock' | 'receipt'>('catalog');
  const [scannedCode, setScannedCode] = useState<string>('');

  // Modal de ajuste rápido de stock / unidades
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Modal de confirmación de eliminación (Baja ABM)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states for Product
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newStock, setNewStock] = useState('0');
  const [newMinStock, setNewMinStock] = useState('');

  // Form states for Stock Movement
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const [movementQty, setMovementQty] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Filtro de Histórico de Movimientos (ALL, IN, OUT)
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');

  // AI Receipt Parser state
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [parsedItems, setParsedItems] = useState<{ name: string; quantity: number; code?: string; unitPrice?: number }[]>([]);
  const [apiKey, setApiKey] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('nodo_ai_api_key') || '' : '';
  });
  const [activeModel, setActiveModel] = useState<string>('gemini-3.5-flash');
  const [receiptImageBase64, setReceiptImageBase64] = useState<string>('');
  const [receiptImagePreview, setReceiptImagePreview] = useState<string>('');
  const [isImportingReceipt, setIsImportingReceipt] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);

  // Paginación y visualización: 10 items por defecto + "Ver más" desplegable
  const [showAllMovements, setShowAllMovements] = useState(false);
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Escáner unificado (USB keyboard listener / Cámara nativa)
  const { isScanning, triggerCameraScan, stopScan } = useBarcodeScanner((barcode) => {
    setScannedCode(barcode);

    // Búsqueda inteligente: si el producto ya existe en inventario
    const existing = products.find((p) => p.code === barcode);
    if (existing) {
      setSelectedProductId(existing.id);
      setAdjustingProduct(existing);
      setIsAdjustModalOpen(true);
    } else {
      setNewCode(barcode);
      setActiveSubTab('catalog');
    }
  });

  useEffect(() => {
    loadProducts();
    loadMovements();
    loadLowStockAlerts();
  }, [loadProducts, loadMovements, loadLowStockAlerts]);

  // Mantener actualizado el producto que se está ajustando si los productos cambian
  useEffect(() => {
    if (adjustingProduct) {
      const refreshed = products.find((p) => p.id === adjustingProduct.id);
      if (refreshed) {
        setAdjustingProduct(refreshed);
      }
    }
  }, [products]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProduct({
        code: newCode,
        name: newName,
        price: parseFloat(newPrice) || 0,
        stock: parseInt(newStock) || 0,
        minStock: parseInt(newMinStock) || 0,
      });
      setNewCode('');
      setNewName('');
      setNewPrice('');
      setNewStock('0');
      setNewMinStock('');
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await recordMovement({
        productId: selectedProductId,
        type: movementType,
        quantity: parseInt(movementQty) || 0,
        reason: movementReason,
      });
      await loadProducts();
      setMovementQty('');
      setMovementReason('');
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleConfirmStockAdjustment = async (
    productId: string,
    type: 'IN' | 'OUT',
    quantity: number,
    reason: string
  ) => {
    await recordMovement({
      productId,
      type,
      quantity,
      reason,
    });
    await loadProducts();
  };

  const handleQuickUnitChange = async (e: React.MouseEvent, product: Product, delta: 1 | -1) => {
    e.stopPropagation();
    if (delta === -1 && product.stock <= 0) {
      alert('El producto no tiene unidades disponibles para descontar.');
      return;
    }
    try {
      await recordMovement({
        productId: product.id,
        type: delta === 1 ? 'IN' : 'OUT',
        quantity: 1,
        reason: delta === 1 ? 'Ajuste rápido (+1 u.)' : 'Ajuste rápido (-1 u.)',
      });
      await loadProducts();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      await deleteProduct(deletingProduct.id);
      setDeletingProduct(null);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nodo_ai_api_key', val);
    }
    if (val.trim()) {
      const parser = new GeminiReceiptParser();
      parser
        .discoverModel(val.trim())
        .then((m) => setActiveModel(m))
        .catch(() => {});
    }
  };

  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setReceiptImagePreview(result);
      setReceiptImageBase64(result);
      setParsedItems([]);
      setImportSuccessMsg(null);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessReceipt = async () => {
    setIsParsingReceipt(true);
    setImportSuccessMsg(null);
    try {
      const parser = new GeminiReceiptParser();
      const items = await parser.parseReceiptImage(receiptImageBase64, apiKey || undefined);
      setParsedItems(items);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsParsingReceipt(false);
    }
  };

  const handleImportToInventory = async () => {
    if (parsedItems.length === 0) return;
    setIsImportingReceipt(true);
    try {
      let importedCount = 0;
      for (const item of parsedItems) {
        if (!item.name || item.quantity <= 0) continue;
        const existing = products.find(
          (p) => (item.code && p.code === item.code) || p.name.toLowerCase() === item.name.toLowerCase()
        );

        if (existing) {
          await recordMovement({
            productId: existing.id,
            type: 'IN',
            quantity: item.quantity,
            reason: 'Remito IA (Ingreso de stock)',
          });
        } else {
          const generatedCode = item.code || `REM-${Math.floor(100000 + Math.random() * 900000)}`;
          const newProd = await createProduct({
            code: generatedCode,
            name: item.name,
            price: item.unitPrice || 0,
            stock: item.quantity,
            minStock: 2,
          });
          await recordMovement({
            productId: newProd.id,
            type: 'IN',
            quantity: item.quantity,
            reason: 'Alta catálogo desde Remito IA',
          });
        }
        importedCount++;
      }

      await loadProducts();
      await loadMovements();
      await loadLowStockAlerts();
      setImportSuccessMsg(`¡Se importaron con éxito ${importedCount} items al inventario y catálogo!`);
      setParsedItems([]);
      setReceiptImagePreview('');
      setReceiptImageBase64('');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsImportingReceipt(false);
    }
  };

  const scannedProduct = products.find((p) => p.code === scannedCode);

  // Mapeo rápido para vincular nombres y códigos a las transacciones
  const productMap = React.useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  // Filtrado y conteo de movimientos (Entradas vs Salidas)
  const inCount = movements.filter((m) => m.type === 'IN').length;
  const outCount = movements.filter((m) => m.type === 'OUT').length;

  const filteredMovements = movements.filter((m) => {
    if (historyFilter === 'ALL') return true;
    return m.type === historyFilter;
  });

  const mobileMovementLimit = 3;
  const desktopMovementLimit = 10;

  const displayedMobileMovements = showAllMovements ? filteredMovements : filteredMovements.slice(0, mobileMovementLimit);
  const hasMoreMobileMovements = filteredMovements.length > mobileMovementLimit;

  const displayedDesktopMovements = showAllMovements ? filteredMovements : filteredMovements.slice(0, desktopMovementLimit);
  const hasMoreDesktopMovements = filteredMovements.length > desktopMovementLimit;

  const mobileProductLimit = 3;
  const desktopProductLimit = 10;

  const displayedMobileProducts = showAllProducts ? products : products.slice(0, mobileProductLimit);
  const hasMoreMobileProducts = products.length > mobileProductLimit;

  const displayedDesktopProducts = showAllProducts ? products : products.slice(0, desktopProductLimit);
  const hasMoreDesktopProducts = products.length > desktopProductLimit;

  return (
    <>
      {isScanning && <ScannerOverlay onCancel={stopScan} />}

      {/* Modal interactivo de ajuste rápido de stock y unidades al escanear */}
      <StockAdjustmentModal
        product={adjustingProduct}
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onConfirm={handleConfirmStockAdjustment}
      />

      {/* Modal de confirmación de eliminación (Baja ABM) */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4 text-center my-auto">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">¿Eliminar Producto?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                ¿Estás seguro de que deseas dar de baja <strong className="text-slate-800">{deletingProduct.name}</strong> ({deletingProduct.code})? Esta acción se registrará en la base local y se replicará en la sincronización.
              </p>
            </div>
            <div className="flex gap-2 justify-center mt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDeletingProduct(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 text-xs font-semibold"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className={`flex flex-col gap-3 sm:gap-6 ${isScanning ? 'scanner-hide-during-scan' : ''}`}>
        {/* Alertas de Stock Mínimo */}
        {lowStockProducts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 flex flex-col gap-2 shadow-xs">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-xs sm:text-sm">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Alertas de Stock Mínimo ({lowStockProducts.length})
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {lowStockProducts.map((p) => (
                <Badge key={p.id} variant="warning">
                  {p.name} (Stock: {p.stock} / Min: {p.minStock})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Escáner & Sub-Tabs (Línea única simétrica en Mobile) */}
        <div className="bg-white border border-slate-200 rounded-xl p-2 sm:p-4 flex items-center justify-between gap-1.5 sm:gap-4 shadow-xs">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant={activeSubTab === 'catalog' ? 'primary' : 'ghost'}
              onClick={() => setActiveSubTab('catalog')}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs"
            >
              Catálogo
            </Button>
            <Button
              variant={activeSubTab === 'stock' ? 'primary' : 'ghost'}
              onClick={() => setActiveSubTab('stock')}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs"
            >
              Movimientos
            </Button>
            <Button
              variant={activeSubTab === 'receipt' ? 'primary' : 'ghost'}
              onClick={() => setActiveSubTab('receipt')}
              className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs"
            >
              Remito
            </Button>
          </div>

          <Button
            variant="secondary"
            onClick={() => triggerCameraScan()}
            className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs shrink-0"
            title="Escanear Código"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7V4h3M17 4h3v3M4 17v3h3M20 17v3h-3M8 8v8M11 8v8M13 8v8M16 8v8" />
            </svg>
            <span className="hidden xs:inline sm:inline">Escanear</span>
          </Button>
        </div>

        {/* Banner informativo de escáner */}
        {scannedCode && (
          <div className={`border rounded-xl p-3 sm:p-3.5 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-xs ${
            scannedProduct
              ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
              <span className="text-base shrink-0 mt-0.5 sm:mt-0">{scannedProduct ? '📦' : '⚠️'}</span>
              <div className="break-words leading-relaxed text-[11px] sm:text-xs">
                {scannedProduct ? (
                  <span>
                    Producto Escaneado: <strong>{scannedProduct.name}</strong> (Stock: <strong className="font-mono">{scannedProduct.stock} u.</strong>)
                  </span>
                ) : (
                  <span>
                    Código <strong className="font-mono">{scannedCode}</strong> no registrado. Completa los datos en el formulario para registrarlo con su stock inicial.
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {scannedProduct && (
                <button
                  type="button"
                  onClick={() => {
                    setAdjustingProduct(scannedProduct);
                    setIsAdjustModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-xs"
                >
                  Modificar Unidades
                </button>
              )}
              <button
                type="button"
                onClick={() => setScannedCode('')}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
                title="Cerrar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* TAB: CATÁLOGO DE PRODUCTOS */}
        {activeSubTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-12 gap-3 sm:gap-6 items-start">
            {/* Alta de Producto (Revelado Progresivo) */}
            <div className="lg:col-span-1 xl:col-span-4 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6 shadow-xs flex flex-col gap-2.5 sm:gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Nuevo Producto</h3>
                {newCode && (
                  <span className="text-[10px] bg-indigo-50 text-indigo-600 font-mono font-bold px-2 py-0.5 rounded">
                    Auto-completado
                  </span>
                )}
              </div>

              <form onSubmit={handleCreateProduct} className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <Input
                      placeholder="Código de Barras"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => triggerCameraScan()}
                    title="Escanear código de barras"
                    className="px-3.5 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7V4h3M17 4h3v3M4 17v3h3M20 17v3h-3M8 8v8M11 8v8M13 8v8M16 8v8" />
                    </svg>
                  </Button>
                </div>

                {newCode.trim().length > 0 ? (
                  <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Input
                      placeholder="Nombre del Producto"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      required
                    />

                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Precio ($)"
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      required
                    />

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Stock Inicial</label>
                        <Input
                          type="number"
                          placeholder="Unidades"
                          value={newStock}
                          onChange={(e) => setNewStock(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-500 block mb-1">Stock Mínimo</label>
                        <Input
                          type="number"
                          placeholder="Alerta Min"
                          value={newMinStock}
                          onChange={(e) => setNewMinStock(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <Button type="submit" disabled={loadingProducts} className="mt-1">
                      Crear Producto
                    </Button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed bg-slate-50 border border-slate-100 p-2.5 rounded-lg text-center mt-1">
                    💡 Ingresá o escaneá un código de barras para desplegar los datos del producto.
                  </p>
                )}
              </form>
            </div>

            {/* Listado de Productos (Mobile Cards + Desktop Table) */}
            <div className="lg:col-span-2 xl:col-span-8 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6 shadow-xs flex flex-col h-fit">
              <div className="flex items-center justify-between mb-2.5 sm:mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider md:hidden">
                  Catálogo ({products.length > mobileProductLimit && !showAllProducts ? `${mobileProductLimit} de ${products.length}` : products.length})
                </h3>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider hidden md:block">
                  Catálogo ({products.length > desktopProductLimit && !showAllProducts ? `${desktopProductLimit} de ${products.length}` : products.length})
                </h3>
                <span className="text-[11px] sm:text-xs text-slate-400 font-medium">Toca +/- para ajustar unidades</span>
              </div>

              {/* Vista Móvil: Cards apiladas y estilizadas (Límite inicial 3 items para encuadre sin scroll) */}
              <div className="md:hidden flex flex-col divide-y divide-slate-100">
                {displayedMobileProducts.map((p) => (
                  <div key={p.id} className="py-2.5 flex flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm leading-snug break-words">{p.name}</h4>
                        <span className="font-mono text-[11px] text-slate-400 mt-0.5 inline-block">Cód: {p.code}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono font-bold text-sm text-indigo-600">
                          ${p.price.toFixed(2)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(p)}
                          title="Eliminar producto"
                          className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                      <span className="text-slate-500 text-[11px]">
                        Mínimo: <strong className="text-slate-700 font-mono">{p.minStock} u.</strong>
                      </span>

                      {/* Controles directos de unidades móviles */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleQuickUnitChange(e, p, -1)}
                          disabled={p.stock <= 0}
                          title="Restar 1 unidad"
                          className="w-6.5 h-6.5 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingProduct(p);
                            setIsAdjustModalOpen(true);
                          }}
                          className="cursor-pointer"
                          title="Toca para modificar unidades"
                        >
                          <Badge variant={p.stock <= p.minStock ? 'warning' : 'success'}>
                            {p.stock} u.
                          </Badge>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleQuickUnitChange(e, p, 1)}
                          title="Sumar 1 unidad"
                          className="w-6.5 h-6.5 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">Sin productos registrados aún.</div>
                )}
              </div>

              {/* Botón desplegable Ver más productos (Mobile) */}
              {hasMoreMobileProducts && (
                <div className="md:hidden pt-2 mt-2 border-t border-slate-100 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllProducts((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 active:scale-95 rounded-xl border border-indigo-100/60 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>
                      {showAllProducts
                        ? 'Ver menos productos'
                        : `Ver más (${products.length - mobileProductLimit} productos restantes)`}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllProducts ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Vista Desktop / Tablet: Tabla espaciosa con ajuste de stock */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                      <th className="py-3.5 px-4">Código</th>
                      <th className="py-3.5 px-4">Nombre</th>
                      <th className="py-3.5 px-4">Precio</th>
                      <th className="py-3.5 px-4">Unidades / Stock</th>
                      <th className="py-3.5 px-4">Min</th>
                      <th className="py-3.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayedDesktopProducts.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-600">{p.code}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono">${p.price.toFixed(2)}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleQuickUnitChange(e, p, -1)}
                              disabled={p.stock <= 0}
                              title="Restar 1 unidad (-1)"
                              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                            >
                              -
                            </button>
                            <Badge variant={p.stock <= p.minStock ? 'warning' : 'success'}>
                              {p.stock} u.
                            </Badge>
                            <button
                              type="button"
                              onClick={(e) => handleQuickUnitChange(e, p, 1)}
                              title="Sumar 1 unidad (+1)"
                              className="w-6 h-6 rounded-md bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-600 font-bold text-xs flex items-center justify-center border border-slate-200 cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">{p.minStock} u.</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustingProduct(p);
                                setIsAdjustModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            >
                              Modificar Stock
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingProduct(p)}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">Sin productos registrados aún.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Botón desplegable Ver más productos (Desktop) */}
              {hasMoreDesktopProducts && (
                <div className="hidden md:flex pt-3.5 mt-2 border-t border-slate-100 justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllProducts((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 active:scale-95 rounded-xl border border-indigo-100/60 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>
                      {showAllProducts
                        ? 'Ver menos productos (mostrar 10)'
                        : `Ver más (${products.length - desktopProductLimit} productos restantes)`}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${showAllProducts ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CONTROL TRANSACCIONAL DE STOCK */}
        {activeSubTab === 'stock' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-12 gap-3 sm:gap-6 items-start">
            <div className="lg:col-span-1 xl:col-span-4 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6 shadow-xs flex flex-col gap-2.5 sm:gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Registrar Movimiento Manual</h3>
                <p className="text-xs text-slate-500 mt-0.5">Ingreso o egreso manual de mercadería</p>
              </div>
              <form onSubmit={handleRecordMovement} className="flex flex-col gap-2.5 sm:gap-3">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1 min-w-0">
                    <select
                      className="w-full appearance-none pl-3.5 pr-9 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 focus:outline-none cursor-pointer truncate"
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      required
                    >
                      <option value="">Seleccionar Producto...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock} | Cód: {p.code})
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => triggerCameraScan()}
                    title="Escanear producto a mover"
                    className="px-3.5 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7V4h3M17 4h3v3M4 17v3h3M20 17v3h-3M8 8v8M11 8v8M13 8v8M16 8v8" />
                    </svg>
                  </Button>
                </div>

                <div className="flex flex-col gap-1 sm:gap-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Tipo de operación a registrar
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={movementType === 'IN' ? 'success' : 'secondary'}
                      className="flex-1"
                      onClick={() => {
                        setMovementType('IN');
                        setHistoryFilter('IN');
                      }}
                    >
                      Entrada (IN)
                    </Button>
                    <Button
                      type="button"
                      variant={movementType === 'OUT' ? 'danger' : 'secondary'}
                      className="flex-1"
                      onClick={() => {
                        setMovementType('OUT');
                        setHistoryFilter('OUT');
                      }}
                    >
                      Salida (OUT)
                    </Button>
                  </div>
                </div>

                <Input
                  type="number"
                  placeholder="Cantidad"
                  value={movementQty}
                  onChange={(e) => setMovementQty(e.target.value)}
                  required
                />
                <Input
                  placeholder="Motivo (ej. Compra remito #104)"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  required
                />
                <Button type="submit">Registrar Movimiento</Button>
              </form>
            </div>

            <div className="lg:col-span-2 xl:col-span-8 bg-white border border-slate-200 rounded-xl p-3.5 sm:p-6 shadow-xs flex flex-col h-fit">
              {/* Cabecera del Histórico con Panel de Informe en 1 sola fila simétrica */}
              <div className="flex flex-col gap-2.5 sm:gap-3 mb-2.5 sm:mb-4 border-b border-slate-100 pb-2.5 sm:pb-3.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider md:hidden">
                    Histórico ({filteredMovements.length > mobileMovementLimit && !showAllMovements ? `${mobileMovementLimit} de ${filteredMovements.length}` : filteredMovements.length})
                  </h3>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider hidden md:block">
                    Histórico ({filteredMovements.length > desktopMovementLimit && !showAllMovements ? `${desktopMovementLimit} de ${filteredMovements.length}` : filteredMovements.length})
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {historyFilter === 'ALL' ? 'Todos los registros' : historyFilter === 'IN' ? 'Filtrado: Entradas' : 'Filtrado: Salidas'}
                  </span>
                </div>

                {/* Panel de Informe (3 columnas simétricas en una sola línea) */}
                <div className="grid grid-cols-3 gap-1.5 sm:gap-2 p-1 sm:p-1.5 bg-slate-50 border border-slate-200/80 rounded-xl w-full">
                  <button
                    type="button"
                    onClick={() => setHistoryFilter('ALL')}
                    className={`py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-lg text-center transition-all cursor-pointer ${
                      historyFilter === 'ALL'
                        ? 'bg-white shadow-2xs font-bold text-slate-900 border border-slate-200'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    title="Ver todos los movimientos"
                  >
                    <span className="block text-[9px] sm:text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
                    <span className="block text-xs sm:text-base font-bold font-mono text-slate-900 leading-tight">
                      {movements.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHistoryFilter('IN');
                      setMovementType('IN');
                    }}
                    className={`py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-lg text-center transition-all cursor-pointer ${
                      historyFilter === 'IN'
                        ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-300 shadow-2xs'
                        : 'text-emerald-600 hover:bg-emerald-50/50'
                    }`}
                    title="Filtrar por Entradas"
                  >
                    <span className="block text-[9px] sm:text-[10px] uppercase font-bold text-emerald-600 tracking-wider">↓ Entradas</span>
                    <span className="block text-xs sm:text-base font-bold font-mono text-emerald-700 leading-tight">
                      {inCount}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setHistoryFilter('OUT');
                      setMovementType('OUT');
                    }}
                    className={`py-1 sm:py-1.5 px-1.5 sm:px-2 rounded-lg text-center transition-all cursor-pointer ${
                      historyFilter === 'OUT'
                        ? 'bg-rose-50 text-rose-800 font-bold border border-rose-300 shadow-2xs'
                        : 'text-rose-600 hover:bg-rose-50/50'
                    }`}
                    title="Filtrar por Salidas"
                  >
                    <span className="block text-[9px] sm:text-[10px] uppercase font-bold text-rose-600 tracking-wider">↑ Salidas</span>
                    <span className="block text-xs sm:text-base font-bold font-mono text-rose-700 leading-tight">
                      {outCount}
                    </span>
                  </button>
                </div>
              </div>

              {/* Vista Móvil: Cards apiladas con detalle del producto */}
              <div className="md:hidden flex flex-col divide-y divide-slate-100">
                {displayedMobileMovements.map((m) => {
                  const product = productMap.get(m.productId);
                  const productName = m.productName || product?.name || 'Producto no identificado';
                  const productCode = m.productCode || product?.code || 'S/C';
                  const isEntry = m.type === 'IN';

                  return (
                    <div key={m.id} className="py-2.5 flex flex-col gap-1.5 transition-colors hover:bg-slate-50/70 rounded-lg px-2 -mx-2">
                      {/* Fila 1: Producto y Unidades */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug break-words">
                            {productName}
                          </h4>
                          <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                            Cód: {productCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={isEntry ? 'success' : 'danger'}>
                            {isEntry ? '↓ Entrada' : '↑ Salida'}
                          </Badge>
                          <span
                            className={`font-mono font-bold text-xs sm:text-sm ${
                              isEntry ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isEntry ? `+${m.quantity}` : `-${m.quantity}`} u.
                          </span>
                        </div>
                      </div>

                      {/* Fila 2: Motivo y Fecha */}
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-50 text-slate-500">
                        <span className="truncate max-w-[200px]" title={m.reason}>
                          {m.reason || (isEntry ? 'Ingreso registrado' : 'Egreso registrado')}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 shrink-0">
                          {new Date(m.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}{' '}
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {filteredMovements.length === 0 && (
                  <div className="py-6 text-center text-slate-400 text-xs font-medium">
                    {historyFilter === 'IN' && 'No hay movimientos de entrada registrados.'}
                    {historyFilter === 'OUT' && 'No hay movimientos de salida registrados.'}
                    {historyFilter === 'ALL' && 'Sin movimientos registrados aún.'}
                  </div>
                )}
              </div>

              {/* Botón desplegable Ver más movimientos (Mobile) */}
              {hasMoreMobileMovements && (
                <div className="pt-2.5 mt-1 border-t border-slate-100 flex justify-center md:hidden">
                  <button
                    type="button"
                    onClick={() => setShowAllMovements((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 active:scale-95 rounded-xl border border-indigo-100/60 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>
                      {showAllMovements
                        ? `Ver menos movimientos (mostrar ${mobileMovementLimit})`
                        : `Ver más (${filteredMovements.length - mobileMovementLimit} movimientos restantes)`}
                    </span>
                    <svg
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${showAllMovements ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Vista Desktop / Tablet: Tabla detallada */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                      <th className="py-3.5 px-4">Tipo</th>
                      <th className="py-3.5 px-4">Producto</th>
                      <th className="py-3.5 px-4">Cantidad</th>
                      <th className="py-3.5 px-4">Motivo</th>
                      <th className="py-3.5 px-4">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {displayedDesktopMovements.map((m) => {
                      const product = productMap.get(m.productId);
                      const productName = m.productName || product?.name || 'Producto';
                      const productCode = m.productCode || product?.code || 'S/C';
                      const isEntry = m.type === 'IN';

                      return (
                        <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-4">
                            <Badge variant={isEntry ? 'success' : 'danger'}>
                              {isEntry ? '↓ Entrada' : '↑ Salida'}
                            </Badge>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{productName}</span>
                              <span className="font-mono text-[11px] text-slate-400">Cód: {productCode}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-bold font-mono text-sm">
                            <span className={isEntry ? 'text-emerald-600' : 'text-rose-600'}>
                              {isEntry ? `+${m.quantity}` : `-${m.quantity}`} u.
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{m.reason}</td>
                          <td className="py-3.5 px-4 text-slate-400 font-mono">
                            {new Date(m.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}{' '}
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredMovements.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                          {historyFilter === 'IN' && 'No hay movimientos de entrada registrados.'}
                          {historyFilter === 'OUT' && 'No hay movimientos de salida registrados.'}
                          {historyFilter === 'ALL' && 'Sin movimientos registrados aún.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Botón desplegable Ver más movimientos */}
              {hasMoreDesktopMovements && (
                <div className="pt-3.5 mt-2 border-t border-slate-100 hidden md:flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllMovements((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 active:scale-95 rounded-xl border border-indigo-100/60 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>
                      {showAllMovements
                        ? `Ver menos movimientos (mostrar ${desktopMovementLimit})`
                        : `Ver más (${filteredMovements.length - desktopMovementLimit} movimientos restantes)`}
                    </span>
                    <svg
                      className={`w-4 h-4 transition-transform duration-200 ${showAllMovements ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: REMITO IA */}
        {activeSubTab === 'receipt' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col gap-6 max-w-3xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Procesamiento Inteligente de Remitos
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Subí o tomá una foto del remito para extraer automáticamente productos, cantidades y precios.
                </p>
              </div>
              <div className="flex items-center gap-1.5 self-start sm:self-center">
                <span className="text-[11px] text-slate-400 font-medium">Motor:</span>
                <Badge variant="info">
                  {activeModel}
                </Badge>
              </div>
            </div>

            {/* Configuración de API Key (Opcional / LocalStorage) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between text-xs">
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  API Key (Google Gemini / OpenAI)
                </label>
                <input
                  type="password"
                  placeholder="Pegá tu API Key (opcional: sin key simula la lectura)"
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  className="w-full min-w-0 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              {apiKey && (
                <button
                  type="button"
                  onClick={() => handleApiKeyChange('')}
                  className="text-xs text-slate-400 hover:text-rose-600 underline self-end sm:self-center cursor-pointer"
                >
                  Limpiar Key
                </button>
              )}
            </div>

            {/* Input de Cámara / Subida de Archivo */}
            <div className="flex flex-col gap-3">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                Foto del Remito
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold border border-indigo-200 transition-colors shadow-2xs">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                  <span>Tomar Foto / Subir Imagen</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleReceiptFileChange}
                    className="hidden"
                  />
                </label>
                {receiptImagePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setReceiptImagePreview('');
                      setReceiptImageBase64('');
                      setParsedItems([]);
                    }}
                    className="text-xs text-rose-600 hover:underline cursor-pointer"
                  >
                    Quitar foto
                  </button>
                )}
              </div>

              {/* Preview de la Imagen cargada */}
              {receiptImagePreview && (
                <div className="relative mt-2 max-h-60 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                  <img
                    src={receiptImagePreview}
                    alt="Preview del Remito"
                    className="max-h-60 object-contain"
                  />
                </div>
              )}
            </div>

            {/* Botón de Procesamiento */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="primary"
                onClick={handleProcessReceipt}
                disabled={isParsingReceipt}
                className="flex-1"
              >
                {isParsingReceipt ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    <span>Analizando Remito con IA...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    <span>{receiptImageBase64 ? 'Procesar Foto del Remito' : 'Simular Lectura de Remito'}</span>
                  </>
                )}
              </Button>
            </div>

            {/* Mensaje de éxito de importación */}
            {importSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 font-medium">
                <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {/* Tabla de Items Extraídos */}
            {parsedItems.length > 0 && (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs flex flex-col">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Items Detectados ({parsedItems.length})
                  </h4>
                  <span className="text-[11px] text-slate-400">Podés editar antes de cargar</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold bg-white">
                        <th className="py-2.5 px-4">Producto</th>
                        <th className="py-2.5 px-4">Cantidad</th>
                        <th className="py-2.5 px-4">Precio Unit.</th>
                        <th className="py-2.5 px-4">Cód. Asignado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-4">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => {
                                const copy = [...parsedItems];
                                copy[idx].name = e.target.value;
                                setParsedItems(copy);
                              }}
                              className="w-full bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none text-slate-900 font-medium py-1"
                            />
                          </td>
                          <td className="py-2 px-4 w-28">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const copy = [...parsedItems];
                                copy[idx].quantity = parseInt(e.target.value) || 0;
                                setParsedItems(copy);
                              }}
                              className="w-20 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none text-slate-900 font-mono font-bold py-1"
                            />
                          </td>
                          <td className="py-2 px-4 w-32">
                            <div className="flex items-center text-slate-500 font-mono">
                              <span>$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPrice ?? ''}
                                placeholder="0.00"
                                onChange={(e) => {
                                  const copy = [...parsedItems];
                                  copy[idx].unitPrice = parseFloat(e.target.value) || 0;
                                  setParsedItems(copy);
                                }}
                                className="w-24 bg-transparent border-b border-dashed border-slate-300 focus:border-indigo-500 focus:outline-none text-slate-900 font-mono py-1 ml-1"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-4 text-slate-400 font-mono text-[11px]">
                            {item.code || 'Auto-generado'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={handleImportToInventory}
                    disabled={isImportingReceipt}
                    className="w-full sm:w-auto"
                  >
                    {isImportingReceipt ? 'Ingresando items...' : 'Cargar Items al Inventario'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
