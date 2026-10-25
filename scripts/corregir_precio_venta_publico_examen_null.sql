-- =============================================================================
-- Corrige tipos_examen.precio_venta_publico: agrega la columna si no existe,
-- rellena con 0 cualquier NULL que haya quedado, y la deja NOT NULL.
-- Causa del error "SqlNullValueException: Data is Null" al leer tipos de
-- examen: el backend mapea esta columna como decimal NO nulo (TipoExamen.cs),
-- pero en esta base quedó como NULL (columna agregada nullable sin backfill,
-- o la PARTE 15 de 00_instalacion_completa.sql no terminó de correr).
-- Idempotente: se puede correr las veces que haga falta.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_examen') AND name = 'precio_venta_publico')
BEGIN
    ALTER TABLE dbo.tipos_examen ADD precio_venta_publico DECIMAL(12,2) NULL;
END
GO

UPDATE dbo.tipos_examen SET precio_venta_publico = 0 WHERE precio_venta_publico IS NULL;
GO

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.tipos_examen') AND name = 'precio_venta_publico' AND is_nullable = 1
)
    ALTER TABLE dbo.tipos_examen ALTER COLUMN precio_venta_publico DECIMAL(12,2) NOT NULL;
GO

-- Verificación: debe devolver 0 filas.
SELECT id_tipo_examen, nombre, precio_venta_publico
FROM dbo.tipos_examen
WHERE precio_venta_publico IS NULL;
GO
