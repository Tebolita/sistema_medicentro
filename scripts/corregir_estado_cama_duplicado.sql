-- =============================================================================
-- El catálogo ESTADO_CAMA quedó con dos valores que significan lo mismo:
-- LIBRE (sembrado primero) y DISPONIBLE (sembrado un día después, probable
-- reseed accidental). Todo el código (hospitalizacion-formulario.ts,
-- hospitalizaciones.service.ts, consulta-atencion.ts) solo reconoce el
-- código 'LIBRE' para decidir qué cama aparece como disponible — una cama
-- marcada como DISPONIBLE nunca sale en esas pantallas, aunque sí lo esté.
--
-- Este script: (1) pasa a LIBRE cualquier cama que hoy esté en DISPONIBLE,
-- (2) da de baja el valor DISPONIBLE para que no se vuelva a usar por
-- error. MANTENIMIENTO se queda activo — es un estado real y distinto,
-- solo que hoy ningún código lo usa todavía (ninguna pantalla filtra por
-- él, pero tampoco hay que tocarlo).
--
-- Es re-ejecutable: si ya no hay nada en DISPONIBLE, no hace nada.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;
BEGIN TRY

DECLARE @IdLibre BIGINT = (
    SELECT v.id_valor_catalogo
    FROM dbo.cat_valor_catalogo v
    JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
    WHERE t.codigo = 'ESTADO_CAMA' AND v.codigo = 'LIBRE'
);
DECLARE @IdDisponible BIGINT = (
    SELECT v.id_valor_catalogo
    FROM dbo.cat_valor_catalogo v
    JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
    WHERE t.codigo = 'ESTADO_CAMA' AND v.codigo = 'DISPONIBLE'
);

IF @IdLibre IS NOT NULL AND @IdDisponible IS NOT NULL
BEGIN
    UPDATE dbo.camas SET id_estado_cama = @IdLibre WHERE id_estado_cama = @IdDisponible;

    UPDATE dbo.cat_valor_catalogo SET activo = 0, fecha_modificacion = SYSUTCDATETIME()
    WHERE id_valor_catalogo = @IdDisponible AND activo = 1;
END

COMMIT TRANSACTION;

-- Cuántas camas quedaron libres después de la corrección — para confirmar
-- que el problema reportado ya se resolvió.
SELECT c.id_cama, c.numero_cama, c.id_habitacion
FROM dbo.camas c
WHERE c.id_estado_cama = @IdLibre AND c.activo = 1;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
