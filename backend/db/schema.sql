-- ============================================================
-- GYMRILLAS — Schema completo (e-commerce + admin tipo Shopify)
-- DB: gymrillas | PostgreSQL 14+
-- Marca: #DFE44E volt / #93C83F verde / #262726 carbón
-- ============================================================
-- Idempotente: se puede correr de nuevo sin romper datos.
-- ============================================================

-- ---------- USUARIOS (clientes + admin) ----------
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  rol VARCHAR(20) NOT NULL DEFAULT 'cliente' CHECK (rol IN ('cliente','admin')),
  email_verificado BOOLEAN DEFAULT FALSE,
  acepta_marketing BOOLEAN DEFAULT FALSE,
  foto_url VARCHAR(500),
  idioma VARCHAR(5) DEFAULT 'es' CHECK (idioma IN ('es','en')),
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- DIRECCIONES ----------
CREATE TABLE IF NOT EXISTS direcciones (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre VARCHAR(150),
  linea1 VARCHAR(255) NOT NULL,
  linea2 VARCHAR(255),
  ciudad VARCHAR(100) NOT NULL,
  estado VARCHAR(100) DEFAULT 'PR',
  zip VARCHAR(15) NOT NULL,
  pais VARCHAR(5) DEFAULT 'PR',
  telefono VARCHAR(20),
  es_default BOOLEAN DEFAULT FALSE
);

-- ---------- PRODUCTOS ----------
CREATE TABLE IF NOT EXISTS productos (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  descripcion TEXT,
  descripcion_corta VARCHAR(500),
  categoria VARCHAR(30) NOT NULL CHECK (categoria IN ('hombre','mujer','accesorios','equipo')),
  subcategoria VARCHAR(50),
  precio_base NUMERIC(10,2) NOT NULL,
  precio_oferta NUMERIC(10,2),
  costo NUMERIC(10,2),
  -- specs de la prenda
  material VARCHAR(255),            -- ej: "Poliéster reciclado + Elastano"
  cuidado TEXT,                     -- instrucciones de lavado
  fit VARCHAR(50),                  -- ej: "Oversized", "Slim", "Compression"
  genero VARCHAR(20),               -- hombre/mujer/unisex
  caracteristicas JSONB DEFAULT '[]'::jsonb,  -- ["Quick-dry","Anti-olor","4-way stretch"]
  -- peso/dimensiones (para USPS/Routes API)
  peso_oz NUMERIC(8,2),
  largo_in NUMERIC(6,2),
  ancho_in NUMERIC(6,2),
  alto_in NUMERIC(6,2),
  activo BOOLEAN DEFAULT TRUE,
  destacado BOOLEAN DEFAULT FALSE,
  nuevo BOOLEAN DEFAULT TRUE,
  -- SEO
  meta_titulo VARCHAR(255),
  meta_descripcion VARCHAR(500),
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- COMPOSICIÓN DE TELA (cantidades en %) ----------
CREATE TABLE IF NOT EXISTS producto_composicion (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  material VARCHAR(80) NOT NULL,    -- "Algodón", "Poliéster", "Elastano"
  porcentaje NUMERIC(5,2) NOT NULL CHECK (porcentaje > 0 AND porcentaje <= 100),
  orden INT DEFAULT 0
);

-- ---------- IMÁGENES (4+ por producto) ----------
CREATE TABLE IF NOT EXISTS producto_imagenes (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  alt VARCHAR(255),
  orden INT DEFAULT 0,
  es_principal BOOLEAN DEFAULT FALSE
);

-- ---------- VARIANTES (talla/color/SKU) ----------
CREATE TABLE IF NOT EXISTS variantes (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  sku VARCHAR(80) UNIQUE NOT NULL,
  talla VARCHAR(20),
  color VARCHAR(50),
  color_hex VARCHAR(9),
  precio_ajuste NUMERIC(10,2) DEFAULT 0,
  imagen_url VARCHAR(500),
  activo BOOLEAN DEFAULT TRUE
);

-- ---------- INVENTARIO ----------
CREATE TABLE IF NOT EXISTS inventario (
  id BIGSERIAL PRIMARY KEY,
  variante_id BIGINT UNIQUE NOT NULL REFERENCES variantes(id) ON DELETE CASCADE,
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo INT DEFAULT 5,
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- LOG DE MOVIMIENTOS DE INVENTARIO ----------
CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id BIGSERIAL PRIMARY KEY,
  variante_id BIGINT NOT NULL REFERENCES variantes(id) ON DELETE CASCADE,
  delta INT NOT NULL,               -- + entrada / - salida
  motivo VARCHAR(40) NOT NULL,      -- 'compra','venta','ajuste','devolucion','merma'
  referencia VARCHAR(100),          -- ej: orden #, factura proveedor
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- CARRITOS ----------
CREATE TABLE IF NOT EXISTS carritos (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
  session_token VARCHAR(100) UNIQUE,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS carrito_items (
  id BIGSERIAL PRIMARY KEY,
  carrito_id BIGINT NOT NULL REFERENCES carritos(id) ON DELETE CASCADE,
  variante_id BIGINT NOT NULL REFERENCES variantes(id) ON DELETE CASCADE,
  cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  UNIQUE(carrito_id, variante_id)
);

-- ---------- CUPONES ----------
CREATE TABLE IF NOT EXISTS cupones (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(50) UNIQUE NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('porcentaje','fijo')),
  valor NUMERIC(10,2) NOT NULL,
  minimo_compra NUMERIC(10,2) DEFAULT 0,
  usos_max INT,
  usos_actuales INT DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  expira_en TIMESTAMPTZ
);

-- ---------- ÓRDENES ----------
CREATE TABLE IF NOT EXISTS ordenes (
  id BIGSERIAL PRIMARY KEY,
  numero_orden VARCHAR(30) UNIQUE NOT NULL,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(200),
  telefono VARCHAR(20),
  subtotal NUMERIC(10,2) NOT NULL,
  descuento NUMERIC(10,2) DEFAULT 0,
  envio NUMERIC(10,2) DEFAULT 0,
  impuesto NUMERIC(10,2) DEFAULT 0,   -- IVU 11.5% PR
  total NUMERIC(10,2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','pagada','procesando','enviada','entregada','cancelada','reembolsada')),
  metodo_pago VARCHAR(30),
  direccion_envio JSONB,
  -- envío
  transportista VARCHAR(40),          -- 'usps','manual','pickup'
  servicio_envio VARCHAR(60),         -- 'USPS Priority', etc.
  tracking VARCHAR(100),
  etiqueta_url VARCHAR(500),
  notas TEXT,
  cupon_id BIGINT REFERENCES cupones(id),
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS orden_items (
  id BIGSERIAL PRIMARY KEY,
  orden_id BIGINT NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  variante_id BIGINT REFERENCES variantes(id) ON DELETE SET NULL,
  producto_id BIGINT REFERENCES productos(id) ON DELETE SET NULL,
  nombre_producto VARCHAR(255) NOT NULL,
  sku VARCHAR(80),
  talla VARCHAR(20),
  color VARCHAR(50),
  precio_unitario NUMERIC(10,2) NOT NULL,
  costo_unitario NUMERIC(10,2) DEFAULT 0,   -- para margen en contabilidad
  cantidad INT NOT NULL
);

-- ---------- PAGOS ----------
CREATE TABLE IF NOT EXISTS pagos (
  id BIGSERIAL PRIMARY KEY,
  orden_id BIGINT NOT NULL REFERENCES ordenes(id) ON DELETE CASCADE,
  proveedor VARCHAR(30) NOT NULL CHECK (proveedor IN ('ath_movil','clover','stripe','paypal','manual')),
  referencia_externa VARCHAR(255),
  monto NUMERIC(10,2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','completado','fallido','reembolsado')),
  datos JSONB,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- CONTABILIDAD: gastos / ingresos manuales ----------
CREATE TABLE IF NOT EXISTS movimientos_contables (
  id BIGSERIAL PRIMARY KEY,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso','gasto')),
  categoria VARCHAR(60) NOT NULL,     -- 'venta','inventario','marketing','envio','operacion','otro'
  descripcion VARCHAR(255),
  monto NUMERIC(10,2) NOT NULL,
  orden_id BIGINT REFERENCES ordenes(id) ON DELETE SET NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- WISHLIST ----------
CREATE TABLE IF NOT EXISTS wishlist (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, producto_id)
);

-- ---------- REVIEWS ----------
CREATE TABLE IF NOT EXISTS reviews (
  id BIGSERIAL PRIMARY KEY,
  producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  autor VARCHAR(120),
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  titulo VARCHAR(150),
  comentario TEXT,
  aprobado BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- REWARDS ----------
CREATE TABLE IF NOT EXISTS rewards (
  id BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  puntos INT NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ganado','redimido')),
  descripcion VARCHAR(255),
  orden_id BIGINT REFERENCES ordenes(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- LEADS ----------
CREATE TABLE IF NOT EXISTS leads (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(150),
  origen VARCHAR(30) DEFAULT 'popup' CHECK (origen IN ('popup','footer','checkout','manual','lista_espera')),
  cupon_enviado VARCHAR(50),
  convertido BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ---------- CONFIGURACIÓN de la tienda (clave/valor) ----------
CREATE TABLE IF NOT EXISTS configuracion (
  clave VARCHAR(60) PRIMARY KEY,
  valor TEXT,
  descripcion VARCHAR(255),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria, activo);
CREATE INDEX IF NOT EXISTS idx_productos_slug ON productos(slug);
CREATE INDEX IF NOT EXISTS idx_productos_sub ON productos(subcategoria);
CREATE INDEX IF NOT EXISTS idx_comp_producto ON producto_composicion(producto_id);
CREATE INDEX IF NOT EXISTS idx_variantes_producto ON variantes(producto_id);
CREATE INDEX IF NOT EXISTS idx_imagenes_producto ON producto_imagenes(producto_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_usuario ON ordenes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ordenes_estado ON ordenes(estado);
CREATE INDEX IF NOT EXISTS idx_ordenes_fecha ON ordenes(creado_en);
CREATE INDEX IF NOT EXISTS idx_orden_items_orden ON orden_items(orden_id);
CREATE INDEX IF NOT EXISTS idx_carrito_items_carrito ON carrito_items(carrito_id);
CREATE INDEX IF NOT EXISTS idx_reviews_producto ON reviews(producto_id, aprobado);
CREATE INDEX IF NOT EXISTS idx_pagos_orden ON pagos(orden_id);
CREATE INDEX IF NOT EXISTS idx_mov_inv_variante ON inventario_movimientos(variante_id);
CREATE INDEX IF NOT EXISTS idx_mov_cont_fecha ON movimientos_contables(fecha);
CREATE INDEX IF NOT EXISTS idx_mov_cont_tipo ON movimientos_contables(tipo, categoria);

-- ============================================================
-- TRIGGER actualizado_en
-- ============================================================
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_usuarios_upd ON usuarios;
CREATE TRIGGER trg_usuarios_upd BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
DROP TRIGGER IF EXISTS trg_productos_upd ON productos;
CREATE TRIGGER trg_productos_upd BEFORE UPDATE ON productos
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
DROP TRIGGER IF EXISTS trg_inventario_upd ON inventario;
CREATE TRIGGER trg_inventario_upd BEFORE UPDATE ON inventario
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
DROP TRIGGER IF EXISTS trg_carritos_upd ON carritos;
CREATE TRIGGER trg_carritos_upd BEFORE UPDATE ON carritos
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
DROP TRIGGER IF EXISTS trg_ordenes_upd ON ordenes;
CREATE TRIGGER trg_ordenes_upd BEFORE UPDATE ON ordenes
  FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

-- ============================================================
-- SEED base (idempotente)
-- ============================================================
INSERT INTO cupones (codigo, tipo, valor, minimo_compra, activo)
VALUES ('BIENVENIDO10', 'porcentaje', 10, 0, TRUE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('tienda_nombre', 'GYMRILLAS', 'Nombre de la tienda'),
  ('ivu_pct', '11.5', 'Impuesto IVU Puerto Rico (%)'),
  ('envio_flat', '5.99', 'Tarifa fija de envío (placeholder hasta USPS)'),
  ('envio_gratis_min', '75', 'Compra mínima para envío gratis'),
  ('moneda', 'USD', 'Moneda'),
  ('puntos_por_dolar', '1', 'Rewards: puntos ganados por dólar'),
  ('origen_zip', '00725', 'ZIP de origen para cálculo de envío (Caguas)'),
  ('usps_userid', '', 'USPS Web Tools / Prices 3.0 — pendiente'),
  ('routes_api_key', '', 'Google Routes API key — pendiente'),
  ('ath_movil_token', '', 'ATH Móvil Business token — pendiente'),
  ('ath_movil_public', '', 'ATH Móvil public token — pendiente')
ON CONFLICT (clave) DO NOTHING;
