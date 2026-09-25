-- =============================================================================
-- Quita los datos de prueba de datos_prueba_farmacia_facturacion.sql
-- La BD bloquea el DELETE físico (trigger), así que se hace BAJA LÓGICA
-- (activo = 0), que es lo que la API ya ignora en sus listados.
--
-- NO toca: EXP-0001 (paciente tuyo), catálogos (cat_*), empleados.
-- Ojo: los items/medicamentos se identifican por NOMBRE (los 5 del script).
-- Si tienes reales con esos mismos nombres, revisa antes de ejecutar.
-- =============================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

-- Facturación: FAC-9001..9003 con sus detalles y pagos
UPDATE p SET activo = 0
FROM pagos p JOIN facturas f ON f.id_factura = p.id_factura
WHERE f.numero_documento IN ('FAC-9001','FAC-9002','FAC-9003');

UPDATE d SET activo = 0
FROM factura_detalle d JOIN facturas f ON f.id_factura = d.id_factura
WHERE f.numero_documento IN ('FAC-9001','FAC-9002','FAC-9003');

UPDATE facturas SET activo = 0
WHERE numero_documento IN ('FAC-9001','FAC-9002','FAC-9003');

-- Recetas de prueba (firma_digital_hash = 'PRUEBA') y sus detalles
UPDATE d SET activo = 0
FROM receta_detalle d JOIN recetas r ON r.id_receta = d.id_receta
WHERE r.firma_digital_hash = 'PRUEBA';

UPDATE recetas SET activo = 0 WHERE firma_digital_hash = 'PRUEBA';

-- Inventario: movimientos e items de los 5 medicamentos de prueba
DECLARE @Nombres TABLE (nombre NVARCHAR(150));
INSERT INTO @Nombres VALUES (N'Amoxicilina 500mg'), (N'Paracetamol 500mg'), (N'Ibuprofeno 400mg'),
                            (N'Loratadina 10mg'), (N'Omeprazol 20mg');

UPDATE m SET activo = 0
FROM movimientos_inventario m JOIN items_inventario i ON i.id_item_inventario = m.id_item_inventario
WHERE i.nombre IN (SELECT nombre FROM @Nombres);

UPDATE items_inventario SET activo = 0 WHERE nombre IN (SELECT nombre FROM @Nombres);
UPDATE medicamentos    SET activo = 0 WHERE nombre IN (SELECT nombre FROM @Nombres);

-- Pacientes de prueba (EXP-0001 NO se toca)
UPDATE pacientes SET activo = 0 WHERE codigo_expediente IN ('EXP-0002','EXP-0003');

COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- Verificación: todo debe salir en 0 activos
SELECT 'facturas'   AS tabla, COUNT(*) AS activos FROM facturas   WHERE numero_documento LIKE 'FAC-900%' AND activo = 1
UNION ALL SELECT 'recetas',   COUNT(*) FROM recetas   WHERE firma_digital_hash = 'PRUEBA' AND activo = 1
UNION ALL SELECT 'items',     COUNT(*) FROM items_inventario WHERE nombre IN (N'Amoxicilina 500mg', N'Paracetamol 500mg', N'Ibuprofeno 400mg', N'Loratadina 10mg', N'Omeprazol 20mg') AND activo = 1
UNION ALL SELECT 'pacientes', COUNT(*) FROM pacientes WHERE codigo_expediente IN ('EXP-0002','EXP-0003') AND activo = 1;
