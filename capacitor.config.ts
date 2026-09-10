import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nodo.inventory',
  appName: 'Nodo Inventory',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    CapacitorSQLite: {
      iosIsEncryption: false,
      iosKeychainPrefix: 'nodo-sqlite',
      iosBiometric: {
        biometricAuth: false,
        biometricTitle: 'Biometric login for credit card'
      },
      androidIsEncryption: false,
      androidBiometric: {
        biometricAuth: false,
        biometricTitle: 'Biometric login for credit card'
      }
    }
  }
};

export default config;
