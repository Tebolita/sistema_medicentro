-- =============================================================================
-- Siembra el valor COMPROMISO_PAGO en el catálogo TIPO_CONSENTIMIENTO.
--
-- Por qué: el formulario de "Hoja de compromiso de pago" (Emergencias)
-- resuelve el tipo de consentimiento buscando por código
-- (idPorCodigo('TIPO_CONSENTIMIENTO', 'COMPROMISO_PAGO')) en vez de un id
-- fijo — así funciona igual en cualquier base de datos. Pero si esa fila no
-- existe todavía en cat_valor_catalogo, la búsqueda devuelve null y el
-- formulario falla al guardar con "No se pudo guardar: falta cargar el
-- catálogo de tipos de consentimiento." (falla seguro, no usa un id
-- inventado — ver src/app/emergencias/compromiso-formulario/compromiso-formulario.ts).
--
-- Reporte de auditoría relacionado: "Reporte valores quemados en código —
-- MediCentro", sección Emergencias.
--
-- Es re-ejecutable: solo inserta si el código no existe ya en ese catálogo.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

DECLARE @IdTipoCatalogo BIGINT = (
    SELECT id_tipo_catalogo FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_CONSENTIMIENTO'
);

IF @IdTipoCatalogo IS NULL
BEGIN
    THROW 50000, 'No existe el tipo de catálogo TIPO_CONSENTIMIENTO — revisa que sembrar_catalogos.sql ya haya corrido.', 1;
END

IF NOT EXISTS (
    SELECT 1 FROM dbo.cat_valor_catalogo
    WHERE id_tipo_catalogo = @IdTipoCatalogo AND codigo = 'COMPROMISO_PAGO'
)
BEGIN
    DECLARE @SiguienteOrden INT = (
        SELECT ISNULL(MAX(orden), 0) + 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdTipoCatalogo
    );

    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, descripcion, orden, activo, fecha_creacion)
    VALUES (@IdTipoCatalogo, 'COMPROMISO_PAGO', 'Compromiso de pago', 'Consentimiento de compromiso de pago (Emergencias)', @SiguienteOrden, 1, SYSDATETIME());
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
SELECT vc.id_valor_catalogo, vc.codigo, vc.nombre, vc.orden, vc.activo
FROM dbo.cat_valor_catalogo vc
JOIN dbo.cat_tipo_catalogo tc ON tc.id_tipo_catalogo = vc.id_tipo_catalogo
WHERE tc.codigo = 'TIPO_CONSENTIMIENTO' AND vc.codigo = 'COMPROMISO_PAGO';
