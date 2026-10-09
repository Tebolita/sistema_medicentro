-- =============================================================================
-- Catálogo TIPO_CONSULTA (Primera vez / Reconsulta) para
-- Consulta externa y Expedientes. Ejecutar todo junto. Es re-ejecutable.
-- Nota: la tabla citas no tiene columna para esto; el front lo guarda como
-- texto al inicio de citas.notas ("Tipo de consulta: Reconsulta.").
-- =============================================================================

-- 1) DESCUBRIMIENTO
SELECT t.codigo AS tipo, v.id_valor_catalogo, v.codigo, v.nombre
FROM cat_valor_catalogo v
JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
WHERE t.codigo = 'TIPO_CONSULTA';

-- 2) SIEMBRA (idempotente)
INSERT INTO cat_tipo_catalogo (codigo, nombre, activo, fecha_creacion)
SELECT 'TIPO_CONSULTA', N'Tipo de consulta', 1, SYSDATETIME()
WHERE NOT EXISTS (SELECT 1 FROM cat_tipo_catalogo WHERE codigo = 'TIPO_CONSULTA');

INSERT INTO cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden, activo, fecha_creacion)
SELECT t.id_tipo_catalogo, v.codigo, v.nombre, v.orden, 1, SYSDATETIME()
FROM cat_tipo_catalogo t
CROSS APPLY (VALUES ('PRIMERA_VEZ', N'Primera vez', 1), ('RECONSULTA', N'Reconsulta', 2)) AS v(codigo, nombre, orden)
WHERE t.codigo = 'TIPO_CONSULTA'
  AND NOT EXISTS (
      SELECT 1 FROM cat_valor_catalogo ex
      WHERE ex.id_tipo_catalogo = t.id_tipo_catalogo AND ex.codigo = v.codigo
  );

-- 3) VERIFICACIÓN (debe dar 2 filas, activo = 1)
SELECT t.codigo AS tipo, v.id_valor_catalogo, v.codigo, v.nombre, v.activo
FROM cat_valor_catalogo v
JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
WHERE t.codigo = 'TIPO_CONSULTA'
ORDER BY v.orden;