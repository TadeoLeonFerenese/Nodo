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
  const { products, loadProducts, createProduct, isLoading: loadingProducts } = useProductStore();
  const { movements, lowStockProducts, loadMovements, loadLowStockAlerts, recordMovement } = useStockStore();

  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'stock' | 'receipt'>('catalog');
  const [scannedCode, setScannedCode] = useState<string>('');

  // Modal de ajuste rápido de stock / unidades
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

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

  // AI Receipt Parser state
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [parsedItems, setParsedItems] = useState<{ name: string; quantity: number; code?: string }[]>([]);

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

  const handleProcessReceiptMock = async () => {
    setIsParsingReceipt(true);
    try {
      const parser = new GeminiReceiptParser();
      const items = await parser.parseReceiptImage('sample_base64_receipt');
      setParsedItems(items);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsParsingReceipt(false);
    }
  };

  const scannedProduct = products.find((p) => p.code === scannedCode);

  // Mapeo rápido para vincular nombres y códigos a las transacciones
  const productMap = React.useMemo(() => {
    return new Map(products.map((p) => [p.id, p]));
  }, [products]);

  // Lista acotada a 10 items iniciales con opción de desplegar más
  const displayedMovements = showAllMovements ? movements : movements.slice(0, 10);
  const hasMoreMovements = movements.length > 10;

  const displayedProducts = showAllProducts ? products : products.slice(0, 10);
  const hasMoreProducts = products.length > 10;

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

      <div className={`flex flex-col gap-6 ${isScanning ? 'scanner-hide-during-scan' : ''}`}>
        {/* Alertas de Stock Mínimo */}
        {lowStockProducts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col gap-2 shadow-xs">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Alertas de Stock Mínimo ({lowStockProducts.length})
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockProducts.map((p) => (
                <Badge key={p.id} variant="warning">
                  {p.name} (Stock: {p.stock} / Min: {p.minStock})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Escáner & Sub-Tabs */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant={activeSubTab === 'catalog' ? 'primary' : 'ghost'} onClick={() => setActiveSubTab('catalog')}>
              Catálogo
            </Button>
            <Button variant={activeSubTab === 'stock' ? 'primary' : 'ghost'} onClick={() => setActiveSubTab('stock')}>
              Movimientos
            </Button>
            <Button variant={activeSubTab === 'receipt' ? 'primary' : 'ghost'} onClick={() => setActiveSubTab('receipt')}>
              Remito
            </Button>
          </div>

          <Button variant="secondary" onClick={() => triggerCameraScan()}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            Escanear Código
          </Button>
        </div>

        {/* Banner informativo de escáner */}
        {scannedCode && (
          <div className={`border rounded-xl p-3.5 text-xs font-semibold flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
            scannedProduct
              ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
              <span className="text-base shrink-0 mt-0.5 sm:mt-0">{scannedProduct ? '📦' : '⚠️'}</span>
              <div className="break-words leading-relaxed">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-12 gap-6 items-start">
            {/* Alta de Producto */}
            <div className="lg:col-span-1 xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
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
                  <div className="flex-1">
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
                    title="Escanear con cámara"
                    className="px-3.5 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                  </Button>
                </div>

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
              </form>
            </div>

            {/* Listado de Productos (Mobile Cards + Desktop Table) */}
            <div className="lg:col-span-2 xl:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col min-h-[420px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Catálogo ({products.length > 10 && !showAllProducts ? `10 de ${products.length}` : products.length})
                </h3>
                <span className="text-xs text-slate-400 font-medium">Toca +/- para ajustar unidades</span>
              </div>

              {/* Vista Móvil: Cards apiladas y estilizadas */}
              <div className="md:hidden flex flex-col divide-y divide-slate-100">
                {displayedProducts.map((p) => (
                  <div key={p.id} className="py-3.5 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 text-sm leading-snug break-words">{p.name}</h4>
                        <span className="font-mono text-xs text-slate-400 mt-0.5 inline-block">Cód: {p.code}</span>
                      </div>
                      <span className="font-mono font-bold text-sm text-indigo-600 shrink-0">
                        ${p.price.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-50">
                      <span className="text-slate-500">
                        Mínimo: <strong className="text-slate-700 font-mono">{p.minStock} u.</strong>
                      </span>

                      {/* Controles directos de unidades móviles */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleQuickUnitChange(e, p, -1)}
                          disabled={p.stock <= 0}
                          title="Restar 1 unidad"
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-700 font-bold text-sm flex items-center justify-center border border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
                          className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-700 font-bold text-sm flex items-center justify-center border border-slate-200 cursor-pointer"
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
                    {displayedProducts.map((p) => (
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

              {/* Botón desplegable Ver más productos */}
              {hasMoreProducts && (
                <div className="pt-3.5 mt-2 border-t border-slate-100 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllProducts((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 active:scale-95 rounded-xl border border-indigo-100/60 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>
                      {showAllProducts
                        ? 'Ver menos productos (mostrar 10)'
                        : `Ver más (${products.length - 10} productos restantes)`}
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
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-1 xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Movimiento de Stock</h3>
              <form onSubmit={handleRecordMovement} className="flex flex-col gap-3">
                <div className="flex gap-2 items-center">
                  <select
                    className="flex-1 px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:outline-none"
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
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => triggerCameraScan()}
                    title="Escanear producto a mover"
                    className="px-3.5 shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    </svg>
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={movementType === 'IN' ? 'primary' : 'secondary'}
                    className="flex-1"
                    onClick={() => setMovementType('IN')}
                  >
                    Entrada (IN)
                  </Button>
                  <Button
                    type="button"
                    variant={movementType === 'OUT' ? 'danger' : 'secondary'}
                    className="flex-1"
                    onClick={() => setMovementType('OUT')}
                  >
                    Salida (OUT)
                  </Button>
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

            <div className="lg:col-span-2 xl:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col min-h-[420px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Histórico ({movements.length > 10 && !showAllMovements ? `10 de ${movements.length}` : movements.length})
                </h3>
                <span className="text-xs text-slate-400 font-medium md:hidden">Entradas y Salidas</span>
              </div>

              {/* Vista Móvil: Cards apiladas con detalle del producto */}
              <div className="md:hidden flex flex-col divide-y divide-slate-100">
                {displayedMovements.map((m) => {
                  const product = productMap.get(m.productId);
                  const productName = m.productName || product?.name || 'Producto no identificado';
                  const productCode = m.productCode || product?.code || 'S/C';
                  const isEntry = m.type === 'IN';

                  return (
                    <div key={m.id} className="py-3.5 flex flex-col gap-2 transition-colors hover:bg-slate-50/70 rounded-lg px-2 -mx-2">
                      {/* Fila 1: Producto y Unidades */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 text-sm leading-snug break-words">
                            {productName}
                          </h4>
                          <span className="font-mono text-[11px] text-slate-400 block mt-0.5">
                            Cód: {productCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={isEntry ? 'success' : 'danger'}>
                            {isEntry ? '↓ Entrada' : '↑ Salida'}
                          </Badge>
                          <span
                            className={`font-mono font-bold text-sm ${
                              isEntry ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {isEntry ? `+${m.quantity}` : `-${m.quantity}`} u.
                          </span>
                        </div>
                      </div>

                      {/* Fila 2: Motivo y Fecha */}
                      <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-50 text-slate-500">
                        <span className="truncate max-w-[210px]" title={m.reason}>
                          {m.reason || (isEntry ? 'Ingreso registrado' : 'Egreso registrado')}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          {new Date(m.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' })}{' '}
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {movements.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">Sin movimientos registrados aún.</div>
                )}
              </div>

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
                    {displayedMovements.map((m) => {
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
                    {movements.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">Sin movimientos registrados aún.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Botón desplegable Ver más movimientos */}
              {hasMoreMovements && (
                <div className="pt-3.5 mt-2 border-t border-slate-100 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllMovements((prev) => !prev)}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 active:scale-95 rounded-xl border border-indigo-100/60 transition-all cursor-pointer shadow-2xs"
                  >
                    <span>
                      {showAllMovements
                        ? 'Ver menos movimientos (mostrar 10)'
                        : `Ver más (${movements.length - 10} movimientos restantes)`}
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
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col gap-4 max-w-2xl mx-auto w-full">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Procesamiento Inteligente de Remitos (IA)</h3>
            <p className="text-xs text-slate-500">
              Sube o toma una foto del remito para extraer automáticamente la lista de productos y cantidades estructurados.
            </p>

            <Button variant="primary" onClick={handleProcessReceiptMock} disabled={isParsingReceipt}>
              {isParsingReceipt ? 'Procesando con IA...' : 'Simular Lectura de Remito con IA'}
            </Button>

            {parsedItems.length > 0 && (
              <div className="mt-4 border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase">Items Extraídos ({parsedItems.length})</h4>
                <ul className="divide-y divide-slate-100 text-xs">
                  {parsedItems.map((item, idx) => (
                    <li key={idx} className="py-2 flex justify-between items-center">
                      <span className="font-semibold text-slate-900">{item.name}</span>
                      <Badge variant="info">{item.quantity} u.</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
