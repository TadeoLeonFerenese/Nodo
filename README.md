# 🛠️ Alternativa desde Android Studio (Interfaz Visual)
Si en algún momento prefieres abrir y compilar la app desde la interfaz gráfica de Android Studio:

Ejecuta:
bash 

---npm run build:apk

npm run cap:android
Cuando abra Android Studio, ve al menú superior: Build > Build Bundle(s) / APK(s) > Build APK(s).
En la notificación que aparece abajo a la derecha, haz clic en "locate" para abrir la carpeta del APK. 

# Nodo Inventory

Sistema de gestión de inventario y control transaccional de stock **Local-First y Multiplataforma** (Windows mediante Tauri / Android mediante Capacitor).

---

## 📱 Compilación de APK para Android (Debug)

Para generar el ejecutable `.apk` para dispositivos Android desde la terminal, ejecutá los siguientes 3 comandos en secuencia:

```bash
# 1. Compilar el código web (React + Vite) a la carpeta dist/
npm run build

# 2. Sincronizar el build web con el proyecto nativo de Capacitor Android
npx cap sync android

# 3. Compilar el ejecutable .APK usando Gradle CLI
cd android && ./gradlew assembleDebug
```

> **Ubicación del archivo generado:**  
> Una vez completado el proceso, el APK listo para instalar estará en:  
> `android/app/build/outputs/apk/debug/app-debug.apk`

