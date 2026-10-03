-- =============================================================================
-- Siembra los catálogos (cat_tipo_catalogo / cat_valor_catalogo) que el
-- backend y el frontend necesitan para Farmacia y Facturación.
--
-- Es re-ejecutable: cada tipo y cada valor solo se inserta si no existe ya
-- (por código), así que no duplica nada si lo corres varias veces.
--
-- Códigos CONFIRMADOS en el código del backend (si faltan, revientan con
-- RecursoNoEncontradoException como el que acabas de ver):
--   TIPO_ITEM_INVENTARIO / MEDICAMENTO        (InventarioFarmaciaService)
--   TIPO_MOVIMIENTO_INVENTARIO / ENTRADA      (InventarioFarmaciaService)
--   ESTADO_ALERTA_STOCK / PENDIENTE           (InventarioFarmaciaService)
--   ESTADO_PAGO / APLICADO, ANULADO           (FacturasService)
--   ESTADO_FACTURA / PAGADA, PENDIENTE        (FacturasService)
--   ESTADO_CXC / PENDIENTE, SALDADA           (FacturasService)
--
-- Los demás (FORMA_PAGO, UNIDAD_MEDIDA, ESTADO_ITEM_INVENTARIO, ESTADO_RECETA,
-- ESTADO_FACTURA/EMITIDA-ANULADA, TIPO_MOVIMIENTO_INVENTARIO/SALIDA-AJUSTE-MERMA,
-- ESTADO_PAGO/ANULADO) los usa el FRONTEND para llenar dropdowns con datos
-- reales; si no existen, el frontend cae solo a su lista de ejemplo (no truena),
-- pero conviene sembrarlos para que se vea la información real.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

DECLARE @Seed TABLE (tipo VARCHAR(50), tipoNombre VARCHAR(100), codigo VARCHAR(50), nombre VARCHAR(100), orden INT);
INSERT INTO @Seed VALUES
 -- Confirmados por el backend
 ('TIPO_ITEM_INVENTARIO','Tipo de item de inventario','MEDICAMENTO','Medicamento',1),
 ('TIPO_ITEM_INVENTARIO','Tipo de item de inventario','INSUMO','Insumo',2),

 ('TIPO_MOVIMIENTO_INVENTARIO','Tipo de movimiento de inventario','ENTRADA','Entrada',1),
 ('TIPO_MOVIMIENTO_INVENTARIO','Tipo de movimiento de inventario','SALIDA','Salida',2),
 ('TIPO_MOVIMIENTO_INVENTARIO','Tipo de movimiento de inventario','AJUSTE','Ajuste',3),
 ('TIPO_MOVIMIENTO_INVENTARIO','Tipo de movimiento de inventario','MERMA','Merma',4),

 ('ESTADO_PAGO','Estado de pago','APLICADO','Aplicado',1),
 ('ESTADO_PAGO','Estado de pago','ANULADO','Anulado',2),

 ('ESTADO_FACTURA','Estado de factura','EMITIDA','Emitida',1),
 ('ESTADO_FACTURA','Estado de factura','PAGADA','Pagada',2),
 ('ESTADO_FACTURA','Estado de factura','ANULADA','Anulada',3),
 ('ESTADO_FACTURA','Estado de factura','PENDIENTE','Pendiente',4),

 ('ESTADO_CXC','Estado de cuenta por cobrar','PENDIENTE','Pendiente',1),
 ('ESTADO_CXC','Estado de cuenta por cobrar','SALDADA','Saldada',2),

 ('ESTADO_ALERTA_STOCK','Estado de alerta de stock','PENDIENTE','Pendiente',1),
 ('ESTADO_ALERTA_STOCK','Estado de alerta de stock','ATENDIDA','Atendida',2),

 -- Usados por el frontend (dropdowns); si faltan, cae a su lista de ejemplo
 ('FORMA_PAGO','Forma de pago','EFECTIVO','Efectivo',1),
 ('FORMA_PAGO','Forma de pago','TARJETA','Tarjeta',2),
 ('FORMA_PAGO','Forma de pago','TRANSFERENCIA','Transferencia',3),
 ('FORMA_PAGO','Forma de pago','CHEQUE','Cheque',4),
 ('FORMA_PAGO','Forma de pago','DEPOSITO','Depósito',5),

 ('UNIDAD_MEDIDA','Unidad de medida','UNIDAD','Unidad',1),
 ('UNIDAD_MEDIDA','Unidad de medida','CAJA','Caja',2),
 ('UNIDAD_MEDIDA','Unidad de medida','FRASCO','Frasco',3),

 ('ESTADO_ITEM_INVENTARIO','Estado de item de inventario','DISPONIBLE','Disponible',1),
 ('ESTADO_ITEM_INVENTARIO','Estado de item de inventario','AGOTADO','Agotado',2),
 ('ESTADO_ITEM_INVENTARIO','Estado de item de inventario','DESCONTINUADO','Descontinuado',3),

 ('ESTADO_RECETA','Estado de receta','EMITIDA','Emitida',1),
 ('ESTADO_RECETA','Estado de receta','SURTIDA','Surtida',2),
 ('ESTADO_RECETA','Estado de receta','CANCELADA','Cancelada',3),

 -- El backend solo valida que el id exista en cat_valor_catalogo (no un
 -- tipo específico), pero por convención debería ser este.
 ('CATEGORIA_MEDICAMENTO','Categoría de medicamento','ANALGESICO','Analgésico',1),
 ('CATEGORIA_MEDICAMENTO','Categoría de medicamento','ANTIBIOTICO','Antibiótico',2),
 ('CATEGORIA_MEDICAMENTO','Categoría de medicamento','ANTIINFLAMATORIO','Antiinflamatorio',3),
 ('CATEGORIA_MEDICAMENTO','Categoría de medicamento','ANTIALERGICO','Antialérgico',4),
 ('CATEGORIA_MEDICAMENTO','Categoría de medicamento','GASTROINTESTINAL','Gastrointestinal',5),
 ('CATEGORIA_MEDICAMENTO','Categoría de medicamento','OTRO','Otro',6);

INSERT INTO cat_tipo_catalogo (codigo, nombre)
SELECT DISTINCT s.tipo, s.tipoNombre FROM @Seed s
WHERE NOT EXISTS (SELECT 1 FROM cat_tipo_catalogo t WHERE t.codigo = s.tipo);

INSERT INTO cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden)
SELECT t.id_tipo_catalogo, s.codigo, s.nombre, s.orden
FROM @Seed s JOIN cat_tipo_catalogo t ON t.codigo = s.tipo
WHERE NOT EXISTS (
    SELECT 1 FROM cat_valor_catalogo v
    WHERE v.id_tipo_catalogo = t.id_tipo_catalogo AND v.codigo = s.codigo);

COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- -----------------------------------------------------------------------------
-- Verificación: todos los tipos y valores que acaba de sembrar/confirmar
-- -----------------------------------------------------------------------------
SELECT t.codigo AS tipo, v.id_valor_catalogo AS id_real, v.codigo, v.nombre, v.orden
FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
WHERE t.codigo IN (
    'TIPO_ITEM_INVENTARIO','TIPO_MOVIMIENTO_INVENTARIO','ESTADO_PAGO','ESTADO_FACTURA',
    'FORMA_PAGO','UNIDAD_MEDIDA','ESTADO_ITEM_INVENTARIO','ESTADO_RECETA','CATEGORIA_MEDICAMENTO',
    'ESTADO_CXC','ESTADO_ALERTA_STOCK'
)
ORDER BY t.codigo, v.orden;
