-- =============================================================================
-- Verifica los ids REALES detrás de los dropdowns de Farmacia y Facturación.
-- Solo lectura (SELECT). Ejecuta y compara con la columna "el front asume".
-- El front y el backend usan ids fijos (1, 2, 3...) porque no hay endpoint
-- de catálogos; si la BD tiene otros ids, se guardan valores equivocados.
-- =============================================================================
SET NOCOUNT ON;

-- 1) Todos los tipos de catálogo que existen (por si los códigos difieren)
SELECT t.id_tipo_catalogo, t.codigo, t.nombre, COUNT(v.id_valor_catalogo) AS valores
FROM cat_tipo_catalogo t LEFT JOIN cat_valor_catalogo v ON v.id_tipo_catalogo = t.id_tipo_catalogo
GROUP BY t.id_tipo_catalogo, t.codigo, t.nombre ORDER BY t.codigo;

-- 2) Valores de los catálogos que usan los dropdowns, con lo que asume el front
SELECT t.codigo AS tipo, v.id_valor_catalogo AS id_real, v.codigo, v.nombre,
       CASE
         WHEN t.codigo = 'UNIDAD_MEDIDA'        THEN '1 Unidad / 2 Caja / 3 Frasco'
         WHEN t.codigo = 'ESTADO_ITEM'          THEN '1 Disponible / 2 Agotado / 3 Descontinuado'
         WHEN t.codigo = 'TIPO_MOVIMIENTO'      THEN '1 Entrada / 2 Salida / 3 Ajuste / 4 Merma (backend: entrada=1, el resto resta)'
         WHEN t.codigo = 'ESTADO_RECETA'        THEN '1 Emitida / 2 Surtida / 3 Cancelada'
         WHEN t.codigo = 'ESTADO_FACTURA'       THEN '1 Emitida / 2 Pagada (backend) / 3 Anulada'
         WHEN t.codigo = 'FORMA_PAGO'           THEN '1 Efectivo / 2 Tarjeta / 3 Transferencia / 4 Cheque / 5 Depósito'
         WHEN t.codigo = 'ESTADO_PAGO'          THEN '1 Aprobado (backend); front: 1 Aplicado / 2 Anulado'
         WHEN t.codigo = 'TIPO_ITEM'            THEN 'backend farmacia: 1 = medicamento; front facturación: 1 Consulta / 2 Tratamiento / 3 Medicamento / 4 Procedimiento  (CONFLICTO)'
         WHEN t.codigo = 'TIPO_DOCUMENTO_FISCAL' THEN 'front/backend usan 1 (factura)'
       END AS el_front_asume
FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
WHERE t.codigo IN ('UNIDAD_MEDIDA','ESTADO_ITEM','TIPO_MOVIMIENTO','ESTADO_RECETA','ESTADO_FACTURA',
                   'FORMA_PAGO','ESTADO_PAGO','TIPO_ITEM','TIPO_DOCUMENTO_FISCAL')
ORDER BY t.codigo, v.id_valor_catalogo;

-- 3) Médicos: el dropdown de recetas usa 1, 2, 3 (Sandoval, Estrada, Fernández)
--    pero id_medico apunta a empleados. Estos son los empleados reales:
SELECT e.id_empleado, e.primer_nombre, e.primer_apellido, e.id_especialidad, e.colegiado
FROM empleados e WHERE e.activo = 1 ORDER BY e.id_empleado;

-- 4) Pacientes y medicamentos reales
SELECT id_paciente, codigo_expediente, primer_nombre, primer_apellido FROM pacientes WHERE activo = 1 ORDER BY id_paciente;
SELECT id_medicamento, nombre FROM medicamentos WHERE activo = 1 ORDER BY id_medicamento;

-- 5) Items de inventario: el backend SOLO lista los que tienen id_tipo_item = 1
SELECT id_item_inventario, nombre, id_tipo_item, id_unidad_medida, id_estado_item, id_medicamento, activo
FROM items_inventario ORDER BY id_item_inventario;
