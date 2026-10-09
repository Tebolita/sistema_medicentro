-- =============================================================================
-- Agrega id_usuario_creacion / id_usuario_modificacion a las tablas que
-- todavía no las tienen, para poder mostrar "creado por / modificado por"
-- en Mantenimiento (ver AUDITORIA_MANTENIMIENTO.md). El resto de columnas
-- de auditoría (fecha_creacion, fecha_modificacion) ya existen en las 5;
-- solo faltan estas dos.
--
-- Nota: `usuarios` NO está en esta lista — esa tabla YA tiene ambas
-- columnas desde antes; lo que le faltaba era mapearlas en el backend
-- (Entidades/Usuario.cs), no en la base.
--
-- Es re-ejecutable: cada columna solo se agrega si no existe ya.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.habitaciones') AND name = 'id_usuario_creacion')
    ALTER TABLE dbo.habitaciones ADD id_usuario_creacion BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.habitaciones') AND name = 'id_usuario_modificacion')
    ALTER TABLE dbo.habitaciones ADD id_usuario_modificacion BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.permisos') AND name = 'id_usuario_creacion')
    ALTER TABLE dbo.permisos ADD id_usuario_creacion BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.permisos') AND name = 'id_usuario_modificacion')
    ALTER TABLE dbo.permisos ADD id_usuario_modificacion BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_consentimiento') AND name = 'id_usuario_creacion')
    ALTER TABLE dbo.tipos_consentimiento ADD id_usuario_creacion BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_consentimiento') AND name = 'id_usuario_modificacion')
    ALTER TABLE dbo.tipos_consentimiento ADD id_usuario_modificacion BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_examen') AND name = 'id_usuario_creacion')
    ALTER TABLE dbo.tipos_examen ADD id_usuario_creacion BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_examen') AND name = 'id_usuario_modificacion')
    ALTER TABLE dbo.tipos_examen ADD id_usuario_modificacion BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.interaccion_medicamentos') AND name = 'id_usuario_creacion')
    ALTER TABLE dbo.interaccion_medicamentos ADD id_usuario_creacion BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.interaccion_medicamentos') AND name = 'id_usuario_modificacion')
    ALTER TABLE dbo.interaccion_medicamentos ADD id_usuario_modificacion BIGINT NULL;

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
SELECT OBJECT_NAME(c.object_id) AS tabla, c.name AS columna, t.name AS tipo, c.is_nullable
FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE c.object_id IN (
    OBJECT_ID('dbo.habitaciones'), OBJECT_ID('dbo.permisos'), OBJECT_ID('dbo.tipos_consentimiento'),
    OBJECT_ID('dbo.tipos_examen'), OBJECT_ID('dbo.interaccion_medicamentos')
)
AND c.name IN ('id_usuario_creacion', 'id_usuario_modificacion')
ORDER BY tabla, columna;
