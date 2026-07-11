-- ============================================================
-- GYMRILLAS — Seed de datos demo
-- Corre DESPUÉS de schema.sql. Idempotente por slug/sku/email.
-- ============================================================

-- ---------- ADMIN demo (cambiar password luego) ----------
-- hash de 'gymrillas123' (bcrypt) — CAMBIAR en producción
INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, email_verificado)
VALUES ('Admin','Gymrillas','admin@gymrillas.com',
        '$2a$10$pHF4KIKGcjjvBxKvg3PwDe09u6NfWGEIfORt6zWWfSBd8UfWzfNMa', 'admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- PRODUCTO 1 — Savage Tee (usa foto Higgsfield)
-- ============================================================
INSERT INTO productos (nombre, slug, descripcion, descripcion_corta, categoria, subcategoria,
  precio_base, precio_oferta, costo, material, cuidado, fit, genero, caracteristicas,
  peso_oz, largo_in, ancho_in, alto_in, destacado, nuevo)
VALUES ('Savage Tee','savage-tee',
  'Camiseta de entrenamiento de corte oversized con tecnología quick-dry. Diseñada para los que entrenan en serio. Tela transpirable que mantiene el cuerpo fresco durante las sesiones más intensas.',
  'Oversized tee quick-dry para entrenamiento de alta intensidad.',
  'hombre','h-tees', 34.00, NULL, 12.50,
  'Poliéster reciclado + Elastano', 'Lavar en frío. No usar secadora. No planchar el estampado.',
  'Oversized','hombre',
  '["Quick-dry","Anti-olor","4-way stretch","Costuras planas"]'::jsonb,
  6.5, 12, 10, 1.5, TRUE, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO producto_composicion (producto_id, material, porcentaje, orden)
SELECT id, 'Poliéster reciclado', 88, 0 FROM productos WHERE slug='savage-tee'
UNION ALL SELECT id, 'Elastano', 12, 1 FROM productos WHERE slug='savage-tee'
ON CONFLICT DO NOTHING;

INSERT INTO producto_imagenes (producto_id, url, alt, orden, es_principal)
SELECT id, 'https://d8j0ntlcm91z4.cloudfront.net/user_37oXaVoFICTcwhHWuCWo5lkkfRO/hf_20260610_024059_8a7845dc-eaeb-44bf-b0d0-426583939174.png','Savage Tee frente',0,TRUE FROM productos WHERE slug='savage-tee'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=70','Savage Tee detalle',1,FALSE FROM productos WHERE slug='savage-tee'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=70','Savage Tee espalda',2,FALSE FROM productos WHERE slug='savage-tee'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=800&q=70','Savage Tee fit',3,FALSE FROM productos WHERE slug='savage-tee';

-- variantes S/M/L/XL
INSERT INTO variantes (producto_id, sku, talla, color, color_hex)
SELECT id,'SAV-NEG-S','S','Negro','#171717' FROM productos WHERE slug='savage-tee'
UNION ALL SELECT id,'SAV-NEG-M','M','Negro','#171717' FROM productos WHERE slug='savage-tee'
UNION ALL SELECT id,'SAV-NEG-L','L','Negro','#171717' FROM productos WHERE slug='savage-tee'
UNION ALL SELECT id,'SAV-NEG-XL','XL','Negro','#171717' FROM productos WHERE slug='savage-tee'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventario (variante_id, stock, stock_minimo)
SELECT id, 25, 5 FROM variantes WHERE sku LIKE 'SAV-%'
ON CONFLICT (variante_id) DO NOTHING;

-- ============================================================
-- PRODUCTO 2 — Beast Hoodie
-- ============================================================
INSERT INTO productos (nombre, slug, descripcion, descripcion_corta, categoria, subcategoria,
  precio_base, costo, material, cuidado, fit, genero, caracteristicas, peso_oz, destacado, nuevo)
VALUES ('Beast Hoodie','beast-hoodie',
  'Hoodie pesado de felpa premium con interior afelpado. Perfecto para días fríos o como capa de calentamiento. Capucha con cordón ajustable y bolsillo canguro.',
  'Hoodie premium de felpa pesada con interior afelpado.',
  'hombre','h-hoodies', 58.00, 24.00,
  'Algodón + Poliéster', 'Lavar en frío con colores similares. Secar a baja temperatura.',
  'Regular','hombre',
  '["Felpa 380gsm","Interior afelpado","Cordón ajustable","Bolsillo canguro"]'::jsonb,
  22.0, TRUE, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO producto_composicion (producto_id, material, porcentaje, orden)
SELECT id,'Algodón',70,0 FROM productos WHERE slug='beast-hoodie'
UNION ALL SELECT id,'Poliéster',30,1 FROM productos WHERE slug='beast-hoodie';

INSERT INTO producto_imagenes (producto_id, url, alt, orden, es_principal)
SELECT id,'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=70','Beast Hoodie',0,TRUE FROM productos WHERE slug='beast-hoodie'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=70','Beast Hoodie detalle',1,FALSE FROM productos WHERE slug='beast-hoodie'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?auto=format&fit=crop&w=800&q=70','Beast Hoodie espalda',2,FALSE FROM productos WHERE slug='beast-hoodie'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1614495039153-3e51b6c9d2d6?auto=format&fit=crop&w=800&q=70','Beast Hoodie fit',3,FALSE FROM productos WHERE slug='beast-hoodie';

INSERT INTO variantes (producto_id, sku, talla, color, color_hex)
SELECT id,'BEA-CAR-S','S','Carbón','#262726' FROM productos WHERE slug='beast-hoodie'
UNION ALL SELECT id,'BEA-CAR-M','M','Carbón','#262726' FROM productos WHERE slug='beast-hoodie'
UNION ALL SELECT id,'BEA-CAR-L','L','Carbón','#262726' FROM productos WHERE slug='beast-hoodie'
UNION ALL SELECT id,'BEA-CAR-XL','XL','Carbón','#262726' FROM productos WHERE slug='beast-hoodie'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventario (variante_id, stock, stock_minimo)
SELECT id, 15, 5 FROM variantes WHERE sku LIKE 'BEA-%'
ON CONFLICT (variante_id) DO NOTHING;

-- ============================================================
-- PRODUCTO 3 — Apex Leggings (mujer, bestseller)
-- ============================================================
INSERT INTO productos (nombre, slug, descripcion, descripcion_corta, categoria, subcategoria,
  precio_base, costo, material, cuidado, fit, genero, caracteristicas, peso_oz, destacado, nuevo)
VALUES ('Apex Leggings','apex-leggings',
  'Leggings de compresión high-waist con tejido squat-proof. Soporte total durante sentadillas y peso muerto. Bolsillo lateral para el celular.',
  'Leggings high-waist squat-proof con bolsillo.',
  'mujer','w-leggings', 45.00, 18.00,
  'Nylon + Elastano', 'Lavar en frío. No usar suavizante. Secar al aire.',
  'Compression','mujer',
  '["Squat-proof","High-waist","Bolsillo lateral","Sin transparencias"]'::jsonb,
  8.0, TRUE, FALSE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO producto_composicion (producto_id, material, porcentaje, orden)
SELECT id,'Nylon',76,0 FROM productos WHERE slug='apex-leggings'
UNION ALL SELECT id,'Elastano',24,1 FROM productos WHERE slug='apex-leggings';

INSERT INTO producto_imagenes (producto_id, url, alt, orden, es_principal)
SELECT id,'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=70','Apex Leggings',0,TRUE FROM productos WHERE slug='apex-leggings'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1506629082955-511b1aa562c8?auto=format&fit=crop&w=800&q=70','Apex Leggings detalle',1,FALSE FROM productos WHERE slug='apex-leggings'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=800&q=70','Apex Leggings espalda',2,FALSE FROM productos WHERE slug='apex-leggings'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?auto=format&fit=crop&w=800&q=70','Apex Leggings fit',3,FALSE FROM productos WHERE slug='apex-leggings';

INSERT INTO variantes (producto_id, sku, talla, color, color_hex)
SELECT id,'APX-NEG-XS','XS','Negro','#171717' FROM productos WHERE slug='apex-leggings'
UNION ALL SELECT id,'APX-NEG-S','S','Negro','#171717' FROM productos WHERE slug='apex-leggings'
UNION ALL SELECT id,'APX-NEG-M','M','Negro','#171717' FROM productos WHERE slug='apex-leggings'
UNION ALL SELECT id,'APX-NEG-L','L','Negro','#171717' FROM productos WHERE slug='apex-leggings'
UNION ALL SELECT id,'APX-VOL-S','S','Volt','#DFE44E' FROM productos WHERE slug='apex-leggings'
UNION ALL SELECT id,'APX-VOL-M','M','Volt','#DFE44E' FROM productos WHERE slug='apex-leggings'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventario (variante_id, stock, stock_minimo)
SELECT id, 30, 8 FROM variantes WHERE sku LIKE 'APX-%'
ON CONFLICT (variante_id) DO NOTHING;

-- ============================================================
-- PRODUCTO 4 — Power Sports Bra (mujer)
-- ============================================================
INSERT INTO productos (nombre, slug, descripcion, descripcion_corta, categoria, subcategoria,
  precio_base, costo, material, cuidado, fit, genero, caracteristicas, peso_oz, nuevo)
VALUES ('Power Sports Bra','power-sports-bra',
  'Top deportivo de alto impacto con soporte reforzado. Copas removibles y banda inferior ancha para máxima sujeción en entrenamientos intensos.',
  'Sports bra de alto impacto con copas removibles.',
  'mujer','w-bras', 36.00, 14.00,
  'Poliéster + Elastano', 'Lavar a mano o ciclo delicado. Secar al aire.',
  'Compression','mujer',
  '["Alto impacto","Copas removibles","Banda ancha","Espalda nadadora"]'::jsonb,
  4.0, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO producto_composicion (producto_id, material, porcentaje, orden)
SELECT id,'Poliéster',82,0 FROM productos WHERE slug='power-sports-bra'
UNION ALL SELECT id,'Elastano',18,1 FROM productos WHERE slug='power-sports-bra';

INSERT INTO producto_imagenes (producto_id, url, alt, orden, es_principal)
SELECT id,'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=800&q=70','Power Sports Bra',0,TRUE FROM productos WHERE slug='power-sports-bra'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=70','Sports Bra detalle',1,FALSE FROM productos WHERE slug='power-sports-bra'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=70','Sports Bra espalda',2,FALSE FROM productos WHERE slug='power-sports-bra'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1550345332-09e3ac987658?auto=format&fit=crop&w=800&q=70','Sports Bra fit',3,FALSE FROM productos WHERE slug='power-sports-bra';

INSERT INTO variantes (producto_id, sku, talla, color, color_hex)
SELECT id,'PWB-NEG-S','S','Negro','#171717' FROM productos WHERE slug='power-sports-bra'
UNION ALL SELECT id,'PWB-NEG-M','M','Negro','#171717' FROM productos WHERE slug='power-sports-bra'
UNION ALL SELECT id,'PWB-NEG-L','L','Negro','#171717' FROM productos WHERE slug='power-sports-bra'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventario (variante_id, stock, stock_minimo)
SELECT id, 20, 5 FROM variantes WHERE sku LIKE 'PWB-%'
ON CONFLICT (variante_id) DO NOTHING;

-- ============================================================
-- PRODUCTO 5 — Volt Shaker Bottle (accesorio)
-- ============================================================
INSERT INTO productos (nombre, slug, descripcion, descripcion_corta, categoria, subcategoria,
  precio_base, costo, material, fit, genero, caracteristicas, peso_oz)
VALUES ('Volt Shaker Bottle','volt-shaker-bottle',
  'Shaker de 24oz con bola mezcladora de acero inoxidable y compartimento para suplementos. Libre de BPA. A prueba de derrames.',
  'Shaker 24oz BPA-free con compartimento.',
  'accesorios','a-botellas', 24.00, 7.00,
  'Tritan BPA-free','unisex',
  '["24oz","BPA-free","Bola mezcladora","Compartimento suplementos","A prueba de derrames"]'::jsonb,
  6.0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO producto_imagenes (producto_id, url, alt, orden, es_principal)
SELECT id,'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=70','Volt Shaker',0,TRUE FROM productos WHERE slug='volt-shaker-bottle'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1559717865-a99cac1c95d8?auto=format&fit=crop&w=800&q=70','Shaker detalle',1,FALSE FROM productos WHERE slug='volt-shaker-bottle'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1622484212850-eb596d769edc?auto=format&fit=crop&w=800&q=70','Shaker uso',2,FALSE FROM productos WHERE slug='volt-shaker-bottle'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=800&q=70','Shaker tapa',3,FALSE FROM productos WHERE slug='volt-shaker-bottle';

INSERT INTO variantes (producto_id, sku, talla, color, color_hex)
SELECT id,'VSB-VOL','Único','Volt','#DFE44E' FROM productos WHERE slug='volt-shaker-bottle'
UNION ALL SELECT id,'VSB-NEG','Único','Negro','#171717' FROM productos WHERE slug='volt-shaker-bottle'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventario (variante_id, stock, stock_minimo)
SELECT id, 50, 10 FROM variantes WHERE sku LIKE 'VSB-%'
ON CONFLICT (variante_id) DO NOTHING;

-- ============================================================
-- PRODUCTO 6 — Gym Bag Pro (accesorio)
-- ============================================================
INSERT INTO productos (nombre, slug, descripcion, descripcion_corta, categoria, subcategoria,
  precio_base, costo, material, fit, genero, caracteristicas, peso_oz)
VALUES ('Gym Bag Pro','gym-bag-pro',
  'Bolso de gimnasio resistente al agua con compartimento para zapatos, bolsillo para laptop y correa ajustable. Capacidad 45L.',
  'Bolso 45L resistente al agua con compartimento de zapatos.',
  'accesorios','a-bags', 52.00, 21.00,
  'Poliéster ripstop','unisex',
  '["45L","Resistente al agua","Compartimento zapatos","Bolsillo laptop","Correa ajustable"]'::jsonb,
  32.0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO producto_imagenes (producto_id, url, alt, orden, es_principal)
SELECT id,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=70','Gym Bag Pro',0,TRUE FROM productos WHERE slug='gym-bag-pro'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&w=800&q=70','Gym Bag detalle',1,FALSE FROM productos WHERE slug='gym-bag-pro'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1622560480605-d83c853bc5c3?auto=format&fit=crop&w=800&q=70','Gym Bag interior',2,FALSE FROM productos WHERE slug='gym-bag-pro'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1581605405669-fcdf81165afa?auto=format&fit=crop&w=800&q=70','Gym Bag uso',3,FALSE FROM productos WHERE slug='gym-bag-pro';

INSERT INTO variantes (producto_id, sku, talla, color, color_hex)
SELECT id,'GBP-NEG','Único','Negro','#171717' FROM productos WHERE slug='gym-bag-pro'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventario (variante_id, stock, stock_minimo)
SELECT id, 12, 4 FROM variantes WHERE sku LIKE 'GBP-%'
ON CONFLICT (variante_id) DO NOTHING;

-- ============================================================
-- PRODUCTO 7 — Resistance Bands Set (accesorio, HOT)
-- ============================================================
INSERT INTO productos (nombre, slug, descripcion, descripcion_corta, categoria, subcategoria,
  precio_base, precio_oferta, costo, material, fit, genero, caracteristicas, peso_oz)
VALUES ('Resistance Bands Set','resistance-bands-set',
  'Set de 5 bandas de resistencia de látex natural (5-50 lbs) con bolsa de transporte. Ideal para entrenamiento en casa, calentamiento y rehabilitación.',
  'Set de 5 bandas de látex (5-50 lbs) con bolsa.',
  'accesorios','a-bandas', 36.00, 28.00, 9.00,
  'Látex natural','unisex',
  '["5 niveles","5-50 lbs","Látex natural","Bolsa incluida","Guía de ejercicios"]'::jsonb,
  14.0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO producto_imagenes (producto_id, url, alt, orden, es_principal)
SELECT id,'https://images.unsplash.com/photo-1598971639058-fab3c3109a00?auto=format&fit=crop&w=800&q=70','Resistance Bands',0,TRUE FROM productos WHERE slug='resistance-bands-set'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=800&q=70','Bands detalle',1,FALSE FROM productos WHERE slug='resistance-bands-set'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1517344884509-a0c97ec11bcc?auto=format&fit=crop&w=800&q=70','Bands uso',2,FALSE FROM productos WHERE slug='resistance-bands-set'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1434608519344-49d77a699e1d?auto=format&fit=crop&w=800&q=70','Bands set',3,FALSE FROM productos WHERE slug='resistance-bands-set';

INSERT INTO variantes (producto_id, sku, talla, color, color_hex)
SELECT id,'RBS-SET','Set','Multicolor','#93C83F' FROM productos WHERE slug='resistance-bands-set'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventario (variante_id, stock, stock_minimo)
SELECT id, 40, 10 FROM variantes WHERE sku LIKE 'RBS-%'
ON CONFLICT (variante_id) DO NOTHING;

-- ============================================================
-- PRODUCTO 8 — Lifting Straps (accesorio)
-- ============================================================
INSERT INTO productos (nombre, slug, descripcion, descripcion_corta, categoria, subcategoria,
  precio_base, costo, material, fit, genero, caracteristicas, peso_oz)
VALUES ('Lifting Straps','lifting-straps',
  'Straps de levantamiento de algodón reforzado con acolchado en la muñeca. Mejora el agarre en peso muerto, remo y jalones. Talla única.',
  'Straps de algodón reforzado con acolchado.',
  'accesorios','a-straps', 18.00, 5.00,
  'Algodón reforzado','unisex',
  '["Acolchado","Algodón reforzado","Largo 21in","Agarre extra"]'::jsonb,
  3.0)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO producto_composicion (producto_id, material, porcentaje, orden)
SELECT id,'Algodón',100,0 FROM productos WHERE slug='lifting-straps';

INSERT INTO producto_imagenes (producto_id, url, alt, orden, es_principal)
SELECT id,'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=800&q=70','Lifting Straps',0,TRUE FROM productos WHERE slug='lifting-straps'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=800&q=70','Straps detalle',1,FALSE FROM productos WHERE slug='lifting-straps'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1534258936925-c58bed479fcb?auto=format&fit=crop&w=800&q=70','Straps uso',2,FALSE FROM productos WHERE slug='lifting-straps'
UNION ALL SELECT id,'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?auto=format&fit=crop&w=800&q=70','Straps par',3,FALSE FROM productos WHERE slug='lifting-straps';

INSERT INTO variantes (producto_id, sku, talla, color, color_hex)
SELECT id,'LST-NEG','Único','Negro','#171717' FROM productos WHERE slug='lifting-straps'
UNION ALL SELECT id,'LST-VOL','Único','Volt','#DFE44E' FROM productos WHERE slug='lifting-straps'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO inventario (variante_id, stock, stock_minimo)
SELECT id, 60, 15 FROM variantes WHERE sku LIKE 'LST-%'
ON CONFLICT (variante_id) DO NOTHING;

-- ============================================================
-- Contabilidad demo: registrar costo de inventario inicial
-- ============================================================
INSERT INTO movimientos_contables (tipo, categoria, descripcion, monto, fecha)
VALUES ('gasto','inventario','Compra inventario inicial Drop 001', 2450.00, CURRENT_DATE - 20)
ON CONFLICT DO NOTHING;

-- leads demo (lista de espera)
INSERT INTO leads (email, nombre, origen) VALUES
  ('cliente1@example.com','Carlos R','lista_espera'),
  ('cliente2@example.com','María T','popup')
ON CONFLICT (email) DO NOTHING;
