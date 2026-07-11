# GYMRILLAS — Guía de despliegue

Stack: **Node 18+ · Express · PostgreSQL · PM2 · Nginx** en el VPS Hostinger.
La app de Node sirve **API + panel admin + storefront** en un solo proceso (puerto 4000).

---

## 1. Primer despliegue

```bash
# En el VPS
cd /var/www
git clone https://github.com/jcolon91/gymrillas-web.git gymrillas
cd gymrillas

# Setup automático (crea DB, .env, instala, migra, seed, PM2)
DB_PASS="UN_PASSWORD_FUERTE" bash deploy/setup.sh
```

Luego configura Nginx:

```bash
sudo cp deploy/nginx-gymrillas.conf /etc/nginx/sites-available/gymrillas
sudo ln -s /etc/nginx/sites-available/gymrillas /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d gymrillas.com -d www.gymrillas.com
```

Edita `backend/.env` y ajusta:
- `CORS_ORIGINS` → `https://gymrillas.com,https://www.gymrillas.com`
- `PUBLIC_URL` → `https://gymrillas.com`

Reinicia: `pm2 restart gymrillas-api`

**Cambia el admin demo:**
```bash
node backend/scripts/crear-admin.js tu@email.com TuPasswordFuerte "Jesús"
```

---

## 2. Actualizaciones (git pull)

```bash
cd /var/www/gymrillas
git pull origin main
cd backend
npm install --omit=dev      # solo si cambió package.json
node scripts/migrate.js     # solo si cambió el schema (es idempotente)
pm2 restart gymrillas-api
```

El **storefront y el admin son archivos estáticos** servidos por Node — con `git pull` + `pm2 restart` ya quedan actualizados.

---

## 3. Verificación

```bash
curl https://gymrillas.com/api/health      # {"ok":true,...}
pm2 logs gymrillas-api --lines 30
```

- Storefront: `https://gymrillas.com`
- Admin: `https://gymrillas.com/admin`

---

## 4. Pendientes (se activan poniendo llaves en Configuración del admin o en `.env`)

| Integración | Variable / Config | Estado |
|---|---|---|
| **ATH Móvil** | `ATH_MOVIL_PUBLIC_TOKEN`, `ATH_MOVIL_TOKEN` | Estructura lista; falta token de negocio |
| **USPS** (cotización/etiquetas) | `USPS_USER_ID`, `USPS_ORIGIN_ZIP` | Stub `cotizarUSPS()` listo en `routes/envios.js` |
| **Google Routes** (entregas locales) | `GOOGLE_ROUTES_API_KEY` | Reservado |
| **Stripe / Clover / PayPal** | claves respectivas | Webhook placeholder en `routes/pagos.js` |
| **Storefront ↔ catálogo en vivo** | — | Fase 2: enlazar `tienda.html` y `producto.html` a `/api/productos` (hoy lista de espera y auth ya conectados) |

Mientras no haya llaves, la tienda funciona con **tarifa de envío fija + pickup local** y los pagos se marcan manualmente desde el admin.

---

## 5. Backups rápidos

```bash
# Backup de la base
pg_dump -U gymrillas_user gymrillas > backup_$(date +%F).sql
# Backup de imágenes subidas
tar czf uploads_$(date +%F).tar.gz backend/uploads
```
