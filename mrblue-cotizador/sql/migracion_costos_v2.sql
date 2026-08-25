-- Actualiza los parámetros de costo con la recalibración de estados de cuenta
-- (ago-2024 a la fecha): renta $12,000 -> $35,000 y ajuste de nómina.
--
--   tasa_indirecto  15.88%  gasto fijo prorrateado sobre costo directo
--   isr_pct         33%     coeficiente marginal (cambia cada declaración anual)
--   margen_neto_pct 20%     utilidad neta deseada SOBRE VENTA, ya libre de ISR
--
-- El piso NO se guarda: la app lo calcula como neto / (1 - ISR) = 29.85%.

INSERT INTO configuracion (clave, valor) VALUES
  ('tasa_indirecto',  '15.88'),
  ('isr_pct',         '33'),
  ('margen_neto_pct', '20')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, updated_at = now();

SELECT clave, valor FROM configuracion ORDER BY clave;
