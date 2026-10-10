-- =============================================================================
-- Script unificado de catálogos (cat_tipo_catalogo / cat_valor_catalogo) y
-- columnas de auditoría que el backend y el frontend necesitan. Reemplaza y
-- junta en uno solo:
--   - sembrar_catalogos.sql (Farmacia, Facturación, Mantenimiento, auditoría)
--   - sembrar_catalogos_recepcion_seguros_expedientes.sql (módulos de Melisa:
--     Recepción, Seguros Médicos, Expedientes Clínicos — incluye TIPO_CONSULTA,
--     que ya cubre lo de sembrar_tipo_consulta.sql)
--   - agregar_columnas_auditoria_usuario.sql (columnas id_usuario_creacion /
--     id_usuario_modificacion que faltaban en 5 tablas)
--
-- NO incluye (a propósito):
--   - agregar_columnas_facturas.sql: ya aplicado, las columnas ya existen.
--   - datos_prueba_farmacia_facturacion.sql / quitar_datos_prueba_...: datos
--     de prueba, no es siembra real.
--
-- Es re-ejecutable de principio a fin: cada columna, cada tipo y cada valor
-- de catálogo solo se agrega si no existe ya (por nombre de columna o por
-- código), así que correrlo varias veces no duplica ni pisa nada.
--
-- IMPORTANTE — 6 catálogos existían en AMBOS scripts originales con filas
-- repetidas o con choques de "orden" (GENERO, TIPO_DOCUMENTO, SEVERIDAD,
-- TIPO_SALA, ESTADO_SALA, ESTADO_CONVENIO). Pegarlos tal cual habría hecho
-- que el INSERT intentara crear el mismo (id_tipo_catalogo, codigo) dos
-- veces en una sola sentencia y reventara contra la restricción única. Se
-- revisaron a mano y se dejó: un solo nombre de tipo por código (SEVERIDAD
-- usa "Nivel de severidad", el que ya asumía convenio-formulario.ts y el
-- resto de Mantenimiento), sin filas duplicadas, y "orden" renumerado donde
-- dos catálogos traían un valor nuevo con el mismo número que uno ya
-- sembrado (ver TIPO_SALA/EMERGENCIA, ESTADO_SALA/FUERA_SERVICIO,
-- TIPO_DOCUMENTO/PARTIDA, ESTADO_CONVENIO/ACTIVO más abajo).
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

-- -----------------------------------------------------------------------------
-- PARTE 1: columnas de auditoría que faltaban (id_usuario_creacion /
-- id_usuario_modificacion). fecha_creacion / fecha_modificacion ya existían
-- en las 5; `usuarios` no está en esta lista porque ya tenía ambas columnas
-- desde antes — lo que le faltaba era mapearlas en el backend, no en la base.
-- -----------------------------------------------------------------------------
BEGIN TRANSACTION;
BEGIN TRY

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.habitaciones') AND name = 'id_usuario_creacion')
    ALTER TABLE dbo.habitaciones ADD id_usuario_creacion BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.habitaciones') AND name = 'id_usuario_modificacion')
    ALTER TABLE dbo.habitaciones ADD id_usuario_modificacion BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.permisos') AND name = 'id_usuario_creacion')
    ALTER TABLE dbo.permisos ADD id_usuario_creacion BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.permisos') AND name = 'id_usuario_modificacion')
    ALTER TABLE dbo.permisos ADD id_usuario_modificacion BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_consentimiento') AND name = 'id_usuario_creacion')
    ALTER TABLE dbo.tipos_consentimiento ADD id_usuario_creacion BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_consentimiento') AND name = 'id_usuario_modificacion')
    ALTER TABLE dbo.tipos_consentimiento ADD id_usuario_modificacion BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_examen') AND name = 'id_usuario_creacion')
    ALTER TABLE dbo.tipos_examen ADD id_usuario_creacion BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_examen') AND name = 'id_usuario_modificacion')
    ALTER TABLE dbo.tipos_examen ADD id_usuario_modificacion BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.interaccion_medicamentos') AND name = 'id_usuario_creacion')
    ALTER TABLE dbo.interaccion_medicamentos ADD id_usuario_creacion BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.interaccion_medicamentos') AND name = 'id_usuario_modificacion')
    ALTER TABLE dbo.interaccion_medicamentos ADD id_usuario_modificacion BIGINT NULL;

COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- -----------------------------------------------------------------------------
-- PARTE 2: catálogos (cat_tipo_catalogo / cat_valor_catalogo)
-- -----------------------------------------------------------------------------
BEGIN TRANSACTION;
BEGIN TRY

DECLARE @Seed TABLE (tipo VARCHAR(50), tipoNombre NVARCHAR(100), codigo VARCHAR(50), nombre NVARCHAR(100), orden SMALLINT);
INSERT INTO @Seed (tipo, tipoNombre, codigo, nombre, orden) VALUES

 -- ===== Confirmados por el backend (si faltan, revientan con RecursoNoEncontradoException) =====
 -- TIPO_ITEM_INVENTARIO/MEDICAMENTO, TIPO_MOVIMIENTO_INVENTARIO/ENTRADA,
 -- ESTADO_ALERTA_STOCK/PENDIENTE (InventarioFarmaciaService); ESTADO_PAGO/APLICADO-ANULADO,
 -- ESTADO_FACTURA/PAGADA-PENDIENTE, ESTADO_CXC/PENDIENTE-SALDADA (FacturasService);
 -- MODULO_SISTEMA y CATEGORIA_EXAMEN (cualquier valor: solo se valida que exista ALGÚN
 -- id en cat_valor_catalogo, pero sin nada sembrado revientan igual).
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

 ('MODULO_SISTEMA','Módulo del sistema','RECEPCION','Recepción',1),
 ('MODULO_SISTEMA','Módulo del sistema','SEGUROS_MEDICOS','Seguros Médicos',2),
 ('MODULO_SISTEMA','Módulo del sistema','EXPEDIENTES_CLINICOS','Expedientes Clínicos',3),
 ('MODULO_SISTEMA','Módulo del sistema','LABORATORIO','Laboratorio y Diagnóstico',4),
 ('MODULO_SISTEMA','Módulo del sistema','EMERGENCIAS','Emergencias',5),
 ('MODULO_SISTEMA','Módulo del sistema','HOSPITALIZACION','Hospitalización',6),
 ('MODULO_SISTEMA','Módulo del sistema','FARMACIA','Farmacia',7),
 ('MODULO_SISTEMA','Módulo del sistema','FACTURACION_COBROS','Facturación y Cobros',8),
 ('MODULO_SISTEMA','Módulo del sistema','MANTENIMIENTO','Mantenimiento',9),

 -- Mismos 2 valores que ya asume hardcodeado el módulo de Laboratorio
 -- (laboratorio-catalogos.ts: CATEGORIAS_EXAMEN), en el mismo orden.
 ('CATEGORIA_EXAMEN','Categoría de examen','LABORATORIO','Laboratorio',1),
 ('CATEGORIA_EXAMEN','Categoría de examen','IMAGEN_DIAGNOSTICO','Imagen / Diagnóstico',2),

 -- ===== Usados por el frontend (dropdowns); si faltan, cae a su lista de ejemplo =====
 ('TIPO_ENTIDAD_ASEGURADORA','Tipo de entidad aseguradora','ASEGURADORA','Aseguradora',1),
 ('TIPO_ENTIDAD_ASEGURADORA','Tipo de entidad aseguradora','MUTUALIDAD','Mutualidad',2),
 ('TIPO_ENTIDAD_ASEGURADORA','Tipo de entidad aseguradora','COOPERATIVA','Cooperativa',3),

 ('TIPO_HABITACION','Tipo de habitación','INDIVIDUAL','Individual',1),
 ('TIPO_HABITACION','Tipo de habitación','COMPARTIDA','Compartida',2),
 ('TIPO_HABITACION','Tipo de habitación','UCI','UCI',3),

 ('ESTADO_HABITACION','Estado de habitación','DISPONIBLE','Disponible',1),
 ('ESTADO_HABITACION','Estado de habitación','OCUPADA','Ocupada',2),
 ('ESTADO_HABITACION','Estado de habitación','LIMPIEZA','En limpieza',3),
 ('ESTADO_HABITACION','Estado de habitación','MANTENIMIENTO','En mantenimiento',4),

 ('ESTADO_CAMA','Estado de cama','DISPONIBLE','Disponible',1),
 ('ESTADO_CAMA','Estado de cama','OCUPADA','Ocupada',2),
 ('ESTADO_CAMA','Estado de cama','MANTENIMIENTO','En mantenimiento',3),

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

 ('CATEGORIA_MEDICAMENTO','Categoría de medicamento','ANALGESICO','Analgésico',1),
 ('CATEGORIA_MEDICAMENTO','Categoría de medicamento','ANTIBIOTICO','Antibiótico',2),
 ('CATEGORIA_MEDICAMENTO','Categoría de medicamento','ANTIINFLAMATORIO','Antiinflamatorio',3),
 ('CATEGORIA_MEDICAMENTO','Categoría de medicamento','ANTIALERGICO','Antialérgico',4),
 ('CATEGORIA_MEDICAMENTO','Categoría de medicamento','GASTROINTESTINAL','Gastrointestinal',5),
 ('CATEGORIA_MEDICAMENTO','Categoría de medicamento','OTRO','Otro',6),

 -- ESTADO_CONVENIO: VIGENTE es el código que ya asume convenio-formulario.ts;
 -- ACTIVO se agrega aparte (venía del script de Recepción/Seguros con otro
 -- código para el mismo significado) para no perder ese valor, renumerado a 4.
 ('ESTADO_CONVENIO','Estado de convenio','VIGENTE','Vigente',1),
 ('ESTADO_CONVENIO','Estado de convenio','VENCIDO','Vencido',2),
 ('ESTADO_CONVENIO','Estado de convenio','SUSPENDIDO','Suspendido',3),
 ('ESTADO_CONVENIO','Estado de convenio','ACTIVO','Activo',4),

 ('ESTADO_EMPLEADO','Estado de empleado','ACTIVO','Activo',1),
 ('ESTADO_EMPLEADO','Estado de empleado','INACTIVO','Inactivo',2),
 ('ESTADO_EMPLEADO','Estado de empleado','SUSPENDIDO','Suspendido',3),

 ('ESTADO_USUARIO','Estado de usuario','ACTIVO','Activo',1),
 ('ESTADO_USUARIO','Estado de usuario','BLOQUEADO','Bloqueado',2),
 ('ESTADO_USUARIO','Estado de usuario','INACTIVO','Inactivo',3),

 -- GENERO: idéntico en ambos scripts originales, una sola copia.
 ('GENERO','Género','MASCULINO','Masculino',1),
 ('GENERO','Género','FEMENINO','Femenino',2),
 ('GENERO','Género','OTRO','Otro',3),

 -- TIPO_DOCUMENTO: DPI/PASAPORTE venían en ambos; NIT y PARTIDA son cada uno
 -- de un script distinto, se quedan los 4 (PARTIDA renumerado a 4).
 ('TIPO_DOCUMENTO','Tipo de documento','DPI','DPI',1),
 ('TIPO_DOCUMENTO','Tipo de documento','PASAPORTE','Pasaporte',2),
 ('TIPO_DOCUMENTO','Tipo de documento','NIT','NIT',3),
 ('TIPO_DOCUMENTO','Tipo de documento','PARTIDA','Partida de nacimiento',4),

 ('TIPO_ITEM_FACTURA','Tipo de ítem de factura','CONSULTA','Consulta',1),
 ('TIPO_ITEM_FACTURA','Tipo de ítem de factura','TRATAMIENTO','Tratamiento',2),
 ('TIPO_ITEM_FACTURA','Tipo de ítem de factura','MEDICAMENTO','Medicamento',3),
 ('TIPO_ITEM_FACTURA','Tipo de ítem de factura','PROCEDIMIENTO','Procedimiento',4),

 -- TIPO_SALA: CONSULTORIO/PROCEDIMIENTOS venían en ambos; QUIROFANO y ESPERA
 -- son de Mantenimiento, EMERGENCIA es de Recepción — se quedan los 5
 -- (EMERGENCIA renumerado a 5).
 ('TIPO_SALA','Tipo de sala','CONSULTORIO','Consultorio',1),
 ('TIPO_SALA','Tipo de sala','QUIROFANO','Quirófano',2),
 ('TIPO_SALA','Tipo de sala','PROCEDIMIENTOS','Sala de procedimientos',3),
 ('TIPO_SALA','Tipo de sala','ESPERA','Sala de espera',4),
 ('TIPO_SALA','Tipo de sala','EMERGENCIA','Emergencia',5),

 -- ESTADO_SALA: DISPONIBLE/MANTENIMIENTO venían en ambos; OCUPADA es de
 -- Mantenimiento, FUERA_SERVICIO es de Recepción — se quedan los 4
 -- (FUERA_SERVICIO renumerado a 4).
 ('ESTADO_SALA','Estado de sala','DISPONIBLE','Disponible',1),
 ('ESTADO_SALA','Estado de sala','OCUPADA','Ocupada',2),
 ('ESTADO_SALA','Estado de sala','MANTENIMIENTO','En mantenimiento',3),
 ('ESTADO_SALA','Estado de sala','FUERA_SERVICIO','Fuera de servicio',4),

 -- SEVERIDAD: mismos 3 códigos en ambos scripts originales (uno la llamaba
 -- "Severidad", el otro "Nivel de severidad" — se deja este último, que es
 -- el que ya asumía convenio-formulario.ts e Interacciones de medicamentos).
 -- Reutilizado por Pacientes (severidad de alergia) e Interacciones de
 -- medicamentos (severidad de la interacción).
 ('SEVERIDAD','Nivel de severidad','LEVE','Leve',1),
 ('SEVERIDAD','Nivel de severidad','MODERADA','Moderada',2),
 ('SEVERIDAD','Nivel de severidad','SEVERA','Severa',3),

 -- CRÍTICO: MedicentroDbContext.RegistrarAuditoriaAsync busca estos 3
 -- códigos exactos (CREAR/MODIFICAR/ELIMINAR_LOGICO) cada vez que se guarda
 -- cualquier cosa en el sistema; si el código no existe en este catálogo,
 -- la fila de bitácora se descarta en silencio (solo un log warning) — sin
 -- esto sembrado, la bitácora de auditoría se queda vacía para TODO el
 -- sistema, no solo para esta pantalla.
 ('TIPO_ACCION_AUDITORIA','Tipo de acción de auditoría','CREAR','Crear',1),
 ('TIPO_ACCION_AUDITORIA','Tipo de acción de auditoría','MODIFICAR','Modificar',2),
 ('TIPO_ACCION_AUDITORIA','Tipo de acción de auditoría','ELIMINAR_LOGICO','Eliminar (baja lógica)',3),

 -- ===== Recepción — Pacientes =====
 ('ESTADO_CIVIL', N'Estado civil', 'SOLTERO', N'Soltero/a', 1),
 ('ESTADO_CIVIL', N'Estado civil', 'CASADO', N'Casado/a', 2),
 ('ESTADO_CIVIL', N'Estado civil', 'DIVORCIADO', N'Divorciado/a', 3),
 ('ESTADO_CIVIL', N'Estado civil', 'VIUDO', N'Viudo/a', 4),
 ('ESTADO_CIVIL', N'Estado civil', 'UNION', N'Unión de hecho', 5),

 ('TIPO_SANGRE', N'Tipo de sangre', 'O_POS', N'O+', 1),
 ('TIPO_SANGRE', N'Tipo de sangre', 'O_NEG', N'O-', 2),
 ('TIPO_SANGRE', N'Tipo de sangre', 'A_POS', N'A+', 3),
 ('TIPO_SANGRE', N'Tipo de sangre', 'A_NEG', N'A-', 4),
 ('TIPO_SANGRE', N'Tipo de sangre', 'B_POS', N'B+', 5),
 ('TIPO_SANGRE', N'Tipo de sangre', 'B_NEG', N'B-', 6),
 ('TIPO_SANGRE', N'Tipo de sangre', 'AB_POS', N'AB+', 7),
 ('TIPO_SANGRE', N'Tipo de sangre', 'AB_NEG', N'AB-', 8),

 ('NIVEL_CONFIDENCIALIDAD', N'Nivel de confidencialidad', 'NORMAL', N'Normal', 1),
 ('NIVEL_CONFIDENCIALIDAD', N'Nivel de confidencialidad', 'RESERVADO', N'Reservado', 2),
 ('NIVEL_CONFIDENCIALIDAD', N'Nivel de confidencialidad', 'CONFIDENCIAL', N'Confidencial', 3),

 ('ESTADO_PACIENTE', N'Estado del paciente', 'ACTIVO', N'Activo', 1),
 ('ESTADO_PACIENTE', N'Estado del paciente', 'INACTIVO', N'Inactivo', 2),
 ('ESTADO_PACIENTE', N'Estado del paciente', 'FALLECIDO', N'Fallecido', 3),

 -- PARENTESCO: también lo necesita Emergencias (compromiso de pago).
 ('PARENTESCO', N'Parentesco', 'PADRE', N'Padre', 1),
 ('PARENTESCO', N'Parentesco', 'MADRE', N'Madre', 2),
 ('PARENTESCO', N'Parentesco', 'CONYUGE', N'Cónyuge', 3),
 ('PARENTESCO', N'Parentesco', 'HIJO', N'Hijo/a', 4),
 ('PARENTESCO', N'Parentesco', 'HERMANO', N'Hermano/a', 5),
 ('PARENTESCO', N'Parentesco', 'OTRO', N'Otro', 6),

 ('TIPO_ALERGIA', N'Tipo de alergia', 'MEDICAMENTO', N'Medicamento', 1),
 ('TIPO_ALERGIA', N'Tipo de alergia', 'ALIMENTO', N'Alimento', 2),
 ('TIPO_ALERGIA', N'Tipo de alergia', 'AMBIENTAL', N'Ambiental', 3),

 ('TIPO_ANTECEDENTE', N'Tipo de antecedente', 'PERSONAL', N'Personal', 1),
 ('TIPO_ANTECEDENTE', N'Tipo de antecedente', 'FAMILIAR', N'Familiar', 2),
 ('TIPO_ANTECEDENTE', N'Tipo de antecedente', 'QUIRURGICO', N'Quirúrgico', 3),

 -- ===== Recepción — Citas / Consulta externa =====
 ('ESTADO_CITA', N'Estado de cita', 'PROGRAMADA', N'Programada', 1),
 ('ESTADO_CITA', N'Estado de cita', 'CONFIRMADA', N'Confirmada', 2),
 ('ESTADO_CITA', N'Estado de cita', 'EN_ATENCION', N'En atención', 3),
 ('ESTADO_CITA', N'Estado de cita', 'ATENDIDA', N'Atendida', 4),
 ('ESTADO_CITA', N'Estado de cita', 'CANCELADA', N'Cancelada', 5),

 ('MOTIVO_CANCELACION', N'Motivo de cancelación', 'SOLICITUD_PACIENTE', N'Solicitud del paciente', 1),
 ('MOTIVO_CANCELACION', N'Motivo de cancelación', 'AUSENCIA_MEDICO', N'Ausencia del médico', 2),
 ('MOTIVO_CANCELACION', N'Motivo de cancelación', 'NO_SE_PRESENTO', N'Paciente no se presentó', 3),
 ('MOTIVO_CANCELACION', N'Motivo de cancelación', 'OTRO', N'Otro', 4),

 ('DIA_SEMANA', N'Día de la semana', 'LUNES', N'Lunes', 1),
 ('DIA_SEMANA', N'Día de la semana', 'MARTES', N'Martes', 2),
 ('DIA_SEMANA', N'Día de la semana', 'MIERCOLES', N'Miércoles', 3),
 ('DIA_SEMANA', N'Día de la semana', 'JUEVES', N'Jueves', 4),
 ('DIA_SEMANA', N'Día de la semana', 'VIERNES', N'Viernes', 5),
 ('DIA_SEMANA', N'Día de la semana', 'SABADO', N'Sábado', 6),
 ('DIA_SEMANA', N'Día de la semana', 'DOMINGO', N'Domingo', 7),

 ('TIPO_RECORDATORIO', N'Tipo de recordatorio', 'SMS', N'SMS', 1),
 ('TIPO_RECORDATORIO', N'Tipo de recordatorio', 'EMAIL', N'Correo electrónico', 2),
 ('TIPO_RECORDATORIO', N'Tipo de recordatorio', 'LLAMADA', N'Llamada', 3),

 ('ESTADO_ENVIO', N'Estado de envío', 'PENDIENTE', N'Pendiente', 1),
 ('ESTADO_ENVIO', N'Estado de envío', 'ENVIADO', N'Enviado', 2),
 ('ESTADO_ENVIO', N'Estado de envío', 'FALLIDO', N'Fallido', 3),

 -- TIPO_CONSULTA: cubre también lo que sembraba sembrar_tipo_consulta.sql.
 ('TIPO_CONSULTA', N'Tipo de consulta', 'PRIMERA_VEZ', N'Primera vez', 1),
 ('TIPO_CONSULTA', N'Tipo de consulta', 'RECONSULTA', N'Reconsulta', 2),

 -- ===== Seguros Médicos =====
 ('RAMO_SEGURO', N'Ramo de seguro', 'GASTOS_MAYORES', N'Gastos médicos mayores', 1),
 ('RAMO_SEGURO', N'Ramo de seguro', 'GASTOS_MENORES', N'Gastos médicos menores', 2),
 ('RAMO_SEGURO', N'Ramo de seguro', 'HOSPITALARIO', N'Hospitalario', 3),
 ('RAMO_SEGURO', N'Ramo de seguro', 'CORPORATIVO', N'Corporativo', 4),

 ('TITULARIDAD_POLIZA', N'Titularidad de póliza', 'TITULAR', N'Titular', 1),
 ('TITULARIDAD_POLIZA', N'Titularidad de póliza', 'DEPENDIENTE', N'Dependiente', 2),

 ('ESTADO_POLIZA', N'Estado de póliza', 'VIGENTE', N'Vigente', 1),
 ('ESTADO_POLIZA', N'Estado de póliza', 'VENCIDA', N'Vencida', 2),
 ('ESTADO_POLIZA', N'Estado de póliza', 'SUSPENDIDA', N'Suspendida', 3),

 ('TIPO_ENTIDAD_CONVENIO', N'Tipo de entidad de convenio', 'ASEGURADORA', N'Aseguradora', 1),
 ('TIPO_ENTIDAD_CONVENIO', N'Tipo de entidad de convenio', 'EMPRESA', N'Empresa', 2),

 ('ESTADO_AFILIACION', N'Estado de afiliación', 'ACTIVA', N'Activa', 1),
 ('ESTADO_AFILIACION', N'Estado de afiliación', 'INACTIVA', N'Inactiva', 2),
 ('ESTADO_AFILIACION', N'Estado de afiliación', 'SUSPENDIDA', N'Suspendida', 3),

 -- ===== Expedientes Clínicos =====
 ('TIPO_REGISTRO_CLINICO', N'Tipo de registro clínico', 'FICHA_PEDIATRICA', N'Ficha de consulta pediátrica', 1),
 ('TIPO_REGISTRO_CLINICO', N'Tipo de registro clínico', 'FICHA_EXTERNA', N'Ficha de consulta externa', 2),
 ('TIPO_REGISTRO_CLINICO', N'Tipo de registro clínico', 'INGRESADO', N'Expediente de paciente ingresado', 3),
 ('TIPO_REGISTRO_CLINICO', N'Tipo de registro clínico', 'EVOLUCION', N'Evolución y signos vitales', 4),

 ('ESTADO_TRATAMIENTO', N'Estado de tratamiento', 'EN_CURSO', N'En curso', 1),
 ('ESTADO_TRATAMIENTO', N'Estado de tratamiento', 'FINALIZADO', N'Finalizado', 2),
 ('ESTADO_TRATAMIENTO', N'Estado de tratamiento', 'SUSPENDIDO', N'Suspendido', 3);

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
-- VERIFICACIÓN 1: columnas de auditoría agregadas
-- -----------------------------------------------------------------------------
SELECT OBJECT_NAME(c.object_id) AS tabla, c.name AS columna, t.name AS tipo, c.is_nullable
FROM sys.columns c JOIN sys.types t ON t.user_type_id = c.user_type_id
WHERE c.object_id IN (
    OBJECT_ID('dbo.habitaciones'), OBJECT_ID('dbo.permisos'), OBJECT_ID('dbo.tipos_consentimiento'),
    OBJECT_ID('dbo.tipos_examen'), OBJECT_ID('dbo.interaccion_medicamentos')
)
AND c.name IN ('id_usuario_creacion', 'id_usuario_modificacion')
ORDER BY tabla, columna;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN 2: resumen de catálogos (cuántos valores activos tiene cada uno)
-- -----------------------------------------------------------------------------
SELECT t.codigo AS tipo, COUNT(v.id_valor_catalogo) AS valores
FROM cat_tipo_catalogo t
LEFT JOIN cat_valor_catalogo v ON v.id_tipo_catalogo = t.id_tipo_catalogo AND v.activo = 1
WHERE t.codigo IN (
    'TIPO_ITEM_INVENTARIO','TIPO_MOVIMIENTO_INVENTARIO','ESTADO_PAGO','ESTADO_FACTURA',
    'FORMA_PAGO','UNIDAD_MEDIDA','ESTADO_ITEM_INVENTARIO','ESTADO_RECETA','CATEGORIA_MEDICAMENTO',
    'ESTADO_CXC','ESTADO_ALERTA_STOCK','MODULO_SISTEMA','TIPO_ENTIDAD_ASEGURADORA','CATEGORIA_EXAMEN',
    'TIPO_HABITACION','ESTADO_HABITACION','ESTADO_CAMA','ESTADO_CONVENIO','ESTADO_EMPLEADO',
    'ESTADO_USUARIO','GENERO','TIPO_DOCUMENTO','TIPO_ITEM_FACTURA','TIPO_SALA','ESTADO_SALA','SEVERIDAD',
    'TIPO_ACCION_AUDITORIA',
    'ESTADO_CIVIL','TIPO_SANGRE','NIVEL_CONFIDENCIALIDAD','ESTADO_PACIENTE','PARENTESCO','TIPO_ALERGIA',
    'TIPO_ANTECEDENTE','ESTADO_CITA','MOTIVO_CANCELACION','DIA_SEMANA','TIPO_RECORDATORIO','ESTADO_ENVIO',
    'TIPO_CONSULTA','RAMO_SEGURO','TITULARIDAD_POLIZA','ESTADO_POLIZA','TIPO_ENTIDAD_CONVENIO',
    'ESTADO_AFILIACION','TIPO_REGISTRO_CLINICO','ESTADO_TRATAMIENTO'
)
GROUP BY t.codigo
ORDER BY t.codigo;

-- -----------------------------------------------------------------------------
-- VERIFICACIÓN 3: detalle con los ids reales de esta base
-- -----------------------------------------------------------------------------
SELECT t.codigo AS tipo, v.id_valor_catalogo AS id_real, v.codigo, v.nombre, v.orden
FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
WHERE t.codigo IN (
    'TIPO_ITEM_INVENTARIO','TIPO_MOVIMIENTO_INVENTARIO','ESTADO_PAGO','ESTADO_FACTURA',
    'FORMA_PAGO','UNIDAD_MEDIDA','ESTADO_ITEM_INVENTARIO','ESTADO_RECETA','CATEGORIA_MEDICAMENTO',
    'ESTADO_CXC','ESTADO_ALERTA_STOCK','MODULO_SISTEMA','TIPO_ENTIDAD_ASEGURADORA','CATEGORIA_EXAMEN',
    'TIPO_HABITACION','ESTADO_HABITACION','ESTADO_CAMA','ESTADO_CONVENIO','ESTADO_EMPLEADO',
    'ESTADO_USUARIO','GENERO','TIPO_DOCUMENTO','TIPO_ITEM_FACTURA','TIPO_SALA','ESTADO_SALA','SEVERIDAD',
    'TIPO_ACCION_AUDITORIA',
    'ESTADO_CIVIL','TIPO_SANGRE','NIVEL_CONFIDENCIALIDAD','ESTADO_PACIENTE','PARENTESCO','TIPO_ALERGIA',
    'TIPO_ANTECEDENTE','ESTADO_CITA','MOTIVO_CANCELACION','DIA_SEMANA','TIPO_RECORDATORIO','ESTADO_ENVIO',
    'TIPO_CONSULTA','RAMO_SEGURO','TITULARIDAD_POLIZA','ESTADO_POLIZA','TIPO_ENTIDAD_CONVENIO',
    'ESTADO_AFILIACION','TIPO_REGISTRO_CLINICO','ESTADO_TRATAMIENTO'
)
ORDER BY t.codigo, v.orden;
