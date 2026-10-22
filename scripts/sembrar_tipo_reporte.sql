-- =============================================================================
-- Siembra el tipo de catálogo TIPO_REPORTE (y sus dos valores) — hoy ni
-- siquiera existe la fila en cat_tipo_catalogo, no solo los valores.
--
-- Por qué: POST /api/reportes-generados (ReportesGeneradosController) exige
-- un IdTipoReporte válido; sin esto, cualquier intento de registrar que se
-- generó/exportó un reporte falla por llave foránea. Los dos valores de
-- abajo corresponden a los dos indicadores que ya existen como vista en la
-- base (vw_indicadores_clinicos, vw_indicadores_financieros) — ver
-- SOLICITUD_REPORTERIA_Y_MODULO_CATALOGOS.md.
--
-- Es re-ejecutable: solo crea lo que todavía no exista.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

IF NOT EXISTS (SELECT 1 FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_REPORTE')
BEGIN
    INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, descripcion, activo, fecha_creacion)
    VALUES ('TIPO_REPORTE', 'Tipo de reporte', 'Reportes e indicadores disponibles en el módulo de Reportes y Estadísticas', 1, SYSDATETIME());
END

DECLARE @IdTipoCatalogo BIGINT = (SELECT id_tipo_catalogo FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_REPORTE');

IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdTipoCatalogo AND codigo = 'INDICADORES_CLINICOS')
BEGIN
    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, descripcion, orden, activo, fecha_creacion)
    VALUES (@IdTipoCatalogo, 'INDICADORES_CLINICOS', 'Indicadores clínicos', 'Citas por mes y estado (vw_indicadores_clinicos)', 1, 1, SYSDATETIME());
END

IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdTipoCatalogo AND codigo = 'INDICADORES_FINANCIEROS')
BEGIN
    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, descripcion, orden, activo, fecha_creacion)
    VALUES (@IdTipoCatalogo, 'INDICADORES_FINANCIEROS', 'Indicadores financieros', 'Facturación por mes y estado (vw_indicadores_financieros)', 2, 1, SYSDATETIME());
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
SELECT vc.id_valor_catalogo, vc.codigo, vc.nombre, vc.orden
FROM dbo.cat_valor_catalogo vc
JOIN dbo.cat_tipo_catalogo tc ON tc.id_tipo_catalogo = vc.id_tipo_catalogo
WHERE tc.codigo = 'TIPO_REPORTE'
ORDER BY vc.orden;
