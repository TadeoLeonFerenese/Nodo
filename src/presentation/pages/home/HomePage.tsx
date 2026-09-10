import React, { useState, useEffect } from 'react';
import { useProductStore } from '../../../application/stores/useProductStore';
import { useStockStore } from '../../../application/stores/useStockStore';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';
import { GeminiReceiptParser } from '../../../infrastructure/ai/GeminiReceiptParser';
import { Button } from '../../components/atoms/Button';
import { Input } from '../../components/atoms/Input';
import { Badge } from '../../components/atoms/Badge';
import { ScannerOverlay } from '../../components/molecules/ScannerOverlay';

export const HomePage: React.FC = () => {
  const { products, loadProducts, createProduct, isLoading: loadingProducts } = useProductStore();
  const { movements, lowStockProducts, loadMovements, loadLowStockAlerts, recordMovement } = useStockStore();

  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'stock' | 'receipt'>('catalog');
  const [scannedCode, setScannedCode] = useState<string>('');

  // Form states for Product
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newMinStock, setNewMinStock] = useState('');

  // Form states for Stock Movement
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementType, setMovementType] = useState<'IN' | 'OUT'>('IN');
  const [movementQty, setMovementQty] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // AI Receipt Parser state
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [parsedItems, setParsedItems] = useState<{ name: string; quantity: number; code?: string }[]>([]);

  // Escáner unificado (USB keyboard listener / Cámara nativa)
  const { isScanning, triggerCameraScan, stopScan } = useBarcodeScanner((barcode) => {
    setScannedCode(barcode);

    // Búsqueda inteligente: si el producto ya existe en inventario
    const existing = products.find((p) => p.code === barcode);
    if (existing) {
      setSelectedProductId(existing.id);
    } else {
      setNewCode(barcode);
    }
  });


  useEffect(() => {
    loadProducts();
    loadMovements();
    loadLowStockAlerts();
  }, [loadProducts, loadMovements, loadLowStockAlerts]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProduct({
        code: newCode,
        name: newName,
        price: parseFloat(newPrice) || 0,
        stock: 0,
        minStock: parseInt(newMinStock) || 0,
      });
      setNewCode('');
      setNewName('');
      setNewPrice('');
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

  const handleProcessReceiptMock = async () => {
    setIsParsingReceipt(true);
    try {
      const parser = new GeminiReceiptParser();
      // Simula imagen en base64 de remito
      const items = await parser.parseReceiptImage('sample_base64_receipt');
      setParsedItems(items);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsParsingReceipt(false);
    }
  };

  return (
    <>
      {isScanning && <ScannerOverlay onCancel={stopScan} />}

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

        {scannedCode && (
          <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-xl p-3.5 font-semibold flex items-center justify-between shadow-xs">
            <span>Último Código Escaneado: <strong className="font-mono">{scannedCode}</strong></span>
            <button onClick={() => setScannedCode('')} className="text-indigo-600 hover:text-indigo-900 font-bold p-1">✕</button>
          </div>
        )}

        {/* TAB: CATÁLOGO DE PRODUCTOS */}
        {activeSubTab === 'catalog' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-12 gap-6 items-start">
            {/* Alta de Producto */}
            <div className="lg:col-span-1 xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col gap-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Nuevo Producto</h3>
              <form onSubmit={handleCreateProduct} className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input placeholder="Código de Barras" value={newCode} onChange={(e) => setNewCode(e.target.value)} required />
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
                <Input placeholder="Nombre del Producto" value={newName} onChange={(e) => setNewName(e.target.value)} required />
                <Input type="number" step="0.01" placeholder="Precio ($)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} required />
                <Input type="number" placeholder="Stock Mínimo Alerta" value={newMinStock} onChange={(e) => setNewMinStock(e.target.value)} required />
                <Button type="submit" disabled={loadingProducts}>Crear Producto</Button>
              </form>
            </div>

            {/* Listado de Productos (Mobile Cards + Desktop Table) */}
            <div className="lg:col-span-2 xl:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col min-h-[420px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Catálogo ({products.length})</h3>
                <span className="text-xs text-slate-400 font-medium md:hidden">Vista móvil</span>
              </div>

              {/* Vista Móvil: Cards apiladas y estilizadas */}
              <div className="md:hidden flex flex-col divide-y divide-slate-100">
                {products.map((p) => (
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
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-50">
                      <span className="text-slate-500">Mínimo: <strong className="text-slate-700 font-mono">{p.minStock} u.</strong></span>
                      <Badge variant={p.stock <= p.minStock ? 'warning' : 'success'}>
                        Stock: {p.stock} u.
                      </Badge>
                    </div>
                  </div>
                ))}
                {products.length === 0 && (
                  <div className="py-8 text-center text-slate-400 text-xs">Sin productos registrados aún.</div>
                )}
              </div>

              {/* Vista Desktop / Tablet: Tabla espaciosa */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                      <th className="py-3.5 px-4">Código</th>
                      <th className="py-3.5 px-4">Nombre</th>
                      <th className="py-3.5 px-4">Precio</th>
                      <th className="py-3.5 px-4">Stock</th>
                      <th className="py-3.5 px-4">Min</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-600">{p.code}</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{p.name}</td>
                        <td className="py-3.5 px-4 text-slate-700 font-mono">${p.price.toFixed(2)}</td>
                        <td className="py-3.5 px-4">
                          <Badge variant={p.stock <= p.minStock ? 'warning' : 'success'}>
                            {p.stock} u.
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">{p.minStock} u.</td>
                      </tr>
                    ))}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-400">Sin productos registrados aún.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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

              <Input type="number" placeholder="Cantidad" value={movementQty} onChange={(e) => setMovementQty(e.target.value)} required />
              <Input placeholder="Motivo (ej. Compra remito #104)" value={movementReason} onChange={(e) => setMovementReason(e.target.value)} required />
              <Button type="submit">Registrar Movimiento</Button>
            </form>
          </div>

          <div className="lg:col-span-2 xl:col-span-8 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs flex flex-col min-h-[420px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Histórico ({movements.length})</h3>
              <span className="text-xs text-slate-400 font-medium md:hidden">Vista móvil</span>
            </div>

            {/* Vista Móvil: Cards apiladas */}
            <div className="md:hidden flex flex-col divide-y divide-slate-100">
              {movements.map((m) => (
                <div key={m.id} className="py-3 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={m.type === 'IN' ? 'success' : 'danger'}>{m.type}</Badge>
                      <span className="font-bold text-slate-900 text-sm">{m.quantity} u.</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-normal">{m.reason}</p>
                </div>
              ))}
              {movements.length === 0 && (
                <div className="py-8 text-center text-slate-400 text-xs">Sin movimientos registrados aún.</div>
              )}
            </div>

            {/* Vista Desktop / Tablet: Tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                    <th className="py-3.5 px-4">Tipo</th>
                    <th className="py-3.5 px-4">Cantidad</th>
                    <th className="py-3.5 px-4">Motivo</th>
                    <th className="py-3.5 px-4">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {movements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4">
                        <Badge variant={m.type === 'IN' ? 'success' : 'danger'}>{m.type}</Badge>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">{m.quantity} u.</td>
                      <td className="py-3.5 px-4 text-slate-600">{m.reason}</td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    </tr>
                  ))}
                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">Sin movimientos registrados aún.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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


