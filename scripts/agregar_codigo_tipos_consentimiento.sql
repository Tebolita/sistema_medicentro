-- =============================================================================
-- Agrega la columna `codigo` a dbo.tipos_consentimiento.
--
-- Por qué: el backend (Entidades/TipoConsentimiento.cs + MedicentroDbContext)
-- mapea la propiedad Codigo a la columna `codigo`, pero el esquema de la base
-- no la tiene. Resultado: "Invalid column name 'codigo'" al crear/editar/
-- listar tipos de consentimiento, y también en Emergencias -> Hoja de
-- compromiso de pago, que busca su tipo por código (COMPROMISO_PAGO).
--
-- Qué hace (re-ejecutable):
--   1) Agrega `codigo NVARCHAR(50)` si no existe.
--   2) Rellena los registros existentes que no tengan código:
--        - el de "compromiso de pago" -> COMPROMISO_PAGO
--        - el resto -> TIPO_<id> (se puede cambiar luego desde
--          Mantenimiento -> Tipos de consentimiento)
--   3) La deja NOT NULL y con índice único.
--   4) Crea el tipo COMPROMISO_PAGO si todavía no existe.
-- =============================================================================

SET NOCOUNT ON;

-- 1) Columna
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_consentimiento') AND name = 'codigo')
BEGIN
    ALTER TABLE dbo.tipos_consentimiento ADD codigo NVARCHAR(50) NULL;
    PRINT 'Columna codigo agregada.';
END
GO

-- 2) Rellenar códigos de los registros existentes
SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE dbo.tipos_consentimiento
SET codigo = 'COMPROMISO_PAGO'
WHERE codigo IS NULL
  AND id_tipo_consentimiento = (
      SELECT MIN(id_tipo_consentimiento) FROM dbo.tipos_consentimiento
      WHERE LOWER(nombre) LIKE '%compromiso%pago%'
  )
  AND NOT EXISTS (SELECT 1 FROM dbo.tipos_consentimiento WHERE codigo = 'COMPROMISO_PAGO');

UPDATE dbo.tipos_consentimiento
SET codigo = CONCAT('TIPO_', id_tipo_consentimiento)
WHERE codigo IS NULL OR LTRIM(RTRIM(codigo)) = '';

COMMIT TRANSACTION;
GO

-- 3) NOT NULL + único
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_consentimiento') AND name = 'codigo' AND is_nullable = 1)
    ALTER TABLE dbo.tipos_consentimiento ALTER COLUMN codigo NVARCHAR(50) NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_tipos_consentimiento_codigo' AND object_id = OBJECT_ID('dbo.tipos_consentimiento'))
    CREATE UNIQUE NONCLUSTERED INDEX ux_tipos_consentimiento_codigo ON dbo.tipos_consentimiento (codigo);
GO

-- 4) Tipo que usa Emergencias -> Hoja de compromiso de pago
IF NOT EXISTS (SELECT 1 FROM dbo.tipos_consentimiento WHERE codigo = 'COMPROMISO_PAGO')
    INSERT INTO dbo.tipos_consentimiento (codigo, nombre, plantilla_texto, activo, fecha_creacion)
    VALUES ('COMPROMISO_PAGO', N'Compromiso de pago', NULL, 1, SYSDATETIME());
GO

-- Verificación
SELECT id_tipo_consentimiento, codigo, nombre, activo
FROM dbo.tipos_consentimiento
ORDER BY id_tipo_consentimiento;
