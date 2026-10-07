-- =============================================================================
-- Corrige items_inventario.id_tipo_item para que apunte al id REAL de
-- TIPO_ITEM_INVENTARIO/MEDICAMENTO.
--
-- Por qué: el script de datos de prueba anterior (datos_prueba_farmacia_
-- facturacion.sql) sembró su propio catálogo "TIPO_ITEM" (no el
-- "TIPO_ITEM_INVENTARIO" que usa el backend de verdad) y guardó los items
-- con ESE id equivocado. Backend/InventarioFarmaciaService.cs filtra el
-- listado con `IdTipoItem == idTipoMedicamento` resuelto desde
-- TIPO_ITEM_INVENTARIO/MEDICAMENTO: si el id no coincide, el listado (y el
-- dropdown "Medicamento" de Venta de medicamentos / Movimiento) sale vacío,
-- aunque los items existan en la tabla.
--
-- Requiere haber corrido antes scripts/sembrar_catalogos.sql (para que
-- TIPO_ITEM_INVENTARIO/MEDICAMENTO ya exista).
--
-- Es seguro re-ejecutarlo: si ya están correctos, el UPDATE no cambia nada.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

DECLARE @IdCorrecto BIGINT = (
    SELECT v.id_valor_catalogo
    FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
    WHERE t.codigo = 'TIPO_ITEM_INVENTARIO' AND v.codigo = 'MEDICAMENTO'
);

IF @IdCorrecto IS NULL
    THROW 50000, 'No existe TIPO_ITEM_INVENTARIO/MEDICAMENTO. Corre primero scripts/sembrar_catalogos.sql.', 1;

-- Todos los items_inventario de este sistema son medicamentos de farmacia
-- (no hay otro tipo de item en la UI todavía), así que se homologan todos.
UPDATE items_inventario
SET id_tipo_item = @IdCorrecto
WHERE id_tipo_item <> @IdCorrecto OR id_tipo_item IS NULL;

COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- -----------------------------------------------------------------------------
-- Verificación: todos deben quedar con el mismo id_tipo_item (el correcto)
-- -----------------------------------------------------------------------------
SELECT id_item_inventario, nombre, id_tipo_item, activo
FROM items_inventario
ORDER BY id_item_inventario;
