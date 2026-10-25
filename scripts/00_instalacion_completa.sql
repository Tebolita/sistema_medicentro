-- =============================================================================
-- INSTALACIÓN / MIGRACIÓN COMPLETA DE CATÁLOGOS Y ESQUEMA — MEDICENTRO
-- =============================================================================
-- Qué es esto: la unión de TODOS los scripts de catálogos, columnas y
-- correcciones de esta carpeta, en el orden correcto, para que una base de
-- datos recién creada (otra computadora, otro servidor) quede lista para
-- usar el sistema sin los errores de "catálogo faltante" que fuimos
-- encontrando durante el desarrollo (columnas inexistentes, catálogos que
-- solo existían porque alguien los creó a mano desde Mantenimiento en ESTA
-- máquina, códigos de catálogo que el backend exige literalmente y que
-- ningún script sembraba, etc.).
--
-- REQUISITO PREVIO (esto NO lo hace este script):
--   1. La base de datos MEDICENTRO con todas sus tablas ya debe existir.
--      Eso se crea corriendo primero:
--        scripts/MEDICENTRO_schema_version_Arturo_final.sql
--      (crea la base y el esquema completo — tablas, llaves, checks — sin
--      ningún dato adentro).
--
-- QUÉ SÍ HACE ESTE SCRIPT (en orden, todo contra la base MEDICENTRO):
--   PARTE 1  — Columnas de auditoría que faltaban en 5 tablas.
--   PARTE 2  — Catálogos base (cat_tipo_catalogo / cat_valor_catalogo):
--              Farmacia, Facturación, Mantenimiento, Recepción, Seguros
--              Médicos, Expedientes Clínicos, auditoría.
--   PARTE 3  — codigo_modulo de cada catálogo + limpieza de catálogos de
--              prueba + valores GENERAL/REPORTES de MODULO_SISTEMA.
--   PARTE 4  — Catálogo TIPO_REPORTE (Reportes y Estadísticas).
--   PARTE 5  — Catálogos TIPO_CONSENTIMIENTO / ESTADO_CONSENTIMIENTO
--              (Emergencias — Hoja de compromiso de pago).
--   PARTE 6  — Columna `codigo` en la tabla tipos_consentimiento.
--   PARTE 7  — Columnas que le faltaban a `facturas` (FEL, convenio,
--              comprobante).
--   PARTE 8  — Corrección de items_inventario.id_tipo_item mal referenciado.
--   PARTE 9  — Catálogos que NUNCA tuvieron script propio: en la máquina
--              original alguien los creó a mano desde Mantenimiento, así
--              que al migrar a una base nueva simplemente no existían y el
--              backend tronaba (RecursoNoEncontradoException) o la pantalla
--              se quedaba con dropdowns vacíos. Reconstruidos a partir de
--              los códigos exactos que el código (frontend/backend) espera:
--                - ESTADO_ORDEN_LABORATORIO (Laboratorio)
--                - PRIORIDAD_ORDEN (Laboratorio)
--                - ESTADO_HOSPITALIZACION (Hospitalización) — el backend
--                  revienta sin el código ACTIVA.
--                - TIPO_ORDEN_HOSPITALIZACION (Hospitalización)
--                - TIPO_DOCUMENTO_FISCAL (Facturación) — frontend y backend
--                  asumen que el primer valor (id más bajo) es "Factura".
--                - NIVEL_TRIAGE / ESTADO_CASO_EMERGENCIA (Emergencias) — sin
--                  código fijo exigido por el backend, pero sin esto el
--                  dropdown sale vacío. Editable libre después desde
--                  Mantenimiento si no calza con lo que ya usan.
--                - ESTADO_ALERTA — el código real sembrado en PARTE 2 es
--                  ESTADO_ALERTA_STOCK, pero InventarioFarmaciaService.cs
--                  busca literalmente "ESTADO_ALERTA" (sin "_STOCK") al
--                  registrar un movimiento de inventario con stock bajo.
--                  Es una inconsistencia real del código, no un typo de este
--                  script: se siembra ESTE código también (no se toca
--                  ESTADO_ALERTA_STOCK, por si algo más ya lo usa) para que
--                  esa alerta no reviente en una base nueva.
--   PARTE 10 — ESTADO_CAMA: incluye el código LIBRE (no solo DISPONIBLE).
--              hospitalizacion-formulario.ts, hospitalizaciones.service.ts,
--              consulta-atencion.ts y CamasService.cs (backend) solo
--              reconocen el código 'LIBRE' para decidir qué cama está
--              disponible; si el catálogo solo tiene 'DISPONIBLE' (que es lo
--              que sembraba la versión vieja de este catálogo), ninguna cama
--              aparece nunca como disponible aunque lo esté. Esta parte dice
--              el código LIBRE sin importar si la base es nueva (nunca tuvo
--              DISPONIBLE) o viene de una migración vieja (tiene camas en
--              DISPONIBLE: las pasa a LIBRE y da de baja DISPONIBLE).
--   PARTE 11 — Cambios de esquema del "motor de consultas" (todo lo que
--              cuelga de una Cita: constancia médica, recetas, hospitali-
--              zación, facturación automática, resultados de examen, acta de
--              cierre) y el catálogo ESTADO_RESULTADO.
--   PARTE 12 — Índice único: un empleado solo puede tener una cuenta de
--              usuario activa.
--   PARTE 13 — Usuario inicial 'admin' (nombre_usuario = 'admin', correo
--              admin@medicentro.gt, contraseña = la que ya tenía en la
--              máquina original — hashada, nunca en texto plano). El
--              empleado detrás es un relleno genérico ("Administrador
--              Sistema"); edítalo desde Mantenimiento -> Empleados con los
--              datos reales de la persona.
--   PARTE 14 — Rol ADMIN (acceso a los 9 módulos) creado y asignado a ese
--              usuario 'admin' — ya puedes iniciar sesión y usar todo el
--              sistema apenas termine de correr este script.
--   PARTE 15 — Columna tipos_examen.precio_venta_publico (precio con el que
--              se cobra cada examen dentro de la factura).
--   PARTE 16 — Catálogo TIPO_CONSULTA, código LABORATORIOS ("consulta" que
--              solo es para que el paciente se haga exámenes, sin médico
--              obligatorio) + empleado de relleno "Laboratorio" (sin
--              especialidad, así nunca aparece en los selectores de médico)
--              que el frontend asigna automáticamente a esas consultas.
--   PARTE 17 — Columna factura_detalle.id_orden_detalle: liga una línea de
--              factura al examen de laboratorio que la originó, para
--              cobrarlo automáticamente con el precio de tipos_examen (igual
--              que ya pasa con los medicamentos de receta).
--
-- QUÉ NO HACE (adrede, hay que hacerlo aparte, a mano):
--   - Crear OTROS usuarios además del admin de la PARTE 13 (recepcionistas,
--     médicos, etc.): edita y corre scripts/insertar_usuario.sql con los
--     datos reales de cada persona (NO lo corras tal cual: trae un
--     "Juan Pérez" de ejemplo), y asígnales el rol que les toque.
--   - Datos de prueba (scripts/datos_prueba_farmacia_facturacion.sql) ni
--     convenios/pólizas de ejemplo (insertar_convenio.sql, insertar_poliza.sql):
--     son plantillas de un solo registro para editar a mano, no parte de la
--     instalación base.
--
-- Es re-ejecutable de principio a fin: cada ALTER/CREATE/INSERT revisa antes
-- si ya existe, así que correrlo varias veces (o contra una base que ya
-- tenía algunas de estas piezas) no duplica ni pisa nada.
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

IF DB_NAME() <> 'MEDICENTRO'
BEGIN
    THROW 50000, 'Este script debe correr contra la base MEDICENTRO (USE MEDICENTRO; antes de ejecutar). Si la base no existe todavía, corre primero MEDICENTRO_schema_version_Arturo_final.sql.', 1;
END

-- =============================================================================
-- PARTE 1: columnas de auditoría que faltaban en 5 tablas.
-- =============================================================================
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
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- =============================================================================
-- PARTE 2: catálogos base (cat_tipo_catalogo / cat_valor_catalogo).
-- Nota: ESTADO_CAMA ya se siembra aquí con el código LIBRE (no DISPONIBLE) —
-- ver PARTE 10 para la corrección sobre bases que vengan con DISPONIBLE.
-- =============================================================================
BEGIN TRANSACTION;
BEGIN TRY

DECLARE @Seed TABLE (tipo VARCHAR(50), tipoNombre NVARCHAR(100), codigo VARCHAR(50), nombre NVARCHAR(100), orden SMALLINT);
INSERT INTO @Seed (tipo, tipoNombre, codigo, nombre, orden) VALUES

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

 ('CATEGORIA_EXAMEN','Categoría de examen','LABORATORIO','Laboratorio',1),
 ('CATEGORIA_EXAMEN','Categoría de examen','IMAGEN_DIAGNOSTICO','Imagen / Diagnóstico',2),

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

 -- ESTADO_CAMA: LIBRE (no DISPONIBLE) — ver nota al inicio de esta PARTE 2.
 ('ESTADO_CAMA','Estado de cama','LIBRE','Disponible',1),
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

 ('GENERO','Género','MASCULINO','Masculino',1),
 ('GENERO','Género','FEMENINO','Femenino',2),
 ('GENERO','Género','OTRO','Otro',3),

 ('TIPO_DOCUMENTO','Tipo de documento','DPI','DPI',1),
 ('TIPO_DOCUMENTO','Tipo de documento','PASAPORTE','Pasaporte',2),
 ('TIPO_DOCUMENTO','Tipo de documento','NIT','NIT',3),
 ('TIPO_DOCUMENTO','Tipo de documento','PARTIDA','Partida de nacimiento',4),

 ('TIPO_ITEM_FACTURA','Tipo de ítem de factura','CONSULTA','Consulta',1),
 ('TIPO_ITEM_FACTURA','Tipo de ítem de factura','TRATAMIENTO','Tratamiento',2),
 ('TIPO_ITEM_FACTURA','Tipo de ítem de factura','MEDICAMENTO','Medicamento',3),
 ('TIPO_ITEM_FACTURA','Tipo de ítem de factura','PROCEDIMIENTO','Procedimiento',4),

 ('TIPO_SALA','Tipo de sala','CONSULTORIO','Consultorio',1),
 ('TIPO_SALA','Tipo de sala','QUIROFANO','Quirófano',2),
 ('TIPO_SALA','Tipo de sala','PROCEDIMIENTOS','Sala de procedimientos',3),
 ('TIPO_SALA','Tipo de sala','ESPERA','Sala de espera',4),
 ('TIPO_SALA','Tipo de sala','EMERGENCIA','Emergencia',5),

 ('ESTADO_SALA','Estado de sala','DISPONIBLE','Disponible',1),
 ('ESTADO_SALA','Estado de sala','OCUPADA','Ocupada',2),
 ('ESTADO_SALA','Estado de sala','MANTENIMIENTO','En mantenimiento',3),
 ('ESTADO_SALA','Estado de sala','FUERA_SERVICIO','Fuera de servicio',4),

 ('SEVERIDAD','Nivel de severidad','LEVE','Leve',1),
 ('SEVERIDAD','Nivel de severidad','MODERADA','Moderada',2),
 ('SEVERIDAD','Nivel de severidad','SEVERA','Severa',3),

 ('TIPO_ACCION_AUDITORIA','Tipo de acción de auditoría','CREAR','Crear',1),
 ('TIPO_ACCION_AUDITORIA','Tipo de acción de auditoría','MODIFICAR','Modificar',2),
 ('TIPO_ACCION_AUDITORIA','Tipo de acción de auditoría','ELIMINAR_LOGICO','Eliminar (baja lógica)',3),

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

 ('TIPO_CONSULTA', N'Tipo de consulta', 'PRIMERA_VEZ', N'Primera vez', 1),
 ('TIPO_CONSULTA', N'Tipo de consulta', 'RECONSULTA', N'Reconsulta', 2),

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
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- =============================================================================
-- PARTE 3: codigo_modulo de cada catálogo + limpieza de catálogos de prueba
-- + valores GENERAL/REPORTES de MODULO_SISTEMA.
-- =============================================================================
BEGIN TRANSACTION;
BEGIN TRY

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.cat_tipo_catalogo') AND name = 'codigo_modulo')
    ALTER TABLE dbo.cat_tipo_catalogo ADD codigo_modulo NVARCHAR(50) NULL;

UPDATE v SET v.activo = 0, v.fecha_modificacion = SYSUTCDATETIME()
FROM dbo.cat_valor_catalogo v
JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
WHERE t.codigo IN ('ESTADO_ITEM', 'TIPO_ITEM', 'TIPO_MOVIMIENTO', 'TIPO_GENERO', 'TIPO_ACCION', 'EJEMPLO', 'TEBOLITA')
  AND v.activo = 1;

UPDATE dbo.cat_tipo_catalogo SET activo = 0, fecha_modificacion = SYSUTCDATETIME()
WHERE codigo IN ('ESTADO_ITEM', 'TIPO_ITEM', 'TIPO_MOVIMIENTO', 'TIPO_GENERO', 'TIPO_ACCION', 'EJEMPLO', 'TEBOLITA')
  AND activo = 1;

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

UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'RECEPCION' WHERE codigo IN (
    'ESTADO_PACIENTE', 'GENERO', 'TIPO_DOCUMENTO', 'ESTADO_CIVIL', 'TIPO_SANGRE',
    'NIVEL_CONFIDENCIALIDAD', 'PARENTESCO', 'TIPO_ALERGIA', 'SEVERIDAD', 'TIPO_ANTECEDENTE',
    'ESTADO_CITA', 'MOTIVO_CANCELACION', 'DIA_SEMANA', 'TIPO_RECORDATORIO', 'ESTADO_ENVIO',
    'TIPO_CONSULTA'
);

UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'SEGUROS_MEDICOS' WHERE codigo IN (
    'ESTADO_POLIZA', 'RAMO_SEGURO', 'TITULARIDAD_POLIZA', 'TIPO_ENTIDAD_ASEGURADORA',
    'ESTADO_CONVENIO', 'TIPO_ENTIDAD_CONVENIO', 'ESTADO_AFILIACION'
);

UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'EXPEDIENTES_CLINICOS' WHERE codigo IN (
    'TIPO_REGISTRO_CLINICO', 'ESTADO_TRATAMIENTO'
);

UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'LABORATORIO' WHERE codigo IN (
    'CATEGORIA_EXAMEN', 'PRIORIDAD_ORDEN', 'ESTADO_ORDEN_LABORATORIO'
);

UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'EMERGENCIAS' WHERE codigo IN (
    'NIVEL_TRIAGE', 'ESTADO_CASO_EMERGENCIA', 'ESTADO_CONSENTIMIENTO', 'TIPO_CONSENTIMIENTO'
);

UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'HOSPITALIZACION' WHERE codigo IN (
    'ESTADO_CAMA', 'ESTADO_HABITACION', 'TIPO_HABITACION', 'ESTADO_HOSPITALIZACION',
    'TIPO_ORDEN_HOSPITALIZACION'
);

UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'FARMACIA' WHERE codigo IN (
    'ESTADO_RECETA', 'UNIDAD_MEDIDA', 'ESTADO_ITEM_INVENTARIO', 'TIPO_ITEM_INVENTARIO',
    'TIPO_MOVIMIENTO_INVENTARIO', 'CATEGORIA_MEDICAMENTO', 'ESTADO_ALERTA_STOCK', 'ESTADO_ALERTA'
);

UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'FACTURACION_COBROS' WHERE codigo IN (
    'ESTADO_FACTURA', 'ESTADO_PAGO', 'FORMA_PAGO', 'TIPO_DOCUMENTO_FISCAL', 'ESTADO_CXC',
    'TIPO_ITEM_FACTURA'
);

UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'MANTENIMIENTO' WHERE codigo IN (
    'ESTADO_EMPLEADO', 'ESTADO_USUARIO', 'TIPO_ACCION_AUDITORIA'
);

UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'REPORTES' WHERE codigo IN (
    'TIPO_REPORTE'
);

UPDATE dbo.cat_tipo_catalogo SET codigo_modulo = 'GENERAL' WHERE codigo IN (
    'MODULO_SISTEMA', 'TIPO_SALA', 'ESTADO_SALA'
);

COMMIT TRANSACTION;

-- Catálogos ACTIVOS sin módulo asignado (si esto devuelve filas, hay que
-- categorizarlos a mano; no es un error, solo informativo).
SELECT codigo, nombre FROM dbo.cat_tipo_catalogo WHERE codigo_modulo IS NULL AND activo = 1;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- =============================================================================
-- PARTE 4: catálogo TIPO_REPORTE (Reportes y Estadísticas).
-- =============================================================================
BEGIN TRANSACTION;
BEGIN TRY

IF NOT EXISTS (SELECT 1 FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_REPORTE')
    INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, descripcion, activo, fecha_creacion)
    VALUES ('TIPO_REPORTE', 'Tipo de reporte', 'Reportes e indicadores disponibles en el módulo de Reportes y Estadísticas', 1, SYSDATETIME());

DECLARE @IdTipoReporte BIGINT = (SELECT id_tipo_catalogo FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_REPORTE');

IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdTipoReporte AND codigo = 'INDICADORES_CLINICOS')
    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, descripcion, orden, activo, fecha_creacion)
    VALUES (@IdTipoReporte, 'INDICADORES_CLINICOS', 'Indicadores clínicos', 'Citas por mes y estado (vw_indicadores_clinicos)', 1, 1, SYSDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdTipoReporte AND codigo = 'INDICADORES_FINANCIEROS')
    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, descripcion, orden, activo, fecha_creacion)
    VALUES (@IdTipoReporte, 'INDICADORES_FINANCIEROS', 'Indicadores financieros', 'Facturación por mes y estado (vw_indicadores_financieros)', 2, 1, SYSDATETIME());

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- =============================================================================
-- PARTE 5: catálogos TIPO_CONSENTIMIENTO / ESTADO_CONSENTIMIENTO.
-- Ningún script anterior creaba el TIPO (solo el valor COMPROMISO_PAGO,
-- asumiendo que el tipo ya existía) — en la máquina original se creó a mano.
-- =============================================================================
BEGIN TRANSACTION;
BEGIN TRY

IF NOT EXISTS (SELECT 1 FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_CONSENTIMIENTO')
    INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, codigo_modulo, activo, fecha_creacion)
    VALUES ('TIPO_CONSENTIMIENTO', N'Tipo de consentimiento', 'EMERGENCIAS', 1, SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.cat_tipo_catalogo WHERE codigo = 'ESTADO_CONSENTIMIENTO')
    INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, codigo_modulo, activo, fecha_creacion)
    VALUES ('ESTADO_CONSENTIMIENTO', N'Estado de consentimiento', 'EMERGENCIAS', 1, SYSUTCDATETIME());

DECLARE @IdTipoConsentimiento BIGINT = (SELECT id_tipo_catalogo FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_CONSENTIMIENTO');
DECLARE @IdEstadoConsentimiento BIGINT = (SELECT id_tipo_catalogo FROM dbo.cat_tipo_catalogo WHERE codigo = 'ESTADO_CONSENTIMIENTO');

-- Lo usa Emergencias -> Hoja de compromiso de pago
-- (idPorCodigo('TIPO_CONSENTIMIENTO', 'COMPROMISO_PAGO')); código exacto.
IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdTipoConsentimiento AND codigo = 'COMPROMISO_PAGO')
    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, descripcion, orden, activo, fecha_creacion)
    VALUES (@IdTipoConsentimiento, 'COMPROMISO_PAGO', 'Compromiso de pago', 'Consentimiento de compromiso de pago (Emergencias)', 1, 1, SYSDATETIME());

-- ESTADO_CONSENTIMIENTO: sin código exacto exigido por el backend (ver
-- consentimiento.model.ts, "firmado/revocado"); editable libre después.
IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdEstadoConsentimiento AND codigo = 'FIRMADO')
    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden, activo, fecha_creacion)
    VALUES (@IdEstadoConsentimiento, 'FIRMADO', N'Firmado', 1, 1, SYSDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdEstadoConsentimiento AND codigo = 'REVOCADO')
    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden, activo, fecha_creacion)
    VALUES (@IdEstadoConsentimiento, 'REVOCADO', N'Revocado', 2, 1, SYSDATETIME());

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- =============================================================================
-- PARTE 6: columna `codigo` en dbo.tipos_consentimiento (tabla física
-- distinta del catálogo genérico de la PARTE 5 — ver comentario en el
-- script original, agregar_codigo_tipos_consentimiento.sql).
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_consentimiento') AND name = 'codigo')
BEGIN
    ALTER TABLE dbo.tipos_consentimiento ADD codigo NVARCHAR(50) NULL;
END
GO

SET XACT_ABORT ON;
BEGIN TRANSACTION;

UPDATE dbo.tipos_consentimiento
SET codigo = 'COMPROMISO_PAGO'
WHERE codigo IS NULL
  AND id_tipo_consentimiento = (
      SELECT MIN(id_tipo_consentimiento) FROM dbo.tipos_consentimiento
      WHERE LOWER(nombre) LIKE '%compromiso%pago%'
  )
  AND NOT EXISTS (SELECT 1 FROM dbo.tipos_consentimiento WHERE codigo = 'COMPROMISO_PAGO');

UPDATE dbo.tipos_consentimiento
SET codigo = CONCAT('TIPO_', id_tipo_consentimiento)
WHERE codigo IS NULL OR LTRIM(RTRIM(codigo)) = '';

COMMIT TRANSACTION;
GO

IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_consentimiento') AND name = 'codigo' AND is_nullable = 1)
    ALTER TABLE dbo.tipos_consentimiento ALTER COLUMN codigo NVARCHAR(50) NOT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_tipos_consentimiento_codigo' AND object_id = OBJECT_ID('dbo.tipos_consentimiento'))
    CREATE UNIQUE NONCLUSTERED INDEX ux_tipos_consentimiento_codigo ON dbo.tipos_consentimiento (codigo);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.tipos_consentimiento WHERE codigo = 'COMPROMISO_PAGO')
    INSERT INTO dbo.tipos_consentimiento (codigo, nombre, plantilla_texto, activo, fecha_creacion)
    VALUES ('COMPROMISO_PAGO', N'Compromiso de pago', NULL, 1, SYSDATETIME());
GO

-- =============================================================================
-- PARTE 7: columnas que le faltaban a `facturas`.
-- =============================================================================
BEGIN TRANSACTION;
BEGIN TRY

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'numero_autorizacion_fel')
    ALTER TABLE dbo.facturas ADD numero_autorizacion_fel NVARCHAR(100) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'fecha_certificacion_fel')
    ALTER TABLE dbo.facturas ADD fecha_certificacion_fel DATETIME2 NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'id_convenio')
    ALTER TABLE dbo.facturas ADD id_convenio BIGINT NULL;

IF OBJECT_ID('dbo.convenios') IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_facturas_convenios')
    ALTER TABLE dbo.facturas
        ADD CONSTRAINT FK_facturas_convenios FOREIGN KEY (id_convenio)
        REFERENCES dbo.convenios (id_convenio);

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'comprobante_url')
    ALTER TABLE dbo.facturas ADD comprobante_url NVARCHAR(500) NULL;

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- =============================================================================
-- PARTE 8: corrige items_inventario.id_tipo_item mal referenciado (apunta al
-- id real de TIPO_ITEM_INVENTARIO/MEDICAMENTO). Defensivo: en una base nueva
-- no debería haber nada que corregir (no hay datos de prueba cargados).
-- =============================================================================
BEGIN TRANSACTION;
BEGIN TRY

DECLARE @IdTipoItemCorrecto BIGINT = (
    SELECT v.id_valor_catalogo
    FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
    WHERE t.codigo = 'TIPO_ITEM_INVENTARIO' AND v.codigo = 'MEDICAMENTO'
);

IF @IdTipoItemCorrecto IS NOT NULL AND OBJECT_ID('dbo.items_inventario') IS NOT NULL
    UPDATE items_inventario
    SET id_tipo_item = @IdTipoItemCorrecto
    WHERE id_tipo_item <> @IdTipoItemCorrecto OR id_tipo_item IS NULL;

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- =============================================================================
-- PARTE 9: catálogos reconstruidos que ningún script anterior sembraba (ver
-- explicación al inicio del archivo). Códigos exactos donde el backend los
-- exige; el resto son valores razonables, editables libremente después
-- desde Mantenimiento -> Catálogos sin romper nada.
-- =============================================================================
BEGIN TRANSACTION;
BEGIN TRY

DECLARE @Seed2 TABLE (tipo VARCHAR(50), tipoNombre NVARCHAR(100), modulo VARCHAR(50), codigo VARCHAR(50), nombre NVARCHAR(100), orden SMALLINT);
INSERT INTO @Seed2 (tipo, tipoNombre, modulo, codigo, nombre, orden) VALUES

 -- Exacto: orden-formulario.ts valida transiciones comparando estos 5 códigos.
 ('ESTADO_ORDEN_LABORATORIO', N'Estado de orden de laboratorio', 'LABORATORIO', 'PENDIENTE', N'Solicitada', 1),
 ('ESTADO_ORDEN_LABORATORIO', N'Estado de orden de laboratorio', 'LABORATORIO', 'EN_PROCESO', N'En proceso', 2),
 ('ESTADO_ORDEN_LABORATORIO', N'Estado de orden de laboratorio', 'LABORATORIO', 'COMPLETADA', N'Completada', 3),
 ('ESTADO_ORDEN_LABORATORIO', N'Estado de orden de laboratorio', 'LABORATORIO', 'CANCELADA', N'Cancelada', 4),
 ('ESTADO_ORDEN_LABORATORIO', N'Estado de orden de laboratorio', 'LABORATORIO', 'RECHAZADA', N'Rechazada', 5),

 ('PRIORIDAD_ORDEN', N'Prioridad de orden', 'LABORATORIO', 'NORMAL', N'Normal', 1),
 ('PRIORIDAD_ORDEN', N'Prioridad de orden', 'LABORATORIO', 'URGENTE', N'Urgente', 2),

 -- Exacto: CamasService.cs y HospitalizacionesService.cs (backend) exigen
 -- literalmente el código ACTIVA.
 ('ESTADO_HOSPITALIZACION', N'Estado de hospitalización', 'HOSPITALIZACION', 'ACTIVA', N'Activa', 1),
 ('ESTADO_HOSPITALIZACION', N'Estado de hospitalización', 'HOSPITALIZACION', 'ALTA', N'Alta', 2),
 ('ESTADO_HOSPITALIZACION', N'Estado de hospitalización', 'HOSPITALIZACION', 'TRASLADADA', N'Trasladada', 3),

 ('TIPO_ORDEN_HOSPITALIZACION', N'Tipo de orden de hospitalización', 'HOSPITALIZACION', 'MEDICA', N'Médica', 1),
 ('TIPO_ORDEN_HOSPITALIZACION', N'Tipo de orden de hospitalización', 'HOSPITALIZACION', 'ENFERMERIA', N'Enfermería', 2),

 -- El frontend (factura-formulario.ts) y el backend (CrearFacturaAutomaticaAsync)
 -- asumen por convención que el primer valor (id más bajo) es "Factura".
 ('TIPO_DOCUMENTO_FISCAL', N'Tipo de documento fiscal', 'FACTURACION_COBROS', 'FACTURA', N'Factura', 1),
 ('TIPO_DOCUMENTO_FISCAL', N'Tipo de documento fiscal', 'FACTURACION_COBROS', 'NOTA_CREDITO', N'Nota de crédito', 2),

 -- Sin código exacto exigido por el backend; esquema de triage estándar de
 -- 4 niveles, editable libre después si tu clínica usa otra escala.
 ('NIVEL_TRIAGE', N'Nivel de triage', 'EMERGENCIAS', 'ROJO', N'Rojo — crítico / resucitación', 1),
 ('NIVEL_TRIAGE', N'Nivel de triage', 'EMERGENCIAS', 'AMARILLO', N'Amarillo — urgente', 2),
 ('NIVEL_TRIAGE', N'Nivel de triage', 'EMERGENCIAS', 'VERDE', N'Verde — menos urgente', 3),
 ('NIVEL_TRIAGE', N'Nivel de triage', 'EMERGENCIAS', 'NEGRO', N'Negro — fallecido', 4),

 ('ESTADO_CASO_EMERGENCIA', N'Estado de caso de emergencia', 'EMERGENCIAS', 'EN_ESPERA', N'En espera', 1),
 ('ESTADO_CASO_EMERGENCIA', N'Estado de caso de emergencia', 'EMERGENCIAS', 'EN_ATENCION', N'En atención', 2),
 ('ESTADO_CASO_EMERGENCIA', N'Estado de caso de emergencia', 'EMERGENCIAS', 'ATENDIDO', N'Atendido', 3),
 ('ESTADO_CASO_EMERGENCIA', N'Estado de caso de emergencia', 'EMERGENCIAS', 'REFERIDO', N'Referido a otro centro', 4),
 ('ESTADO_CASO_EMERGENCIA', N'Estado de caso de emergencia', 'EMERGENCIAS', 'CANCELADO', N'Cancelado', 5),

 -- Exacto: InventarioFarmaciaService.cs busca "ESTADO_ALERTA" (sin
 -- "_STOCK") al registrar un movimiento con stock bajo — inconsistencia real
 -- del código, no de este script. No se toca ESTADO_ALERTA_STOCK (PARTE 2).
 ('ESTADO_ALERTA', N'Estado de alerta', 'FARMACIA', 'PENDIENTE', N'Pendiente', 1),
 ('ESTADO_ALERTA', N'Estado de alerta', 'FARMACIA', 'ATENDIDA', N'Atendida', 2);

INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, codigo_modulo, activo, fecha_creacion)
SELECT DISTINCT s.tipo, s.tipoNombre, s.modulo, 1, SYSUTCDATETIME()
FROM @Seed2 s
WHERE NOT EXISTS (SELECT 1 FROM dbo.cat_tipo_catalogo t WHERE t.codigo = s.tipo);

INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden)
SELECT t.id_tipo_catalogo, s.codigo, s.nombre, s.orden
FROM @Seed2 s JOIN dbo.cat_tipo_catalogo t ON t.codigo = s.tipo
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.cat_valor_catalogo v
    WHERE v.id_tipo_catalogo = t.id_tipo_catalogo AND v.codigo = s.codigo);

-- Catálogo TIPO_OPERACION: solo el TIPO, sin valores — los tipos de
-- operación/cirugía son conocimiento clínico que agrega el equipo clínico
-- desde Mantenimiento (ver motor_consultas_schema.sql original, sección 3).
IF NOT EXISTS (SELECT 1 FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_OPERACION')
    INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, codigo_modulo, activo, fecha_creacion)
    VALUES ('TIPO_OPERACION', N'Tipo de operación', 'HOSPITALIZACION', 1, SYSUTCDATETIME());

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- =============================================================================
-- PARTE 10: ESTADO_CAMA — migra a LIBRE cualquier cama que haya quedado en
-- DISPONIBLE (de una base que vino con el catálogo viejo). En una base nueva
-- sembrada por este mismo script (PARTE 2 ya usa LIBRE) esto no encuentra
-- nada que hacer.
-- =============================================================================
BEGIN TRANSACTION;
BEGIN TRY

DECLARE @IdCamaLibre BIGINT = (
    SELECT v.id_valor_catalogo
    FROM dbo.cat_valor_catalogo v
    JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
    WHERE t.codigo = 'ESTADO_CAMA' AND v.codigo = 'LIBRE'
);
DECLARE @IdCamaDisponible BIGINT = (
    SELECT v.id_valor_catalogo
    FROM dbo.cat_valor_catalogo v
    JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
    WHERE t.codigo = 'ESTADO_CAMA' AND v.codigo = 'DISPONIBLE'
);

IF @IdCamaLibre IS NOT NULL AND @IdCamaDisponible IS NOT NULL AND OBJECT_ID('dbo.camas') IS NOT NULL
BEGIN
    UPDATE dbo.camas SET id_estado_cama = @IdCamaLibre WHERE id_estado_cama = @IdCamaDisponible;

    UPDATE dbo.cat_valor_catalogo SET activo = 0, fecha_modificacion = SYSUTCDATETIME()
    WHERE id_valor_catalogo = @IdCamaDisponible AND activo = 1;
END

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- =============================================================================
-- PARTE 11: cambios de esquema del "motor de consultas" (constancia médica,
-- id_cita en recetas/órdenes/hospitalizaciones/facturas/libro_actas,
-- medicamento externo, factura automática en Q0, precio de venta al
-- público, resultados de examen) y su catálogo ESTADO_RESULTADO.
-- =============================================================================
-- 1. Constancia médica (tabla nueva)
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'constancia_medica' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.constancia_medica (
        id_constancia           BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_cita                 BIGINT NOT NULL,
        id_paciente             BIGINT NOT NULL,
        id_medico               BIGINT NOT NULL,
        diagnostico             NVARCHAR(500) NULL,
        contenido               NVARCHAR(MAX) NOT NULL,
        activo                  BIT NOT NULL DEFAULT 1,
        fecha_creacion          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion      DATETIME2 NULL,
        id_usuario_creacion     BIGINT NULL,
        id_usuario_modificacion BIGINT NULL,
        CONSTRAINT fk_constancia_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita),
        CONSTRAINT fk_constancia_paciente FOREIGN KEY (id_paciente) REFERENCES dbo.pacientes (id_paciente),
        CONSTRAINT fk_constancia_medico FOREIGN KEY (id_medico) REFERENCES dbo.empleados (id_empleado),
        CONSTRAINT uq_constancia_cita UNIQUE (id_cita)
    );
END

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'constancia_medica' AND schema_id = SCHEMA_ID('dbo'))
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'uq_constancia_cita')
    ALTER TABLE dbo.constancia_medica ADD CONSTRAINT uq_constancia_cita UNIQUE (id_cita);
GO

BEGIN TRANSACTION;
BEGIN TRY

-- 2. Emergencias -> Cita automática
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.casos_emergencia') AND name = 'id_cita')
    ALTER TABLE dbo.casos_emergencia ADD id_cita BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.casos_emergencia') AND name = 'id_sala')
    ALTER TABLE dbo.casos_emergencia ADD id_sala BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_caso_emergencia_cita')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.casos_emergencia') AND name = 'id_cita')
    ALTER TABLE dbo.casos_emergencia ADD CONSTRAINT fk_caso_emergencia_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_caso_emergencia_sala')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.casos_emergencia') AND name = 'id_sala')
    ALTER TABLE dbo.casos_emergencia ADD CONSTRAINT fk_caso_emergencia_sala FOREIGN KEY (id_sala) REFERENCES dbo.salas (id_sala);

-- 3. Marcar cita para operación
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.citas') AND name = 'requiere_operacion')
    ALTER TABLE dbo.citas ADD requiere_operacion BIT NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.citas') AND name = 'id_tipo_operacion')
    ALTER TABLE dbo.citas ADD id_tipo_operacion BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.citas') AND name = 'notas_operacion')
    ALTER TABLE dbo.citas ADD notas_operacion NVARCHAR(500) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_citas_tipo_operacion')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.citas') AND name = 'id_tipo_operacion')
    ALTER TABLE dbo.citas ADD CONSTRAINT fk_citas_tipo_operacion FOREIGN KEY (id_tipo_operacion) REFERENCES dbo.cat_valor_catalogo (id_valor_catalogo);

-- 4. Receta ligada a su cita
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.recetas') AND name = 'id_cita')
    ALTER TABLE dbo.recetas ADD id_cita BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_receta_cita')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.recetas') AND name = 'id_cita')
    ALTER TABLE dbo.recetas ADD CONSTRAINT fk_receta_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita);

-- 5. Medicamento externo en receta_detalle
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.receta_detalle') AND name = 'id_medicamento' AND is_nullable = 0)
    ALTER TABLE dbo.receta_detalle ALTER COLUMN id_medicamento BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.receta_detalle') AND name = 'nombre_medicamento_externo')
    ALTER TABLE dbo.receta_detalle ADD nombre_medicamento_externo NVARCHAR(200) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_receta_detalle_medicamento')
    ALTER TABLE dbo.receta_detalle ADD CONSTRAINT ck_receta_detalle_medicamento CHECK (
        (id_medicamento IS NOT NULL AND nombre_medicamento_externo IS NULL) OR
        (id_medicamento IS NULL AND nombre_medicamento_externo IS NOT NULL)
    );

-- 6. Factura ligada a la línea de receta que la originó
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.factura_detalle') AND name = 'id_receta_detalle')
    ALTER TABLE dbo.factura_detalle ADD id_receta_detalle BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_factura_detalle_receta_detalle')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.factura_detalle') AND name = 'id_receta_detalle')
    ALTER TABLE dbo.factura_detalle ADD CONSTRAINT fk_factura_detalle_receta_detalle FOREIGN KEY (id_receta_detalle) REFERENCES dbo.receta_detalle (id_receta_detalle);

-- 7. Cantidad por medicamento en receta_detalle
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.receta_detalle') AND name = 'cantidad')
BEGIN
    ALTER TABLE dbo.receta_detalle ADD cantidad DECIMAL(10,2) NULL;
    UPDATE dbo.receta_detalle SET cantidad = 1 WHERE cantidad IS NULL;
    ALTER TABLE dbo.receta_detalle ALTER COLUMN cantidad DECIMAL(10,2) NOT NULL;
END

-- 8. Hospitalización ligada a la cita que la originó
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.hospitalizaciones') AND name = 'id_cita')
    ALTER TABLE dbo.hospitalizaciones ADD id_cita BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_hospitalizaciones_cita')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.hospitalizaciones') AND name = 'id_cita')
    ALTER TABLE dbo.hospitalizaciones ADD CONSTRAINT fk_hospitalizaciones_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita);

-- 9. Factura automática en Q0.00 por cita, y precio de venta al público por medicamento
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'id_cita')
    ALTER TABLE dbo.facturas ADD id_cita BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_facturas_cita')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'id_cita')
    ALTER TABLE dbo.facturas ADD CONSTRAINT fk_facturas_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_facturas_id_cita' AND object_id = OBJECT_ID('dbo.facturas'))
    CREATE UNIQUE INDEX ux_facturas_id_cita ON dbo.facturas (id_cita) WHERE id_cita IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.medicamentos') AND name = 'precio_venta_publico')
BEGIN
    ALTER TABLE dbo.medicamentos ADD precio_venta_publico DECIMAL(12,2) NULL;
    UPDATE dbo.medicamentos SET precio_venta_publico = 0 WHERE precio_venta_publico IS NULL;
    ALTER TABLE dbo.medicamentos ALTER COLUMN precio_venta_publico DECIMAL(12,2) NOT NULL;
END

-- 10. Catálogo ESTADO_RESULTADO
IF NOT EXISTS (SELECT 1 FROM dbo.cat_tipo_catalogo WHERE codigo = 'ESTADO_RESULTADO')
    INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, codigo_modulo, activo, fecha_creacion)
    VALUES ('ESTADO_RESULTADO', N'Estado del resultado de examen', 'LABORATORIO', 1, SYSUTCDATETIME());

INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden)
SELECT t.id_tipo_catalogo, v.codigo, v.nombre, v.orden
FROM dbo.cat_tipo_catalogo t
CROSS JOIN (VALUES
    ('PRELIMINAR', N'Preliminar', 1),
    ('FINAL', N'Final', 2),
    ('CORREGIDO', N'Corregido', 3)
) AS v(codigo, nombre, orden)
WHERE t.codigo = 'ESTADO_RESULTADO'
AND NOT EXISTS (
    SELECT 1 FROM dbo.cat_valor_catalogo existente
    WHERE existente.id_tipo_catalogo = t.id_tipo_catalogo AND existente.codigo = v.codigo
);

-- 11. Acta ligada a la cita que la originó
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.libro_actas') AND name = 'id_cita')
    ALTER TABLE dbo.libro_actas ADD id_cita BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_libro_actas_cita')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.libro_actas') AND name = 'id_cita')
    ALTER TABLE dbo.libro_actas ADD CONSTRAINT fk_libro_actas_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_libro_actas_id_cita' AND object_id = OBJECT_ID('dbo.libro_actas'))
    CREATE UNIQUE INDEX ux_libro_actas_id_cita ON dbo.libro_actas (id_cita) WHERE id_cita IS NOT NULL;

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- =============================================================================
-- PARTE 12: un empleado solo puede tener una cuenta de usuario activa.
-- En una base nueva (sin usuarios todavía) esto no encuentra duplicados y
-- crea el índice directo.
-- =============================================================================
IF EXISTS (
    SELECT 1 FROM dbo.usuarios
    WHERE activo = 1 AND id_empleado IS NOT NULL
    GROUP BY id_empleado HAVING COUNT(*) > 1
)
BEGIN
    PRINT 'PARTE 12: hay empleados con más de un usuario activo — revisa dbo.usuarios antes de crear el índice único (correr de nuevo este script cuando estén corregidos).';
    SELECT u.id_empleado, u.id_usuario, u.nombre_usuario, u.correo, u.fecha_creacion
    FROM dbo.usuarios u
    WHERE u.activo = 1
      AND u.id_empleado IN (
          SELECT id_empleado FROM dbo.usuarios
          WHERE activo = 1 AND id_empleado IS NOT NULL
          GROUP BY id_empleado HAVING COUNT(*) > 1
      )
    ORDER BY u.id_empleado, u.fecha_creacion;
END
ELSE IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_usuarios_empleado_activo' AND object_id = OBJECT_ID('dbo.usuarios'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX ux_usuarios_empleado_activo
        ON dbo.usuarios (id_empleado)
        WHERE id_empleado IS NOT NULL AND activo = 1;
    PRINT 'PARTE 12: índice ux_usuarios_empleado_activo creado.';
END
ELSE
    PRINT 'PARTE 12: el índice ux_usuarios_empleado_activo ya existía.';
GO

-- =============================================================================
-- PARTE 13: usuario administrador inicial (nombre_usuario = 'admin').
-- Idempotente por nombre_usuario: si ya existe, no hace nada.
--
-- El empleado detrás de este usuario se crea con datos de relleno (nombre
-- "Administrador" / "Sistema") para cumplir las columnas obligatorias de
-- `empleados` — edítalo desde Mantenimiento -> Empleados con los datos
-- reales de la persona en cuanto entres por primera vez.
--
-- Ningún id se deja fijo (ni de empleado, ni de catálogo, ni de usuario que
-- "creó" el registro): todo se resuelve por código o se deja en NULL, para
-- que esto funcione igual sin importar qué ids ya existan en la base.
-- =============================================================================
BEGIN TRANSACTION;
BEGIN TRY

IF NOT EXISTS (SELECT 1 FROM dbo.usuarios WHERE nombre_usuario = N'admin')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.puestos WHERE nombre = N'Administrador del Sistema')
        INSERT INTO dbo.puestos (nombre, activo, fecha_creacion) VALUES (N'Administrador del Sistema', 1, SYSUTCDATETIME());

    DECLARE @IdPuestoAdmin BIGINT = (SELECT id_puesto FROM dbo.puestos WHERE nombre = N'Administrador del Sistema');

    DECLARE @IdEstadoEmpleadoActivo BIGINT = (
        SELECT v.id_valor_catalogo FROM dbo.cat_valor_catalogo v
        JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
        WHERE t.codigo = 'ESTADO_EMPLEADO' AND v.codigo = 'ACTIVO'
    );
    DECLARE @IdEstadoUsuarioActivo BIGINT = (
        SELECT v.id_valor_catalogo FROM dbo.cat_valor_catalogo v
        JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
        WHERE t.codigo = 'ESTADO_USUARIO' AND v.codigo = 'ACTIVO'
    );

    IF @IdEstadoEmpleadoActivo IS NULL OR @IdEstadoUsuarioActivo IS NULL
        THROW 50000, 'No se pudo resolver ESTADO_EMPLEADO/ACTIVO o ESTADO_USUARIO/ACTIVO — revisa que la PARTE 2 haya corrido bien.', 1;

    -- Empleado de relleno: nombre genérico, se edita después desde la app.
    INSERT INTO dbo.empleados (
        primer_nombre, primer_apellido, fecha_ingreso, id_puesto, id_estado_empleado, activo, fecha_creacion
    )
    VALUES (
        N'Administrador', N'Sistema', CAST(SYSUTCDATETIME() AS DATE), @IdPuestoAdmin, @IdEstadoEmpleadoActivo, 1, SYSUTCDATETIME()
    );
    DECLARE @IdEmpleadoAdmin BIGINT = SCOPE_IDENTITY();

    INSERT INTO dbo.usuarios (
        id_empleado, nombre_usuario, correo, hash_password, id_estado_usuario,
        fecha_ultimo_acceso, intentos_fallidos, requiere_cambio_password, activo,
        fecha_creacion, fecha_modificacion, id_usuario_creacion, id_usuario_modificacion
    )
    VALUES (
        @IdEmpleadoAdmin, N'admin', N'admin@medicentro.gt',
        N'$2a$11$QwbA/SzojVTXDqYPne.oVeiGKZnboACL5rgMtNr096JR7qbaOlnnK',
        @IdEstadoUsuarioActivo,
        NULL, 0, 0, 1,
        SYSUTCDATETIME(), NULL, NULL, NULL
    );
END

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- =============================================================================
-- PARTE 14: rol ADMIN (acceso a los 9 módulos) asignado al usuario 'admin'
-- recién creado. Junta crear_rol_admin_permisos.sql + corregir_rol_admin.sql
-- pero resolviendo el usuario por nombre_usuario en vez de un id fijo — el
-- backend (MatrizAcceso.cs) autoriza por el NOMBRE del rol en el token
-- ('ADMIN' exacto), no por rol_permiso.
-- =============================================================================
BEGIN TRANSACTION;
BEGIN TRY

DECLARE @IdUsuarioAdmin BIGINT = (SELECT id_usuario FROM dbo.usuarios WHERE nombre_usuario = N'admin');

IF @IdUsuarioAdmin IS NOT NULL
BEGIN
    DECLARE @Modulos TABLE (codigo NVARCHAR(50) PRIMARY KEY, nombre NVARCHAR(150));
    INSERT INTO @Modulos (codigo, nombre) VALUES
        ('RECEPCION',            N'Recepción'),
        ('SEGUROS_MEDICOS',      N'Seguros Médicos'),
        ('EXPEDIENTES_CLINICOS', N'Expedientes Clínicos'),
        ('LABORATORIO',          N'Laboratorio y Diagnóstico'),
        ('EMERGENCIAS',          N'Emergencias'),
        ('HOSPITALIZACION',      N'Hospitalización'),
        ('FARMACIA',             N'Farmacia'),
        ('FACTURACION_COBROS',   N'Facturación y Cobros'),
        ('MANTENIMIENTO',        N'Mantenimiento');

    -- Permisos de módulo (uno por módulo, código ACCESO_<MODULO>)
    INSERT INTO dbo.permisos (codigo, nombre, id_modulo, descripcion)
    SELECT 'ACCESO_' + m.codigo, N'Acceso a ' + m.nombre, cv.id_valor_catalogo, N'Permite ver y usar el módulo ' + m.nombre
    FROM @Modulos m
    JOIN dbo.cat_valor_catalogo cv ON cv.codigo = m.codigo
    JOIN dbo.cat_tipo_catalogo ct ON ct.id_tipo_catalogo = cv.id_tipo_catalogo AND ct.codigo = 'MODULO_SISTEMA'
    WHERE NOT EXISTS (SELECT 1 FROM dbo.permisos p WHERE p.codigo = 'ACCESO_' + m.codigo);

    UPDATE p SET activo = 1, fecha_modificacion = SYSDATETIME()
    FROM dbo.permisos p JOIN @Modulos m ON p.codigo = 'ACCESO_' + m.codigo
    WHERE p.activo = 0;

    -- Rol ADMIN (nombre exacto: lo exige MatrizAcceso.cs)
    IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE nombre = N'ADMIN')
        INSERT INTO dbo.roles (nombre, descripcion, id_usuario_creacion)
        VALUES (N'ADMIN', N'Acceso total a todos los módulos del sistema', @IdUsuarioAdmin);
    ELSE
        UPDATE dbo.roles SET activo = 1 WHERE nombre = N'ADMIN' AND activo = 0;

    DECLARE @IdRolAdmin BIGINT = (SELECT id_rol FROM dbo.roles WHERE nombre = N'ADMIN');

    INSERT INTO dbo.rol_permiso (id_rol, id_permiso)
    SELECT @IdRolAdmin, p.id_permiso
    FROM dbo.permisos p JOIN @Modulos m ON p.codigo = 'ACCESO_' + m.codigo
    WHERE NOT EXISTS (SELECT 1 FROM dbo.rol_permiso rp WHERE rp.id_rol = @IdRolAdmin AND rp.id_permiso = p.id_permiso);

    UPDATE rp SET activo = 1
    FROM dbo.rol_permiso rp
    JOIN dbo.permisos p ON p.id_permiso = rp.id_permiso
    JOIN @Modulos m ON p.codigo = 'ACCESO_' + m.codigo
    WHERE rp.id_rol = @IdRolAdmin AND rp.activo = 0;

    IF NOT EXISTS (SELECT 1 FROM dbo.usuario_rol WHERE id_usuario = @IdUsuarioAdmin AND id_rol = @IdRolAdmin)
        INSERT INTO dbo.usuario_rol (id_usuario, id_rol) VALUES (@IdUsuarioAdmin, @IdRolAdmin);
    ELSE
        UPDATE dbo.usuario_rol SET activo = 1 WHERE id_usuario = @IdUsuarioAdmin AND id_rol = @IdRolAdmin AND activo = 0;

    -- Si quedó también un rol 'Administrador' viejo por separado, se desactiva
    -- para no tener dos roles de admin (ver corregir_rol_admin.sql original).
    DECLARE @IdRolViejo BIGINT = (SELECT id_rol FROM dbo.roles WHERE nombre = N'Administrador');
    IF @IdRolViejo IS NOT NULL
    BEGIN
        UPDATE dbo.usuario_rol SET activo = 0 WHERE id_rol = @IdRolViejo;
        UPDATE dbo.roles SET activo = 0, fecha_modificacion = SYSDATETIME() WHERE id_rol = @IdRolViejo;
    END
END

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- Verificación: debe listar 9 filas (una por módulo) para el usuario 'admin'.
SELECT u.id_usuario, u.nombre_usuario, r.nombre AS rol, p.codigo AS permiso, cv.codigo AS modulo
FROM dbo.usuarios u
JOIN dbo.usuario_rol ur ON ur.id_usuario = u.id_usuario AND ur.activo = 1
JOIN dbo.roles r ON r.id_rol = ur.id_rol AND r.nombre = N'ADMIN'
JOIN dbo.rol_permiso rp ON rp.id_rol = r.id_rol AND rp.activo = 1
JOIN dbo.permisos p ON p.id_permiso = rp.id_permiso
JOIN dbo.cat_valor_catalogo cv ON cv.id_valor_catalogo = p.id_modulo
WHERE u.nombre_usuario = N'admin'
ORDER BY cv.orden;

-- =============================================================================
-- VERIFICACIÓN FINAL: resumen de catálogos clave (cuántos valores activos
-- tiene cada uno). Si alguno de los que el backend exige en duro aparece en
-- 0, algo falló arriba — revisa el mensaje de error de esa PARTE.
-- =============================================================================
SELECT t.codigo AS tipo, COUNT(v.id_valor_catalogo) AS valores_activos
FROM dbo.cat_tipo_catalogo t
LEFT JOIN dbo.cat_valor_catalogo v ON v.id_tipo_catalogo = t.id_tipo_catalogo AND v.activo = 1
WHERE t.codigo IN (
    'TIPO_ITEM_INVENTARIO','TIPO_MOVIMIENTO_INVENTARIO','ESTADO_PAGO','ESTADO_FACTURA','FORMA_PAGO',
    'UNIDAD_MEDIDA','ESTADO_ITEM_INVENTARIO','ESTADO_RECETA','CATEGORIA_MEDICAMENTO','ESTADO_CXC',
    'ESTADO_ALERTA_STOCK','ESTADO_ALERTA','MODULO_SISTEMA','TIPO_ENTIDAD_ASEGURADORA','CATEGORIA_EXAMEN',
    'TIPO_HABITACION','ESTADO_HABITACION','ESTADO_CAMA','ESTADO_CONVENIO','ESTADO_EMPLEADO','ESTADO_USUARIO',
    'GENERO','TIPO_DOCUMENTO','TIPO_ITEM_FACTURA','TIPO_SALA','ESTADO_SALA','SEVERIDAD','TIPO_ACCION_AUDITORIA',
    'ESTADO_CIVIL','TIPO_SANGRE','NIVEL_CONFIDENCIALIDAD','ESTADO_PACIENTE','PARENTESCO','TIPO_ALERGIA',
    'TIPO_ANTECEDENTE','ESTADO_CITA','MOTIVO_CANCELACION','DIA_SEMANA','TIPO_RECORDATORIO','ESTADO_ENVIO',
    'TIPO_CONSULTA','RAMO_SEGURO','TITULARIDAD_POLIZA','ESTADO_POLIZA','TIPO_ENTIDAD_CONVENIO','ESTADO_AFILIACION',
    'TIPO_REGISTRO_CLINICO','ESTADO_TRATAMIENTO','TIPO_REPORTE','TIPO_CONSENTIMIENTO','ESTADO_CONSENTIMIENTO',
    'ESTADO_ORDEN_LABORATORIO','PRIORIDAD_ORDEN','ESTADO_HOSPITALIZACION','TIPO_ORDEN_HOSPITALIZACION',
    'TIPO_DOCUMENTO_FISCAL','NIVEL_TRIAGE','ESTADO_CASO_EMERGENCIA','TIPO_OPERACION','ESTADO_RESULTADO'
)
GROUP BY t.codigo
ORDER BY t.codigo;

-- =============================================================================
-- PARTE 15: columna tipos_examen.precio_venta_publico — con esto se calcula
-- la línea de factura de cada examen (mismo patrón que
-- medicamentos.precio_venta_publico de la PARTE 11).
-- =============================================================================
BEGIN TRANSACTION;
BEGIN TRY

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.tipos_examen') AND name = 'precio_venta_publico')
BEGIN
    ALTER TABLE dbo.tipos_examen ADD precio_venta_publico DECIMAL(12,2) NULL;
    UPDATE dbo.tipos_examen SET precio_venta_publico = 0 WHERE precio_venta_publico IS NULL;
    ALTER TABLE dbo.tipos_examen ALTER COLUMN precio_venta_publico DECIMAL(12,2) NOT NULL;
END

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- =============================================================================
-- PARTE 16: catálogo TIPO_CONSULTA código LABORATORIOS + empleado de relleno
-- "Laboratorio" / "(Sin médico asignado)" que consulta-formulario.ts asigna
-- automáticamente a las consultas de solo-exámenes (sin id_especialidad, así
-- que EmpleadosService.ListarMedicosAsync() —que filtra
-- WHERE e.Activo && e.IdEspecialidad != null— nunca lo lista como médico).
-- Idempotente: si el valor de catálogo o el empleado ya existen, no hace nada.
-- =============================================================================
BEGIN TRANSACTION;
BEGIN TRY

DECLARE @IdTipoCatalogoConsulta BIGINT = (SELECT id_tipo_catalogo FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_CONSULTA');
IF @IdTipoCatalogoConsulta IS NULL
    THROW 50000, 'No existe el tipo de catálogo TIPO_CONSULTA — revisa que la PARTE 2 haya corrido bien.', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdTipoCatalogoConsulta AND codigo = 'LABORATORIOS')
    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden, activo, fecha_creacion)
    VALUES (@IdTipoCatalogoConsulta, 'LABORATORIOS', N'Laboratorios', 3, 1, SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.empleados WHERE primer_nombre = N'Laboratorio' AND primer_apellido = N'(Sin médico asignado)')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM dbo.puestos WHERE nombre = N'Laboratorio (sin médico)')
        INSERT INTO dbo.puestos (nombre, activo, fecha_creacion) VALUES (N'Laboratorio (sin médico)', 1, SYSUTCDATETIME());

    DECLARE @IdPuestoLaboratorio BIGINT = (SELECT id_puesto FROM dbo.puestos WHERE nombre = N'Laboratorio (sin médico)');

    DECLARE @IdEstadoEmpleadoActivoLab BIGINT = (
        SELECT v.id_valor_catalogo FROM dbo.cat_valor_catalogo v
        JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
        WHERE t.codigo = 'ESTADO_EMPLEADO' AND v.codigo = 'ACTIVO'
    );
    IF @IdEstadoEmpleadoActivoLab IS NULL
        THROW 50000, 'No se pudo resolver ESTADO_EMPLEADO/ACTIVO — revisa que la PARTE 2 haya corrido bien.', 1;

    -- id_especialidad se deja NULL adrede: así nunca aparece como médico seleccionable.
    INSERT INTO dbo.empleados (
        primer_nombre, primer_apellido, id_puesto, id_especialidad, fecha_ingreso, id_estado_empleado, activo, fecha_creacion
    )
    VALUES (
        N'Laboratorio', N'(Sin médico asignado)', @IdPuestoLaboratorio, NULL, CAST(SYSUTCDATETIME() AS DATE), @IdEstadoEmpleadoActivoLab, 1, SYSUTCDATETIME()
    );
END

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- Verificación: debe devolver una fila, con id_especialidad en NULL.
SELECT e.id_empleado, e.primer_nombre, e.primer_apellido, e.id_especialidad, cv.codigo AS codigo_tipo_consulta
FROM dbo.empleados e
CROSS JOIN (
    SELECT v.codigo FROM dbo.cat_valor_catalogo v
    JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
    WHERE t.codigo = 'TIPO_CONSULTA' AND v.codigo = 'LABORATORIOS'
) cv
WHERE e.primer_nombre = N'Laboratorio' AND e.primer_apellido = N'(Sin médico asignado)';

-- =============================================================================
-- PARTE 17: factura_detalle.id_orden_detalle — liga una línea de factura al
-- examen de laboratorio que la originó (mismo patrón que id_receta_detalle
-- con los medicamentos de receta), para que FacturasService.
-- SincronizarLineasDesdeExamenesAsync pueda cobrar cada examen agregado a
-- una orden de laboratorio con el precio_venta_publico de tipos_examen
-- (PARTE 15), igual que ya pasa con los medicamentos de una receta.
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.factura_detalle') AND name = 'id_orden_detalle')
    ALTER TABLE dbo.factura_detalle ADD id_orden_detalle BIGINT NULL;
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_factura_detalle_orden_detalle')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.factura_detalle') AND name = 'id_orden_detalle')
    ALTER TABLE dbo.factura_detalle ADD CONSTRAINT fk_factura_detalle_orden_detalle FOREIGN KEY (id_orden_detalle) REFERENCES dbo.orden_detalle (id_orden_detalle);
