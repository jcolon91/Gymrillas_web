# GYMRILLAS — Auditoría de seguridad y endurecimiento

Auditoría automatizada (multi-agente, con verificación adversarial) sobre backend
Node/Express, panel admin y storefront. **64 hallazgos** mapeados (14 críticos,
32 altos, 15 medios, 3 bajos); tras verificación se descartaron falsos positivos y
se corrigieron los reales. Las queries del backend ya usaban parámetros ($1,$2…),
así que **no había SQL injection**.

## Corregido

### Crítico
- **Confirmación de pago falsificable** (`pagos.js /ath/confirmar`): cualquiera podía
  marcar **cualquier** orden como pagada. Ahora exige: autorización (dueño autenticado
  o invitado que prueba el email de la orden), idempotencia (solo desde `pendiente`), y
  **verificación real del pago — fail-closed**: en producción NO auto-confirma hasta
  implementar la validación contra ATH Móvil Business (`validarPagoATH`). El comercio
  puede confirmar manualmente desde el admin.
- **`pagos.js /iniciar`** ahora valida propiedad de la orden (no se puede iniciar pago
  de órdenes ajenas ni enumerar totales).
- **Cantidades negativas en checkout** (`ordenes.js`): `cantidad = -5` permitía descuentos
  y **aumentar** stock. Ahora se exige entero 1–99.
- **Secretos de pago expuestos** (`dashboard.js /config`): Stripe SK, ATH Business Token y
  cuenta bancaria viajaban en claro al navegador. Ahora se **enmascaran** (`••••1234`); el
  PUT no sobrescribe un secreto con la máscara (write-only desde el panel).
- **CORS y cabeceras** (`server.js`): CORS abierto si faltaba config → en producción ahora
  se rechaza cross-origin sin allowlist. Añadidas cabeceras de seguridad
  (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, HSTS, Permissions-Policy) y
  se oculta `X-Powered-By`.
- **JWT** (`middleware/auth.js`): se eliminó el secreto de respaldo en producción; el server
  **no arranca** sin `JWT_SECRET` (mín. 32 caracteres).

### Alto / Medio
- **`pagos.js /admin/manual`**: el monto ya no se acepta del cliente; se usa el **total real**
  de la orden.
- **Validación de datos**: precios > 0 y oferta < base y costo ≥ 0 (`productos.js`); stock y
  porcentajes de composición saneados; tipo/valor/rango de cupones (`cupones.js`); cantidades
  de carrito acotadas 1–99 (`carrito.js`).
- **XSS en el admin**: los `onclick` que interpolaban texto (nº de orden, nombre de producto)
  ahora usan `escJs()` además de `esc()` (escape para contexto JS-en-atributo).
- **Fiabilidad / crashes**: `try/catch` añadido en rutas que faltaban (`dashboard /config`,
  `reviews`, `leads`, `cupones`); guard de array en cambio de contraseña (`auth.js`); parseo
  seguro de precios en carrito.
- **Uploads** (`upload.js`): se valida extensión **y** MIME type de imagen.
- **CSV injection**: export de leads y contabilidad neutraliza fórmulas (`= + - @`).
- **Contraseñas**: mínimo subido a 8 caracteres.

## Riesgos aceptados / recomendaciones a futuro
- **Token en `localStorage`** (admin y cliente): estándar para SPA; el riesgo se mitiga
  evitando XSS (hecho). Migrar a cookie `httpOnly` + CSRF si se quiere defensa adicional.
- **Verificación ATH Móvil**: implementar `validarPagoATH()` (findPaymentByReference) y la
  firma de webhooks de Stripe/Clover antes de aceptar pagos en vivo.
- **Rate limiting**: hay 40 req/15min en `/api/auth`; considerar bloqueo por cuenta/captcha
  si hay abuso.

> El **modo demo** del panel (deploy estático) replica el enmascarado de secretos para que
> el comportamiento sea idéntico al backend real.
