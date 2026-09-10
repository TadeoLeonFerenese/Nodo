import { BarcodeScanner } from '@capacitor-community/barcode-scanner';
import { isCapacitor } from '../../utils/platform';

type ScanCallback = (barcode: string) => void;

export class BarcodeScannerService {
  private static listeners: Set<ScanCallback> = new Set();
  private static buffer: string = '';
  private static lastKeyTime: number = 0;
  private static isInitialized: boolean = false;
  private static isScanningActive: boolean = false;

  static initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') return;

    // Fast keyboard listener for USB Barcode Scanners on Windows / PC
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Ignore physical keyboard buffer when native camera modal is active
      if (this.isScanningActive) return;
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt') return;

      const currentTime = Date.now();
      // USB scanners type very quickly (< 30ms between keypresses)
      if (currentTime - this.lastKeyTime > 50) {
        this.buffer = '';
      }
      this.lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (this.buffer.length >= 3) {
          const scannedCode = this.buffer.trim();
          this.buffer = '';
          this.notify(scannedCode);
        }
      } else if (e.key.length === 1) {
        this.buffer += e.key;
      }
    });

    this.isInitialized = true;
  }

  static subscribe(callback: ScanCallback): () => void {
    this.initialize();
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  static async scanFromCamera(): Promise<string | null> {
    if (!isCapacitor()) {
      // Simulated camera scan for Web / Dev mode
      const mockCode = prompt('Simular Escáner de Cámara (Ingresar Código de Barras o URL):', 'http://192.168.0.3:4545');
      return mockCode || null;
    }

    try {
      // 1. Explicitly check and request runtime camera permissions
      const status = await BarcodeScanner.checkPermission({ force: true });
      if (status.denied) {
        alert('Se requiere permiso de cámara para escanear. Habilitá el permiso en los ajustes de la app.');
        return null;
      }
      if (!status.granted) {
        return null;
      }

      // 2. Hide background and mark scanner active
      this.isScanningActive = true;
      document.body.classList.add('scanner-active');
      document.documentElement.classList.add('scanner-active');
      await BarcodeScanner.hideBackground();

      // 3. Start native camera stream
      const result = await BarcodeScanner.startScan();

      await this.cleanupScan();

      if (result.hasContent && result.content) {
        return result.content;
      }
      return null;
    } catch (error) {
      console.error('[BarcodeScannerService] Camera scan error:', error);
      await this.cleanupScan();
      return null;
    }
  }

  static async stopScan(): Promise<void> {
    await this.cleanupScan();
  }

  private static async cleanupScan(): Promise<void> {
    this.isScanningActive = false;
    document.body.classList.remove('scanner-active');
    document.documentElement.classList.remove('scanner-active');
    try {
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan({ resolveScan: true });
    } catch {
      // Ignore cleanup error if already stopped
    }
  }

  private static notify(barcode: string): void {
    console.log('[BarcodeScannerService] Barcode captured (hardware):', barcode);
    this.listeners.forEach((cb) => cb(barcode));
  }
}

