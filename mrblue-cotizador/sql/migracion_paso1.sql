-- ═══════════════════════════════════════════════════════════════════════════
-- PASO 1 — Mover cronograma e historial de precios de localStorage a Supabase
-- Correr completo en Supabase → SQL Editor. Es idempotente: puedes correrlo
-- más de una vez sin romper nada.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── Cronograma de trabajos ─────────────────────────────────────────────────
-- Un renglón por trabajo confirmado. `pasos` y `proveedores_usados` se guardan
-- como JSON porque su forma cambia según el trabajo (cuántas etapas lleva).
CREATE TABLE IF NOT EXISTS cronograma_trabajos (
  id                       uuid PRIMARY KEY,
  nombre                   text,
  cliente                  text,
  fecha_inicio             date,
  fecha_entrega_estimada   timestamptz,
  horas_totales            numeric,
  proveedores_usados       jsonb DEFAULT '[]'::jsonb,
  pasos                    jsonb DEFAULT '[]'::jsonb,
  completado               boolean DEFAULT false,
  fecha_real_entrega       timestamptz,
  actualizado              timestamptz DEFAULT now(),
  creado_por               text,
  created_at               timestamptz DEFAULT now()
);

-- ── Historial de precios cotizados ─────────────────────────────────────────
-- Cada vez que guardas una cotización con precios queda un renglón aquí,
-- ligado al mismo cot_id, para ver cómo cambió el precio del mismo trabajo.
CREATE TABLE IF NOT EXISTS historial_precios (
  id                      uuid PRIMARY KEY,
  cot_id                  uuid,
  folio                   text,
  nombre                  text,
  cliente                 text,
  fecha                   timestamptz DEFAULT now(),
  tipo                    text,          -- 'cotizacion' | 'pedido_confirmado'
  qty                     integer,
  pliegos                 integer,
  desglose                jsonb DEFAULT '[]'::jsonb,
  costo_total             numeric,
  margen_pct              numeric,
  precio_venta            numeric,
  utilidad                numeric,
  precio_real_proveedor   numeric,
  proveedores_usados      jsonb DEFAULT '[]'::jsonb,
  creado_por              text,
  created_at              timestamptz DEFAULT now()
);

-- Índices para las consultas que de verdad hace la app.
CREATE INDEX IF NOT EXISTS idx_historial_precios_cot_id ON historial_precios (cot_id);
CREATE INDEX IF NOT EXISTS idx_historial_precios_fecha  ON historial_precios (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cronograma_actualizado   ON cronograma_trabajos (actualizado DESC);

-- ── RLS ────────────────────────────────────────────────────────────────────
-- Abiertas por ahora, igual que el resto de tus tablas. En el paso 4 (cuando
-- entre Supabase Auth) estas se aprietan a usuarios autenticados y por
-- organización.
ALTER TABLE cronograma_trabajos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_precios   ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cronograma_all ON cronograma_trabajos;
CREATE POLICY cronograma_all ON cronograma_trabajos
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS historial_all ON historial_precios;
CREATE POLICY historial_all ON historial_precios
  FOR ALL USING (true) WITH CHECK (true);

-- ── Verificación ───────────────────────────────────────────────────────────
SELECT 'cronograma_trabajos' AS tabla, COUNT(*) AS filas FROM cronograma_trabajos
UNION ALL
SELECT 'historial_precios', COUNT(*) FROM historial_precios;
