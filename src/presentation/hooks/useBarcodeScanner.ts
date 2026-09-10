import { useState, useEffect, useCallback } from 'react';
import { BarcodeScannerService } from '../../infrastructure/scanner/BarcodeScannerService';

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const unsubscribe = BarcodeScannerService.subscribe((code) => {
      setIsScanning(false);
      onScan(code);
    });
    return () => {
      unsubscribe();
    };
  }, [onScan]);

  const triggerCameraScan = useCallback(async (): Promise<string | null> => {
    setIsScanning(true);
    try {
      const code = await BarcodeScannerService.scanFromCamera();
      setIsScanning(false);
      return code;
    } catch (e) {
      setIsScanning(false);
      throw e;
    }
  }, []);

  const stopScan = useCallback(async () => {
    await BarcodeScannerService.stopScan();
    setIsScanning(false);
  }, []);

  return { isScanning, triggerCameraScan, stopScan };
}

