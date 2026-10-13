-- =============================================================================
-- Agrega a `facturas` la columna `comprobante_url`: guarda la URL/ruta del
-- comprobante (foto de recibo/voucher) subido al servidor Node de Angular.
-- Un solo documento por factura: volver a subir reemplaza el valor. NULL si
-- no se ha subido ninguno todavía.
--
-- Es re-ejecutable: la columna solo se agrega si no existe ya.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'comprobante_url'
)
    ALTER TABLE dbo.facturas ADD comprobante_url NVARCHAR(500) NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.extended_properties
    WHERE major_id = OBJECT_ID('dbo.facturas')
      AND minor_id = (
          SELECT column_id FROM sys.columns
          WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'comprobante_url'
      )
      AND name = 'MS_Description'
)
    EXEC sys.sp_addextendedproperty
        @name = N'MS_Description',
        @value = N'URL/ruta del comprobante (recibo/voucher) asociado a la factura. Un solo documento por factura; NULL si no se ha subido ninguno.',
        @level0type = N'SCHEMA', @level0name = 'dbo',
        @level1type = N'TABLE', @level1name = 'facturas',
        @level2type = N'COLUMN', @level2name = 'comprobante_url';

COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- -----------------------------------------------------------------------------
-- Verificación
-- -----------------------------------------------------------------------------
SELECT c.name AS columna, t.name AS tipo, c.max_length, c.is_nullable
FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE c.object_id = OBJECT_ID('dbo.facturas')
  AND c.name = 'comprobante_url';
