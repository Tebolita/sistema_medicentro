-- =============================================================================
-- Asigna cat_tipo_catalogo.codigo_modulo a TODOS los tipos de catálogo que
-- hoy existen en la base, usando los códigos reales de MODULO_SISTEMA (ver
-- SOLICITUD_REPORTERIA_Y_MODULO_CATALOGOS.md, sección 2, y
-- src/app/shared/menu-data.ts -> CODIGO_MODULO_A_SLUG).
--
-- Se agregan DOS valores nuevos a MODULO_SISTEMA que todavía no existían:
--   - GENERAL: catálogos que no pertenecen a un módulo clínico/administrativo
--     concreto (MODULO_SISTEMA mismo, Salas).
--   - REPORTES: para TIPO_REPORTE (Módulo 9, ver sembrar_tipo_reporte.sql).
--     menu-data.ts ya esperaba este código en CODIGO_MODULO_A_SLUG; solo
--     faltaba sembrarlo como valor real del catálogo.
--
-- Criterio usado para cada grupo: a qué MenuSection pertenece la pantalla
-- que de verdad usa ese catálogo (ver los modelos en src/app/models/*.ts y
-- las rutas en menu-data.ts), no necesariamente dónde vive su pantalla de
-- Mantenimiento (p. ej. "Convenios" se administra desde Mantenimiento, pero
-- el dato es de Seguros Médicos — ver seguro.model.ts, "Módulo 12").
--
-- LIMPIEZA — 7 códigos no se encontraron referenciados en ningún .ts del
-- frontend ni del backend (ESTADO_ITEM, TIPO_ITEM, TIPO_MOVIMIENTO,
-- TIPO_GENERO, TIPO_ACCION, EJEMPLO, TEBOLITA): son catálogos de prueba o
-- duplicados de otros ya existentes (p. ej. TIPO_ITEM_INVENTARIO,
-- TIPO_MOVIMIENTO_INVENTARIO, GENERO). En vez de categorizarlos, este
-- script los da de baja (activo = 0, tanto el tipo como sus valores) para
-- que dejen de aparecer en GET /api/catalogos — es borrado lógico, no
-- DELETE, así que sigue siendo reversible a mano si alguno resultara estar
-- en uso después de todo.
--
-- Es re-ejecutable: los UPDATE son idempotentes (dejan el mismo resultado
-- sin importar cuántas veces se corran) y el valor de MODULO_SISTEMA solo
-- se inserta si no existe ya.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;
BEGIN TRY

-- Por si se corre contra una base donde el backend todavía no aplicó su
-- propia migración de esta columna.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.cat_tipo_catalogo') AND name = 'codigo_modulo')
    ALTER TABLE dbo.cat_tipo_catalogo ADD codigo_modulo NVARCHAR(50) NULL;

-- ----------------------------------------------------------------------------
-- Limpieza: catálogos de prueba/duplicados sin ninguna referencia en el
-- código (ver nota al inicio del archivo). Se dan de baja antes de
-- categorizar el resto, para que no quepan en ningún UPDATE de más abajo.
-- ----------------------------------------------------------------------------
UPDATE v SET v.activo = 0, v.fecha_modificacion = SYSUTCDATETIME()
FROM dbo.cat_valor_catalogo v
JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
WHERE t.codigo IN ('ESTADO_ITEM', 'TIPO_ITEM', 'TIPO_MOVIMIENTO', 'TIPO_GENERO', 'TIPO_ACCION', 'EJEMPLO', 'TEBOLITA')
  AND v.activo = 1;

UPDATE dbo.cat_tipo_catalogo SET activo = 0, fecha_modificacion = SYSUTCDATETIME()
WHERE codigo IN ('ESTADO_ITEM', 'TIPO_ITEM', 'TIPO_MOVIMIENTO', 'TIPO_GENERO', 'TIPO_ACCION', 'EJEMPLO', 'TEBOLITA')
  AND activo = 1;

-- ----------------------------------------------------------------------------
-- Valores nuevos de MODULO_SISTEMA (GENERAL y REPORTES), al final del orden
-- que ya traía sembrado.
-- ----------------------------------------------------------------------------
DECLARE @IdModuloSistema BIGINT = (SELECT id_tipo_catalogo FROM dbo.cat_tipo_catalogo WHERE codigo = 'MODULO_SISTEMA');
DECLARE @SiguienteOrden SMALLINT = (SELECT ISNULL(MAX(orden), 0) + 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdModuloSistema);

IF @IdModuloSistema IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdModuloSistema AND codigo = 'GENERAL')
        INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden)
        VALUES (@IdModuloSistema, 'GENERAL', N'General', @SiguienteOrden);

    IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdModuloSistema AND codigo = 'REPORTES')
        INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden)
        VALUES (@IdModuloSistema, 'REPORTES', N'Reportes y Estadísticas', @SiguienteOrden + 1);
END

-- ----------------------------------------------------------------------------
-- Recepción: pacientes (ficha + atributos clínicos básicos) y citas/agendamiento
-- (Cita, DisponibilidadMedico, Recordatorio — ver cita.model.ts "Módulo 2";
-- "Consulta externa" cuelga de la sección Recepción en menu-data.ts).
-- ----------------------------------------------------------------------------
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'RECEPCION' WHERE codigo IN (
    'ESTADO_PACIENTE', 'GENERO', 'TIPO_DOCUMENTO', 'ESTADO_CIVIL', 'TIPO_SANGRE',
    'NIVEL_CONFIDENCIALIDAD', 'PARENTESCO', 'TIPO_ALERGIA', 'SEVERIDAD', 'TIPO_ANTECEDENTE',
    'ESTADO_CITA', 'MOTIVO_CANCELACION', 'DIA_SEMANA', 'TIPO_RECORDATORIO', 'ESTADO_ENVIO',
    'TIPO_CONSULTA'
);

-- ----------------------------------------------------------------------------
-- Seguros Médicos: aseguradoras, convenios, pólizas y afiliación (ver
-- seguro.model.ts "Módulo 12: Convenios con Aseguradoras/Empresas +
-- Módulo 12.1: Pólizas de Seguro").
-- ----------------------------------------------------------------------------
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'SEGUROS_MEDICOS' WHERE codigo IN (
    'ESTADO_POLIZA', 'RAMO_SEGURO', 'TITULARIDAD_POLIZA', 'TIPO_ENTIDAD_ASEGURADORA',
    'ESTADO_CONVENIO', 'TIPO_ENTIDAD_CONVENIO', 'ESTADO_AFILIACION'
);

-- ----------------------------------------------------------------------------
-- Expedientes Clínicos.
-- ----------------------------------------------------------------------------
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'EXPEDIENTES_CLINICOS' WHERE codigo IN (
    'TIPO_REGISTRO_CLINICO', 'ESTADO_TRATAMIENTO'
);

-- ----------------------------------------------------------------------------
-- Laboratorio y Diagnóstico.
-- ----------------------------------------------------------------------------
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'LABORATORIO' WHERE codigo IN (
    'CATEGORIA_EXAMEN', 'PRIORIDAD_ORDEN', 'ESTADO_ORDEN_LABORATORIO'
);

-- ----------------------------------------------------------------------------
-- Emergencias: triage, casos y compromiso de pago (tipos/estado de
-- consentimiento cuelgan de Emergencias en menu-data.ts).
-- ----------------------------------------------------------------------------
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'EMERGENCIAS' WHERE codigo IN (
    'NIVEL_TRIAGE', 'ESTADO_CASO_EMERGENCIA', 'ESTADO_CONSENTIMIENTO', 'TIPO_CONSENTIMIENTO'
);

-- ----------------------------------------------------------------------------
-- Hospitalización: ingreso, camas, habitaciones y órdenes médicas.
-- ----------------------------------------------------------------------------
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'HOSPITALIZACION' WHERE codigo IN (
    'ESTADO_CAMA', 'ESTADO_HABITACION', 'TIPO_HABITACION', 'ESTADO_HOSPITALIZACION',
    'TIPO_ORDEN_HOSPITALIZACION'
);

-- ----------------------------------------------------------------------------
-- Farmacia: recetas, inventario y alertas de stock.
-- ----------------------------------------------------------------------------
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'FARMACIA' WHERE codigo IN (
    'ESTADO_RECETA', 'UNIDAD_MEDIDA', 'ESTADO_ITEM_INVENTARIO', 'TIPO_ITEM_INVENTARIO',
    'TIPO_MOVIMIENTO_INVENTARIO', 'CATEGORIA_MEDICAMENTO', 'ESTADO_ALERTA_STOCK'
);

-- ----------------------------------------------------------------------------
-- Facturación y Cobros.
-- ----------------------------------------------------------------------------
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'FACTURACION_COBROS' WHERE codigo IN (
    'ESTADO_FACTURA', 'ESTADO_PAGO', 'FORMA_PAGO', 'TIPO_DOCUMENTO_FISCAL', 'ESTADO_CXC',
    'TIPO_ITEM_FACTURA'
);

-- ----------------------------------------------------------------------------
-- Mantenimiento: catálogos de administración (empleados/usuarios/auditoría)
-- que no pertenecen a ningún módulo clínico/financiero y solo se ven desde
-- las pantallas de Mantenimiento (grupos "Seguridad" / "Recursos Humanos" en
-- menu-data.ts, que no son MenuSection propias).
-- ----------------------------------------------------------------------------
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'MANTENIMIENTO' WHERE codigo IN (
    'ESTADO_EMPLEADO', 'ESTADO_USUARIO', 'TIPO_ACCION_AUDITORIA'
);

-- ----------------------------------------------------------------------------
-- Reportes y Estadísticas.
-- ----------------------------------------------------------------------------
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'REPORTES' WHERE codigo IN (
    'TIPO_REPORTE'
);

-- ----------------------------------------------------------------------------
-- General: catálogos meta (MODULO_SISTEMA) e infraestructura compartida
-- entre módulos (Salas, igual que en menu-data.ts). Los 7 códigos de prueba
-- que antes caían acá ya se dieron de baja arriba en vez de categorizarse.
-- ----------------------------------------------------------------------------
UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'GENERAL' WHERE codigo IN (
    'MODULO_SISTEMA', 'TIPO_SALA', 'ESTADO_SALA'
);

COMMIT TRANSACTION;

-- Catálogos ACTIVOS que quedaron en la base pero no estaban en la lista de
-- arriba (si esto devuelve filas, hay que categorizarlos aparte). Los que
-- se dieron de baja en la limpieza no cuentan: ya no importa que no tengan
-- módulo.
SELECT codigo, nombre FROM dbo.cat_tipo_catalogo WHERE codigo_modulo IS NULL AND activo = 1;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
