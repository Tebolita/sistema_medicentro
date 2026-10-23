-- =============================================================================
-- Corrige medicamentos.precio_venta_publico cuando quedó NULL en filas
-- existentes (la columna se agregó sin DEFAULT, así que toda fila que ya
-- existía antes del ALTER quedó en NULL hasta el UPDATE/backfill de
-- motor_consultas_schema.sql, sección 9). La entidad del backend la mapea
-- como decimal NO nulo, así que leer una fila con NULL ahí revienta con
-- SqlNullValueException al listar medicamentos.
--
-- Es re-ejecutable: si la columna no existe, o ya es NOT NULL y sin filas en
-- NULL, no hace nada.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;
BEGIN TRY

IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.medicamentos') AND name = 'precio_venta_publico'
)
BEGIN
    UPDATE dbo.medicamentos SET precio_venta_publico = 0 WHERE precio_venta_publico IS NULL;

    IF EXISTS (
        SELECT 1 FROM sys.columns
        WHERE object_id = OBJECT_ID('dbo.medicamentos') AND name = 'precio_venta_publico' AND is_nullable = 1
    )
        ALTER TABLE dbo.medicamentos ALTER COLUMN precio_venta_publico DECIMAL(12,2) NOT NULL;
END

COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
