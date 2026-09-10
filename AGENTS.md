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