#!/usr/bin/env bash
# ============================================================
# GYMRILLAS — setup en VPS (Ubuntu). Corre desde la raíz del repo.
#   cd /var/www/gymrillas && bash deploy/setup.sh
# Requisitos previos: Node 18+, PostgreSQL, PM2, Nginx ya instalados.
# ============================================================
set -e

echo "=== GYMRILLAS · Setup ==="

# --- 1) Variables (edita estos valores o expórtalos antes) ---
DB_NAME="${DB_NAME:-gymrillas}"
DB_USER="${DB_USER:-gymrillas_user}"
DB_PASS="${DB_PASS:-cambia_este_password}"

echo "→ Base de datos: $DB_NAME / usuario: $DB_USER"

# --- 2) Crear DB y usuario (idempotente) ---
sudo -u postgres psql <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='${DB_USER}') THEN
    CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
  END IF;
END \$\$;
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname='${DB_NAME}')\gexec
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
SQL

# --- 3) Backend: .env ---
cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  sed -i "s/^DB_NAME=.*/DB_NAME=${DB_NAME}/" .env
  sed -i "s/^DB_USER=.*/DB_USER=${DB_USER}/" .env
  sed -i "s/^DB_PASS=.*/DB_PASS=${DB_PASS}/" .env
  # secreto JWT aleatorio
  SECRET=$(head -c 48 /dev/urandom | base64 | tr -d '/+=' | head -c 48)
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${SECRET}|" .env
  echo "→ .env creado (revisa CORS_ORIGINS y PUBLIC_URL)"
else
  echo "→ .env ya existe, no se toca"
fi

# --- 4) Dependencias ---
echo "→ npm install…"
npm install --omit=dev

# --- 5) Migrar + seed ---
echo "→ Aplicando schema…"
node scripts/migrate.js
echo "→ Insertando datos demo…"
node scripts/seed.js

# --- 6) Carpeta de uploads ---
mkdir -p uploads/productos

# --- 7) PM2 ---
echo "→ Arrancando con PM2…"
pm2 delete gymrillas-api 2>/dev/null || true
pm2 start server.js --name gymrillas-api
pm2 save

echo ""
echo "============================================="
echo "✓ Listo. API en puerto 4000."
echo "  Admin:  https://TU-DOMINIO/admin"
echo "  Login:  admin@gymrillas.com / gymrillas123"
echo "  ⚠ Cambia el password admin:"
echo "    node backend/scripts/crear-admin.js tu@email.com TuPasswordFuerte \"Tu Nombre\""
echo "============================================="
