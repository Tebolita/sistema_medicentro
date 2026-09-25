-- =============================================================================
-- Datos de PRUEBA para los módulos Farmacia y Facturación y Cobros
-- Toca: cat_tipo_catalogo/cat_valor_catalogo (solo si faltan), pacientes,
--       medicamentos, items_inventario, movimientos_inventario, recetas,
--       receta_detalle, facturas, factura_detalle, pagos
--
-- - Es re-ejecutable: cada bloque revisa si su dato de prueba ya existe.
-- - Los ids de catálogo se RESUELVEN por (tipo, código); no se asumen.
--   Si un valor no existe se crea. Al final hay una consulta que muestra los
--   ids reales, porque el backend usa ids fijos (movimiento entrada = 1,
--   factura pagada = 2, pago aprobado = 1) y hay que verificar que coincidan.
-- - Requiere al menos un empleado en `empleados` (lo crea insertar_usuario.sql);
--   se usa como médico de las recetas.
-- - Los nombres de columna de pacientes, items_inventario, movimientos y
--   facturación salen de las entidades del backend. Los de `medicamentos`
--   salen del modelo TypeScript (el backend aún no tiene esa entidad): si
--   tu tabla difiere, ajusta el bloque 3.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

-- -----------------------------------------------------------------------------
-- 1) Catálogos necesarios (se crean solo si faltan)
-- -----------------------------------------------------------------------------
DECLARE @Seed TABLE (tipo VARCHAR(50), tipoNombre VARCHAR(100), codigo VARCHAR(50), nombre VARCHAR(100), orden INT);
INSERT INTO @Seed VALUES
 ('ESTADO_PACIENTE','Estado de paciente','ACTIVO','Activo',1),
 ('TIPO_ITEM','Tipo de item','MEDICAMENTO','Medicamento',1),
 ('TIPO_ITEM','Tipo de item','INSUMO','Insumo',2),
 ('UNIDAD_MEDIDA','Unidad de medida','UNIDAD','Unidad',1),
 ('UNIDAD_MEDIDA','Unidad de medida','CAJA','Caja',2),
 ('UNIDAD_MEDIDA','Unidad de medida','FRASCO','Frasco',3),
 ('ESTADO_ITEM','Estado de item','DISPONIBLE','Disponible',1),
 ('ESTADO_ITEM','Estado de item','AGOTADO','Agotado',2),
 ('ESTADO_ITEM','Estado de item','DESCONTINUADO','Descontinuado',3),
 ('TIPO_MOVIMIENTO','Tipo de movimiento','ENTRADA','Entrada',1),
 ('TIPO_MOVIMIENTO','Tipo de movimiento','SALIDA','Salida',2),
 ('TIPO_MOVIMIENTO','Tipo de movimiento','AJUSTE','Ajuste',3),
 ('TIPO_MOVIMIENTO','Tipo de movimiento','MERMA','Merma',4),
 ('ESTADO_RECETA','Estado de receta','EMITIDA','Emitida',1),
 ('ESTADO_RECETA','Estado de receta','SURTIDA','Surtida',2),
 ('ESTADO_RECETA','Estado de receta','CANCELADA','Cancelada',3),
 ('TIPO_DOCUMENTO_FISCAL','Tipo de documento fiscal','FACTURA','Factura',1),
 ('ESTADO_FACTURA','Estado de factura','EMITIDA','Emitida',1),
 ('ESTADO_FACTURA','Estado de factura','PAGADA','Pagada',2),
 ('ESTADO_FACTURA','Estado de factura','ANULADA','Anulada',3),
 ('FORMA_PAGO','Forma de pago','EFECTIVO','Efectivo',1),
 ('FORMA_PAGO','Forma de pago','TARJETA','Tarjeta',2),
 ('FORMA_PAGO','Forma de pago','TRANSFERENCIA','Transferencia',3),
 ('FORMA_PAGO','Forma de pago','CHEQUE','Cheque',4),
 ('FORMA_PAGO','Forma de pago','DEPOSITO','Depósito',5),
 ('ESTADO_PAGO','Estado de pago','APROBADO','Aprobado',1),
 ('ESTADO_PAGO','Estado de pago','ANULADO','Anulado',2);

INSERT INTO cat_tipo_catalogo (codigo, nombre)
SELECT DISTINCT s.tipo, s.tipoNombre FROM @Seed s
WHERE NOT EXISTS (SELECT 1 FROM cat_tipo_catalogo t WHERE t.codigo = s.tipo);

INSERT INTO cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden)
SELECT t.id_tipo_catalogo, s.codigo, s.nombre, s.orden
FROM @Seed s JOIN cat_tipo_catalogo t ON t.codigo = s.tipo
WHERE NOT EXISTS (
    SELECT 1 FROM cat_valor_catalogo v
    WHERE v.id_tipo_catalogo = t.id_tipo_catalogo AND v.codigo = s.codigo);

-- Resolución de ids por (tipo, código)
DECLARE
 @EstPacActivo   BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='ESTADO_PACIENTE' AND v.codigo='ACTIVO'),
 @TipoItemMed    BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='TIPO_ITEM' AND v.codigo='MEDICAMENTO'),
 @UniUnidad      BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='UNIDAD_MEDIDA' AND v.codigo='UNIDAD'),
 @UniCaja        BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='UNIDAD_MEDIDA' AND v.codigo='CAJA'),
 @UniFrasco      BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='UNIDAD_MEDIDA' AND v.codigo='FRASCO'),
 @EstItemDisp    BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='ESTADO_ITEM' AND v.codigo='DISPONIBLE'),
 @MovEntrada     BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='TIPO_MOVIMIENTO' AND v.codigo='ENTRADA'),
 @MovSalida      BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='TIPO_MOVIMIENTO' AND v.codigo='SALIDA'),
 @RecEmitida     BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='ESTADO_RECETA' AND v.codigo='EMITIDA'),
 @RecSurtida     BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='ESTADO_RECETA' AND v.codigo='SURTIDA'),
 @DocFactura     BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='TIPO_DOCUMENTO_FISCAL' AND v.codigo='FACTURA'),
 @FacEmitida     BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='ESTADO_FACTURA' AND v.codigo='EMITIDA'),
 @FacPagada      BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='ESTADO_FACTURA' AND v.codigo='PAGADA'),
 @PagoEfectivo   BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='FORMA_PAGO' AND v.codigo='EFECTIVO'),
 @PagoTarjeta    BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='FORMA_PAGO' AND v.codigo='TARJETA'),
 @PagoAprobado   BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='ESTADO_PAGO' AND v.codigo='APROBADO');

DECLARE @IdMedico BIGINT = (SELECT TOP 1 id_empleado FROM empleados ORDER BY id_empleado);
IF @IdMedico IS NULL
    THROW 50000, 'No hay empleados en la tabla empleados. Ejecuta primero insertar_usuario.sql.', 1;

-- -----------------------------------------------------------------------------
-- 2) Pacientes de prueba (EXP-0002 y EXP-0003; EXP-0001 ya debe existir)
-- -----------------------------------------------------------------------------
INSERT INTO pacientes (codigo_expediente, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
                       fecha_nacimiento, telefono_principal, correo, direccion, id_estado_paciente)
SELECT v.cod, v.pn, v.sn, v.pa, v.sa, v.nac, v.tel, v.correo, v.dir, @EstPacActivo
FROM (VALUES
 ('EXP-0002', N'Carlos', NULL,        N'Ramírez', N'Morales', CAST('1975-11-02' AS DATE), N'5522-3344', N'carlos.ramirez@correo.test', N'Cuilapa, Santa Rosa'),
 ('EXP-0003', N'Ana',    N'Lucía',    N'Pérez',   NULL,       CAST('2001-07-25' AS DATE), N'5533-4455', NULL,                          N'Barberena, Santa Rosa')
) AS v(cod, pn, sn, pa, sa, nac, tel, correo, dir)
WHERE NOT EXISTS (SELECT 1 FROM pacientes p WHERE p.codigo_expediente = v.cod);

DECLARE @P1 BIGINT = (SELECT id_paciente FROM pacientes WHERE codigo_expediente='EXP-0001'),
        @P2 BIGINT = (SELECT id_paciente FROM pacientes WHERE codigo_expediente='EXP-0002'),
        @P3 BIGINT = (SELECT id_paciente FROM pacientes WHERE codigo_expediente='EXP-0003');

-- -----------------------------------------------------------------------------
-- 3) Medicamentos (columnas según el modelo TypeScript `Medicamento`)
-- -----------------------------------------------------------------------------
INSERT INTO medicamentos (nombre, principio_activo, presentacion, concentracion, requiere_receta)
SELECT v.nombre, v.pa, v.pres, v.conc, v.rr
FROM (VALUES
 (N'Amoxicilina 500mg',  N'Amoxicilina',  N'Cápsulas',  N'500 mg', CAST(1 AS BIT)),
 (N'Paracetamol 500mg',  N'Paracetamol',  N'Tabletas',  N'500 mg', CAST(0 AS BIT)),
 (N'Ibuprofeno 400mg',   N'Ibuprofeno',   N'Tabletas',  N'400 mg', CAST(0 AS BIT)),
 (N'Loratadina 10mg',    N'Loratadina',   N'Tabletas',  N'10 mg',  CAST(0 AS BIT)),
 (N'Omeprazol 20mg',     N'Omeprazol',    N'Cápsulas',  N'20 mg',  CAST(0 AS BIT))
) AS v(nombre, pa, pres, conc, rr)
WHERE NOT EXISTS (SELECT 1 FROM medicamentos m WHERE m.nombre = v.nombre);

DECLARE @MAmox BIGINT = (SELECT id_medicamento FROM medicamentos WHERE nombre=N'Amoxicilina 500mg'),
        @MPara BIGINT = (SELECT id_medicamento FROM medicamentos WHERE nombre=N'Paracetamol 500mg'),
        @MIbu  BIGINT = (SELECT id_medicamento FROM medicamentos WHERE nombre=N'Ibuprofeno 400mg'),
        @MLora BIGINT = (SELECT id_medicamento FROM medicamentos WHERE nombre=N'Loratadina 10mg'),
        @MOme  BIGINT = (SELECT id_medicamento FROM medicamentos WHERE nombre=N'Omeprazol 20mg');

-- -----------------------------------------------------------------------------
-- 4) Inventario de farmacia: stock inicial = una ENTRADA. Dos items quedan
--    bajo el mínimo para probar la alerta de "bajo stock".
--    (bajo_stock es columna calculada: no se inserta)
-- -----------------------------------------------------------------------------
INSERT INTO items_inventario (id_medicamento, nombre, id_tipo_item, id_unidad_medida, stock_minimo, stock_actual, id_estado_item)
SELECT v.med, v.nombre, @TipoItemMed, v.uni, v.minimo, v.actual, @EstItemDisp
FROM (VALUES
 (@MAmox, N'Amoxicilina 500mg',  @UniCaja,   20, 80),
 (@MPara, N'Paracetamol 500mg',  @UniCaja,   30, 150),
 (@MIbu,  N'Ibuprofeno 400mg',   @UniCaja,   25, 10),   -- bajo stock
 (@MLora, N'Loratadina 10mg',    @UniCaja,   15, 45),
 (@MOme,  N'Omeprazol 20mg',     @UniFrasco, 10, 4)     -- bajo stock
) AS v(med, nombre, uni, minimo, actual)
WHERE NOT EXISTS (SELECT 1 FROM items_inventario i WHERE i.nombre = v.nombre);

INSERT INTO movimientos_inventario (id_item_inventario, id_tipo_movimiento, cantidad, motivo)
SELECT i.id_item_inventario, @MovEntrada, i.stock_actual, N'Stock inicial (datos de prueba)'
FROM items_inventario i
WHERE i.id_medicamento IN (@MAmox, @MPara, @MIbu, @MLora, @MOme)
  AND NOT EXISTS (SELECT 1 FROM movimientos_inventario m WHERE m.id_item_inventario = i.id_item_inventario);

-- -----------------------------------------------------------------------------
-- 5) Recetas de prueba (2, cada una con 2 medicamentos)
--    Se identifican por paciente + firma_digital_hash = 'PRUEBA'
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM recetas WHERE id_paciente=@P1 AND firma_digital_hash='PRUEBA')
BEGIN
    INSERT INTO recetas (id_paciente, id_medico, id_estado_receta, firma_digital_hash) VALUES (@P1, @IdMedico, @RecEmitida, 'PRUEBA');
    DECLARE @R1 BIGINT = SCOPE_IDENTITY();
    INSERT INTO receta_detalle (id_receta, id_medicamento, dosis, frecuencia, duracion, indicaciones) VALUES
     (@R1, @MAmox, N'500 mg', N'Cada 8 horas', N'7 días', N'Tomar con alimentos'),
     (@R1, @MPara, N'500 mg', N'Cada 6 horas si hay dolor o fiebre', N'3 días', NULL);
END

IF NOT EXISTS (SELECT 1 FROM recetas WHERE id_paciente=@P2 AND firma_digital_hash='PRUEBA')
BEGIN
    INSERT INTO recetas (id_paciente, id_medico, id_estado_receta, firma_digital_hash) VALUES (@P2, @IdMedico, @RecSurtida, 'PRUEBA');
    DECLARE @R2 BIGINT = SCOPE_IDENTITY();
    INSERT INTO receta_detalle (id_receta, id_medicamento, dosis, frecuencia, duracion, indicaciones) VALUES
     (@R2, @MOme,  N'20 mg',  N'Una vez al día en ayunas', N'14 días', N'30 minutos antes del desayuno'),
     (@R2, @MIbu,  N'400 mg', N'Cada 8 horas',             N'5 días',  N'Después de comer');
END

-- -----------------------------------------------------------------------------
-- 6) Facturas de prueba. IVA 12% sobre (subtotal - descuento), igual que el
--    backend. Números FAC-9001..9003 para no chocar con los que genera la API.
--      FAC-9001: emitida, sin pagos          (para probar "registrar pago")
--      FAC-9002: emitida, con pago PARCIAL   (para probar el saldo pendiente)
--      FAC-9003: pagada, con pago total
-- -----------------------------------------------------------------------------
DECLARE @Fac TABLE (num VARCHAR(20), pac BIGINT, desc_ DECIMAL(12,2), estado BIGINT);
INSERT INTO @Fac VALUES ('FAC-9001',@P1,0,@FacEmitida), ('FAC-9002',@P2,10,@FacEmitida), ('FAC-9003',@P3,0,@FacPagada);

-- Detalle por factura (num, descripción, cantidad, precio, descuento, tipo item: 1 consulta / 3 medicamento)
DECLARE @Det TABLE (num VARCHAR(20), descripcion NVARCHAR(200), cant DECIMAL(12,2), precio DECIMAL(12,2), descu DECIMAL(12,2), tipo BIGINT);
INSERT INTO @Det VALUES
 ('FAC-9001', N'Consulta médica general', 1, 150, 0, @TipoItemMed),
 ('FAC-9001', N'Amoxicilina 500mg',       2, 45,  0, @TipoItemMed),
 ('FAC-9002', N'Consulta de control',     1, 120, 0, @TipoItemMed),
 ('FAC-9002', N'Omeprazol 20mg',          1, 85,  5, @TipoItemMed),
 ('FAC-9003', N'Consulta pediátrica',     1, 200, 0, @TipoItemMed);

INSERT INTO facturas (id_paciente, id_tipo_documento_fiscal, serie, numero_documento, subtotal, descuento, impuesto, total, id_estado_factura)
SELECT f.pac, @DocFactura, 'A', f.num,
       s.sub, f.desc_,
       ROUND((s.sub - f.desc_) * 0.12, 2),
       (s.sub - f.desc_) + ROUND((s.sub - f.desc_) * 0.12, 2),
       f.estado
FROM @Fac f
CROSS APPLY (SELECT SUM(d.cant * d.precio - d.descu) AS sub FROM @Det d WHERE d.num = f.num) s
WHERE NOT EXISTS (SELECT 1 FROM facturas x WHERE x.numero_documento = f.num);

INSERT INTO factura_detalle (id_factura, id_tipo_item, descripcion, cantidad, precio_unitario, descuento, subtotal)
SELECT fa.id_factura, d.tipo, d.descripcion, d.cant, d.precio, d.descu, d.cant * d.precio - d.descu
FROM @Det d JOIN facturas fa ON fa.numero_documento = d.num
WHERE NOT EXISTS (SELECT 1 FROM factura_detalle x WHERE x.id_factura = fa.id_factura);

-- Pagos: 9002 abona Q100 (parcial), 9003 paga el total
INSERT INTO pagos (id_factura, monto, id_forma_pago, id_estado_pago, referencia_pago, observaciones)
-- (monto NULL en el VALUES = "el total de la factura")
SELECT fa.id_factura, ISNULL(v.monto, fa.total), v.forma, @PagoAprobado, v.ref, v.obs
FROM (VALUES
 ('FAC-9002', CAST(100.00 AS DECIMAL(12,2)), @PagoEfectivo, CAST(NULL AS NVARCHAR(100)), N'Abono parcial (prueba)'),
 ('FAC-9003', CAST(NULL AS DECIMAL(12,2)),   @PagoTarjeta,  N'VOUCHER-0001',              N'Pago total (prueba)')
) AS v(num, monto, forma, ref, obs)
JOIN facturas fa ON fa.numero_documento = v.num
WHERE NOT EXISTS (SELECT 1 FROM pagos p WHERE p.id_factura = fa.id_factura);

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
-- Ids reales de catálogo: el backend asume TIPO_MOVIMIENTO.ENTRADA=1,
-- ESTADO_FACTURA.PAGADA=2 y ESTADO_PAGO.APROBADO=1. Si aquí salen otros
-- valores, hay que ajustar el backend o los catálogos.
SELECT t.codigo AS tipo, v.codigo, v.id_valor_catalogo
FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
WHERE t.codigo IN ('TIPO_MOVIMIENTO','ESTADO_FACTURA','ESTADO_PAGO','FORMA_PAGO','TIPO_ITEM','ESTADO_RECETA')
ORDER BY t.codigo, v.orden;

SELECT i.id_item_inventario, i.nombre, i.stock_actual, i.stock_minimo, i.bajo_stock FROM items_inventario i ORDER BY i.nombre;

SELECT r.id_receta, p.primer_nombre, p.primer_apellido, COUNT(d.id_receta_detalle) AS medicamentos
FROM recetas r JOIN pacientes p ON p.id_paciente = r.id_paciente
LEFT JOIN receta_detalle d ON d.id_receta = r.id_receta
WHERE r.firma_digital_hash = 'PRUEBA' GROUP BY r.id_receta, p.primer_nombre, p.primer_apellido;

SELECT f.numero_documento, f.subtotal, f.descuento, f.impuesto, f.total, f.id_estado_factura,
       ISNULL((SELECT SUM(monto) FROM pagos p WHERE p.id_factura = f.id_factura), 0) AS pagado
FROM facturas f WHERE f.numero_documento LIKE 'FAC-900%' ORDER BY f.numero_documento;
