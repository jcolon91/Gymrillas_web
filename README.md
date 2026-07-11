# 🦍 GYMRILLAS — E-commerce

Tienda online de ropa y accesorios fitness de Puerto Rico. Plataforma full-stack con **storefront**, **panel de administración tipo Shopify** y **API REST**.

> Marca: volt `#DFE44E` · verde `#93C83F` · carbón `#262726` · tipografía Saira.

---

## Stack

- **Backend:** Node.js + Express + PostgreSQL (JWT, bcrypt, multer)
- **Admin:** SPA vanilla JS (sin build) servida por el backend en `/admin`
- **Storefront:** HTML/CSS/JS estático servido por el backend
- **Infra:** PM2 + Nginx en VPS · proceso único en puerto `4000`

---

## Estructura

```
gymrillas-web/
├── backend/
│   ├── server.js            # App Express (monta API + sirve admin + storefront)
│   ├── db.js                # Pool PostgreSQL + helper de transacciones
│   ├── db/
│   │   ├── schema.sql       # Esquema completo (idempotente)
│   │   └── seed.sql         # Datos demo (8 productos completos + admin)
│   ├── middleware/          # auth (JWT) · upload (multer)
│   ├── routes/              # auth, productos, inventario, ordenes, contabilidad,
│   │                        # envios, pagos, cupones, reviews, leads, carrito, dashboard
│   └── scripts/             # migrate.js · seed.js · crear-admin.js
├── admin/                   # Panel de administración (index.html + assets)
├── frontend/                # Storefront (tienda, producto, carrito, checkout, cuenta…)
└── deploy/                  # setup.sh · nginx-gymrillas.conf · DEPLOY.md
```

---

## Funcionalidades

### Panel admin (`/admin`) — estilo Shopify
- **Dashboard:** ventas hoy/mes/total, órdenes pendientes, inventario, gráfico de 14 días, top productos
- **Productos:** CRUD completo y 100% editable
  - Mínimo 4 fotos (subida directa o por URL)
  - Especificaciones de prenda: material, fit, género, cuidado, características
  - **Composición de tela en %** (valida que sume 100%)
  - Peso y dimensiones (para envío USPS)
  - Variantes (talla/color/SKU) con stock por variante
  - SEO (meta título/descripción), destacado, activo/oculto
- **Inventario:** stock por variante, alertas de stock bajo, ajustes con log de movimientos, valor a costo/retail
- **Órdenes:** detalle completo, cambio de estado, marcar pagada manual, tracking de envío
- **Envíos:** cola de pendientes, asignar transportista/tracking
- **Contabilidad:** ingresos/gastos/utilidad/margen bruto, P&L, movimientos manuales, export CSV
- **Clientes:** listado con total gastado y # órdenes
- **Cupones:** CRUD (porcentaje/fijo, mínimo, usos, expiración)
- **Reseñas:** moderación (aprobar/eliminar)
- **Leads:** suscriptores de lista de espera, export CSV
- **Configuración:** IVU, envío, llaves de integraciones

### Storefront
- Catálogo, página de producto, carrito, checkout (tabs ATH Móvil/tarjeta), cuenta
- **Lista de espera y login/registro conectados a la API**
- Cálculo de IVU (11.5%) y envío gratis sobre el mínimo

---

## Instalación

Ver **[deploy/DEPLOY.md](deploy/DEPLOY.md)** para la guía completa.

```bash
DB_PASS="password_fuerte" bash deploy/setup.sh
```

Admin demo: `admin@gymrillas.com` / `gymrillas123` (cámbialo en el primer login).

---

## Pendientes (estructura lista, faltan llaves)

- **ATH Móvil** Business (token) — capa de pagos desacoplada
- **USPS** Prices 3.0 (cotización + etiquetas) — stub listo
- **Google Routes API** (entregas locales)
- **Stripe / Clover / PayPal** (webhooks placeholder)
- **Fase 2:** enlazar catálogo del storefront a `/api/productos` en vivo

---

© Gymrillas · Puerto Rico
