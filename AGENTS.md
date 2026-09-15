# Contexto del Proyecto
- Stack: React, Vite, Zustand, Tailwind CSS, Tauri (Windows), Capacitor (Android).
- Tipo: [LOCAL-FIRST / MULTIPLATAFORMA] (App independiente con sincronización remota).
- Persistencia: SQLite (Motor local principal) + Laravel/PostgreSQL (Sincronización en 2do plano).

## Arquitectura Base
- Diseño modular y completamente desacoplado.
- Separación estricta entre la capa de presentación (UI) y las consultas a la base de datos local.

## Funcionalidades Core (MVP)
1. ABM de Productos: Gestión de catálogo (alta, baja, modificación y lectura).
2. Control de Stock: Registro transaccional de entradas/salidas, cálculo en tiempo real y alertas de mínimo.
3. Procesamiento con IA: Lectura de fotos de remitos para extraer estructuradamente productos y cantidades.
4. Escáner: Input preparado para cámara del celular o pistola lectora de código de barras USB.

## Restricciones Estrictas de UI/UX
- Registro de Usuarios: Formulario limitado exacta y únicamente a cuatro campos (usuario, email, contraseña y confirmación de contraseña).
- Navegación Móvil: El menú inferior (bottom navigation) debe tener solo dos opciones: "Inicio" y "Perfil".
- Estética: Diseño minimalista, limpio y con absoluta simetría visual.
- Viewport Móvil Sin Scroll Inicial (Above the fold): En Android/móvil, usar espaciados externos compactos (`p-2.5 sm:p-6`), tarjetas con `p-3.5 sm:p-6` y grillas con `gap-3 sm:gap-6`. La barra de sub-pestañas y el botón de escaneo deben convivir en una única fila horizontal (`p-2 sm:p-4`).
- Paginación Adaptativa Obligatoria: En móvil (`md:hidden`) mostrar 2 productos iniciales en Catálogo y 3 en Movimientos con botón desplegable "Ver más / Ver menos". En desktop (`hidden md:block`) mantener 10 elementos.
- Alturas Dinámicas: Prohibido usar alturas mínimas fijas (`min-h-[...]`) en tarjetas de datos; usar siempre `h-fit`.
- Botones de Acción (Atomic Design): Entrada (IN) debe usar `variant="success"` (`bg-emerald-600`) y Salida (OUT) `variant="danger"` (`bg-rose-600`).

## Protocolo del Motor de IA (Google Gemini REST)
- Contrato Estricto CamelCase: La API REST de Gemini (`v1beta/models`) exige camelCase derivado de Protobuf. Usar estrictamente `inlineData`, `mimeType` y `responseMimeType`. Prohibido snake_case (`inline_data`, etc., dispara HTTP 400).
- Prioridad de Modelo: En resolución dinámica (`discoverModel`), priorizar siempre `gemini-3.5-flash` sobre otras variantes del catálogo.
- Manejo de Errores: En WebView móvil `response.statusText` puede ser vacío; es mandatorio parsear `errJson.error.message` para informar al usuario.
- Estado de API Key: Si no hay key, mostrar enlace externo a Google AI Studio (`target="_blank" rel="noopener noreferrer"`). Si está presente, mostrar badge de confirmación y opción de limpieza.

## Estándares de Compilación y APK (Android / Capacitor)
- Flujo de Build de 3 Pasos:
  1. `npm run build`
  2. `npx cap sync android`
  3. `npx cap open android` (o `./gradlew assembleDebug`).
- Enlaces Externos en APK: Todo enlace web debe usar `target="_blank" rel="noopener noreferrer"` para abrir el navegador del sistema y no interferir con la WebView local.