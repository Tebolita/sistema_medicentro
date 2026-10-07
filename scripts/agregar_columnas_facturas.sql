-- =============================================================================
-- Agrega a `facturas` las columnas opcionales que el backend ya espera
-- (Entidades/Factura.cs y Data/MedicentroDbContext.cs) pero que tu tabla no
-- tiene: numero_autorizacion_fel, fecha_certificacion_fel, id_convenio.
--
-- Por qué esto es probablemente la causa del crash: si la tabla `facturas`
-- de tu base no tiene estas 3 columnas, CUALQUIER INSERT/UPDATE de factura
-- (por ejemplo, al presionar "Guardar factura" después de subir el
-- comprobante) hace que Entity Framework mande una consulta con columnas
-- que no existen → SqlException "Invalid column name...". Si esa excepción
-- no queda bien atrapada en el proceso del backend, tumba todo el proceso
-- en vez de solo devolver un error 500 — coincide con el código -1 que
-- viste. La subida de la imagen en sí NO toca tu backend .NET (va al
-- servidor propio de Angular), así que el crash casi seguro pasa al
-- guardar la factura justo después.
--
-- Es re-ejecutable: cada columna solo se agrega si no existe ya.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'numero_autorizacion_fel'
)
    ALTER TABLE dbo.facturas ADD numero_autorizacion_fel NVARCHAR(100) NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'fecha_certificacion_fel'
)
    ALTER TABLE dbo.facturas ADD fecha_certificacion_fel DATETIME2 NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'id_convenio'
)
    ALTER TABLE dbo.facturas ADD id_convenio BIGINT NULL;

-- FK opcional hacia convenios, solo si esa tabla existe en tu base y la
-- columna se acaba de crear sin datos previos que pudieran violarla.
IF OBJECT_ID('dbo.convenios') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_facturas_convenios'
   )
BEGIN
    ALTER TABLE dbo.facturas
        ADD CONSTRAINT FK_facturas_convenios FOREIGN KEY (id_convenio)
        REFERENCES dbo.convenios (id_convenio);
END

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
  AND c.name IN ('numero_autorizacion_fel', 'fecha_certificacion_fel', 'id_convenio');
