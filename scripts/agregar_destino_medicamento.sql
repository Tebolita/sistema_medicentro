-- =============================================================================
-- Catálogo DESTINO_MEDICAMENTO (FARMACIA/CLINICA/AMBOS) + columna
-- medicamentos.id_destino_medicamento — distingue medicamentos que se
-- venden/facturan al paciente (Farmacia) de los que se usan internamente
-- para administrar a hospitalizados (Clínica). Solo informativo: no
-- restringe en qué pantalla se puede usar cada medicamento.
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 26 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esta parte.
-- =============================================================================
USE MEDICENTRO;
GO

BEGIN TRANSACTION;
BEGIN TRY

IF NOT EXISTS (SELECT 1 FROM dbo.cat_tipo_catalogo WHERE codigo = 'DESTINO_MEDICAMENTO')
    INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, codigo_modulo, activo, fecha_creacion)
    VALUES ('DESTINO_MEDICAMENTO', N'Destino del medicamento', 'FARMACIA', 1, SYSUTCDATETIME());

DECLARE @IdDestinoMedicamento BIGINT = (SELECT id_tipo_catalogo FROM dbo.cat_tipo_catalogo WHERE codigo = 'DESTINO_MEDICAMENTO');

IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdDestinoMedicamento AND codigo = 'FARMACIA')
    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden, activo, fecha_creacion)
    VALUES (@IdDestinoMedicamento, 'FARMACIA', N'Farmacia', 1, 1, SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdDestinoMedicamento AND codigo = 'CLINICA')
    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden, activo, fecha_creacion)
    VALUES (@IdDestinoMedicamento, 'CLINICA', N'Clínica', 2, 1, SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdDestinoMedicamento AND codigo = 'AMBOS')
    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden, activo, fecha_creacion)
    VALUES (@IdDestinoMedicamento, 'AMBOS', N'Ambos', 3, 1, SYSUTCDATETIME());

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.medicamentos') AND name = 'id_destino_medicamento')
    ALTER TABLE dbo.medicamentos ADD id_destino_medicamento BIGINT NULL;
GO

-- Verificación.
SELECT t.codigo, v.codigo, v.nombre
FROM dbo.cat_tipo_catalogo t
JOIN dbo.cat_valor_catalogo v ON v.id_tipo_catalogo = t.id_tipo_catalogo
WHERE t.codigo = 'DESTINO_MEDICAMENTO';
SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID('dbo.medicamentos') AND c.name = 'id_destino_medicamento';
GO
