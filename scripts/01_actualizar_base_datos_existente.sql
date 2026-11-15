-- =============================================================================
-- ACTUALIZAR (O CREAR) LA BASE MEDICENTRO — todo con IF, se puede correr
-- sobre una base que ya existe y con datos.
-- =============================================================================
-- Hace lo mismo que 00_crear_base_datos_desde_cero.sql, pero revisando antes
-- cada cosa:
--   - Base de datos: si MEDICENTRO no existe la crea; si existe, la usa.
--   - Tablas: si la tabla no existe la crea completa. Si ya existe, revisa
--     columna por columna y agrega solo las que le falten.
--       * Una columna NOT NULL sin DEFAULT no se puede agregar a una tabla
--         que ya tiene filas: en ese caso se agrega como NULL y se imprime un
--         AVISO para que la llenes y luego la pases a NOT NULL.
--       * No cambia el tipo ni el tamaño de columnas que ya existen, ni borra
--         nada.
--   - Llaves foráneas: si ya hay una llave de esa columna hacia esa tabla, la
--     salta (no importa el nombre que tenga). Si no, la crea.
--   - Índices: los crea solo si no existe uno con ese nombre.
--   - Vistas: CREATE OR ALTER (quedan con la versión de este script).
--   - Catálogos: inserta solo los tipos y valores cuyo código no exista (no
--     reactiva ni renombra los que ya tienes). A los tipos sin módulo les
--     pone su módulo.
--   - COMPROMISO_PAGO, usuario admin, rol ADMIN, permisos y empleado de
--     Laboratorio: solo si no existen.
--
-- Si algo no se puede crear (por ejemplo una llave foránea o un índice único
-- porque los datos que ya tienes no la cumplen), NO se detiene: imprime
-- "AVISO: ..." en la pestaña Mensajes y sigue. Al terminar revisa esos avisos.
--
-- Recomendado: saca un respaldo antes (clic derecho a la base -> Tareas ->
-- Copia de seguridad). Requiere SQL Server 2016 SP1 o superior.
-- Se puede correr las veces que quieras: la segunda vez ya no agrega nada.
-- =============================================================================

SET NOCOUNT ON;
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
GO

USE [master];
GO

IF DB_ID(N'MEDICENTRO') IS NULL
BEGIN
    CREATE DATABASE [MEDICENTRO];
    PRINT N'Base MEDICENTRO creada.';
END
ELSE
    PRINT N'La base MEDICENTRO ya existe: solo se agrega lo que falte.';
GO

USE [MEDICENTRO];
GO

IF DB_NAME() <> N'MEDICENTRO'
BEGIN
    RAISERROR(N'No se pudo entrar a la base MEDICENTRO. No se ejecutó nada más.', 16, 1);
    SET NOEXEC ON;
END
GO

-- =============================================================================
-- PARTE 1: TABLAS — crea la tabla si no existe; si existe, agrega las
-- columnas que le falten.
-- =============================================================================

-- Origen: agregar_control_medicamentos.sql (PARTE 28)
IF OBJECT_ID(N'dbo.administracion_medicamento', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[administracion_medicamento] (
    	[id_administracion] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_medicamento_programado] [bigint] NOT NULL,
    	[id_empleado] [bigint] NOT NULL,
    	[fecha_hora] [datetime2](7) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	PRIMARY KEY CLUSTERED ([id_administracion] ASC)
    );
    PRINT N'Tabla creada: administracion_medicamento';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.administracion_medicamento', N'id_medicamento_programado') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[administracion_medicamento])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[administracion_medicamento] ADD [id_medicamento_programado] [bigint] NULL;');
            PRINT N'AVISO: administracion_medicamento.id_medicamento_programado se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[administracion_medicamento] ADD [id_medicamento_programado] [bigint] NOT NULL;');
        PRINT N'Columna agregada: administracion_medicamento.id_medicamento_programado';
    END
    IF COL_LENGTH(N'dbo.administracion_medicamento', N'id_empleado') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[administracion_medicamento])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[administracion_medicamento] ADD [id_empleado] [bigint] NULL;');
            PRINT N'AVISO: administracion_medicamento.id_empleado se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[administracion_medicamento] ADD [id_empleado] [bigint] NOT NULL;');
        PRINT N'Columna agregada: administracion_medicamento.id_empleado';
    END
    IF COL_LENGTH(N'dbo.administracion_medicamento', N'fecha_hora') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[administracion_medicamento])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[administracion_medicamento] ADD [fecha_hora] [datetime2](7) NULL;');
            PRINT N'AVISO: administracion_medicamento.fecha_hora se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[administracion_medicamento] ADD [fecha_hora] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: administracion_medicamento.fecha_hora';
    END
    IF COL_LENGTH(N'dbo.administracion_medicamento', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[administracion_medicamento] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: administracion_medicamento.activo';
    END
    IF COL_LENGTH(N'dbo.administracion_medicamento', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[administracion_medicamento] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: administracion_medicamento.fecha_creacion';
    END
END
GO

IF OBJECT_ID(N'dbo.alertas_stock', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[alertas_stock] (
    	[id_alerta_stock] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_item_inventario] [bigint] NOT NULL,
    	[fecha_alerta] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[stock_al_momento] [numeric](12, 2) NOT NULL,
    	[id_estado_alerta] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	PRIMARY KEY CLUSTERED ([id_alerta_stock] ASC)
    );
    PRINT N'Tabla creada: alertas_stock';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.alertas_stock', N'id_item_inventario') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[alertas_stock])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[alertas_stock] ADD [id_item_inventario] [bigint] NULL;');
            PRINT N'AVISO: alertas_stock.id_item_inventario se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[alertas_stock] ADD [id_item_inventario] [bigint] NOT NULL;');
        PRINT N'Columna agregada: alertas_stock.id_item_inventario';
    END
    IF COL_LENGTH(N'dbo.alertas_stock', N'fecha_alerta') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[alertas_stock] ADD [fecha_alerta] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: alertas_stock.fecha_alerta';
    END
    IF COL_LENGTH(N'dbo.alertas_stock', N'stock_al_momento') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[alertas_stock])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[alertas_stock] ADD [stock_al_momento] [numeric](12, 2) NULL;');
            PRINT N'AVISO: alertas_stock.stock_al_momento se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[alertas_stock] ADD [stock_al_momento] [numeric](12, 2) NOT NULL;');
        PRINT N'Columna agregada: alertas_stock.stock_al_momento';
    END
    IF COL_LENGTH(N'dbo.alertas_stock', N'id_estado_alerta') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[alertas_stock])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[alertas_stock] ADD [id_estado_alerta] [bigint] NULL;');
            PRINT N'AVISO: alertas_stock.id_estado_alerta se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[alertas_stock] ADD [id_estado_alerta] [bigint] NOT NULL;');
        PRINT N'Columna agregada: alertas_stock.id_estado_alerta';
    END
    IF COL_LENGTH(N'dbo.alertas_stock', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[alertas_stock] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: alertas_stock.activo';
    END
    IF COL_LENGTH(N'dbo.alertas_stock', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[alertas_stock] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: alertas_stock.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.alertas_stock', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[alertas_stock] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: alertas_stock.fecha_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.aseguradoras', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[aseguradoras] (
    	[id_aseguradora] [bigint] IDENTITY(1,1) NOT NULL,
    	[nombre] [nvarchar](200) NOT NULL,
    	[nit] [nvarchar](30) NULL,
    	[id_tipo_entidad] [bigint] NULL,
    	[contacto] [nvarchar](150) NULL,
    	[telefono] [nvarchar](30) NULL,
    	[correo] [nvarchar](150) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_aseguradora] ASC)
    );
    PRINT N'Tabla creada: aseguradoras';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.aseguradoras', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[aseguradoras])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD [nombre] [nvarchar](200) NULL;');
            PRINT N'AVISO: aseguradoras.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD [nombre] [nvarchar](200) NOT NULL;');
        PRINT N'Columna agregada: aseguradoras.nombre';
    END
    IF COL_LENGTH(N'dbo.aseguradoras', N'nit') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD [nit] [nvarchar](30) NULL;');
        PRINT N'Columna agregada: aseguradoras.nit';
    END
    IF COL_LENGTH(N'dbo.aseguradoras', N'id_tipo_entidad') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD [id_tipo_entidad] [bigint] NULL;');
        PRINT N'Columna agregada: aseguradoras.id_tipo_entidad';
    END
    IF COL_LENGTH(N'dbo.aseguradoras', N'contacto') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD [contacto] [nvarchar](150) NULL;');
        PRINT N'Columna agregada: aseguradoras.contacto';
    END
    IF COL_LENGTH(N'dbo.aseguradoras', N'telefono') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD [telefono] [nvarchar](30) NULL;');
        PRINT N'Columna agregada: aseguradoras.telefono';
    END
    IF COL_LENGTH(N'dbo.aseguradoras', N'correo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD [correo] [nvarchar](150) NULL;');
        PRINT N'Columna agregada: aseguradoras.correo';
    END
    IF COL_LENGTH(N'dbo.aseguradoras', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: aseguradoras.activo';
    END
    IF COL_LENGTH(N'dbo.aseguradoras', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: aseguradoras.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.aseguradoras', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: aseguradoras.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.aseguradoras', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: aseguradoras.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.aseguradoras', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: aseguradoras.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.bitacora_auditoria', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[bitacora_auditoria] (
    	[id_bitacora] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_usuario] [bigint] NULL,
    	[id_tipo_accion] [bigint] NOT NULL,
    	[tabla_afectada] [nvarchar](100) NOT NULL,
    	[id_registro_afectado] [bigint] NULL,
    	[valores_anteriores] [nvarchar](max) NULL,
    	[valores_nuevos] [nvarchar](max) NULL,
    	[ip_origen] [nvarchar](50) NULL,
    	[fecha_hora] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	PRIMARY KEY CLUSTERED ([id_bitacora] ASC),
    	CHECK (([valores_anteriores] IS NULL OR isjson([valores_anteriores])=(1))),
    	CHECK (([valores_nuevos] IS NULL OR isjson([valores_nuevos])=(1)))
    );
    PRINT N'Tabla creada: bitacora_auditoria';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.bitacora_auditoria', N'id_usuario') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD [id_usuario] [bigint] NULL;');
        PRINT N'Columna agregada: bitacora_auditoria.id_usuario';
    END
    IF COL_LENGTH(N'dbo.bitacora_auditoria', N'id_tipo_accion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[bitacora_auditoria])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD [id_tipo_accion] [bigint] NULL;');
            PRINT N'AVISO: bitacora_auditoria.id_tipo_accion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD [id_tipo_accion] [bigint] NOT NULL;');
        PRINT N'Columna agregada: bitacora_auditoria.id_tipo_accion';
    END
    IF COL_LENGTH(N'dbo.bitacora_auditoria', N'tabla_afectada') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[bitacora_auditoria])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD [tabla_afectada] [nvarchar](100) NULL;');
            PRINT N'AVISO: bitacora_auditoria.tabla_afectada se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD [tabla_afectada] [nvarchar](100) NOT NULL;');
        PRINT N'Columna agregada: bitacora_auditoria.tabla_afectada';
    END
    IF COL_LENGTH(N'dbo.bitacora_auditoria', N'id_registro_afectado') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD [id_registro_afectado] [bigint] NULL;');
        PRINT N'Columna agregada: bitacora_auditoria.id_registro_afectado';
    END
    IF COL_LENGTH(N'dbo.bitacora_auditoria', N'valores_anteriores') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD [valores_anteriores] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: bitacora_auditoria.valores_anteriores';
    END
    IF COL_LENGTH(N'dbo.bitacora_auditoria', N'valores_nuevos') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD [valores_nuevos] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: bitacora_auditoria.valores_nuevos';
    END
    IF COL_LENGTH(N'dbo.bitacora_auditoria', N'ip_origen') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD [ip_origen] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: bitacora_auditoria.ip_origen';
    END
    IF COL_LENGTH(N'dbo.bitacora_auditoria', N'fecha_hora') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD [fecha_hora] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: bitacora_auditoria.fecha_hora';
    END
    IF COL_LENGTH(N'dbo.bitacora_auditoria', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: bitacora_auditoria.activo';
    END
END
GO

IF OBJECT_ID(N'dbo.camas', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[camas] (
    	[id_cama] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_habitacion] [bigint] NOT NULL,
    	[numero_cama] [nvarchar](10) NOT NULL,
    	[id_estado_cama] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	PRIMARY KEY CLUSTERED ([id_cama] ASC),
    	UNIQUE NONCLUSTERED ([id_habitacion] ASC, [numero_cama] ASC)
    );
    PRINT N'Tabla creada: camas';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.camas', N'id_habitacion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[camas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[camas] ADD [id_habitacion] [bigint] NULL;');
            PRINT N'AVISO: camas.id_habitacion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[camas] ADD [id_habitacion] [bigint] NOT NULL;');
        PRINT N'Columna agregada: camas.id_habitacion';
    END
    IF COL_LENGTH(N'dbo.camas', N'numero_cama') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[camas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[camas] ADD [numero_cama] [nvarchar](10) NULL;');
            PRINT N'AVISO: camas.numero_cama se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[camas] ADD [numero_cama] [nvarchar](10) NOT NULL;');
        PRINT N'Columna agregada: camas.numero_cama';
    END
    IF COL_LENGTH(N'dbo.camas', N'id_estado_cama') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[camas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[camas] ADD [id_estado_cama] [bigint] NULL;');
            PRINT N'AVISO: camas.id_estado_cama se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[camas] ADD [id_estado_cama] [bigint] NOT NULL;');
        PRINT N'Columna agregada: camas.id_estado_cama';
    END
    IF COL_LENGTH(N'dbo.camas', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[camas] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: camas.activo';
    END
    IF COL_LENGTH(N'dbo.camas', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[camas] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: camas.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.camas', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[camas] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: camas.fecha_modificacion';
    END
END
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql
IF OBJECT_ID(N'dbo.casos_emergencia', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[casos_emergencia] (
    	[id_caso] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NULL,
    	[nombre_paciente] [nvarchar](200) NULL,
    	[id_medico] [bigint] NULL,
    	[id_nivel_triage] [bigint] NOT NULL,
    	[id_estado_caso] [bigint] NOT NULL,
    	[motivo] [nvarchar](255) NOT NULL,
    	[hora_llegada] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[id_cita] [bigint] NULL,
    	[id_sala] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_caso] ASC)
    );
    PRINT N'Tabla creada: casos_emergencia';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.casos_emergencia', N'id_paciente') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [id_paciente] [bigint] NULL;');
        PRINT N'Columna agregada: casos_emergencia.id_paciente';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'nombre_paciente') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [nombre_paciente] [nvarchar](200) NULL;');
        PRINT N'Columna agregada: casos_emergencia.nombre_paciente';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'id_medico') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [id_medico] [bigint] NULL;');
        PRINT N'Columna agregada: casos_emergencia.id_medico';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'id_nivel_triage') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[casos_emergencia])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [id_nivel_triage] [bigint] NULL;');
            PRINT N'AVISO: casos_emergencia.id_nivel_triage se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [id_nivel_triage] [bigint] NOT NULL;');
        PRINT N'Columna agregada: casos_emergencia.id_nivel_triage';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'id_estado_caso') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[casos_emergencia])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [id_estado_caso] [bigint] NULL;');
            PRINT N'AVISO: casos_emergencia.id_estado_caso se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [id_estado_caso] [bigint] NOT NULL;');
        PRINT N'Columna agregada: casos_emergencia.id_estado_caso';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'motivo') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[casos_emergencia])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [motivo] [nvarchar](255) NULL;');
            PRINT N'AVISO: casos_emergencia.motivo se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [motivo] [nvarchar](255) NOT NULL;');
        PRINT N'Columna agregada: casos_emergencia.motivo';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'hora_llegada') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [hora_llegada] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: casos_emergencia.hora_llegada';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: casos_emergencia.activo';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: casos_emergencia.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: casos_emergencia.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: casos_emergencia.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: casos_emergencia.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'id_cita') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [id_cita] [bigint] NULL;');
        PRINT N'Columna agregada: casos_emergencia.id_cita';
    END
    IF COL_LENGTH(N'dbo.casos_emergencia', N'id_sala') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD [id_sala] [bigint] NULL;');
        PRINT N'Columna agregada: casos_emergencia.id_sala';
    END
END
GO

-- Incluye columnas agregadas por: categorizar_tipos_catalogo.sql
IF OBJECT_ID(N'dbo.cat_tipo_catalogo', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[cat_tipo_catalogo] (
    	[id_tipo_catalogo] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo] [nvarchar](50) NOT NULL,
    	[nombre] [nvarchar](150) NOT NULL,
    	[descripcion] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[codigo_modulo] [nvarchar](50) NULL,
    	PRIMARY KEY CLUSTERED ([id_tipo_catalogo] ASC),
    	UNIQUE NONCLUSTERED ([codigo] ASC)
    );
    PRINT N'Tabla creada: cat_tipo_catalogo';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.cat_tipo_catalogo', N'codigo') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[cat_tipo_catalogo])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD [codigo] [nvarchar](50) NULL;');
            PRINT N'AVISO: cat_tipo_catalogo.codigo se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD [codigo] [nvarchar](50) NOT NULL;');
        PRINT N'Columna agregada: cat_tipo_catalogo.codigo';
    END
    IF COL_LENGTH(N'dbo.cat_tipo_catalogo', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[cat_tipo_catalogo])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD [nombre] [nvarchar](150) NULL;');
            PRINT N'AVISO: cat_tipo_catalogo.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD [nombre] [nvarchar](150) NOT NULL;');
        PRINT N'Columna agregada: cat_tipo_catalogo.nombre';
    END
    IF COL_LENGTH(N'dbo.cat_tipo_catalogo', N'descripcion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD [descripcion] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: cat_tipo_catalogo.descripcion';
    END
    IF COL_LENGTH(N'dbo.cat_tipo_catalogo', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: cat_tipo_catalogo.activo';
    END
    IF COL_LENGTH(N'dbo.cat_tipo_catalogo', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: cat_tipo_catalogo.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.cat_tipo_catalogo', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: cat_tipo_catalogo.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.cat_tipo_catalogo', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: cat_tipo_catalogo.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.cat_tipo_catalogo', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: cat_tipo_catalogo.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.cat_tipo_catalogo', N'codigo_modulo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD [codigo_modulo] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: cat_tipo_catalogo.codigo_modulo';
    END
END
GO

IF OBJECT_ID(N'dbo.cat_valor_catalogo', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[cat_valor_catalogo] (
    	[id_valor_catalogo] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_tipo_catalogo] [bigint] NOT NULL,
    	[codigo] [nvarchar](50) NOT NULL,
    	[nombre] [nvarchar](150) NOT NULL,
    	[descripcion] [nvarchar](255) NULL,
    	[orden] [smallint] NOT NULL DEFAULT ((0)),
    	[metadata] [nvarchar](max) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_valor_catalogo] ASC),
    	UNIQUE NONCLUSTERED ([id_tipo_catalogo] ASC, [codigo] ASC),
    	CHECK (([metadata] IS NULL OR isjson([metadata])=(1)))
    );
    PRINT N'Tabla creada: cat_valor_catalogo';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.cat_valor_catalogo', N'id_tipo_catalogo') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[cat_valor_catalogo])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [id_tipo_catalogo] [bigint] NULL;');
            PRINT N'AVISO: cat_valor_catalogo.id_tipo_catalogo se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [id_tipo_catalogo] [bigint] NOT NULL;');
        PRINT N'Columna agregada: cat_valor_catalogo.id_tipo_catalogo';
    END
    IF COL_LENGTH(N'dbo.cat_valor_catalogo', N'codigo') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[cat_valor_catalogo])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [codigo] [nvarchar](50) NULL;');
            PRINT N'AVISO: cat_valor_catalogo.codigo se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [codigo] [nvarchar](50) NOT NULL;');
        PRINT N'Columna agregada: cat_valor_catalogo.codigo';
    END
    IF COL_LENGTH(N'dbo.cat_valor_catalogo', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[cat_valor_catalogo])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [nombre] [nvarchar](150) NULL;');
            PRINT N'AVISO: cat_valor_catalogo.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [nombre] [nvarchar](150) NOT NULL;');
        PRINT N'Columna agregada: cat_valor_catalogo.nombre';
    END
    IF COL_LENGTH(N'dbo.cat_valor_catalogo', N'descripcion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [descripcion] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: cat_valor_catalogo.descripcion';
    END
    IF COL_LENGTH(N'dbo.cat_valor_catalogo', N'orden') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [orden] [smallint] NOT NULL DEFAULT ((0));');
        PRINT N'Columna agregada: cat_valor_catalogo.orden';
    END
    IF COL_LENGTH(N'dbo.cat_valor_catalogo', N'metadata') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [metadata] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: cat_valor_catalogo.metadata';
    END
    IF COL_LENGTH(N'dbo.cat_valor_catalogo', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: cat_valor_catalogo.activo';
    END
    IF COL_LENGTH(N'dbo.cat_valor_catalogo', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: cat_valor_catalogo.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.cat_valor_catalogo', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: cat_valor_catalogo.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.cat_valor_catalogo', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: cat_valor_catalogo.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.cat_valor_catalogo', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: cat_valor_catalogo.id_usuario_modificacion';
    END
END
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql
IF OBJECT_ID(N'dbo.citas', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[citas] (
    	[id_cita] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[id_especialidad] [bigint] NULL,
    	[id_sala] [bigint] NULL,
    	[fecha_hora_inicio] [datetime2](7) NOT NULL,
    	[fecha_hora_fin] [datetime2](7) NOT NULL,
    	[id_estado_cita] [bigint] NOT NULL,
    	[id_motivo_cancelacion] [bigint] NULL,
    	[motivo_consulta] [nvarchar](255) NULL,
    	[notas] [nvarchar](max) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[id_poliza] [bigint] NULL,
    	[requiere_operacion] [bit] NOT NULL DEFAULT ((0)),
    	[id_tipo_operacion] [bigint] NULL,
    	[notas_operacion] [nvarchar](500) NULL,
    	PRIMARY KEY CLUSTERED ([id_cita] ASC),
    	CHECK (([fecha_hora_fin]>[fecha_hora_inicio]))
    );
    PRINT N'Tabla creada: citas';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.citas', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[citas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: citas.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: citas.id_paciente';
    END
    IF COL_LENGTH(N'dbo.citas', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[citas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: citas.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: citas.id_medico';
    END
    IF COL_LENGTH(N'dbo.citas', N'id_especialidad') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_especialidad] [bigint] NULL;');
        PRINT N'Columna agregada: citas.id_especialidad';
    END
    IF COL_LENGTH(N'dbo.citas', N'id_sala') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_sala] [bigint] NULL;');
        PRINT N'Columna agregada: citas.id_sala';
    END
    IF COL_LENGTH(N'dbo.citas', N'fecha_hora_inicio') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[citas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[citas] ADD [fecha_hora_inicio] [datetime2](7) NULL;');
            PRINT N'AVISO: citas.fecha_hora_inicio se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[citas] ADD [fecha_hora_inicio] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: citas.fecha_hora_inicio';
    END
    IF COL_LENGTH(N'dbo.citas', N'fecha_hora_fin') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[citas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[citas] ADD [fecha_hora_fin] [datetime2](7) NULL;');
            PRINT N'AVISO: citas.fecha_hora_fin se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[citas] ADD [fecha_hora_fin] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: citas.fecha_hora_fin';
    END
    IF COL_LENGTH(N'dbo.citas', N'id_estado_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[citas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_estado_cita] [bigint] NULL;');
            PRINT N'AVISO: citas.id_estado_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_estado_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: citas.id_estado_cita';
    END
    IF COL_LENGTH(N'dbo.citas', N'id_motivo_cancelacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_motivo_cancelacion] [bigint] NULL;');
        PRINT N'Columna agregada: citas.id_motivo_cancelacion';
    END
    IF COL_LENGTH(N'dbo.citas', N'motivo_consulta') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [motivo_consulta] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: citas.motivo_consulta';
    END
    IF COL_LENGTH(N'dbo.citas', N'notas') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [notas] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: citas.notas';
    END
    IF COL_LENGTH(N'dbo.citas', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: citas.activo';
    END
    IF COL_LENGTH(N'dbo.citas', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: citas.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.citas', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: citas.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.citas', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: citas.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.citas', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: citas.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.citas', N'id_poliza') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_poliza] [bigint] NULL;');
        PRINT N'Columna agregada: citas.id_poliza';
    END
    IF COL_LENGTH(N'dbo.citas', N'requiere_operacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [requiere_operacion] [bit] NOT NULL DEFAULT ((0));');
        PRINT N'Columna agregada: citas.requiere_operacion';
    END
    IF COL_LENGTH(N'dbo.citas', N'id_tipo_operacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [id_tipo_operacion] [bigint] NULL;');
        PRINT N'Columna agregada: citas.id_tipo_operacion';
    END
    IF COL_LENGTH(N'dbo.citas', N'notas_operacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas] ADD [notas_operacion] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: citas.notas_operacion';
    END
END
GO

IF OBJECT_ID(N'dbo.citas_historial', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[citas_historial] (
    	[id_cita_historial] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_cita] [bigint] NOT NULL,
    	[id_estado_anterior] [bigint] NULL,
    	[id_estado_nuevo] [bigint] NOT NULL,
    	[motivo] [nvarchar](255) NULL,
    	[fecha_hora_anterior] [datetime2](7) NULL,
    	[fecha_hora_nueva] [datetime2](7) NULL,
    	[fecha_cambio] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[id_usuario_creacion] [bigint] NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	PRIMARY KEY CLUSTERED ([id_cita_historial] ASC)
    );
    PRINT N'Tabla creada: citas_historial';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.citas_historial', N'id_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[citas_historial])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD [id_cita] [bigint] NULL;');
            PRINT N'AVISO: citas_historial.id_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD [id_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: citas_historial.id_cita';
    END
    IF COL_LENGTH(N'dbo.citas_historial', N'id_estado_anterior') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD [id_estado_anterior] [bigint] NULL;');
        PRINT N'Columna agregada: citas_historial.id_estado_anterior';
    END
    IF COL_LENGTH(N'dbo.citas_historial', N'id_estado_nuevo') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[citas_historial])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD [id_estado_nuevo] [bigint] NULL;');
            PRINT N'AVISO: citas_historial.id_estado_nuevo se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD [id_estado_nuevo] [bigint] NOT NULL;');
        PRINT N'Columna agregada: citas_historial.id_estado_nuevo';
    END
    IF COL_LENGTH(N'dbo.citas_historial', N'motivo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD [motivo] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: citas_historial.motivo';
    END
    IF COL_LENGTH(N'dbo.citas_historial', N'fecha_hora_anterior') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD [fecha_hora_anterior] [datetime2](7) NULL;');
        PRINT N'Columna agregada: citas_historial.fecha_hora_anterior';
    END
    IF COL_LENGTH(N'dbo.citas_historial', N'fecha_hora_nueva') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD [fecha_hora_nueva] [datetime2](7) NULL;');
        PRINT N'Columna agregada: citas_historial.fecha_hora_nueva';
    END
    IF COL_LENGTH(N'dbo.citas_historial', N'fecha_cambio') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD [fecha_cambio] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: citas_historial.fecha_cambio';
    END
    IF COL_LENGTH(N'dbo.citas_historial', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: citas_historial.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.citas_historial', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: citas_historial.activo';
    END
END
GO

IF OBJECT_ID(N'dbo.consentimientos_informados', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[consentimientos_informados] (
    	[id_consentimiento] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_tipo_consentimiento] [bigint] NOT NULL,
    	[id_tratamiento] [bigint] NULL,
    	[id_medico_responsable] [bigint] NOT NULL,
    	[id_testigo] [bigint] NULL,
    	[fecha_firma] [datetime2](7) NULL,
    	[firma_digital_hash] [nvarchar](255) NULL,
    	[firma_digital_url] [nvarchar](500) NULL,
    	[id_estado_consentimiento] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[nombre_responsable] [nvarchar](200) NULL,
    	[id_parentesco_responsable] [bigint] NULL,
    	[telefono_responsable] [nvarchar](30) NULL,
    	PRIMARY KEY CLUSTERED ([id_consentimiento] ASC)
    );
    PRINT N'Tabla creada: consentimientos_informados';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[consentimientos_informados])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: consentimientos_informados.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: consentimientos_informados.id_paciente';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'id_tipo_consentimiento') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[consentimientos_informados])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_tipo_consentimiento] [bigint] NULL;');
            PRINT N'AVISO: consentimientos_informados.id_tipo_consentimiento se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_tipo_consentimiento] [bigint] NOT NULL;');
        PRINT N'Columna agregada: consentimientos_informados.id_tipo_consentimiento';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'id_tratamiento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_tratamiento] [bigint] NULL;');
        PRINT N'Columna agregada: consentimientos_informados.id_tratamiento';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'id_medico_responsable') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[consentimientos_informados])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_medico_responsable] [bigint] NULL;');
            PRINT N'AVISO: consentimientos_informados.id_medico_responsable se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_medico_responsable] [bigint] NOT NULL;');
        PRINT N'Columna agregada: consentimientos_informados.id_medico_responsable';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'id_testigo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_testigo] [bigint] NULL;');
        PRINT N'Columna agregada: consentimientos_informados.id_testigo';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'fecha_firma') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [fecha_firma] [datetime2](7) NULL;');
        PRINT N'Columna agregada: consentimientos_informados.fecha_firma';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'firma_digital_hash') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [firma_digital_hash] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: consentimientos_informados.firma_digital_hash';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'firma_digital_url') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [firma_digital_url] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: consentimientos_informados.firma_digital_url';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'id_estado_consentimiento') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[consentimientos_informados])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_estado_consentimiento] [bigint] NULL;');
            PRINT N'AVISO: consentimientos_informados.id_estado_consentimiento se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_estado_consentimiento] [bigint] NOT NULL;');
        PRINT N'Columna agregada: consentimientos_informados.id_estado_consentimiento';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: consentimientos_informados.activo';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: consentimientos_informados.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: consentimientos_informados.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: consentimientos_informados.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: consentimientos_informados.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'nombre_responsable') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [nombre_responsable] [nvarchar](200) NULL;');
        PRINT N'Columna agregada: consentimientos_informados.nombre_responsable';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'id_parentesco_responsable') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [id_parentesco_responsable] [bigint] NULL;');
        PRINT N'Columna agregada: consentimientos_informados.id_parentesco_responsable';
    END
    IF COL_LENGTH(N'dbo.consentimientos_informados', N'telefono_responsable') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD [telefono_responsable] [nvarchar](30) NULL;');
        PRINT N'Columna agregada: consentimientos_informados.telefono_responsable';
    END
END
GO

IF OBJECT_ID(N'dbo.constancia_medica', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[constancia_medica] (
    	[id_constancia] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_cita] [bigint] NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[diagnostico] [nvarchar](500) NULL,
    	[contenido] [nvarchar](max) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_constancia] ASC),
    	CONSTRAINT [uq_constancia_cita] UNIQUE ([id_cita])
    );
    PRINT N'Tabla creada: constancia_medica';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.constancia_medica', N'id_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[constancia_medica])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [id_cita] [bigint] NULL;');
            PRINT N'AVISO: constancia_medica.id_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [id_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: constancia_medica.id_cita';
    END
    IF COL_LENGTH(N'dbo.constancia_medica', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[constancia_medica])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: constancia_medica.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: constancia_medica.id_paciente';
    END
    IF COL_LENGTH(N'dbo.constancia_medica', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[constancia_medica])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: constancia_medica.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: constancia_medica.id_medico';
    END
    IF COL_LENGTH(N'dbo.constancia_medica', N'diagnostico') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [diagnostico] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: constancia_medica.diagnostico';
    END
    IF COL_LENGTH(N'dbo.constancia_medica', N'contenido') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[constancia_medica])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [contenido] [nvarchar](max) NULL;');
            PRINT N'AVISO: constancia_medica.contenido se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [contenido] [nvarchar](max) NOT NULL;');
        PRINT N'Columna agregada: constancia_medica.contenido';
    END
    IF COL_LENGTH(N'dbo.constancia_medica', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: constancia_medica.activo';
    END
    IF COL_LENGTH(N'dbo.constancia_medica', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: constancia_medica.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.constancia_medica', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: constancia_medica.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.constancia_medica', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: constancia_medica.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.constancia_medica', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: constancia_medica.id_usuario_modificacion';
    END
END
GO

-- Origen: agregar_control_signos.sql (PARTE 30)
IF OBJECT_ID(N'dbo.control_signos_consulta', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[control_signos_consulta] (
    	[id_control_signos_consulta] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_cita] [bigint] NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[fecha_hora] [datetime2](7) NOT NULL,
    	[presion_arterial] [nvarchar](20) NULL,
    	[temperatura] [numeric](5, 2) NULL,
    	[frecuencia_respiratoria] [int] NULL,
    	[observaciones] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_control_signos_consulta] ASC)
    );
    PRINT N'Tabla creada: control_signos_consulta';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.control_signos_consulta', N'id_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[control_signos_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [id_cita] [bigint] NULL;');
            PRINT N'AVISO: control_signos_consulta.id_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [id_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: control_signos_consulta.id_cita';
    END
    IF COL_LENGTH(N'dbo.control_signos_consulta', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[control_signos_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: control_signos_consulta.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: control_signos_consulta.id_paciente';
    END
    IF COL_LENGTH(N'dbo.control_signos_consulta', N'fecha_hora') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[control_signos_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [fecha_hora] [datetime2](7) NULL;');
            PRINT N'AVISO: control_signos_consulta.fecha_hora se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [fecha_hora] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: control_signos_consulta.fecha_hora';
    END
    IF COL_LENGTH(N'dbo.control_signos_consulta', N'presion_arterial') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [presion_arterial] [nvarchar](20) NULL;');
        PRINT N'Columna agregada: control_signos_consulta.presion_arterial';
    END
    IF COL_LENGTH(N'dbo.control_signos_consulta', N'temperatura') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [temperatura] [numeric](5, 2) NULL;');
        PRINT N'Columna agregada: control_signos_consulta.temperatura';
    END
    IF COL_LENGTH(N'dbo.control_signos_consulta', N'frecuencia_respiratoria') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [frecuencia_respiratoria] [int] NULL;');
        PRINT N'Columna agregada: control_signos_consulta.frecuencia_respiratoria';
    END
    IF COL_LENGTH(N'dbo.control_signos_consulta', N'observaciones') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [observaciones] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: control_signos_consulta.observaciones';
    END
    IF COL_LENGTH(N'dbo.control_signos_consulta', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: control_signos_consulta.activo';
    END
    IF COL_LENGTH(N'dbo.control_signos_consulta', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: control_signos_consulta.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.control_signos_consulta', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: control_signos_consulta.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.control_signos_consulta', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: control_signos_consulta.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.control_signos_consulta', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: control_signos_consulta.id_usuario_modificacion';
    END
END
GO

-- Origen: agregar_control_signos.sql (PARTE 29)
IF OBJECT_ID(N'dbo.control_signos_hospitalizacion', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[control_signos_hospitalizacion] (
    	[id_control_signos] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_hospitalizacion] [bigint] NOT NULL,
    	[fecha_hora] [datetime2](7) NOT NULL,
    	[presion_arterial] [nvarchar](20) NULL,
    	[temperatura] [numeric](5, 2) NULL,
    	[frecuencia_respiratoria] [int] NULL,
    	[observaciones] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	PRIMARY KEY CLUSTERED ([id_control_signos] ASC)
    );
    PRINT N'Tabla creada: control_signos_hospitalizacion';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.control_signos_hospitalizacion', N'id_hospitalizacion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[control_signos_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[control_signos_hospitalizacion] ADD [id_hospitalizacion] [bigint] NULL;');
            PRINT N'AVISO: control_signos_hospitalizacion.id_hospitalizacion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[control_signos_hospitalizacion] ADD [id_hospitalizacion] [bigint] NOT NULL;');
        PRINT N'Columna agregada: control_signos_hospitalizacion.id_hospitalizacion';
    END
    IF COL_LENGTH(N'dbo.control_signos_hospitalizacion', N'fecha_hora') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[control_signos_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[control_signos_hospitalizacion] ADD [fecha_hora] [datetime2](7) NULL;');
            PRINT N'AVISO: control_signos_hospitalizacion.fecha_hora se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[control_signos_hospitalizacion] ADD [fecha_hora] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: control_signos_hospitalizacion.fecha_hora';
    END
    IF COL_LENGTH(N'dbo.control_signos_hospitalizacion', N'presion_arterial') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_hospitalizacion] ADD [presion_arterial] [nvarchar](20) NULL;');
        PRINT N'Columna agregada: control_signos_hospitalizacion.presion_arterial';
    END
    IF COL_LENGTH(N'dbo.control_signos_hospitalizacion', N'temperatura') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_hospitalizacion] ADD [temperatura] [numeric](5, 2) NULL;');
        PRINT N'Columna agregada: control_signos_hospitalizacion.temperatura';
    END
    IF COL_LENGTH(N'dbo.control_signos_hospitalizacion', N'frecuencia_respiratoria') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_hospitalizacion] ADD [frecuencia_respiratoria] [int] NULL;');
        PRINT N'Columna agregada: control_signos_hospitalizacion.frecuencia_respiratoria';
    END
    IF COL_LENGTH(N'dbo.control_signos_hospitalizacion', N'observaciones') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_hospitalizacion] ADD [observaciones] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: control_signos_hospitalizacion.observaciones';
    END
    IF COL_LENGTH(N'dbo.control_signos_hospitalizacion', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_hospitalizacion] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: control_signos_hospitalizacion.activo';
    END
    IF COL_LENGTH(N'dbo.control_signos_hospitalizacion', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_hospitalizacion] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: control_signos_hospitalizacion.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.control_signos_hospitalizacion', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[control_signos_hospitalizacion] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: control_signos_hospitalizacion.fecha_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.convenio_cobertura', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[convenio_cobertura] (
    	[id_convenio_cobertura] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_convenio] [bigint] NOT NULL,
    	[id_tipo_item] [bigint] NOT NULL,
    	[porcentaje_cobertura] [numeric](5, 2) NOT NULL,
    	[monto_maximo] [numeric](12, 2) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	PRIMARY KEY CLUSTERED ([id_convenio_cobertura] ASC),
    	UNIQUE NONCLUSTERED ([id_convenio] ASC, [id_tipo_item] ASC)
    );
    PRINT N'Tabla creada: convenio_cobertura';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.convenio_cobertura', N'id_convenio') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[convenio_cobertura])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[convenio_cobertura] ADD [id_convenio] [bigint] NULL;');
            PRINT N'AVISO: convenio_cobertura.id_convenio se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[convenio_cobertura] ADD [id_convenio] [bigint] NOT NULL;');
        PRINT N'Columna agregada: convenio_cobertura.id_convenio';
    END
    IF COL_LENGTH(N'dbo.convenio_cobertura', N'id_tipo_item') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[convenio_cobertura])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[convenio_cobertura] ADD [id_tipo_item] [bigint] NULL;');
            PRINT N'AVISO: convenio_cobertura.id_tipo_item se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[convenio_cobertura] ADD [id_tipo_item] [bigint] NOT NULL;');
        PRINT N'Columna agregada: convenio_cobertura.id_tipo_item';
    END
    IF COL_LENGTH(N'dbo.convenio_cobertura', N'porcentaje_cobertura') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[convenio_cobertura])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[convenio_cobertura] ADD [porcentaje_cobertura] [numeric](5, 2) NULL;');
            PRINT N'AVISO: convenio_cobertura.porcentaje_cobertura se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[convenio_cobertura] ADD [porcentaje_cobertura] [numeric](5, 2) NOT NULL;');
        PRINT N'Columna agregada: convenio_cobertura.porcentaje_cobertura';
    END
    IF COL_LENGTH(N'dbo.convenio_cobertura', N'monto_maximo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[convenio_cobertura] ADD [monto_maximo] [numeric](12, 2) NULL;');
        PRINT N'Columna agregada: convenio_cobertura.monto_maximo';
    END
    IF COL_LENGTH(N'dbo.convenio_cobertura', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[convenio_cobertura] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: convenio_cobertura.activo';
    END
    IF COL_LENGTH(N'dbo.convenio_cobertura', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[convenio_cobertura] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: convenio_cobertura.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.convenio_cobertura', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[convenio_cobertura] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: convenio_cobertura.fecha_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.convenios', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[convenios] (
    	[id_convenio] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_aseguradora] [bigint] NOT NULL,
    	[nombre_convenio] [nvarchar](200) NOT NULL,
    	[fecha_inicio] [date] NOT NULL,
    	[fecha_fin] [date] NULL,
    	[porcentaje_cobertura_general] [numeric](5, 2) NULL,
    	[condiciones] [nvarchar](max) NULL,
    	[id_estado_convenio] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_convenio] ASC),
    	CHECK (([fecha_fin] IS NULL OR [fecha_fin]>=[fecha_inicio]))
    );
    PRINT N'Tabla creada: convenios';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.convenios', N'id_aseguradora') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[convenios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[convenios] ADD [id_aseguradora] [bigint] NULL;');
            PRINT N'AVISO: convenios.id_aseguradora se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[convenios] ADD [id_aseguradora] [bigint] NOT NULL;');
        PRINT N'Columna agregada: convenios.id_aseguradora';
    END
    IF COL_LENGTH(N'dbo.convenios', N'nombre_convenio') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[convenios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[convenios] ADD [nombre_convenio] [nvarchar](200) NULL;');
            PRINT N'AVISO: convenios.nombre_convenio se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[convenios] ADD [nombre_convenio] [nvarchar](200) NOT NULL;');
        PRINT N'Columna agregada: convenios.nombre_convenio';
    END
    IF COL_LENGTH(N'dbo.convenios', N'fecha_inicio') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[convenios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[convenios] ADD [fecha_inicio] [date] NULL;');
            PRINT N'AVISO: convenios.fecha_inicio se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[convenios] ADD [fecha_inicio] [date] NOT NULL;');
        PRINT N'Columna agregada: convenios.fecha_inicio';
    END
    IF COL_LENGTH(N'dbo.convenios', N'fecha_fin') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[convenios] ADD [fecha_fin] [date] NULL;');
        PRINT N'Columna agregada: convenios.fecha_fin';
    END
    IF COL_LENGTH(N'dbo.convenios', N'porcentaje_cobertura_general') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[convenios] ADD [porcentaje_cobertura_general] [numeric](5, 2) NULL;');
        PRINT N'Columna agregada: convenios.porcentaje_cobertura_general';
    END
    IF COL_LENGTH(N'dbo.convenios', N'condiciones') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[convenios] ADD [condiciones] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: convenios.condiciones';
    END
    IF COL_LENGTH(N'dbo.convenios', N'id_estado_convenio') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[convenios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[convenios] ADD [id_estado_convenio] [bigint] NULL;');
            PRINT N'AVISO: convenios.id_estado_convenio se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[convenios] ADD [id_estado_convenio] [bigint] NOT NULL;');
        PRINT N'Columna agregada: convenios.id_estado_convenio';
    END
    IF COL_LENGTH(N'dbo.convenios', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[convenios] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: convenios.activo';
    END
    IF COL_LENGTH(N'dbo.convenios', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[convenios] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: convenios.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.convenios', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[convenios] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: convenios.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.convenios', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[convenios] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: convenios.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.convenios', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[convenios] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: convenios.id_usuario_modificacion';
    END
END
GO

-- Origen: agregar_costo_paciente_consulta.sql + agregar_id_servicio_costos.sql (PARTES 32 y 35)
IF OBJECT_ID(N'dbo.costo_paciente_consulta', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[costo_paciente_consulta] (
    	[id_costo_paciente_consulta] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_cita] [bigint] NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_medicamento] [bigint] NULL,
    	[fecha] [datetime2](7) NOT NULL,
    	[descripcion] [nvarchar](255) NOT NULL,
    	[cantidad] [numeric](10, 2) NOT NULL,
    	[valor_unitario] [numeric](12, 2) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[id_servicio] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_costo_paciente_consulta] ASC)
    );
    PRINT N'Tabla creada: costo_paciente_consulta';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'id_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[costo_paciente_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [id_cita] [bigint] NULL;');
            PRINT N'AVISO: costo_paciente_consulta.id_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [id_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: costo_paciente_consulta.id_cita';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[costo_paciente_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: costo_paciente_consulta.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: costo_paciente_consulta.id_paciente';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'id_medicamento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [id_medicamento] [bigint] NULL;');
        PRINT N'Columna agregada: costo_paciente_consulta.id_medicamento';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'fecha') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[costo_paciente_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [fecha] [datetime2](7) NULL;');
            PRINT N'AVISO: costo_paciente_consulta.fecha se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [fecha] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: costo_paciente_consulta.fecha';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'descripcion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[costo_paciente_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [descripcion] [nvarchar](255) NULL;');
            PRINT N'AVISO: costo_paciente_consulta.descripcion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [descripcion] [nvarchar](255) NOT NULL;');
        PRINT N'Columna agregada: costo_paciente_consulta.descripcion';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'cantidad') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[costo_paciente_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [cantidad] [numeric](10, 2) NULL;');
            PRINT N'AVISO: costo_paciente_consulta.cantidad se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [cantidad] [numeric](10, 2) NOT NULL;');
        PRINT N'Columna agregada: costo_paciente_consulta.cantidad';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'valor_unitario') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[costo_paciente_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [valor_unitario] [numeric](12, 2) NULL;');
            PRINT N'AVISO: costo_paciente_consulta.valor_unitario se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [valor_unitario] [numeric](12, 2) NOT NULL;');
        PRINT N'Columna agregada: costo_paciente_consulta.valor_unitario';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: costo_paciente_consulta.activo';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: costo_paciente_consulta.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: costo_paciente_consulta.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: costo_paciente_consulta.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: costo_paciente_consulta.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_consulta', N'id_servicio') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD [id_servicio] [bigint] NULL;');
        PRINT N'Columna agregada: costo_paciente_consulta.id_servicio';
    END
END
GO

-- Origen: agregar_costo_paciente.sql + agregar_id_servicio_costos.sql (PARTES 31 y 35)
IF OBJECT_ID(N'dbo.costo_paciente_hospitalizacion', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[costo_paciente_hospitalizacion] (
    	[id_costo_paciente] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_hospitalizacion] [bigint] NOT NULL,
    	[id_medicamento] [bigint] NULL,
    	[fecha] [datetime2](7) NOT NULL,
    	[descripcion] [nvarchar](255) NOT NULL,
    	[cantidad] [numeric](10, 2) NOT NULL,
    	[valor_unitario] [numeric](12, 2) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[id_servicio] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_costo_paciente] ASC)
    );
    PRINT N'Tabla creada: costo_paciente_hospitalizacion';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.costo_paciente_hospitalizacion', N'id_hospitalizacion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[costo_paciente_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [id_hospitalizacion] [bigint] NULL;');
            PRINT N'AVISO: costo_paciente_hospitalizacion.id_hospitalizacion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [id_hospitalizacion] [bigint] NOT NULL;');
        PRINT N'Columna agregada: costo_paciente_hospitalizacion.id_hospitalizacion';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_hospitalizacion', N'id_medicamento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [id_medicamento] [bigint] NULL;');
        PRINT N'Columna agregada: costo_paciente_hospitalizacion.id_medicamento';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_hospitalizacion', N'fecha') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[costo_paciente_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [fecha] [datetime2](7) NULL;');
            PRINT N'AVISO: costo_paciente_hospitalizacion.fecha se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [fecha] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: costo_paciente_hospitalizacion.fecha';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_hospitalizacion', N'descripcion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[costo_paciente_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [descripcion] [nvarchar](255) NULL;');
            PRINT N'AVISO: costo_paciente_hospitalizacion.descripcion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [descripcion] [nvarchar](255) NOT NULL;');
        PRINT N'Columna agregada: costo_paciente_hospitalizacion.descripcion';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_hospitalizacion', N'cantidad') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[costo_paciente_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [cantidad] [numeric](10, 2) NULL;');
            PRINT N'AVISO: costo_paciente_hospitalizacion.cantidad se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [cantidad] [numeric](10, 2) NOT NULL;');
        PRINT N'Columna agregada: costo_paciente_hospitalizacion.cantidad';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_hospitalizacion', N'valor_unitario') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[costo_paciente_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [valor_unitario] [numeric](12, 2) NULL;');
            PRINT N'AVISO: costo_paciente_hospitalizacion.valor_unitario se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [valor_unitario] [numeric](12, 2) NOT NULL;');
        PRINT N'Columna agregada: costo_paciente_hospitalizacion.valor_unitario';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_hospitalizacion', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: costo_paciente_hospitalizacion.activo';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_hospitalizacion', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: costo_paciente_hospitalizacion.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_hospitalizacion', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: costo_paciente_hospitalizacion.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_hospitalizacion', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: costo_paciente_hospitalizacion.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_hospitalizacion', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: costo_paciente_hospitalizacion.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.costo_paciente_hospitalizacion', N'id_servicio') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD [id_servicio] [bigint] NULL;');
        PRINT N'Columna agregada: costo_paciente_hospitalizacion.id_servicio';
    END
END
GO

IF OBJECT_ID(N'dbo.cuentas_por_cobrar', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[cuentas_por_cobrar] (
    	[id_cuenta_cobrar] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_factura] [bigint] NOT NULL,
    	[monto_original] [numeric](12, 2) NOT NULL,
    	[saldo_pendiente] [numeric](12, 2) NOT NULL,
    	[fecha_vencimiento] [date] NULL,
    	[id_estado_cxc] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	PRIMARY KEY CLUSTERED ([id_cuenta_cobrar] ASC)
    );
    PRINT N'Tabla creada: cuentas_por_cobrar';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.cuentas_por_cobrar', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[cuentas_por_cobrar])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: cuentas_por_cobrar.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: cuentas_por_cobrar.id_paciente';
    END
    IF COL_LENGTH(N'dbo.cuentas_por_cobrar', N'id_factura') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[cuentas_por_cobrar])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [id_factura] [bigint] NULL;');
            PRINT N'AVISO: cuentas_por_cobrar.id_factura se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [id_factura] [bigint] NOT NULL;');
        PRINT N'Columna agregada: cuentas_por_cobrar.id_factura';
    END
    IF COL_LENGTH(N'dbo.cuentas_por_cobrar', N'monto_original') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[cuentas_por_cobrar])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [monto_original] [numeric](12, 2) NULL;');
            PRINT N'AVISO: cuentas_por_cobrar.monto_original se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [monto_original] [numeric](12, 2) NOT NULL;');
        PRINT N'Columna agregada: cuentas_por_cobrar.monto_original';
    END
    IF COL_LENGTH(N'dbo.cuentas_por_cobrar', N'saldo_pendiente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[cuentas_por_cobrar])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [saldo_pendiente] [numeric](12, 2) NULL;');
            PRINT N'AVISO: cuentas_por_cobrar.saldo_pendiente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [saldo_pendiente] [numeric](12, 2) NOT NULL;');
        PRINT N'Columna agregada: cuentas_por_cobrar.saldo_pendiente';
    END
    IF COL_LENGTH(N'dbo.cuentas_por_cobrar', N'fecha_vencimiento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [fecha_vencimiento] [date] NULL;');
        PRINT N'Columna agregada: cuentas_por_cobrar.fecha_vencimiento';
    END
    IF COL_LENGTH(N'dbo.cuentas_por_cobrar', N'id_estado_cxc') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[cuentas_por_cobrar])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [id_estado_cxc] [bigint] NULL;');
            PRINT N'AVISO: cuentas_por_cobrar.id_estado_cxc se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [id_estado_cxc] [bigint] NOT NULL;');
        PRINT N'Columna agregada: cuentas_por_cobrar.id_estado_cxc';
    END
    IF COL_LENGTH(N'dbo.cuentas_por_cobrar', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: cuentas_por_cobrar.activo';
    END
    IF COL_LENGTH(N'dbo.cuentas_por_cobrar', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: cuentas_por_cobrar.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.cuentas_por_cobrar', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: cuentas_por_cobrar.fecha_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.disponibilidad_medico', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[disponibilidad_medico] (
    	[id_disponibilidad] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[id_dia_semana] [bigint] NOT NULL,
    	[hora_inicio] [time](7) NOT NULL,
    	[hora_fin] [time](7) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_disponibilidad] ASC),
    	CHECK (([hora_fin]>[hora_inicio]))
    );
    PRINT N'Tabla creada: disponibilidad_medico';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.disponibilidad_medico', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[disponibilidad_medico])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: disponibilidad_medico.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: disponibilidad_medico.id_medico';
    END
    IF COL_LENGTH(N'dbo.disponibilidad_medico', N'id_dia_semana') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[disponibilidad_medico])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [id_dia_semana] [bigint] NULL;');
            PRINT N'AVISO: disponibilidad_medico.id_dia_semana se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [id_dia_semana] [bigint] NOT NULL;');
        PRINT N'Columna agregada: disponibilidad_medico.id_dia_semana';
    END
    IF COL_LENGTH(N'dbo.disponibilidad_medico', N'hora_inicio') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[disponibilidad_medico])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [hora_inicio] [time](7) NULL;');
            PRINT N'AVISO: disponibilidad_medico.hora_inicio se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [hora_inicio] [time](7) NOT NULL;');
        PRINT N'Columna agregada: disponibilidad_medico.hora_inicio';
    END
    IF COL_LENGTH(N'dbo.disponibilidad_medico', N'hora_fin') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[disponibilidad_medico])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [hora_fin] [time](7) NULL;');
            PRINT N'AVISO: disponibilidad_medico.hora_fin se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [hora_fin] [time](7) NOT NULL;');
        PRINT N'Columna agregada: disponibilidad_medico.hora_fin';
    END
    IF COL_LENGTH(N'dbo.disponibilidad_medico', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: disponibilidad_medico.activo';
    END
    IF COL_LENGTH(N'dbo.disponibilidad_medico', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: disponibilidad_medico.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.disponibilidad_medico', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: disponibilidad_medico.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.disponibilidad_medico', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: disponibilidad_medico.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.disponibilidad_medico', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: disponibilidad_medico.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.empleados', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[empleados] (
    	[id_empleado] [bigint] IDENTITY(1,1) NOT NULL,
    	[primer_nombre] [nvarchar](100) NOT NULL,
    	[segundo_nombre] [nvarchar](100) NULL,
    	[primer_apellido] [nvarchar](100) NOT NULL,
    	[segundo_apellido] [nvarchar](100) NULL,
    	[fecha_nacimiento] [date] NULL,
    	[id_genero] [bigint] NULL,
    	[id_tipo_documento] [bigint] NULL,
    	[numero_documento] [nvarchar](50) NULL,
    	[id_puesto] [bigint] NOT NULL,
    	[id_especialidad] [bigint] NULL,
    	[colegiado] [nvarchar](50) NULL,
    	[fecha_ingreso] [date] NOT NULL,
    	[fecha_egreso] [date] NULL,
    	[id_estado_empleado] [bigint] NOT NULL,
    	[telefono] [nvarchar](30) NULL,
    	[correo] [nvarchar](150) NULL,
    	[direccion] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_empleado] ASC),
    	CHECK (([fecha_egreso] IS NULL OR [fecha_egreso]>=[fecha_ingreso]))
    );
    PRINT N'Tabla creada: empleados';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.empleados', N'primer_nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[empleados])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[empleados] ADD [primer_nombre] [nvarchar](100) NULL;');
            PRINT N'AVISO: empleados.primer_nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[empleados] ADD [primer_nombre] [nvarchar](100) NOT NULL;');
        PRINT N'Columna agregada: empleados.primer_nombre';
    END
    IF COL_LENGTH(N'dbo.empleados', N'segundo_nombre') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [segundo_nombre] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: empleados.segundo_nombre';
    END
    IF COL_LENGTH(N'dbo.empleados', N'primer_apellido') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[empleados])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[empleados] ADD [primer_apellido] [nvarchar](100) NULL;');
            PRINT N'AVISO: empleados.primer_apellido se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[empleados] ADD [primer_apellido] [nvarchar](100) NOT NULL;');
        PRINT N'Columna agregada: empleados.primer_apellido';
    END
    IF COL_LENGTH(N'dbo.empleados', N'segundo_apellido') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [segundo_apellido] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: empleados.segundo_apellido';
    END
    IF COL_LENGTH(N'dbo.empleados', N'fecha_nacimiento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [fecha_nacimiento] [date] NULL;');
        PRINT N'Columna agregada: empleados.fecha_nacimiento';
    END
    IF COL_LENGTH(N'dbo.empleados', N'id_genero') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [id_genero] [bigint] NULL;');
        PRINT N'Columna agregada: empleados.id_genero';
    END
    IF COL_LENGTH(N'dbo.empleados', N'id_tipo_documento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [id_tipo_documento] [bigint] NULL;');
        PRINT N'Columna agregada: empleados.id_tipo_documento';
    END
    IF COL_LENGTH(N'dbo.empleados', N'numero_documento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [numero_documento] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: empleados.numero_documento';
    END
    IF COL_LENGTH(N'dbo.empleados', N'id_puesto') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[empleados])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[empleados] ADD [id_puesto] [bigint] NULL;');
            PRINT N'AVISO: empleados.id_puesto se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[empleados] ADD [id_puesto] [bigint] NOT NULL;');
        PRINT N'Columna agregada: empleados.id_puesto';
    END
    IF COL_LENGTH(N'dbo.empleados', N'id_especialidad') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [id_especialidad] [bigint] NULL;');
        PRINT N'Columna agregada: empleados.id_especialidad';
    END
    IF COL_LENGTH(N'dbo.empleados', N'colegiado') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [colegiado] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: empleados.colegiado';
    END
    IF COL_LENGTH(N'dbo.empleados', N'fecha_ingreso') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[empleados])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[empleados] ADD [fecha_ingreso] [date] NULL;');
            PRINT N'AVISO: empleados.fecha_ingreso se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[empleados] ADD [fecha_ingreso] [date] NOT NULL;');
        PRINT N'Columna agregada: empleados.fecha_ingreso';
    END
    IF COL_LENGTH(N'dbo.empleados', N'fecha_egreso') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [fecha_egreso] [date] NULL;');
        PRINT N'Columna agregada: empleados.fecha_egreso';
    END
    IF COL_LENGTH(N'dbo.empleados', N'id_estado_empleado') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[empleados])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[empleados] ADD [id_estado_empleado] [bigint] NULL;');
            PRINT N'AVISO: empleados.id_estado_empleado se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[empleados] ADD [id_estado_empleado] [bigint] NOT NULL;');
        PRINT N'Columna agregada: empleados.id_estado_empleado';
    END
    IF COL_LENGTH(N'dbo.empleados', N'telefono') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [telefono] [nvarchar](30) NULL;');
        PRINT N'Columna agregada: empleados.telefono';
    END
    IF COL_LENGTH(N'dbo.empleados', N'correo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [correo] [nvarchar](150) NULL;');
        PRINT N'Columna agregada: empleados.correo';
    END
    IF COL_LENGTH(N'dbo.empleados', N'direccion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [direccion] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: empleados.direccion';
    END
    IF COL_LENGTH(N'dbo.empleados', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: empleados.activo';
    END
    IF COL_LENGTH(N'dbo.empleados', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: empleados.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.empleados', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: empleados.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.empleados', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: empleados.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.empleados', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: empleados.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.especialidades', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[especialidades] (
    	[id_especialidad] [bigint] IDENTITY(1,1) NOT NULL,
    	[nombre] [nvarchar](150) NOT NULL,
    	[descripcion] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_especialidad] ASC),
    	UNIQUE NONCLUSTERED ([nombre] ASC)
    );
    PRINT N'Tabla creada: especialidades';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.especialidades', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[especialidades])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[especialidades] ADD [nombre] [nvarchar](150) NULL;');
            PRINT N'AVISO: especialidades.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[especialidades] ADD [nombre] [nvarchar](150) NOT NULL;');
        PRINT N'Columna agregada: especialidades.nombre';
    END
    IF COL_LENGTH(N'dbo.especialidades', N'descripcion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[especialidades] ADD [descripcion] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: especialidades.descripcion';
    END
    IF COL_LENGTH(N'dbo.especialidades', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[especialidades] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: especialidades.activo';
    END
    IF COL_LENGTH(N'dbo.especialidades', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[especialidades] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: especialidades.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.especialidades', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[especialidades] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: especialidades.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.especialidades', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[especialidades] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: especialidades.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.especialidades', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[especialidades] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: especialidades.id_usuario_modificacion';
    END
END
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql, agregar_factura_detalle_orden_detalle.sql, agregar_factura_detalle_costo_paciente.sql
IF OBJECT_ID(N'dbo.factura_detalle', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[factura_detalle] (
    	[id_factura_detalle] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_factura] [bigint] NOT NULL,
    	[id_tipo_item] [bigint] NOT NULL,
    	[id_cita] [bigint] NULL,
    	[id_tratamiento] [bigint] NULL,
    	[id_medicamento] [bigint] NULL,
    	[descripcion] [nvarchar](255) NOT NULL,
    	[cantidad] [numeric](10, 2) NOT NULL DEFAULT ((1)),
    	[precio_unitario] [numeric](12, 2) NOT NULL,
    	[descuento] [numeric](12, 2) NOT NULL DEFAULT ((0)),
    	[subtotal] [numeric](12, 2) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[id_receta_detalle] [bigint] NULL,
    	[id_orden_detalle] [bigint] NULL,
    	[id_costo_paciente_consulta] [bigint] NULL,
    	[id_costo_paciente_hospitalizacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_factura_detalle] ASC)
    );
    PRINT N'Tabla creada: factura_detalle';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.factura_detalle', N'id_factura') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[factura_detalle])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [id_factura] [bigint] NULL;');
            PRINT N'AVISO: factura_detalle.id_factura se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [id_factura] [bigint] NOT NULL;');
        PRINT N'Columna agregada: factura_detalle.id_factura';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'id_tipo_item') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[factura_detalle])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [id_tipo_item] [bigint] NULL;');
            PRINT N'AVISO: factura_detalle.id_tipo_item se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [id_tipo_item] [bigint] NOT NULL;');
        PRINT N'Columna agregada: factura_detalle.id_tipo_item';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'id_cita') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [id_cita] [bigint] NULL;');
        PRINT N'Columna agregada: factura_detalle.id_cita';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'id_tratamiento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [id_tratamiento] [bigint] NULL;');
        PRINT N'Columna agregada: factura_detalle.id_tratamiento';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'id_medicamento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [id_medicamento] [bigint] NULL;');
        PRINT N'Columna agregada: factura_detalle.id_medicamento';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'descripcion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[factura_detalle])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [descripcion] [nvarchar](255) NULL;');
            PRINT N'AVISO: factura_detalle.descripcion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [descripcion] [nvarchar](255) NOT NULL;');
        PRINT N'Columna agregada: factura_detalle.descripcion';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'cantidad') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [cantidad] [numeric](10, 2) NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: factura_detalle.cantidad';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'precio_unitario') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[factura_detalle])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [precio_unitario] [numeric](12, 2) NULL;');
            PRINT N'AVISO: factura_detalle.precio_unitario se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [precio_unitario] [numeric](12, 2) NOT NULL;');
        PRINT N'Columna agregada: factura_detalle.precio_unitario';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'descuento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [descuento] [numeric](12, 2) NOT NULL DEFAULT ((0));');
        PRINT N'Columna agregada: factura_detalle.descuento';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'subtotal') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[factura_detalle])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [subtotal] [numeric](12, 2) NULL;');
            PRINT N'AVISO: factura_detalle.subtotal se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [subtotal] [numeric](12, 2) NOT NULL;');
        PRINT N'Columna agregada: factura_detalle.subtotal';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: factura_detalle.activo';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: factura_detalle.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'id_receta_detalle') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [id_receta_detalle] [bigint] NULL;');
        PRINT N'Columna agregada: factura_detalle.id_receta_detalle';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'id_orden_detalle') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [id_orden_detalle] [bigint] NULL;');
        PRINT N'Columna agregada: factura_detalle.id_orden_detalle';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'id_costo_paciente_consulta') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [id_costo_paciente_consulta] [bigint] NULL;');
        PRINT N'Columna agregada: factura_detalle.id_costo_paciente_consulta';
    END
    IF COL_LENGTH(N'dbo.factura_detalle', N'id_costo_paciente_hospitalizacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD [id_costo_paciente_hospitalizacion] [bigint] NULL;');
        PRINT N'Columna agregada: factura_detalle.id_costo_paciente_hospitalizacion';
    END
END
GO

-- Incluye columnas agregadas por: agregar_columna_comprobante_url.sql, motor_consultas_schema.sql, agregar_factura_detalle_costo_paciente.sql
IF OBJECT_ID(N'dbo.facturas', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[facturas] (
    	[id_factura] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_tipo_documento_fiscal] [bigint] NOT NULL,
    	[serie] [nvarchar](20) NULL,
    	[numero_documento] [nvarchar](30) NOT NULL,
    	[fecha_emision] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[subtotal] [numeric](12, 2) NOT NULL DEFAULT ((0)),
    	[descuento] [numeric](12, 2) NOT NULL DEFAULT ((0)),
    	[impuesto] [numeric](12, 2) NOT NULL DEFAULT ((0)),
    	[total] [numeric](12, 2) NOT NULL DEFAULT ((0)),
    	[id_estado_factura] [bigint] NOT NULL,
    	[numero_autorizacion_fel] [nvarchar](100) NULL,
    	[fecha_certificacion_fel] [datetime2](7) NULL,
    	[id_convenio] [bigint] NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[id_poliza] [bigint] NULL,
    	[comprobante_url] [nvarchar](500) NULL,
    	[id_cita] [bigint] NULL,
    	[id_hospitalizacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_factura] ASC),
    	UNIQUE NONCLUSTERED ([serie] ASC, [numero_documento] ASC)
    );
    PRINT N'Tabla creada: facturas';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.facturas', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[facturas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[facturas] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: facturas.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[facturas] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: facturas.id_paciente';
    END
    IF COL_LENGTH(N'dbo.facturas', N'id_tipo_documento_fiscal') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[facturas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[facturas] ADD [id_tipo_documento_fiscal] [bigint] NULL;');
            PRINT N'AVISO: facturas.id_tipo_documento_fiscal se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[facturas] ADD [id_tipo_documento_fiscal] [bigint] NOT NULL;');
        PRINT N'Columna agregada: facturas.id_tipo_documento_fiscal';
    END
    IF COL_LENGTH(N'dbo.facturas', N'serie') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [serie] [nvarchar](20) NULL;');
        PRINT N'Columna agregada: facturas.serie';
    END
    IF COL_LENGTH(N'dbo.facturas', N'numero_documento') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[facturas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[facturas] ADD [numero_documento] [nvarchar](30) NULL;');
            PRINT N'AVISO: facturas.numero_documento se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[facturas] ADD [numero_documento] [nvarchar](30) NOT NULL;');
        PRINT N'Columna agregada: facturas.numero_documento';
    END
    IF COL_LENGTH(N'dbo.facturas', N'fecha_emision') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [fecha_emision] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: facturas.fecha_emision';
    END
    IF COL_LENGTH(N'dbo.facturas', N'subtotal') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [subtotal] [numeric](12, 2) NOT NULL DEFAULT ((0));');
        PRINT N'Columna agregada: facturas.subtotal';
    END
    IF COL_LENGTH(N'dbo.facturas', N'descuento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [descuento] [numeric](12, 2) NOT NULL DEFAULT ((0));');
        PRINT N'Columna agregada: facturas.descuento';
    END
    IF COL_LENGTH(N'dbo.facturas', N'impuesto') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [impuesto] [numeric](12, 2) NOT NULL DEFAULT ((0));');
        PRINT N'Columna agregada: facturas.impuesto';
    END
    IF COL_LENGTH(N'dbo.facturas', N'total') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [total] [numeric](12, 2) NOT NULL DEFAULT ((0));');
        PRINT N'Columna agregada: facturas.total';
    END
    IF COL_LENGTH(N'dbo.facturas', N'id_estado_factura') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[facturas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[facturas] ADD [id_estado_factura] [bigint] NULL;');
            PRINT N'AVISO: facturas.id_estado_factura se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[facturas] ADD [id_estado_factura] [bigint] NOT NULL;');
        PRINT N'Columna agregada: facturas.id_estado_factura';
    END
    IF COL_LENGTH(N'dbo.facturas', N'numero_autorizacion_fel') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [numero_autorizacion_fel] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: facturas.numero_autorizacion_fel';
    END
    IF COL_LENGTH(N'dbo.facturas', N'fecha_certificacion_fel') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [fecha_certificacion_fel] [datetime2](7) NULL;');
        PRINT N'Columna agregada: facturas.fecha_certificacion_fel';
    END
    IF COL_LENGTH(N'dbo.facturas', N'id_convenio') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [id_convenio] [bigint] NULL;');
        PRINT N'Columna agregada: facturas.id_convenio';
    END
    IF COL_LENGTH(N'dbo.facturas', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: facturas.activo';
    END
    IF COL_LENGTH(N'dbo.facturas', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: facturas.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.facturas', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: facturas.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.facturas', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: facturas.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.facturas', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: facturas.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.facturas', N'id_poliza') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [id_poliza] [bigint] NULL;');
        PRINT N'Columna agregada: facturas.id_poliza';
    END
    IF COL_LENGTH(N'dbo.facturas', N'comprobante_url') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [comprobante_url] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: facturas.comprobante_url';
    END
    IF COL_LENGTH(N'dbo.facturas', N'id_cita') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [id_cita] [bigint] NULL;');
        PRINT N'Columna agregada: facturas.id_cita';
    END
    IF COL_LENGTH(N'dbo.facturas', N'id_hospitalizacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD [id_hospitalizacion] [bigint] NULL;');
        PRINT N'Columna agregada: facturas.id_hospitalizacion';
    END
END
GO

-- Origen: agregar_ficha_clinica_general.sql (PARTE 20)
IF OBJECT_ID(N'dbo.ficha_clinica_general', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ficha_clinica_general] (
    	[id_ficha] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_cita] [bigint] NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[motivo_consulta] [nvarchar](max) NOT NULL,
    	[historia_enfermedad] [nvarchar](max) NULL,
    	[prenatales] [nvarchar](max) NULL,
    	[vacunacion] [nvarchar](max) NULL,
    	[menarquia] [nvarchar](50) NULL,
    	[ciclo] [nvarchar](50) NULL,
    	[dolor] [nvarchar](100) NULL,
    	[ultima_regla] [datetime2](7) NULL,
    	[revision_sistemas] [nvarchar](max) NULL,
    	[estado_general] [nvarchar](255) NULL,
    	[presion_arterial] [nvarchar](20) NULL,
    	[pulso] [int] NULL,
    	[respiracion] [int] NULL,
    	[temperatura] [numeric](5, 2) NULL,
    	[piel_faneras] [nvarchar](max) NULL,
    	[cabeza_cuello] [nvarchar](max) NULL,
    	[cardio_pulmonar] [nvarchar](max) NULL,
    	[abdomen] [nvarchar](max) NULL,
    	[dorso_raquis] [nvarchar](max) NULL,
    	[extremidades] [nvarchar](max) NULL,
    	[neurologico] [nvarchar](max) NULL,
    	[otros] [nvarchar](max) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_ficha] ASC),
    	CONSTRAINT [uq_ficha_cg_cita] UNIQUE NONCLUSTERED ([id_cita] ASC)
    );
    PRINT N'Tabla creada: ficha_clinica_general';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'id_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ficha_clinica_general])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [id_cita] [bigint] NULL;');
            PRINT N'AVISO: ficha_clinica_general.id_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [id_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.id_cita';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ficha_clinica_general])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: ficha_clinica_general.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.id_paciente';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ficha_clinica_general])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: ficha_clinica_general.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.id_medico';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'motivo_consulta') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ficha_clinica_general])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [motivo_consulta] [nvarchar](max) NULL;');
            PRINT N'AVISO: ficha_clinica_general.motivo_consulta se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [motivo_consulta] [nvarchar](max) NOT NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.motivo_consulta';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'historia_enfermedad') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [historia_enfermedad] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.historia_enfermedad';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'prenatales') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [prenatales] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.prenatales';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'vacunacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [vacunacion] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.vacunacion';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'menarquia') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [menarquia] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.menarquia';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'ciclo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [ciclo] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.ciclo';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'dolor') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [dolor] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.dolor';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'ultima_regla') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [ultima_regla] [datetime2](7) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.ultima_regla';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'revision_sistemas') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [revision_sistemas] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.revision_sistemas';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'estado_general') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [estado_general] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.estado_general';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'presion_arterial') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [presion_arterial] [nvarchar](20) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.presion_arterial';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'pulso') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [pulso] [int] NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.pulso';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'respiracion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [respiracion] [int] NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.respiracion';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'temperatura') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [temperatura] [numeric](5, 2) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.temperatura';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'piel_faneras') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [piel_faneras] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.piel_faneras';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'cabeza_cuello') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [cabeza_cuello] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.cabeza_cuello';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'cardio_pulmonar') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [cardio_pulmonar] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.cardio_pulmonar';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'abdomen') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [abdomen] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.abdomen';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'dorso_raquis') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [dorso_raquis] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.dorso_raquis';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'extremidades') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [extremidades] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.extremidades';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'neurologico') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [neurologico] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.neurologico';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'otros') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [otros] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.otros';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: ficha_clinica_general.activo';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: ficha_clinica_general.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.ficha_clinica_general', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: ficha_clinica_general.id_usuario_modificacion';
    END
END
GO

-- Origen: crear_ficha_consulta_externa.sql (PARTE 18; sin antecedentes_toxicos/vacunas, que esa parte elimina)
IF OBJECT_ID(N'dbo.ficha_consulta_externa', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ficha_consulta_externa] (
    	[id_ficha] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_cita] [bigint] NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[peso] [numeric](6, 2) NULL,
    	[talla] [numeric](6, 2) NULL,
    	[presion_arterial] [nvarchar](20) NULL,
    	[frecuencia_cardiaca] [int] NULL,
    	[frecuencia_respiratoria] [int] NULL,
    	[temperatura] [numeric](5, 2) NULL,
    	[motivo_historia_actual] [nvarchar](max) NOT NULL,
    	[examen_fisico] [nvarchar](max) NULL,
    	[plan_diagnostico] [nvarchar](max) NULL,
    	[plan_terapeutico] [nvarchar](max) NULL,
    	[estudios_complementarios] [nvarchar](max) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_ficha] ASC),
    	CONSTRAINT [uq_ficha_ce_cita] UNIQUE NONCLUSTERED ([id_cita] ASC)
    );
    PRINT N'Tabla creada: ficha_consulta_externa';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'id_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ficha_consulta_externa])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [id_cita] [bigint] NULL;');
            PRINT N'AVISO: ficha_consulta_externa.id_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [id_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.id_cita';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ficha_consulta_externa])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: ficha_consulta_externa.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.id_paciente';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ficha_consulta_externa])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: ficha_consulta_externa.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.id_medico';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'peso') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [peso] [numeric](6, 2) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.peso';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'talla') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [talla] [numeric](6, 2) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.talla';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'presion_arterial') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [presion_arterial] [nvarchar](20) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.presion_arterial';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'frecuencia_cardiaca') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [frecuencia_cardiaca] [int] NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.frecuencia_cardiaca';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'frecuencia_respiratoria') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [frecuencia_respiratoria] [int] NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.frecuencia_respiratoria';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'temperatura') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [temperatura] [numeric](5, 2) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.temperatura';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'motivo_historia_actual') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ficha_consulta_externa])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [motivo_historia_actual] [nvarchar](max) NULL;');
            PRINT N'AVISO: ficha_consulta_externa.motivo_historia_actual se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [motivo_historia_actual] [nvarchar](max) NOT NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.motivo_historia_actual';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'examen_fisico') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [examen_fisico] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.examen_fisico';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'plan_diagnostico') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [plan_diagnostico] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.plan_diagnostico';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'plan_terapeutico') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [plan_terapeutico] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.plan_terapeutico';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'estudios_complementarios') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [estudios_complementarios] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.estudios_complementarios';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: ficha_consulta_externa.activo';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: ficha_consulta_externa.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa.id_usuario_modificacion';
    END
END
GO

-- Origen: crear_ficha_consulta_externa_pediatrica.sql (PARTE 37)
IF OBJECT_ID(N'dbo.ficha_consulta_externa_pediatrica', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ficha_consulta_externa_pediatrica] (
    	[id_ficha] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_cita] [bigint] NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[motivo_consulta] [nvarchar](max) NOT NULL,
    	[historia_clinica] [nvarchar](max) NULL,
    	[lugar_nacimiento] [nvarchar](200) NULL,
    	[tipo_parto] [nvarchar](100) NULL,
    	[pan] [nvarchar](100) NULL,
    	[llanto_al_nacer] [nvarchar](200) NULL,
    	[complicaciones] [nvarchar](max) NULL,
    	[alimentacion_lm] [bit] NULL,
    	[alimentacion_tiempo] [nvarchar](100) NULL,
    	[formula] [nvarchar](200) NULL,
    	[inmunizaciones_completas] [bit] NULL,
    	[inmunizaciones_en] [nvarchar](100) NULL,
    	[sonrisa_social] [nvarchar](100) NULL,
    	[se_sento] [nvarchar](100) NULL,
    	[camino] [nvarchar](100) NULL,
    	[hablo] [nvarchar](100) NULL,
    	[revision_por_sistemas] [nvarchar](max) NULL,
    	[peso] [numeric](6, 2) NULL,
    	[talla] [numeric](6, 2) NULL,
    	[cc] [numeric](6, 2) NULL,
    	[pe] [numeric](6, 2) NULL,
    	[te] [numeric](6, 2) NULL,
    	[pt] [numeric](6, 2) NULL,
    	[imc] [numeric](6, 2) NULL,
    	[fr] [int] NULL,
    	[fc] [int] NULL,
    	[temperatura] [numeric](5, 2) NULL,
    	[pa] [nvarchar](20) NULL,
    	[downes] [nvarchar](50) NULL,
    	[fr_ea_c_r] [nvarchar](200) NULL,
    	[examen_fisico] [nvarchar](max) NULL,
    	[plan_diagnostico] [nvarchar](max) NULL,
    	[plan_terapeutico] [nvarchar](max) NULL,
    	[plan_educacional] [nvarchar](max) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_ficha] ASC),
    	CONSTRAINT [uq_ficha_cep_cita] UNIQUE NONCLUSTERED ([id_cita] ASC)
    );
    PRINT N'Tabla creada: ficha_consulta_externa_pediatrica';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'id_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ficha_consulta_externa_pediatrica])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [id_cita] [bigint] NULL;');
            PRINT N'AVISO: ficha_consulta_externa_pediatrica.id_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [id_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.id_cita';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ficha_consulta_externa_pediatrica])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: ficha_consulta_externa_pediatrica.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.id_paciente';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ficha_consulta_externa_pediatrica])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: ficha_consulta_externa_pediatrica.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.id_medico';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'motivo_consulta') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ficha_consulta_externa_pediatrica])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [motivo_consulta] [nvarchar](max) NULL;');
            PRINT N'AVISO: ficha_consulta_externa_pediatrica.motivo_consulta se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [motivo_consulta] [nvarchar](max) NOT NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.motivo_consulta';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'historia_clinica') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [historia_clinica] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.historia_clinica';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'lugar_nacimiento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [lugar_nacimiento] [nvarchar](200) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.lugar_nacimiento';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'tipo_parto') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [tipo_parto] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.tipo_parto';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'pan') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [pan] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.pan';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'llanto_al_nacer') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [llanto_al_nacer] [nvarchar](200) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.llanto_al_nacer';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'complicaciones') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [complicaciones] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.complicaciones';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'alimentacion_lm') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [alimentacion_lm] [bit] NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.alimentacion_lm';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'alimentacion_tiempo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [alimentacion_tiempo] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.alimentacion_tiempo';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'formula') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [formula] [nvarchar](200) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.formula';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'inmunizaciones_completas') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [inmunizaciones_completas] [bit] NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.inmunizaciones_completas';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'inmunizaciones_en') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [inmunizaciones_en] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.inmunizaciones_en';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'sonrisa_social') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [sonrisa_social] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.sonrisa_social';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'se_sento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [se_sento] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.se_sento';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'camino') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [camino] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.camino';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'hablo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [hablo] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.hablo';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'revision_por_sistemas') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [revision_por_sistemas] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.revision_por_sistemas';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'peso') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [peso] [numeric](6, 2) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.peso';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'talla') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [talla] [numeric](6, 2) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.talla';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'cc') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [cc] [numeric](6, 2) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.cc';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'pe') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [pe] [numeric](6, 2) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.pe';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'te') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [te] [numeric](6, 2) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.te';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'pt') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [pt] [numeric](6, 2) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.pt';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'imc') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [imc] [numeric](6, 2) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.imc';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'fr') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [fr] [int] NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.fr';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'fc') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [fc] [int] NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.fc';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'temperatura') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [temperatura] [numeric](5, 2) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.temperatura';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'pa') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [pa] [nvarchar](20) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.pa';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'downes') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [downes] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.downes';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'fr_ea_c_r') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [fr_ea_c_r] [nvarchar](200) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.fr_ea_c_r';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'examen_fisico') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [examen_fisico] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.examen_fisico';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'plan_diagnostico') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [plan_diagnostico] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.plan_diagnostico';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'plan_terapeutico') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [plan_terapeutico] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.plan_terapeutico';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'plan_educacional') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [plan_educacional] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.plan_educacional';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.activo';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.ficha_consulta_externa_pediatrica', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: ficha_consulta_externa_pediatrica.id_usuario_modificacion';
    END
END
GO

-- Incluye columnas agregadas por: sembrar_catalogos.sql
IF OBJECT_ID(N'dbo.habitaciones', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[habitaciones] (
    	[id_habitacion] [bigint] IDENTITY(1,1) NOT NULL,
    	[numero] [nvarchar](20) NOT NULL,
    	[piso] [smallint] NULL,
    	[id_tipo_habitacion] [bigint] NULL,
    	[id_estado_habitacion] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_habitacion] ASC),
    	UNIQUE NONCLUSTERED ([numero] ASC)
    );
    PRINT N'Tabla creada: habitaciones';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.habitaciones', N'numero') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[habitaciones])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD [numero] [nvarchar](20) NULL;');
            PRINT N'AVISO: habitaciones.numero se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD [numero] [nvarchar](20) NOT NULL;');
        PRINT N'Columna agregada: habitaciones.numero';
    END
    IF COL_LENGTH(N'dbo.habitaciones', N'piso') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD [piso] [smallint] NULL;');
        PRINT N'Columna agregada: habitaciones.piso';
    END
    IF COL_LENGTH(N'dbo.habitaciones', N'id_tipo_habitacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD [id_tipo_habitacion] [bigint] NULL;');
        PRINT N'Columna agregada: habitaciones.id_tipo_habitacion';
    END
    IF COL_LENGTH(N'dbo.habitaciones', N'id_estado_habitacion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[habitaciones])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD [id_estado_habitacion] [bigint] NULL;');
            PRINT N'AVISO: habitaciones.id_estado_habitacion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD [id_estado_habitacion] [bigint] NOT NULL;');
        PRINT N'Columna agregada: habitaciones.id_estado_habitacion';
    END
    IF COL_LENGTH(N'dbo.habitaciones', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: habitaciones.activo';
    END
    IF COL_LENGTH(N'dbo.habitaciones', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: habitaciones.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.habitaciones', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: habitaciones.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.habitaciones', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: habitaciones.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.habitaciones', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: habitaciones.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.historial_clinico', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[historial_clinico] (
    	[id_historial] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[id_cita] [bigint] NULL,
    	[id_tratamiento] [bigint] NULL,
    	[id_tipo_registro] [bigint] NOT NULL,
    	[id_nivel_confidencialidad] [bigint] NULL,
    	[fecha] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[motivo_consulta] [nvarchar](500) NULL,
    	[diagnostico] [nvarchar](500) NULL,
    	[notas] [nvarchar](max) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_historial] ASC)
    );
    PRINT N'Tabla creada: historial_clinico';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.historial_clinico', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[historial_clinico])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: historial_clinico.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: historial_clinico.id_paciente';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[historial_clinico])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: historial_clinico.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: historial_clinico.id_medico';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'id_cita') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [id_cita] [bigint] NULL;');
        PRINT N'Columna agregada: historial_clinico.id_cita';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'id_tratamiento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [id_tratamiento] [bigint] NULL;');
        PRINT N'Columna agregada: historial_clinico.id_tratamiento';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'id_tipo_registro') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[historial_clinico])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [id_tipo_registro] [bigint] NULL;');
            PRINT N'AVISO: historial_clinico.id_tipo_registro se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [id_tipo_registro] [bigint] NOT NULL;');
        PRINT N'Columna agregada: historial_clinico.id_tipo_registro';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'id_nivel_confidencialidad') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [id_nivel_confidencialidad] [bigint] NULL;');
        PRINT N'Columna agregada: historial_clinico.id_nivel_confidencialidad';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'fecha') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [fecha] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: historial_clinico.fecha';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'motivo_consulta') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [motivo_consulta] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: historial_clinico.motivo_consulta';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'diagnostico') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [diagnostico] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: historial_clinico.diagnostico';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'notas') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [notas] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: historial_clinico.notas';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: historial_clinico.activo';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: historial_clinico.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: historial_clinico.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: historial_clinico.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.historial_clinico', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: historial_clinico.id_usuario_modificacion';
    END
END
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql
IF OBJECT_ID(N'dbo.hospitalizaciones', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[hospitalizaciones] (
    	[id_hospitalizacion] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_cama] [bigint] NOT NULL,
    	[id_medico_responsable] [bigint] NOT NULL,
    	[fecha_ingreso] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_egreso] [datetime2](7) NULL,
    	[motivo_ingreso] [nvarchar](500) NOT NULL,
    	[diagnostico_egreso] [nvarchar](500) NULL,
    	[id_estado_hospitalizacion] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[id_cita] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_hospitalizacion] ASC),
    	CHECK (([fecha_egreso] IS NULL OR [fecha_egreso]>=[fecha_ingreso]))
    );
    PRINT N'Tabla creada: hospitalizaciones';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[hospitalizaciones])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: hospitalizaciones.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: hospitalizaciones.id_paciente';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'id_cama') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[hospitalizaciones])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [id_cama] [bigint] NULL;');
            PRINT N'AVISO: hospitalizaciones.id_cama se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [id_cama] [bigint] NOT NULL;');
        PRINT N'Columna agregada: hospitalizaciones.id_cama';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'id_medico_responsable') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[hospitalizaciones])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [id_medico_responsable] [bigint] NULL;');
            PRINT N'AVISO: hospitalizaciones.id_medico_responsable se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [id_medico_responsable] [bigint] NOT NULL;');
        PRINT N'Columna agregada: hospitalizaciones.id_medico_responsable';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'fecha_ingreso') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [fecha_ingreso] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: hospitalizaciones.fecha_ingreso';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'fecha_egreso') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [fecha_egreso] [datetime2](7) NULL;');
        PRINT N'Columna agregada: hospitalizaciones.fecha_egreso';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'motivo_ingreso') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[hospitalizaciones])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [motivo_ingreso] [nvarchar](500) NULL;');
            PRINT N'AVISO: hospitalizaciones.motivo_ingreso se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [motivo_ingreso] [nvarchar](500) NOT NULL;');
        PRINT N'Columna agregada: hospitalizaciones.motivo_ingreso';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'diagnostico_egreso') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [diagnostico_egreso] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: hospitalizaciones.diagnostico_egreso';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'id_estado_hospitalizacion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[hospitalizaciones])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [id_estado_hospitalizacion] [bigint] NULL;');
            PRINT N'AVISO: hospitalizaciones.id_estado_hospitalizacion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [id_estado_hospitalizacion] [bigint] NOT NULL;');
        PRINT N'Columna agregada: hospitalizaciones.id_estado_hospitalizacion';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: hospitalizaciones.activo';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: hospitalizaciones.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: hospitalizaciones.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: hospitalizaciones.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: hospitalizaciones.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.hospitalizaciones', N'id_cita') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD [id_cita] [bigint] NULL;');
        PRINT N'Columna agregada: hospitalizaciones.id_cita';
    END
END
GO

-- Incluye columnas agregadas por: sembrar_catalogos.sql
IF OBJECT_ID(N'dbo.interaccion_medicamentos', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[interaccion_medicamentos] (
    	[id_interaccion] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_medicamento_1] [bigint] NOT NULL,
    	[id_medicamento_2] [bigint] NOT NULL,
    	[id_nivel_severidad] [bigint] NOT NULL,
    	[descripcion] [nvarchar](500) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_interaccion] ASC),
    	UNIQUE NONCLUSTERED ([id_medicamento_1] ASC, [id_medicamento_2] ASC),
    	CHECK (([id_medicamento_1]<>[id_medicamento_2]))
    );
    PRINT N'Tabla creada: interaccion_medicamentos';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.interaccion_medicamentos', N'id_medicamento_1') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[interaccion_medicamentos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [id_medicamento_1] [bigint] NULL;');
            PRINT N'AVISO: interaccion_medicamentos.id_medicamento_1 se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [id_medicamento_1] [bigint] NOT NULL;');
        PRINT N'Columna agregada: interaccion_medicamentos.id_medicamento_1';
    END
    IF COL_LENGTH(N'dbo.interaccion_medicamentos', N'id_medicamento_2') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[interaccion_medicamentos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [id_medicamento_2] [bigint] NULL;');
            PRINT N'AVISO: interaccion_medicamentos.id_medicamento_2 se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [id_medicamento_2] [bigint] NOT NULL;');
        PRINT N'Columna agregada: interaccion_medicamentos.id_medicamento_2';
    END
    IF COL_LENGTH(N'dbo.interaccion_medicamentos', N'id_nivel_severidad') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[interaccion_medicamentos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [id_nivel_severidad] [bigint] NULL;');
            PRINT N'AVISO: interaccion_medicamentos.id_nivel_severidad se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [id_nivel_severidad] [bigint] NOT NULL;');
        PRINT N'Columna agregada: interaccion_medicamentos.id_nivel_severidad';
    END
    IF COL_LENGTH(N'dbo.interaccion_medicamentos', N'descripcion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[interaccion_medicamentos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [descripcion] [nvarchar](500) NULL;');
            PRINT N'AVISO: interaccion_medicamentos.descripcion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [descripcion] [nvarchar](500) NOT NULL;');
        PRINT N'Columna agregada: interaccion_medicamentos.descripcion';
    END
    IF COL_LENGTH(N'dbo.interaccion_medicamentos', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: interaccion_medicamentos.activo';
    END
    IF COL_LENGTH(N'dbo.interaccion_medicamentos', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: interaccion_medicamentos.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.interaccion_medicamentos', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: interaccion_medicamentos.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.interaccion_medicamentos', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: interaccion_medicamentos.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.interaccion_medicamentos', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: interaccion_medicamentos.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.items_inventario', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[items_inventario] (
    	[id_item_inventario] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_medicamento] [bigint] NULL,
    	[id_proveedor] [bigint] NULL,
    	[nombre] [nvarchar](200) NOT NULL,
    	[id_tipo_item] [bigint] NOT NULL,
    	[id_unidad_medida] [bigint] NOT NULL,
    	[stock_minimo] [numeric](12, 2) NOT NULL DEFAULT ((0)),
    	[stock_actual] [numeric](12, 2) NOT NULL DEFAULT ((0)),
    	[id_estado_item] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[bajo_stock]  AS (case when [stock_actual]<=[stock_minimo] then (1) else (0) end) PERSISTED NOT NULL,
    	PRIMARY KEY CLUSTERED ([id_item_inventario] ASC),
    	CHECK (([stock_actual]>=(0)))
    );
    PRINT N'Tabla creada: items_inventario';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.items_inventario', N'id_medicamento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [id_medicamento] [bigint] NULL;');
        PRINT N'Columna agregada: items_inventario.id_medicamento';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'id_proveedor') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [id_proveedor] [bigint] NULL;');
        PRINT N'Columna agregada: items_inventario.id_proveedor';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[items_inventario])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [nombre] [nvarchar](200) NULL;');
            PRINT N'AVISO: items_inventario.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [nombre] [nvarchar](200) NOT NULL;');
        PRINT N'Columna agregada: items_inventario.nombre';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'id_tipo_item') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[items_inventario])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [id_tipo_item] [bigint] NULL;');
            PRINT N'AVISO: items_inventario.id_tipo_item se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [id_tipo_item] [bigint] NOT NULL;');
        PRINT N'Columna agregada: items_inventario.id_tipo_item';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'id_unidad_medida') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[items_inventario])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [id_unidad_medida] [bigint] NULL;');
            PRINT N'AVISO: items_inventario.id_unidad_medida se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [id_unidad_medida] [bigint] NOT NULL;');
        PRINT N'Columna agregada: items_inventario.id_unidad_medida';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'stock_minimo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [stock_minimo] [numeric](12, 2) NOT NULL DEFAULT ((0));');
        PRINT N'Columna agregada: items_inventario.stock_minimo';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'stock_actual') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [stock_actual] [numeric](12, 2) NOT NULL DEFAULT ((0));');
        PRINT N'Columna agregada: items_inventario.stock_actual';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'id_estado_item') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[items_inventario])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [id_estado_item] [bigint] NULL;');
            PRINT N'AVISO: items_inventario.id_estado_item se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [id_estado_item] [bigint] NOT NULL;');
        PRINT N'Columna agregada: items_inventario.id_estado_item';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: items_inventario.activo';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: items_inventario.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: items_inventario.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: items_inventario.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: items_inventario.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.items_inventario', N'bajo_stock') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD [bajo_stock]  AS (case when [stock_actual]<=[stock_minimo] then (1) else (0) end) PERSISTED NOT NULL;');
        PRINT N'Columna agregada: items_inventario.bajo_stock';
    END
END
GO

IF OBJECT_ID(N'dbo.libro_actas', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[libro_actas] (
    	[id_acta] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[motivo_ingreso] [nvarchar](500) NOT NULL,
    	[id_atendido_por] [bigint] NOT NULL,
    	[fecha_hora] [datetime2](7) NOT NULL,
    	[observaciones] [nvarchar](1000) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[id_cita] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_acta] ASC)
    );
    PRINT N'Tabla creada: libro_actas';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.libro_actas', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[libro_actas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: libro_actas.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: libro_actas.id_paciente';
    END
    IF COL_LENGTH(N'dbo.libro_actas', N'motivo_ingreso') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[libro_actas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [motivo_ingreso] [nvarchar](500) NULL;');
            PRINT N'AVISO: libro_actas.motivo_ingreso se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [motivo_ingreso] [nvarchar](500) NOT NULL;');
        PRINT N'Columna agregada: libro_actas.motivo_ingreso';
    END
    IF COL_LENGTH(N'dbo.libro_actas', N'id_atendido_por') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[libro_actas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [id_atendido_por] [bigint] NULL;');
            PRINT N'AVISO: libro_actas.id_atendido_por se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [id_atendido_por] [bigint] NOT NULL;');
        PRINT N'Columna agregada: libro_actas.id_atendido_por';
    END
    IF COL_LENGTH(N'dbo.libro_actas', N'fecha_hora') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[libro_actas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [fecha_hora] [datetime2](7) NULL;');
            PRINT N'AVISO: libro_actas.fecha_hora se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [fecha_hora] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: libro_actas.fecha_hora';
    END
    IF COL_LENGTH(N'dbo.libro_actas', N'observaciones') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [observaciones] [nvarchar](1000) NULL;');
        PRINT N'Columna agregada: libro_actas.observaciones';
    END
    IF COL_LENGTH(N'dbo.libro_actas', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: libro_actas.activo';
    END
    IF COL_LENGTH(N'dbo.libro_actas', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: libro_actas.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.libro_actas', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: libro_actas.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.libro_actas', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: libro_actas.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.libro_actas', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: libro_actas.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.libro_actas', N'id_cita') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD [id_cita] [bigint] NULL;');
        PRINT N'Columna agregada: libro_actas.id_cita';
    END
END
GO

-- Origen: agregar_control_medicamentos.sql (PARTE 27)
IF OBJECT_ID(N'dbo.medicamento_programado_hospitalizacion', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[medicamento_programado_hospitalizacion] (
    	[id_medicamento_programado] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_hospitalizacion] [bigint] NOT NULL,
    	[id_medicamento] [bigint] NOT NULL,
    	[hora] [time](7) NOT NULL,
    	[fecha_inicial] [datetime2](7) NOT NULL,
    	[observaciones] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_medicamento_programado] ASC)
    );
    PRINT N'Tabla creada: medicamento_programado_hospitalizacion';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.medicamento_programado_hospitalizacion', N'id_hospitalizacion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[medicamento_programado_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [id_hospitalizacion] [bigint] NULL;');
            PRINT N'AVISO: medicamento_programado_hospitalizacion.id_hospitalizacion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [id_hospitalizacion] [bigint] NOT NULL;');
        PRINT N'Columna agregada: medicamento_programado_hospitalizacion.id_hospitalizacion';
    END
    IF COL_LENGTH(N'dbo.medicamento_programado_hospitalizacion', N'id_medicamento') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[medicamento_programado_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [id_medicamento] [bigint] NULL;');
            PRINT N'AVISO: medicamento_programado_hospitalizacion.id_medicamento se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [id_medicamento] [bigint] NOT NULL;');
        PRINT N'Columna agregada: medicamento_programado_hospitalizacion.id_medicamento';
    END
    IF COL_LENGTH(N'dbo.medicamento_programado_hospitalizacion', N'hora') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[medicamento_programado_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [hora] [time](7) NULL;');
            PRINT N'AVISO: medicamento_programado_hospitalizacion.hora se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [hora] [time](7) NOT NULL;');
        PRINT N'Columna agregada: medicamento_programado_hospitalizacion.hora';
    END
    IF COL_LENGTH(N'dbo.medicamento_programado_hospitalizacion', N'fecha_inicial') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[medicamento_programado_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [fecha_inicial] [datetime2](7) NULL;');
            PRINT N'AVISO: medicamento_programado_hospitalizacion.fecha_inicial se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [fecha_inicial] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: medicamento_programado_hospitalizacion.fecha_inicial';
    END
    IF COL_LENGTH(N'dbo.medicamento_programado_hospitalizacion', N'observaciones') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [observaciones] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: medicamento_programado_hospitalizacion.observaciones';
    END
    IF COL_LENGTH(N'dbo.medicamento_programado_hospitalizacion', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: medicamento_programado_hospitalizacion.activo';
    END
    IF COL_LENGTH(N'dbo.medicamento_programado_hospitalizacion', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: medicamento_programado_hospitalizacion.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.medicamento_programado_hospitalizacion', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: medicamento_programado_hospitalizacion.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.medicamento_programado_hospitalizacion', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: medicamento_programado_hospitalizacion.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.medicamento_programado_hospitalizacion', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: medicamento_programado_hospitalizacion.id_usuario_modificacion';
    END
END
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql, agregar_destino_medicamento.sql
-- (id_destino_medicamento no tiene llave foránea, igual que en el script original)
IF OBJECT_ID(N'dbo.medicamentos', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[medicamentos] (
    	[id_medicamento] [bigint] IDENTITY(1,1) NOT NULL,
    	[nombre] [nvarchar](200) NOT NULL,
    	[principio_activo] [nvarchar](200) NULL,
    	[presentacion] [nvarchar](100) NULL,
    	[concentracion] [nvarchar](50) NULL,
    	[id_categoria_medicamento] [bigint] NULL,
    	[requiere_receta] [bit] NOT NULL DEFAULT ((1)),
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[precio_venta_publico] [decimal](12, 2) NOT NULL,
    	[id_destino_medicamento] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_medicamento] ASC)
    );
    PRINT N'Tabla creada: medicamentos';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.medicamentos', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[medicamentos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [nombre] [nvarchar](200) NULL;');
            PRINT N'AVISO: medicamentos.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [nombre] [nvarchar](200) NOT NULL;');
        PRINT N'Columna agregada: medicamentos.nombre';
    END
    IF COL_LENGTH(N'dbo.medicamentos', N'principio_activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [principio_activo] [nvarchar](200) NULL;');
        PRINT N'Columna agregada: medicamentos.principio_activo';
    END
    IF COL_LENGTH(N'dbo.medicamentos', N'presentacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [presentacion] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: medicamentos.presentacion';
    END
    IF COL_LENGTH(N'dbo.medicamentos', N'concentracion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [concentracion] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: medicamentos.concentracion';
    END
    IF COL_LENGTH(N'dbo.medicamentos', N'id_categoria_medicamento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [id_categoria_medicamento] [bigint] NULL;');
        PRINT N'Columna agregada: medicamentos.id_categoria_medicamento';
    END
    IF COL_LENGTH(N'dbo.medicamentos', N'requiere_receta') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [requiere_receta] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: medicamentos.requiere_receta';
    END
    IF COL_LENGTH(N'dbo.medicamentos', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: medicamentos.activo';
    END
    IF COL_LENGTH(N'dbo.medicamentos', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: medicamentos.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.medicamentos', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: medicamentos.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.medicamentos', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: medicamentos.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.medicamentos', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: medicamentos.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.medicamentos', N'precio_venta_publico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[medicamentos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [precio_venta_publico] [decimal](12, 2) NULL;');
            PRINT N'AVISO: medicamentos.precio_venta_publico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [precio_venta_publico] [decimal](12, 2) NOT NULL;');
        PRINT N'Columna agregada: medicamentos.precio_venta_publico';
    END
    IF COL_LENGTH(N'dbo.medicamentos', N'id_destino_medicamento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD [id_destino_medicamento] [bigint] NULL;');
        PRINT N'Columna agregada: medicamentos.id_destino_medicamento';
    END
END
GO

IF OBJECT_ID(N'dbo.movimientos_inventario', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[movimientos_inventario] (
    	[id_movimiento] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_item_inventario] [bigint] NOT NULL,
    	[id_tipo_movimiento] [bigint] NOT NULL,
    	[cantidad] [numeric](12, 2) NOT NULL,
    	[fecha_movimiento] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[id_tratamiento] [bigint] NULL,
    	[motivo] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[id_usuario_creacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_movimiento] ASC),
    	CHECK (([cantidad]<>(0)))
    );
    PRINT N'Tabla creada: movimientos_inventario';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.movimientos_inventario', N'id_item_inventario') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[movimientos_inventario])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD [id_item_inventario] [bigint] NULL;');
            PRINT N'AVISO: movimientos_inventario.id_item_inventario se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD [id_item_inventario] [bigint] NOT NULL;');
        PRINT N'Columna agregada: movimientos_inventario.id_item_inventario';
    END
    IF COL_LENGTH(N'dbo.movimientos_inventario', N'id_tipo_movimiento') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[movimientos_inventario])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD [id_tipo_movimiento] [bigint] NULL;');
            PRINT N'AVISO: movimientos_inventario.id_tipo_movimiento se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD [id_tipo_movimiento] [bigint] NOT NULL;');
        PRINT N'Columna agregada: movimientos_inventario.id_tipo_movimiento';
    END
    IF COL_LENGTH(N'dbo.movimientos_inventario', N'cantidad') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[movimientos_inventario])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD [cantidad] [numeric](12, 2) NULL;');
            PRINT N'AVISO: movimientos_inventario.cantidad se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD [cantidad] [numeric](12, 2) NOT NULL;');
        PRINT N'Columna agregada: movimientos_inventario.cantidad';
    END
    IF COL_LENGTH(N'dbo.movimientos_inventario', N'fecha_movimiento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD [fecha_movimiento] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: movimientos_inventario.fecha_movimiento';
    END
    IF COL_LENGTH(N'dbo.movimientos_inventario', N'id_tratamiento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD [id_tratamiento] [bigint] NULL;');
        PRINT N'Columna agregada: movimientos_inventario.id_tratamiento';
    END
    IF COL_LENGTH(N'dbo.movimientos_inventario', N'motivo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD [motivo] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: movimientos_inventario.motivo';
    END
    IF COL_LENGTH(N'dbo.movimientos_inventario', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: movimientos_inventario.activo';
    END
    IF COL_LENGTH(N'dbo.movimientos_inventario', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: movimientos_inventario.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.movimientos_inventario', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: movimientos_inventario.id_usuario_creacion';
    END
END
GO

-- Origen: agregar_nota_enfermeria_consulta.sql (PARTE 25)
IF OBJECT_ID(N'dbo.nota_enfermeria_consulta', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[nota_enfermeria_consulta] (
    	[id_nota_enfermeria_consulta] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_cita] [bigint] NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_empleado] [bigint] NOT NULL,
    	[fecha_hora] [datetime2](7) NOT NULL,
    	[nota] [nvarchar](max) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_nota_enfermeria_consulta] ASC)
    );
    PRINT N'Tabla creada: nota_enfermeria_consulta';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.nota_enfermeria_consulta', N'id_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_enfermeria_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [id_cita] [bigint] NULL;');
            PRINT N'AVISO: nota_enfermeria_consulta.id_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [id_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: nota_enfermeria_consulta.id_cita';
    END
    IF COL_LENGTH(N'dbo.nota_enfermeria_consulta', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_enfermeria_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: nota_enfermeria_consulta.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: nota_enfermeria_consulta.id_paciente';
    END
    IF COL_LENGTH(N'dbo.nota_enfermeria_consulta', N'id_empleado') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_enfermeria_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [id_empleado] [bigint] NULL;');
            PRINT N'AVISO: nota_enfermeria_consulta.id_empleado se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [id_empleado] [bigint] NOT NULL;');
        PRINT N'Columna agregada: nota_enfermeria_consulta.id_empleado';
    END
    IF COL_LENGTH(N'dbo.nota_enfermeria_consulta', N'fecha_hora') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_enfermeria_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [fecha_hora] [datetime2](7) NULL;');
            PRINT N'AVISO: nota_enfermeria_consulta.fecha_hora se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [fecha_hora] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: nota_enfermeria_consulta.fecha_hora';
    END
    IF COL_LENGTH(N'dbo.nota_enfermeria_consulta', N'nota') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_enfermeria_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [nota] [nvarchar](max) NULL;');
            PRINT N'AVISO: nota_enfermeria_consulta.nota se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [nota] [nvarchar](max) NOT NULL;');
        PRINT N'Columna agregada: nota_enfermeria_consulta.nota';
    END
    IF COL_LENGTH(N'dbo.nota_enfermeria_consulta', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: nota_enfermeria_consulta.activo';
    END
    IF COL_LENGTH(N'dbo.nota_enfermeria_consulta', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: nota_enfermeria_consulta.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.nota_enfermeria_consulta', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: nota_enfermeria_consulta.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.nota_enfermeria_consulta', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: nota_enfermeria_consulta.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.nota_enfermeria_consulta', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: nota_enfermeria_consulta.id_usuario_modificacion';
    END
END
GO

-- Origen: agregar_nota_evolucion_consulta.sql (PARTE 23)
IF OBJECT_ID(N'dbo.nota_evolucion_consulta', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[nota_evolucion_consulta] (
    	[id_nota_evolucion_consulta] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_cita] [bigint] NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[fecha_hora] [datetime2](7) NOT NULL,
    	[evolucion] [nvarchar](max) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_nota_evolucion_consulta] ASC)
    );
    PRINT N'Tabla creada: nota_evolucion_consulta';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.nota_evolucion_consulta', N'id_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_evolucion_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [id_cita] [bigint] NULL;');
            PRINT N'AVISO: nota_evolucion_consulta.id_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [id_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: nota_evolucion_consulta.id_cita';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_consulta', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_evolucion_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: nota_evolucion_consulta.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: nota_evolucion_consulta.id_paciente';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_consulta', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_evolucion_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: nota_evolucion_consulta.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: nota_evolucion_consulta.id_medico';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_consulta', N'fecha_hora') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_evolucion_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [fecha_hora] [datetime2](7) NULL;');
            PRINT N'AVISO: nota_evolucion_consulta.fecha_hora se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [fecha_hora] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: nota_evolucion_consulta.fecha_hora';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_consulta', N'evolucion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_evolucion_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [evolucion] [nvarchar](max) NULL;');
            PRINT N'AVISO: nota_evolucion_consulta.evolucion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [evolucion] [nvarchar](max) NOT NULL;');
        PRINT N'Columna agregada: nota_evolucion_consulta.evolucion';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_consulta', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: nota_evolucion_consulta.activo';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_consulta', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: nota_evolucion_consulta.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_consulta', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: nota_evolucion_consulta.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_consulta', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: nota_evolucion_consulta.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_consulta', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: nota_evolucion_consulta.id_usuario_modificacion';
    END
END
GO

-- Origen: agregar_nota_evolucion_hospitalizacion.sql (PARTE 24)
IF OBJECT_ID(N'dbo.nota_evolucion_hospitalizacion', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[nota_evolucion_hospitalizacion] (
    	[id_nota_evolucion] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_hospitalizacion] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[fecha_hora] [datetime2](7) NOT NULL,
    	[evolucion] [nvarchar](max) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	PRIMARY KEY CLUSTERED ([id_nota_evolucion] ASC)
    );
    PRINT N'Tabla creada: nota_evolucion_hospitalizacion';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.nota_evolucion_hospitalizacion', N'id_hospitalizacion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_evolucion_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD [id_hospitalizacion] [bigint] NULL;');
            PRINT N'AVISO: nota_evolucion_hospitalizacion.id_hospitalizacion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD [id_hospitalizacion] [bigint] NOT NULL;');
        PRINT N'Columna agregada: nota_evolucion_hospitalizacion.id_hospitalizacion';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_hospitalizacion', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_evolucion_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: nota_evolucion_hospitalizacion.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: nota_evolucion_hospitalizacion.id_medico';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_hospitalizacion', N'fecha_hora') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_evolucion_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD [fecha_hora] [datetime2](7) NULL;');
            PRINT N'AVISO: nota_evolucion_hospitalizacion.fecha_hora se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD [fecha_hora] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: nota_evolucion_hospitalizacion.fecha_hora';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_hospitalizacion', N'evolucion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[nota_evolucion_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD [evolucion] [nvarchar](max) NULL;');
            PRINT N'AVISO: nota_evolucion_hospitalizacion.evolucion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD [evolucion] [nvarchar](max) NOT NULL;');
        PRINT N'Columna agregada: nota_evolucion_hospitalizacion.evolucion';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_hospitalizacion', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: nota_evolucion_hospitalizacion.activo';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_hospitalizacion', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: nota_evolucion_hospitalizacion.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.nota_evolucion_hospitalizacion', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: nota_evolucion_hospitalizacion.fecha_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.notas_credito', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[notas_credito] (
    	[id_nota_credito] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_factura_original] [bigint] NOT NULL,
    	[numero_documento] [nvarchar](30) NOT NULL,
    	[fecha_emision] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[id_motivo] [bigint] NOT NULL,
    	[monto] [numeric](12, 2) NOT NULL,
    	[id_estado_nota_credito] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_nota_credito] ASC)
    );
    PRINT N'Tabla creada: notas_credito';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.notas_credito', N'id_factura_original') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[notas_credito])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [id_factura_original] [bigint] NULL;');
            PRINT N'AVISO: notas_credito.id_factura_original se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [id_factura_original] [bigint] NOT NULL;');
        PRINT N'Columna agregada: notas_credito.id_factura_original';
    END
    IF COL_LENGTH(N'dbo.notas_credito', N'numero_documento') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[notas_credito])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [numero_documento] [nvarchar](30) NULL;');
            PRINT N'AVISO: notas_credito.numero_documento se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [numero_documento] [nvarchar](30) NOT NULL;');
        PRINT N'Columna agregada: notas_credito.numero_documento';
    END
    IF COL_LENGTH(N'dbo.notas_credito', N'fecha_emision') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [fecha_emision] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: notas_credito.fecha_emision';
    END
    IF COL_LENGTH(N'dbo.notas_credito', N'id_motivo') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[notas_credito])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [id_motivo] [bigint] NULL;');
            PRINT N'AVISO: notas_credito.id_motivo se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [id_motivo] [bigint] NOT NULL;');
        PRINT N'Columna agregada: notas_credito.id_motivo';
    END
    IF COL_LENGTH(N'dbo.notas_credito', N'monto') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[notas_credito])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [monto] [numeric](12, 2) NULL;');
            PRINT N'AVISO: notas_credito.monto se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [monto] [numeric](12, 2) NOT NULL;');
        PRINT N'Columna agregada: notas_credito.monto';
    END
    IF COL_LENGTH(N'dbo.notas_credito', N'id_estado_nota_credito') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[notas_credito])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [id_estado_nota_credito] [bigint] NULL;');
            PRINT N'AVISO: notas_credito.id_estado_nota_credito se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [id_estado_nota_credito] [bigint] NOT NULL;');
        PRINT N'Columna agregada: notas_credito.id_estado_nota_credito';
    END
    IF COL_LENGTH(N'dbo.notas_credito', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: notas_credito.activo';
    END
    IF COL_LENGTH(N'dbo.notas_credito', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: notas_credito.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.notas_credito', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: notas_credito.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.notas_credito', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: notas_credito.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.notas_credito', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: notas_credito.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.notas_enfermeria', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[notas_enfermeria] (
    	[id_nota_enfermeria] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_hospitalizacion] [bigint] NOT NULL,
    	[id_empleado] [bigint] NOT NULL,
    	[fecha_hora] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[nota] [nvarchar](max) NOT NULL,
    	[signos_vitales] [nvarchar](max) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	PRIMARY KEY CLUSTERED ([id_nota_enfermeria] ASC),
    	CHECK (([signos_vitales] IS NULL OR isjson([signos_vitales])=(1)))
    );
    PRINT N'Tabla creada: notas_enfermeria';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.notas_enfermeria', N'id_hospitalizacion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[notas_enfermeria])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[notas_enfermeria] ADD [id_hospitalizacion] [bigint] NULL;');
            PRINT N'AVISO: notas_enfermeria.id_hospitalizacion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[notas_enfermeria] ADD [id_hospitalizacion] [bigint] NOT NULL;');
        PRINT N'Columna agregada: notas_enfermeria.id_hospitalizacion';
    END
    IF COL_LENGTH(N'dbo.notas_enfermeria', N'id_empleado') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[notas_enfermeria])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[notas_enfermeria] ADD [id_empleado] [bigint] NULL;');
            PRINT N'AVISO: notas_enfermeria.id_empleado se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[notas_enfermeria] ADD [id_empleado] [bigint] NOT NULL;');
        PRINT N'Columna agregada: notas_enfermeria.id_empleado';
    END
    IF COL_LENGTH(N'dbo.notas_enfermeria', N'fecha_hora') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[notas_enfermeria] ADD [fecha_hora] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: notas_enfermeria.fecha_hora';
    END
    IF COL_LENGTH(N'dbo.notas_enfermeria', N'nota') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[notas_enfermeria])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[notas_enfermeria] ADD [nota] [nvarchar](max) NULL;');
            PRINT N'AVISO: notas_enfermeria.nota se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[notas_enfermeria] ADD [nota] [nvarchar](max) NOT NULL;');
        PRINT N'Columna agregada: notas_enfermeria.nota';
    END
    IF COL_LENGTH(N'dbo.notas_enfermeria', N'signos_vitales') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[notas_enfermeria] ADD [signos_vitales] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: notas_enfermeria.signos_vitales';
    END
    IF COL_LENGTH(N'dbo.notas_enfermeria', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[notas_enfermeria] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: notas_enfermeria.activo';
    END
    IF COL_LENGTH(N'dbo.notas_enfermeria', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[notas_enfermeria] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: notas_enfermeria.fecha_creacion';
    END
END
GO

IF OBJECT_ID(N'dbo.orden_detalle', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[orden_detalle] (
    	[id_orden_detalle] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_orden] [bigint] NOT NULL,
    	[id_tipo_examen] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	PRIMARY KEY CLUSTERED ([id_orden_detalle] ASC)
    );
    PRINT N'Tabla creada: orden_detalle';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.orden_detalle', N'id_orden') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[orden_detalle])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[orden_detalle] ADD [id_orden] [bigint] NULL;');
            PRINT N'AVISO: orden_detalle.id_orden se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[orden_detalle] ADD [id_orden] [bigint] NOT NULL;');
        PRINT N'Columna agregada: orden_detalle.id_orden';
    END
    IF COL_LENGTH(N'dbo.orden_detalle', N'id_tipo_examen') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[orden_detalle])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[orden_detalle] ADD [id_tipo_examen] [bigint] NULL;');
            PRINT N'AVISO: orden_detalle.id_tipo_examen se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[orden_detalle] ADD [id_tipo_examen] [bigint] NOT NULL;');
        PRINT N'Columna agregada: orden_detalle.id_tipo_examen';
    END
    IF COL_LENGTH(N'dbo.orden_detalle', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[orden_detalle] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: orden_detalle.activo';
    END
    IF COL_LENGTH(N'dbo.orden_detalle', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[orden_detalle] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: orden_detalle.fecha_creacion';
    END
END
GO

-- Origen: agregar_orden_medica_consulta.sql (PARTE 21)
IF OBJECT_ID(N'dbo.orden_medica_consulta', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[orden_medica_consulta] (
    	[id_orden_medica_consulta] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_cita] [bigint] NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[id_tipo_orden] [bigint] NOT NULL,
    	[fecha_orden] [datetime2](7) NOT NULL,
    	[indicaciones] [nvarchar](max) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_orden_medica_consulta] ASC)
    );
    PRINT N'Tabla creada: orden_medica_consulta';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.orden_medica_consulta', N'id_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[orden_medica_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [id_cita] [bigint] NULL;');
            PRINT N'AVISO: orden_medica_consulta.id_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [id_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: orden_medica_consulta.id_cita';
    END
    IF COL_LENGTH(N'dbo.orden_medica_consulta', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[orden_medica_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: orden_medica_consulta.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: orden_medica_consulta.id_paciente';
    END
    IF COL_LENGTH(N'dbo.orden_medica_consulta', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[orden_medica_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: orden_medica_consulta.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: orden_medica_consulta.id_medico';
    END
    IF COL_LENGTH(N'dbo.orden_medica_consulta', N'id_tipo_orden') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[orden_medica_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [id_tipo_orden] [bigint] NULL;');
            PRINT N'AVISO: orden_medica_consulta.id_tipo_orden se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [id_tipo_orden] [bigint] NOT NULL;');
        PRINT N'Columna agregada: orden_medica_consulta.id_tipo_orden';
    END
    IF COL_LENGTH(N'dbo.orden_medica_consulta', N'fecha_orden') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[orden_medica_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [fecha_orden] [datetime2](7) NULL;');
            PRINT N'AVISO: orden_medica_consulta.fecha_orden se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [fecha_orden] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: orden_medica_consulta.fecha_orden';
    END
    IF COL_LENGTH(N'dbo.orden_medica_consulta', N'indicaciones') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[orden_medica_consulta])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [indicaciones] [nvarchar](max) NULL;');
            PRINT N'AVISO: orden_medica_consulta.indicaciones se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [indicaciones] [nvarchar](max) NOT NULL;');
        PRINT N'Columna agregada: orden_medica_consulta.indicaciones';
    END
    IF COL_LENGTH(N'dbo.orden_medica_consulta', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: orden_medica_consulta.activo';
    END
    IF COL_LENGTH(N'dbo.orden_medica_consulta', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: orden_medica_consulta.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.orden_medica_consulta', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: orden_medica_consulta.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.orden_medica_consulta', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: orden_medica_consulta.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.orden_medica_consulta', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: orden_medica_consulta.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.ordenes_laboratorio', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ordenes_laboratorio] (
    	[id_orden] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[id_cita] [bigint] NULL,
    	[fecha_orden] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[id_prioridad] [bigint] NULL,
    	[id_estado_orden] [bigint] NOT NULL,
    	[notas] [nvarchar](500) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_orden] ASC)
    );
    PRINT N'Tabla creada: ordenes_laboratorio';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.ordenes_laboratorio', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ordenes_laboratorio])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: ordenes_laboratorio.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ordenes_laboratorio.id_paciente';
    END
    IF COL_LENGTH(N'dbo.ordenes_laboratorio', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ordenes_laboratorio])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: ordenes_laboratorio.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ordenes_laboratorio.id_medico';
    END
    IF COL_LENGTH(N'dbo.ordenes_laboratorio', N'id_cita') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [id_cita] [bigint] NULL;');
        PRINT N'Columna agregada: ordenes_laboratorio.id_cita';
    END
    IF COL_LENGTH(N'dbo.ordenes_laboratorio', N'fecha_orden') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [fecha_orden] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: ordenes_laboratorio.fecha_orden';
    END
    IF COL_LENGTH(N'dbo.ordenes_laboratorio', N'id_prioridad') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [id_prioridad] [bigint] NULL;');
        PRINT N'Columna agregada: ordenes_laboratorio.id_prioridad';
    END
    IF COL_LENGTH(N'dbo.ordenes_laboratorio', N'id_estado_orden') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ordenes_laboratorio])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [id_estado_orden] [bigint] NULL;');
            PRINT N'AVISO: ordenes_laboratorio.id_estado_orden se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [id_estado_orden] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ordenes_laboratorio.id_estado_orden';
    END
    IF COL_LENGTH(N'dbo.ordenes_laboratorio', N'notas') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [notas] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: ordenes_laboratorio.notas';
    END
    IF COL_LENGTH(N'dbo.ordenes_laboratorio', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: ordenes_laboratorio.activo';
    END
    IF COL_LENGTH(N'dbo.ordenes_laboratorio', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: ordenes_laboratorio.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.ordenes_laboratorio', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: ordenes_laboratorio.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.ordenes_laboratorio', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: ordenes_laboratorio.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.ordenes_laboratorio', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: ordenes_laboratorio.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.ordenes_medicas_hospitalizacion', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[ordenes_medicas_hospitalizacion] (
    	[id_orden_medica] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_hospitalizacion] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[id_tipo_orden] [bigint] NOT NULL,
    	[fecha_orden] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[descripcion] [nvarchar](max) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	PRIMARY KEY CLUSTERED ([id_orden_medica] ASC)
    );
    PRINT N'Tabla creada: ordenes_medicas_hospitalizacion';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.ordenes_medicas_hospitalizacion', N'id_hospitalizacion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ordenes_medicas_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD [id_hospitalizacion] [bigint] NULL;');
            PRINT N'AVISO: ordenes_medicas_hospitalizacion.id_hospitalizacion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD [id_hospitalizacion] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ordenes_medicas_hospitalizacion.id_hospitalizacion';
    END
    IF COL_LENGTH(N'dbo.ordenes_medicas_hospitalizacion', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ordenes_medicas_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: ordenes_medicas_hospitalizacion.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ordenes_medicas_hospitalizacion.id_medico';
    END
    IF COL_LENGTH(N'dbo.ordenes_medicas_hospitalizacion', N'id_tipo_orden') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ordenes_medicas_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD [id_tipo_orden] [bigint] NULL;');
            PRINT N'AVISO: ordenes_medicas_hospitalizacion.id_tipo_orden se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD [id_tipo_orden] [bigint] NOT NULL;');
        PRINT N'Columna agregada: ordenes_medicas_hospitalizacion.id_tipo_orden';
    END
    IF COL_LENGTH(N'dbo.ordenes_medicas_hospitalizacion', N'fecha_orden') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD [fecha_orden] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: ordenes_medicas_hospitalizacion.fecha_orden';
    END
    IF COL_LENGTH(N'dbo.ordenes_medicas_hospitalizacion', N'descripcion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[ordenes_medicas_hospitalizacion])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD [descripcion] [nvarchar](max) NULL;');
            PRINT N'AVISO: ordenes_medicas_hospitalizacion.descripcion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD [descripcion] [nvarchar](max) NOT NULL;');
        PRINT N'Columna agregada: ordenes_medicas_hospitalizacion.descripcion';
    END
    IF COL_LENGTH(N'dbo.ordenes_medicas_hospitalizacion', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: ordenes_medicas_hospitalizacion.activo';
    END
    IF COL_LENGTH(N'dbo.ordenes_medicas_hospitalizacion', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: ordenes_medicas_hospitalizacion.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.ordenes_medicas_hospitalizacion', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: ordenes_medicas_hospitalizacion.fecha_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.paciente_alergia', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[paciente_alergia] (
    	[id_alergia] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_tipo_alergia] [bigint] NOT NULL,
    	[descripcion] [nvarchar](255) NOT NULL,
    	[id_severidad] [bigint] NOT NULL,
    	[fecha_diagnostico] [date] NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_alergia] ASC)
    );
    PRINT N'Tabla creada: paciente_alergia';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.paciente_alergia', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_alergia])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: paciente_alergia.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: paciente_alergia.id_paciente';
    END
    IF COL_LENGTH(N'dbo.paciente_alergia', N'id_tipo_alergia') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_alergia])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [id_tipo_alergia] [bigint] NULL;');
            PRINT N'AVISO: paciente_alergia.id_tipo_alergia se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [id_tipo_alergia] [bigint] NOT NULL;');
        PRINT N'Columna agregada: paciente_alergia.id_tipo_alergia';
    END
    IF COL_LENGTH(N'dbo.paciente_alergia', N'descripcion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_alergia])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [descripcion] [nvarchar](255) NULL;');
            PRINT N'AVISO: paciente_alergia.descripcion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [descripcion] [nvarchar](255) NOT NULL;');
        PRINT N'Columna agregada: paciente_alergia.descripcion';
    END
    IF COL_LENGTH(N'dbo.paciente_alergia', N'id_severidad') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_alergia])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [id_severidad] [bigint] NULL;');
            PRINT N'AVISO: paciente_alergia.id_severidad se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [id_severidad] [bigint] NOT NULL;');
        PRINT N'Columna agregada: paciente_alergia.id_severidad';
    END
    IF COL_LENGTH(N'dbo.paciente_alergia', N'fecha_diagnostico') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [fecha_diagnostico] [date] NULL;');
        PRINT N'Columna agregada: paciente_alergia.fecha_diagnostico';
    END
    IF COL_LENGTH(N'dbo.paciente_alergia', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: paciente_alergia.activo';
    END
    IF COL_LENGTH(N'dbo.paciente_alergia', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: paciente_alergia.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.paciente_alergia', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: paciente_alergia.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.paciente_alergia', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: paciente_alergia.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.paciente_alergia', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: paciente_alergia.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.paciente_antecedente', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[paciente_antecedente] (
    	[id_antecedente] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_tipo_antecedente] [bigint] NOT NULL,
    	[descripcion] [nvarchar](500) NOT NULL,
    	[fecha_registro] [date] NOT NULL DEFAULT (CONVERT([date],getdate())),
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_antecedente] ASC)
    );
    PRINT N'Tabla creada: paciente_antecedente';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.paciente_antecedente', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_antecedente])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: paciente_antecedente.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: paciente_antecedente.id_paciente';
    END
    IF COL_LENGTH(N'dbo.paciente_antecedente', N'id_tipo_antecedente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_antecedente])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD [id_tipo_antecedente] [bigint] NULL;');
            PRINT N'AVISO: paciente_antecedente.id_tipo_antecedente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD [id_tipo_antecedente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: paciente_antecedente.id_tipo_antecedente';
    END
    IF COL_LENGTH(N'dbo.paciente_antecedente', N'descripcion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_antecedente])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD [descripcion] [nvarchar](500) NULL;');
            PRINT N'AVISO: paciente_antecedente.descripcion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD [descripcion] [nvarchar](500) NOT NULL;');
        PRINT N'Columna agregada: paciente_antecedente.descripcion';
    END
    IF COL_LENGTH(N'dbo.paciente_antecedente', N'fecha_registro') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD [fecha_registro] [date] NOT NULL DEFAULT (CONVERT([date],getdate()));');
        PRINT N'Columna agregada: paciente_antecedente.fecha_registro';
    END
    IF COL_LENGTH(N'dbo.paciente_antecedente', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: paciente_antecedente.activo';
    END
    IF COL_LENGTH(N'dbo.paciente_antecedente', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: paciente_antecedente.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.paciente_antecedente', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: paciente_antecedente.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.paciente_antecedente', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: paciente_antecedente.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.paciente_antecedente', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: paciente_antecedente.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.paciente_contacto_emergencia', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[paciente_contacto_emergencia] (
    	[id_contacto_emergencia] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[nombre_completo] [nvarchar](200) NOT NULL,
    	[id_parentesco] [bigint] NULL,
    	[telefono] [nvarchar](30) NOT NULL,
    	[direccion] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_contacto_emergencia] ASC)
    );
    PRINT N'Tabla creada: paciente_contacto_emergencia';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.paciente_contacto_emergencia', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_contacto_emergencia])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: paciente_contacto_emergencia.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: paciente_contacto_emergencia.id_paciente';
    END
    IF COL_LENGTH(N'dbo.paciente_contacto_emergencia', N'nombre_completo') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_contacto_emergencia])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [nombre_completo] [nvarchar](200) NULL;');
            PRINT N'AVISO: paciente_contacto_emergencia.nombre_completo se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [nombre_completo] [nvarchar](200) NOT NULL;');
        PRINT N'Columna agregada: paciente_contacto_emergencia.nombre_completo';
    END
    IF COL_LENGTH(N'dbo.paciente_contacto_emergencia', N'id_parentesco') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [id_parentesco] [bigint] NULL;');
        PRINT N'Columna agregada: paciente_contacto_emergencia.id_parentesco';
    END
    IF COL_LENGTH(N'dbo.paciente_contacto_emergencia', N'telefono') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_contacto_emergencia])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [telefono] [nvarchar](30) NULL;');
            PRINT N'AVISO: paciente_contacto_emergencia.telefono se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [telefono] [nvarchar](30) NOT NULL;');
        PRINT N'Columna agregada: paciente_contacto_emergencia.telefono';
    END
    IF COL_LENGTH(N'dbo.paciente_contacto_emergencia', N'direccion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [direccion] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: paciente_contacto_emergencia.direccion';
    END
    IF COL_LENGTH(N'dbo.paciente_contacto_emergencia', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: paciente_contacto_emergencia.activo';
    END
    IF COL_LENGTH(N'dbo.paciente_contacto_emergencia', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: paciente_contacto_emergencia.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.paciente_contacto_emergencia', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: paciente_contacto_emergencia.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.paciente_contacto_emergencia', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: paciente_contacto_emergencia.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.paciente_contacto_emergencia', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: paciente_contacto_emergencia.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.paciente_convenio', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[paciente_convenio] (
    	[id_paciente_convenio] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_convenio] [bigint] NOT NULL,
    	[numero_afiliado] [nvarchar](50) NULL,
    	[fecha_vinculacion] [date] NOT NULL DEFAULT (CONVERT([date],getdate())),
    	[id_estado_afiliacion] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	PRIMARY KEY CLUSTERED ([id_paciente_convenio] ASC),
    	UNIQUE NONCLUSTERED ([id_paciente] ASC, [id_convenio] ASC)
    );
    PRINT N'Tabla creada: paciente_convenio';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.paciente_convenio', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_convenio])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: paciente_convenio.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: paciente_convenio.id_paciente';
    END
    IF COL_LENGTH(N'dbo.paciente_convenio', N'id_convenio') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_convenio])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD [id_convenio] [bigint] NULL;');
            PRINT N'AVISO: paciente_convenio.id_convenio se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD [id_convenio] [bigint] NOT NULL;');
        PRINT N'Columna agregada: paciente_convenio.id_convenio';
    END
    IF COL_LENGTH(N'dbo.paciente_convenio', N'numero_afiliado') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD [numero_afiliado] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: paciente_convenio.numero_afiliado';
    END
    IF COL_LENGTH(N'dbo.paciente_convenio', N'fecha_vinculacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD [fecha_vinculacion] [date] NOT NULL DEFAULT (CONVERT([date],getdate()));');
        PRINT N'Columna agregada: paciente_convenio.fecha_vinculacion';
    END
    IF COL_LENGTH(N'dbo.paciente_convenio', N'id_estado_afiliacion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[paciente_convenio])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD [id_estado_afiliacion] [bigint] NULL;');
            PRINT N'AVISO: paciente_convenio.id_estado_afiliacion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD [id_estado_afiliacion] [bigint] NOT NULL;');
        PRINT N'Columna agregada: paciente_convenio.id_estado_afiliacion';
    END
    IF COL_LENGTH(N'dbo.paciente_convenio', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: paciente_convenio.activo';
    END
    IF COL_LENGTH(N'dbo.paciente_convenio', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: paciente_convenio.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.paciente_convenio', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: paciente_convenio.fecha_modificacion';
    END
END
GO

-- Incluye columnas agregadas por: agregar_ficha_clinica_general.sql
IF OBJECT_ID(N'dbo.pacientes', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[pacientes] (
    	[id_paciente] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo_expediente] [nvarchar](30) NOT NULL,
    	[primer_nombre] [nvarchar](100) NOT NULL,
    	[segundo_nombre] [nvarchar](100) NULL,
    	[primer_apellido] [nvarchar](100) NOT NULL,
    	[segundo_apellido] [nvarchar](100) NULL,
    	[fecha_nacimiento] [date] NOT NULL,
    	[id_genero] [bigint] NULL,
    	[id_tipo_documento] [bigint] NULL,
    	[numero_documento] [nvarchar](50) NULL,
    	[id_estado_civil] [bigint] NULL,
    	[telefono_principal] [nvarchar](30) NULL,
    	[telefono_secundario] [nvarchar](30) NULL,
    	[correo] [nvarchar](150) NULL,
    	[direccion] [nvarchar](255) NULL,
    	[id_tipo_sangre] [bigint] NULL,
    	[id_nivel_confidencialidad] [bigint] NULL,
    	[id_estado_paciente] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[religion] [nvarchar](100) NULL,
    	[ocupacion] [nvarchar](100) NULL,
    	PRIMARY KEY CLUSTERED ([id_paciente] ASC),
    	UNIQUE NONCLUSTERED ([codigo_expediente] ASC)
    );
    PRINT N'Tabla creada: pacientes';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.pacientes', N'codigo_expediente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[pacientes])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [codigo_expediente] [nvarchar](30) NULL;');
            PRINT N'AVISO: pacientes.codigo_expediente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [codigo_expediente] [nvarchar](30) NOT NULL;');
        PRINT N'Columna agregada: pacientes.codigo_expediente';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'primer_nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[pacientes])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [primer_nombre] [nvarchar](100) NULL;');
            PRINT N'AVISO: pacientes.primer_nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [primer_nombre] [nvarchar](100) NOT NULL;');
        PRINT N'Columna agregada: pacientes.primer_nombre';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'segundo_nombre') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [segundo_nombre] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: pacientes.segundo_nombre';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'primer_apellido') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[pacientes])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [primer_apellido] [nvarchar](100) NULL;');
            PRINT N'AVISO: pacientes.primer_apellido se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [primer_apellido] [nvarchar](100) NOT NULL;');
        PRINT N'Columna agregada: pacientes.primer_apellido';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'segundo_apellido') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [segundo_apellido] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: pacientes.segundo_apellido';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'fecha_nacimiento') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[pacientes])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [fecha_nacimiento] [date] NULL;');
            PRINT N'AVISO: pacientes.fecha_nacimiento se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [fecha_nacimiento] [date] NOT NULL;');
        PRINT N'Columna agregada: pacientes.fecha_nacimiento';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'id_genero') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [id_genero] [bigint] NULL;');
        PRINT N'Columna agregada: pacientes.id_genero';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'id_tipo_documento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [id_tipo_documento] [bigint] NULL;');
        PRINT N'Columna agregada: pacientes.id_tipo_documento';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'numero_documento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [numero_documento] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: pacientes.numero_documento';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'id_estado_civil') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [id_estado_civil] [bigint] NULL;');
        PRINT N'Columna agregada: pacientes.id_estado_civil';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'telefono_principal') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [telefono_principal] [nvarchar](30) NULL;');
        PRINT N'Columna agregada: pacientes.telefono_principal';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'telefono_secundario') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [telefono_secundario] [nvarchar](30) NULL;');
        PRINT N'Columna agregada: pacientes.telefono_secundario';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'correo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [correo] [nvarchar](150) NULL;');
        PRINT N'Columna agregada: pacientes.correo';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'direccion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [direccion] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: pacientes.direccion';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'id_tipo_sangre') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [id_tipo_sangre] [bigint] NULL;');
        PRINT N'Columna agregada: pacientes.id_tipo_sangre';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'id_nivel_confidencialidad') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [id_nivel_confidencialidad] [bigint] NULL;');
        PRINT N'Columna agregada: pacientes.id_nivel_confidencialidad';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'id_estado_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[pacientes])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [id_estado_paciente] [bigint] NULL;');
            PRINT N'AVISO: pacientes.id_estado_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [id_estado_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: pacientes.id_estado_paciente';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: pacientes.activo';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: pacientes.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: pacientes.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: pacientes.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: pacientes.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'religion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [religion] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: pacientes.religion';
    END
    IF COL_LENGTH(N'dbo.pacientes', N'ocupacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD [ocupacion] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: pacientes.ocupacion';
    END
END
GO

IF OBJECT_ID(N'dbo.pagos', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[pagos] (
    	[id_pago] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_factura] [bigint] NOT NULL,
    	[fecha_pago] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[monto] [numeric](12, 2) NOT NULL,
    	[id_forma_pago] [bigint] NOT NULL,
    	[id_estado_pago] [bigint] NOT NULL,
    	[referencia_pago] [nvarchar](100) NULL,
    	[observaciones] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_pago] ASC),
    	CHECK (([monto]>(0)))
    );
    PRINT N'Tabla creada: pagos';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.pagos', N'id_factura') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[pagos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[pagos] ADD [id_factura] [bigint] NULL;');
            PRINT N'AVISO: pagos.id_factura se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[pagos] ADD [id_factura] [bigint] NOT NULL;');
        PRINT N'Columna agregada: pagos.id_factura';
    END
    IF COL_LENGTH(N'dbo.pagos', N'fecha_pago') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD [fecha_pago] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: pagos.fecha_pago';
    END
    IF COL_LENGTH(N'dbo.pagos', N'monto') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[pagos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[pagos] ADD [monto] [numeric](12, 2) NULL;');
            PRINT N'AVISO: pagos.monto se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[pagos] ADD [monto] [numeric](12, 2) NOT NULL;');
        PRINT N'Columna agregada: pagos.monto';
    END
    IF COL_LENGTH(N'dbo.pagos', N'id_forma_pago') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[pagos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[pagos] ADD [id_forma_pago] [bigint] NULL;');
            PRINT N'AVISO: pagos.id_forma_pago se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[pagos] ADD [id_forma_pago] [bigint] NOT NULL;');
        PRINT N'Columna agregada: pagos.id_forma_pago';
    END
    IF COL_LENGTH(N'dbo.pagos', N'id_estado_pago') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[pagos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[pagos] ADD [id_estado_pago] [bigint] NULL;');
            PRINT N'AVISO: pagos.id_estado_pago se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[pagos] ADD [id_estado_pago] [bigint] NOT NULL;');
        PRINT N'Columna agregada: pagos.id_estado_pago';
    END
    IF COL_LENGTH(N'dbo.pagos', N'referencia_pago') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD [referencia_pago] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: pagos.referencia_pago';
    END
    IF COL_LENGTH(N'dbo.pagos', N'observaciones') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD [observaciones] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: pagos.observaciones';
    END
    IF COL_LENGTH(N'dbo.pagos', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: pagos.activo';
    END
    IF COL_LENGTH(N'dbo.pagos', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: pagos.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.pagos', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: pagos.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.pagos', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: pagos.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.pagos', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: pagos.id_usuario_modificacion';
    END
END
GO

-- Incluye columnas agregadas por: sembrar_catalogos.sql
IF OBJECT_ID(N'dbo.permisos', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[permisos] (
    	[id_permiso] [bigint] IDENTITY(1,1) NOT NULL,
    	[codigo] [nvarchar](100) NOT NULL,
    	[nombre] [nvarchar](150) NOT NULL,
    	[id_modulo] [bigint] NOT NULL,
    	[descripcion] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_permiso] ASC),
    	UNIQUE NONCLUSTERED ([codigo] ASC)
    );
    PRINT N'Tabla creada: permisos';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.permisos', N'codigo') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[permisos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[permisos] ADD [codigo] [nvarchar](100) NULL;');
            PRINT N'AVISO: permisos.codigo se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[permisos] ADD [codigo] [nvarchar](100) NOT NULL;');
        PRINT N'Columna agregada: permisos.codigo';
    END
    IF COL_LENGTH(N'dbo.permisos', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[permisos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[permisos] ADD [nombre] [nvarchar](150) NULL;');
            PRINT N'AVISO: permisos.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[permisos] ADD [nombre] [nvarchar](150) NOT NULL;');
        PRINT N'Columna agregada: permisos.nombre';
    END
    IF COL_LENGTH(N'dbo.permisos', N'id_modulo') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[permisos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[permisos] ADD [id_modulo] [bigint] NULL;');
            PRINT N'AVISO: permisos.id_modulo se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[permisos] ADD [id_modulo] [bigint] NOT NULL;');
        PRINT N'Columna agregada: permisos.id_modulo';
    END
    IF COL_LENGTH(N'dbo.permisos', N'descripcion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[permisos] ADD [descripcion] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: permisos.descripcion';
    END
    IF COL_LENGTH(N'dbo.permisos', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[permisos] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: permisos.activo';
    END
    IF COL_LENGTH(N'dbo.permisos', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[permisos] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: permisos.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.permisos', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[permisos] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: permisos.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.permisos', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[permisos] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: permisos.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.permisos', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[permisos] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: permisos.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.polizas_seguro', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[polizas_seguro] (
    	[id_poliza] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_aseguradora] [bigint] NOT NULL,
    	[id_convenio] [bigint] NULL,
    	[id_ramo] [bigint] NOT NULL,
    	[numero_poliza] [nvarchar](50) NOT NULL,
    	[numero_certificado] [nvarchar](50) NULL,
    	[id_titularidad] [bigint] NOT NULL,
    	[nombre_titular] [nvarchar](200) NULL,
    	[nombre_propietario] [nvarchar](200) NULL,
    	[codigo_autorizacion] [nvarchar](50) NULL,
    	[porcentaje_copago] [numeric](5, 2) NULL,
    	[monto_copago] [numeric](12, 2) NULL,
    	[fecha_inicio_vigencia] [date] NULL,
    	[fecha_fin_vigencia] [date] NULL,
    	[id_estado_poliza] [bigint] NOT NULL,
    	[observaciones] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_poliza] ASC),
    	CHECK (([fecha_fin_vigencia] IS NULL OR [fecha_fin_vigencia]>=[fecha_inicio_vigencia]))
    );
    PRINT N'Tabla creada: polizas_seguro';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.polizas_seguro', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[polizas_seguro])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: polizas_seguro.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: polizas_seguro.id_paciente';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'id_aseguradora') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[polizas_seguro])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_aseguradora] [bigint] NULL;');
            PRINT N'AVISO: polizas_seguro.id_aseguradora se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_aseguradora] [bigint] NOT NULL;');
        PRINT N'Columna agregada: polizas_seguro.id_aseguradora';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'id_convenio') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_convenio] [bigint] NULL;');
        PRINT N'Columna agregada: polizas_seguro.id_convenio';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'id_ramo') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[polizas_seguro])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_ramo] [bigint] NULL;');
            PRINT N'AVISO: polizas_seguro.id_ramo se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_ramo] [bigint] NOT NULL;');
        PRINT N'Columna agregada: polizas_seguro.id_ramo';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'numero_poliza') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[polizas_seguro])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [numero_poliza] [nvarchar](50) NULL;');
            PRINT N'AVISO: polizas_seguro.numero_poliza se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [numero_poliza] [nvarchar](50) NOT NULL;');
        PRINT N'Columna agregada: polizas_seguro.numero_poliza';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'numero_certificado') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [numero_certificado] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: polizas_seguro.numero_certificado';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'id_titularidad') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[polizas_seguro])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_titularidad] [bigint] NULL;');
            PRINT N'AVISO: polizas_seguro.id_titularidad se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_titularidad] [bigint] NOT NULL;');
        PRINT N'Columna agregada: polizas_seguro.id_titularidad';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'nombre_titular') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [nombre_titular] [nvarchar](200) NULL;');
        PRINT N'Columna agregada: polizas_seguro.nombre_titular';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'nombre_propietario') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [nombre_propietario] [nvarchar](200) NULL;');
        PRINT N'Columna agregada: polizas_seguro.nombre_propietario';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'codigo_autorizacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [codigo_autorizacion] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: polizas_seguro.codigo_autorizacion';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'porcentaje_copago') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [porcentaje_copago] [numeric](5, 2) NULL;');
        PRINT N'Columna agregada: polizas_seguro.porcentaje_copago';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'monto_copago') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [monto_copago] [numeric](12, 2) NULL;');
        PRINT N'Columna agregada: polizas_seguro.monto_copago';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'fecha_inicio_vigencia') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [fecha_inicio_vigencia] [date] NULL;');
        PRINT N'Columna agregada: polizas_seguro.fecha_inicio_vigencia';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'fecha_fin_vigencia') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [fecha_fin_vigencia] [date] NULL;');
        PRINT N'Columna agregada: polizas_seguro.fecha_fin_vigencia';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'id_estado_poliza') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[polizas_seguro])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_estado_poliza] [bigint] NULL;');
            PRINT N'AVISO: polizas_seguro.id_estado_poliza se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_estado_poliza] [bigint] NOT NULL;');
        PRINT N'Columna agregada: polizas_seguro.id_estado_poliza';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'observaciones') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [observaciones] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: polizas_seguro.observaciones';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: polizas_seguro.activo';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: polizas_seguro.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: polizas_seguro.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: polizas_seguro.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.polizas_seguro', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: polizas_seguro.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.proveedores', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[proveedores] (
    	[id_proveedor] [bigint] IDENTITY(1,1) NOT NULL,
    	[nombre] [nvarchar](200) NOT NULL,
    	[nit] [nvarchar](30) NULL,
    	[telefono] [nvarchar](30) NULL,
    	[correo] [nvarchar](150) NULL,
    	[direccion] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_proveedor] ASC)
    );
    PRINT N'Tabla creada: proveedores';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.proveedores', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[proveedores])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[proveedores] ADD [nombre] [nvarchar](200) NULL;');
            PRINT N'AVISO: proveedores.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[proveedores] ADD [nombre] [nvarchar](200) NOT NULL;');
        PRINT N'Columna agregada: proveedores.nombre';
    END
    IF COL_LENGTH(N'dbo.proveedores', N'nit') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[proveedores] ADD [nit] [nvarchar](30) NULL;');
        PRINT N'Columna agregada: proveedores.nit';
    END
    IF COL_LENGTH(N'dbo.proveedores', N'telefono') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[proveedores] ADD [telefono] [nvarchar](30) NULL;');
        PRINT N'Columna agregada: proveedores.telefono';
    END
    IF COL_LENGTH(N'dbo.proveedores', N'correo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[proveedores] ADD [correo] [nvarchar](150) NULL;');
        PRINT N'Columna agregada: proveedores.correo';
    END
    IF COL_LENGTH(N'dbo.proveedores', N'direccion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[proveedores] ADD [direccion] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: proveedores.direccion';
    END
    IF COL_LENGTH(N'dbo.proveedores', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[proveedores] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: proveedores.activo';
    END
    IF COL_LENGTH(N'dbo.proveedores', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[proveedores] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: proveedores.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.proveedores', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[proveedores] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: proveedores.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.proveedores', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[proveedores] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: proveedores.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.proveedores', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[proveedores] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: proveedores.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.puestos', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[puestos] (
    	[id_puesto] [bigint] IDENTITY(1,1) NOT NULL,
    	[nombre] [nvarchar](150) NOT NULL,
    	[descripcion] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_puesto] ASC),
    	UNIQUE NONCLUSTERED ([nombre] ASC)
    );
    PRINT N'Tabla creada: puestos';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.puestos', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[puestos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[puestos] ADD [nombre] [nvarchar](150) NULL;');
            PRINT N'AVISO: puestos.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[puestos] ADD [nombre] [nvarchar](150) NOT NULL;');
        PRINT N'Columna agregada: puestos.nombre';
    END
    IF COL_LENGTH(N'dbo.puestos', N'descripcion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[puestos] ADD [descripcion] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: puestos.descripcion';
    END
    IF COL_LENGTH(N'dbo.puestos', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[puestos] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: puestos.activo';
    END
    IF COL_LENGTH(N'dbo.puestos', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[puestos] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: puestos.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.puestos', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[puestos] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: puestos.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.puestos', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[puestos] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: puestos.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.puestos', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[puestos] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: puestos.id_usuario_modificacion';
    END
END
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql
IF OBJECT_ID(N'dbo.receta_detalle', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[receta_detalle] (
    	[id_receta_detalle] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_receta] [bigint] NOT NULL,
    	[id_medicamento] [bigint] NULL,
    	[dosis] [nvarchar](100) NOT NULL,
    	[frecuencia] [nvarchar](100) NOT NULL,
    	[duracion] [nvarchar](100) NULL,
    	[indicaciones] [nvarchar](500) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[nombre_medicamento_externo] [nvarchar](200) NULL,
    	[cantidad] [decimal](10, 2) NOT NULL,
    	PRIMARY KEY CLUSTERED ([id_receta_detalle] ASC),
    	CONSTRAINT [ck_receta_detalle_medicamento] CHECK (
    		([id_medicamento] IS NOT NULL AND [nombre_medicamento_externo] IS NULL) OR
    		([id_medicamento] IS NULL AND [nombre_medicamento_externo] IS NOT NULL))
    );
    PRINT N'Tabla creada: receta_detalle';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.receta_detalle', N'id_receta') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[receta_detalle])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [id_receta] [bigint] NULL;');
            PRINT N'AVISO: receta_detalle.id_receta se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [id_receta] [bigint] NOT NULL;');
        PRINT N'Columna agregada: receta_detalle.id_receta';
    END
    IF COL_LENGTH(N'dbo.receta_detalle', N'id_medicamento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [id_medicamento] [bigint] NULL;');
        PRINT N'Columna agregada: receta_detalle.id_medicamento';
    END
    IF COL_LENGTH(N'dbo.receta_detalle', N'dosis') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[receta_detalle])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [dosis] [nvarchar](100) NULL;');
            PRINT N'AVISO: receta_detalle.dosis se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [dosis] [nvarchar](100) NOT NULL;');
        PRINT N'Columna agregada: receta_detalle.dosis';
    END
    IF COL_LENGTH(N'dbo.receta_detalle', N'frecuencia') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[receta_detalle])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [frecuencia] [nvarchar](100) NULL;');
            PRINT N'AVISO: receta_detalle.frecuencia se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [frecuencia] [nvarchar](100) NOT NULL;');
        PRINT N'Columna agregada: receta_detalle.frecuencia';
    END
    IF COL_LENGTH(N'dbo.receta_detalle', N'duracion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [duracion] [nvarchar](100) NULL;');
        PRINT N'Columna agregada: receta_detalle.duracion';
    END
    IF COL_LENGTH(N'dbo.receta_detalle', N'indicaciones') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [indicaciones] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: receta_detalle.indicaciones';
    END
    IF COL_LENGTH(N'dbo.receta_detalle', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: receta_detalle.activo';
    END
    IF COL_LENGTH(N'dbo.receta_detalle', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: receta_detalle.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.receta_detalle', N'nombre_medicamento_externo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [nombre_medicamento_externo] [nvarchar](200) NULL;');
        PRINT N'Columna agregada: receta_detalle.nombre_medicamento_externo';
    END
    IF COL_LENGTH(N'dbo.receta_detalle', N'cantidad') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[receta_detalle])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [cantidad] [decimal](10, 2) NULL;');
            PRINT N'AVISO: receta_detalle.cantidad se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD [cantidad] [decimal](10, 2) NOT NULL;');
        PRINT N'Columna agregada: receta_detalle.cantidad';
    END
END
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql
IF OBJECT_ID(N'dbo.recetas', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[recetas] (
    	[id_receta] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_tratamiento] [bigint] NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[fecha_emision] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[firma_digital_hash] [nvarchar](255) NULL,
    	[firma_digital_url] [nvarchar](500) NULL,
    	[id_estado_receta] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[id_cita] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_receta] ASC)
    );
    PRINT N'Tabla creada: recetas';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.recetas', N'id_tratamiento') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD [id_tratamiento] [bigint] NULL;');
        PRINT N'Columna agregada: recetas.id_tratamiento';
    END
    IF COL_LENGTH(N'dbo.recetas', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[recetas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[recetas] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: recetas.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[recetas] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: recetas.id_paciente';
    END
    IF COL_LENGTH(N'dbo.recetas', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[recetas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[recetas] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: recetas.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[recetas] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: recetas.id_medico';
    END
    IF COL_LENGTH(N'dbo.recetas', N'fecha_emision') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD [fecha_emision] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: recetas.fecha_emision';
    END
    IF COL_LENGTH(N'dbo.recetas', N'firma_digital_hash') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD [firma_digital_hash] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: recetas.firma_digital_hash';
    END
    IF COL_LENGTH(N'dbo.recetas', N'firma_digital_url') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD [firma_digital_url] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: recetas.firma_digital_url';
    END
    IF COL_LENGTH(N'dbo.recetas', N'id_estado_receta') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[recetas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[recetas] ADD [id_estado_receta] [bigint] NULL;');
            PRINT N'AVISO: recetas.id_estado_receta se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[recetas] ADD [id_estado_receta] [bigint] NOT NULL;');
        PRINT N'Columna agregada: recetas.id_estado_receta';
    END
    IF COL_LENGTH(N'dbo.recetas', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: recetas.activo';
    END
    IF COL_LENGTH(N'dbo.recetas', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: recetas.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.recetas', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: recetas.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.recetas', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: recetas.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.recetas', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: recetas.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.recetas', N'id_cita') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD [id_cita] [bigint] NULL;');
        PRINT N'Columna agregada: recetas.id_cita';
    END
END
GO

IF OBJECT_ID(N'dbo.recordatorios', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[recordatorios] (
    	[id_recordatorio] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_cita] [bigint] NOT NULL,
    	[id_tipo_recordatorio] [bigint] NOT NULL,
    	[fecha_programada] [datetime2](7) NOT NULL,
    	[fecha_envio] [datetime2](7) NULL,
    	[id_estado_envio] [bigint] NOT NULL,
    	[detalle_error] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	PRIMARY KEY CLUSTERED ([id_recordatorio] ASC)
    );
    PRINT N'Tabla creada: recordatorios';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.recordatorios', N'id_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[recordatorios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [id_cita] [bigint] NULL;');
            PRINT N'AVISO: recordatorios.id_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [id_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: recordatorios.id_cita';
    END
    IF COL_LENGTH(N'dbo.recordatorios', N'id_tipo_recordatorio') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[recordatorios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [id_tipo_recordatorio] [bigint] NULL;');
            PRINT N'AVISO: recordatorios.id_tipo_recordatorio se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [id_tipo_recordatorio] [bigint] NOT NULL;');
        PRINT N'Columna agregada: recordatorios.id_tipo_recordatorio';
    END
    IF COL_LENGTH(N'dbo.recordatorios', N'fecha_programada') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[recordatorios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [fecha_programada] [datetime2](7) NULL;');
            PRINT N'AVISO: recordatorios.fecha_programada se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [fecha_programada] [datetime2](7) NOT NULL;');
        PRINT N'Columna agregada: recordatorios.fecha_programada';
    END
    IF COL_LENGTH(N'dbo.recordatorios', N'fecha_envio') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [fecha_envio] [datetime2](7) NULL;');
        PRINT N'Columna agregada: recordatorios.fecha_envio';
    END
    IF COL_LENGTH(N'dbo.recordatorios', N'id_estado_envio') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[recordatorios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [id_estado_envio] [bigint] NULL;');
            PRINT N'AVISO: recordatorios.id_estado_envio se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [id_estado_envio] [bigint] NOT NULL;');
        PRINT N'Columna agregada: recordatorios.id_estado_envio';
    END
    IF COL_LENGTH(N'dbo.recordatorios', N'detalle_error') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [detalle_error] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: recordatorios.detalle_error';
    END
    IF COL_LENGTH(N'dbo.recordatorios', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: recordatorios.activo';
    END
    IF COL_LENGTH(N'dbo.recordatorios', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: recordatorios.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.recordatorios', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: recordatorios.fecha_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.reportes_generados', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[reportes_generados] (
    	[id_reporte_generado] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_tipo_reporte] [bigint] NOT NULL,
    	[parametros] [nvarchar](max) NULL,
    	[fecha_generacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[id_usuario] [bigint] NULL,
    	[url_archivo] [nvarchar](500) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	PRIMARY KEY CLUSTERED ([id_reporte_generado] ASC),
    	CHECK (([parametros] IS NULL OR isjson([parametros])=(1)))
    );
    PRINT N'Tabla creada: reportes_generados';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.reportes_generados', N'id_tipo_reporte') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[reportes_generados])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[reportes_generados] ADD [id_tipo_reporte] [bigint] NULL;');
            PRINT N'AVISO: reportes_generados.id_tipo_reporte se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[reportes_generados] ADD [id_tipo_reporte] [bigint] NOT NULL;');
        PRINT N'Columna agregada: reportes_generados.id_tipo_reporte';
    END
    IF COL_LENGTH(N'dbo.reportes_generados', N'parametros') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[reportes_generados] ADD [parametros] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: reportes_generados.parametros';
    END
    IF COL_LENGTH(N'dbo.reportes_generados', N'fecha_generacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[reportes_generados] ADD [fecha_generacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: reportes_generados.fecha_generacion';
    END
    IF COL_LENGTH(N'dbo.reportes_generados', N'id_usuario') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[reportes_generados] ADD [id_usuario] [bigint] NULL;');
        PRINT N'Columna agregada: reportes_generados.id_usuario';
    END
    IF COL_LENGTH(N'dbo.reportes_generados', N'url_archivo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[reportes_generados] ADD [url_archivo] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: reportes_generados.url_archivo';
    END
    IF COL_LENGTH(N'dbo.reportes_generados', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[reportes_generados] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: reportes_generados.activo';
    END
END
GO

IF OBJECT_ID(N'dbo.resultados_examen', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[resultados_examen] (
    	[id_resultado] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_orden_detalle] [bigint] NOT NULL,
    	[fecha_resultado] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[resultado_texto] [nvarchar](max) NULL,
    	[archivo_adjunto_url] [nvarchar](500) NULL,
    	[id_estado_resultado] [bigint] NOT NULL,
    	[id_medico_valida] [bigint] NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_resultado] ASC)
    );
    PRINT N'Tabla creada: resultados_examen';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.resultados_examen', N'id_orden_detalle') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[resultados_examen])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [id_orden_detalle] [bigint] NULL;');
            PRINT N'AVISO: resultados_examen.id_orden_detalle se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [id_orden_detalle] [bigint] NOT NULL;');
        PRINT N'Columna agregada: resultados_examen.id_orden_detalle';
    END
    IF COL_LENGTH(N'dbo.resultados_examen', N'fecha_resultado') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [fecha_resultado] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: resultados_examen.fecha_resultado';
    END
    IF COL_LENGTH(N'dbo.resultados_examen', N'resultado_texto') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [resultado_texto] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: resultados_examen.resultado_texto';
    END
    IF COL_LENGTH(N'dbo.resultados_examen', N'archivo_adjunto_url') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [archivo_adjunto_url] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: resultados_examen.archivo_adjunto_url';
    END
    IF COL_LENGTH(N'dbo.resultados_examen', N'id_estado_resultado') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[resultados_examen])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [id_estado_resultado] [bigint] NULL;');
            PRINT N'AVISO: resultados_examen.id_estado_resultado se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [id_estado_resultado] [bigint] NOT NULL;');
        PRINT N'Columna agregada: resultados_examen.id_estado_resultado';
    END
    IF COL_LENGTH(N'dbo.resultados_examen', N'id_medico_valida') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [id_medico_valida] [bigint] NULL;');
        PRINT N'Columna agregada: resultados_examen.id_medico_valida';
    END
    IF COL_LENGTH(N'dbo.resultados_examen', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: resultados_examen.activo';
    END
    IF COL_LENGTH(N'dbo.resultados_examen', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: resultados_examen.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.resultados_examen', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: resultados_examen.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.resultados_examen', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: resultados_examen.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.resultados_examen', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: resultados_examen.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.rol_permiso', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[rol_permiso] (
    	[id_rol_permiso] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_rol] [bigint] NOT NULL,
    	[id_permiso] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	PRIMARY KEY CLUSTERED ([id_rol_permiso] ASC),
    	UNIQUE NONCLUSTERED ([id_rol] ASC, [id_permiso] ASC)
    );
    PRINT N'Tabla creada: rol_permiso';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.rol_permiso', N'id_rol') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[rol_permiso])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[rol_permiso] ADD [id_rol] [bigint] NULL;');
            PRINT N'AVISO: rol_permiso.id_rol se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[rol_permiso] ADD [id_rol] [bigint] NOT NULL;');
        PRINT N'Columna agregada: rol_permiso.id_rol';
    END
    IF COL_LENGTH(N'dbo.rol_permiso', N'id_permiso') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[rol_permiso])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[rol_permiso] ADD [id_permiso] [bigint] NULL;');
            PRINT N'AVISO: rol_permiso.id_permiso se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[rol_permiso] ADD [id_permiso] [bigint] NOT NULL;');
        PRINT N'Columna agregada: rol_permiso.id_permiso';
    END
    IF COL_LENGTH(N'dbo.rol_permiso', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[rol_permiso] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: rol_permiso.activo';
    END
    IF COL_LENGTH(N'dbo.rol_permiso', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[rol_permiso] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: rol_permiso.fecha_creacion';
    END
END
GO

IF OBJECT_ID(N'dbo.roles', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[roles] (
    	[id_rol] [bigint] IDENTITY(1,1) NOT NULL,
    	[nombre] [nvarchar](100) NOT NULL,
    	[descripcion] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_rol] ASC),
    	UNIQUE NONCLUSTERED ([nombre] ASC)
    );
    PRINT N'Tabla creada: roles';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.roles', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[roles])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[roles] ADD [nombre] [nvarchar](100) NULL;');
            PRINT N'AVISO: roles.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[roles] ADD [nombre] [nvarchar](100) NOT NULL;');
        PRINT N'Columna agregada: roles.nombre';
    END
    IF COL_LENGTH(N'dbo.roles', N'descripcion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[roles] ADD [descripcion] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: roles.descripcion';
    END
    IF COL_LENGTH(N'dbo.roles', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[roles] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: roles.activo';
    END
    IF COL_LENGTH(N'dbo.roles', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[roles] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: roles.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.roles', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[roles] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: roles.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.roles', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[roles] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: roles.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.roles', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[roles] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: roles.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.salas', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[salas] (
    	[id_sala] [bigint] IDENTITY(1,1) NOT NULL,
    	[nombre] [nvarchar](100) NOT NULL,
    	[id_tipo_sala] [bigint] NULL,
    	[id_estado_sala] [bigint] NOT NULL,
    	[capacidad] [smallint] NOT NULL DEFAULT ((1)),
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_sala] ASC)
    );
    PRINT N'Tabla creada: salas';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.salas', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[salas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[salas] ADD [nombre] [nvarchar](100) NULL;');
            PRINT N'AVISO: salas.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[salas] ADD [nombre] [nvarchar](100) NOT NULL;');
        PRINT N'Columna agregada: salas.nombre';
    END
    IF COL_LENGTH(N'dbo.salas', N'id_tipo_sala') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[salas] ADD [id_tipo_sala] [bigint] NULL;');
        PRINT N'Columna agregada: salas.id_tipo_sala';
    END
    IF COL_LENGTH(N'dbo.salas', N'id_estado_sala') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[salas])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[salas] ADD [id_estado_sala] [bigint] NULL;');
            PRINT N'AVISO: salas.id_estado_sala se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[salas] ADD [id_estado_sala] [bigint] NOT NULL;');
        PRINT N'Columna agregada: salas.id_estado_sala';
    END
    IF COL_LENGTH(N'dbo.salas', N'capacidad') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[salas] ADD [capacidad] [smallint] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: salas.capacidad';
    END
    IF COL_LENGTH(N'dbo.salas', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[salas] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: salas.activo';
    END
    IF COL_LENGTH(N'dbo.salas', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[salas] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: salas.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.salas', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[salas] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: salas.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.salas', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[salas] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: salas.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.salas', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[salas] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: salas.id_usuario_modificacion';
    END
END
GO

-- Origen: crear_servicios.sql (PARTE 33)
IF OBJECT_ID(N'dbo.servicios', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[servicios] (
    	[id_servicio] [bigint] IDENTITY(1,1) NOT NULL,
    	[nombre] [nvarchar](200) NOT NULL,
    	[descripcion] [nvarchar](500) NULL,
    	[precio] [numeric](12, 2) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_servicio] ASC)
    );
    PRINT N'Tabla creada: servicios';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.servicios', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[servicios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[servicios] ADD [nombre] [nvarchar](200) NULL;');
            PRINT N'AVISO: servicios.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[servicios] ADD [nombre] [nvarchar](200) NOT NULL;');
        PRINT N'Columna agregada: servicios.nombre';
    END
    IF COL_LENGTH(N'dbo.servicios', N'descripcion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[servicios] ADD [descripcion] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: servicios.descripcion';
    END
    IF COL_LENGTH(N'dbo.servicios', N'precio') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[servicios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[servicios] ADD [precio] [numeric](12, 2) NULL;');
            PRINT N'AVISO: servicios.precio se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[servicios] ADD [precio] [numeric](12, 2) NOT NULL;');
        PRINT N'Columna agregada: servicios.precio';
    END
    IF COL_LENGTH(N'dbo.servicios', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[servicios] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: servicios.activo';
    END
    IF COL_LENGTH(N'dbo.servicios', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[servicios] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: servicios.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.servicios', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[servicios] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: servicios.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.servicios', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[servicios] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: servicios.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.servicios', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[servicios] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: servicios.id_usuario_modificacion';
    END
END
GO

-- Incluye columnas agregadas por: sembrar_catalogos.sql, agregar_codigo_tipos_consentimiento.sql
IF OBJECT_ID(N'dbo.tipos_consentimiento', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[tipos_consentimiento] (
    	[id_tipo_consentimiento] [bigint] IDENTITY(1,1) NOT NULL,
    	[nombre] [nvarchar](200) NOT NULL,
    	[plantilla_texto] [nvarchar](max) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[codigo] [nvarchar](50) NOT NULL,
    	PRIMARY KEY CLUSTERED ([id_tipo_consentimiento] ASC)
    );
    PRINT N'Tabla creada: tipos_consentimiento';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.tipos_consentimiento', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[tipos_consentimiento])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[tipos_consentimiento] ADD [nombre] [nvarchar](200) NULL;');
            PRINT N'AVISO: tipos_consentimiento.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[tipos_consentimiento] ADD [nombre] [nvarchar](200) NOT NULL;');
        PRINT N'Columna agregada: tipos_consentimiento.nombre';
    END
    IF COL_LENGTH(N'dbo.tipos_consentimiento', N'plantilla_texto') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tipos_consentimiento] ADD [plantilla_texto] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: tipos_consentimiento.plantilla_texto';
    END
    IF COL_LENGTH(N'dbo.tipos_consentimiento', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tipos_consentimiento] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: tipos_consentimiento.activo';
    END
    IF COL_LENGTH(N'dbo.tipos_consentimiento', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tipos_consentimiento] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: tipos_consentimiento.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.tipos_consentimiento', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tipos_consentimiento] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: tipos_consentimiento.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.tipos_consentimiento', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tipos_consentimiento] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: tipos_consentimiento.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.tipos_consentimiento', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tipos_consentimiento] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: tipos_consentimiento.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.tipos_consentimiento', N'codigo') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[tipos_consentimiento])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[tipos_consentimiento] ADD [codigo] [nvarchar](50) NULL;');
            PRINT N'AVISO: tipos_consentimiento.codigo se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[tipos_consentimiento] ADD [codigo] [nvarchar](50) NOT NULL;');
        PRINT N'Columna agregada: tipos_consentimiento.codigo';
    END
END
GO

-- Incluye columnas agregadas por: sembrar_catalogos.sql, corregir_precio_venta_publico_examen_null.sql
IF OBJECT_ID(N'dbo.tipos_examen', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[tipos_examen] (
    	[id_tipo_examen] [bigint] IDENTITY(1,1) NOT NULL,
    	[nombre] [nvarchar](200) NOT NULL,
    	[id_categoria_examen] [bigint] NOT NULL,
    	[descripcion] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	[precio_venta_publico] [decimal](12, 2) NOT NULL,
    	PRIMARY KEY CLUSTERED ([id_tipo_examen] ASC)
    );
    PRINT N'Tabla creada: tipos_examen';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.tipos_examen', N'nombre') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[tipos_examen])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD [nombre] [nvarchar](200) NULL;');
            PRINT N'AVISO: tipos_examen.nombre se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD [nombre] [nvarchar](200) NOT NULL;');
        PRINT N'Columna agregada: tipos_examen.nombre';
    END
    IF COL_LENGTH(N'dbo.tipos_examen', N'id_categoria_examen') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[tipos_examen])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD [id_categoria_examen] [bigint] NULL;');
            PRINT N'AVISO: tipos_examen.id_categoria_examen se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD [id_categoria_examen] [bigint] NOT NULL;');
        PRINT N'Columna agregada: tipos_examen.id_categoria_examen';
    END
    IF COL_LENGTH(N'dbo.tipos_examen', N'descripcion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD [descripcion] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: tipos_examen.descripcion';
    END
    IF COL_LENGTH(N'dbo.tipos_examen', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: tipos_examen.activo';
    END
    IF COL_LENGTH(N'dbo.tipos_examen', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: tipos_examen.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.tipos_examen', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: tipos_examen.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.tipos_examen', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: tipos_examen.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.tipos_examen', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: tipos_examen.id_usuario_modificacion';
    END
    IF COL_LENGTH(N'dbo.tipos_examen', N'precio_venta_publico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[tipos_examen])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD [precio_venta_publico] [decimal](12, 2) NULL;');
            PRINT N'AVISO: tipos_examen.precio_venta_publico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD [precio_venta_publico] [decimal](12, 2) NOT NULL;');
        PRINT N'Columna agregada: tipos_examen.precio_venta_publico';
    END
END
GO

IF OBJECT_ID(N'dbo.tratamiento_seguimiento', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[tratamiento_seguimiento] (
    	[id_seguimiento] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_tratamiento] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[fecha] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[notas_evolucion] [nvarchar](max) NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_seguimiento] ASC)
    );
    PRINT N'Tabla creada: tratamiento_seguimiento';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.tratamiento_seguimiento', N'id_tratamiento') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[tratamiento_seguimiento])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD [id_tratamiento] [bigint] NULL;');
            PRINT N'AVISO: tratamiento_seguimiento.id_tratamiento se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD [id_tratamiento] [bigint] NOT NULL;');
        PRINT N'Columna agregada: tratamiento_seguimiento.id_tratamiento';
    END
    IF COL_LENGTH(N'dbo.tratamiento_seguimiento', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[tratamiento_seguimiento])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: tratamiento_seguimiento.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: tratamiento_seguimiento.id_medico';
    END
    IF COL_LENGTH(N'dbo.tratamiento_seguimiento', N'fecha') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD [fecha] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: tratamiento_seguimiento.fecha';
    END
    IF COL_LENGTH(N'dbo.tratamiento_seguimiento', N'notas_evolucion') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[tratamiento_seguimiento])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD [notas_evolucion] [nvarchar](max) NULL;');
            PRINT N'AVISO: tratamiento_seguimiento.notas_evolucion se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD [notas_evolucion] [nvarchar](max) NOT NULL;');
        PRINT N'Columna agregada: tratamiento_seguimiento.notas_evolucion';
    END
    IF COL_LENGTH(N'dbo.tratamiento_seguimiento', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: tratamiento_seguimiento.activo';
    END
    IF COL_LENGTH(N'dbo.tratamiento_seguimiento', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: tratamiento_seguimiento.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.tratamiento_seguimiento', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: tratamiento_seguimiento.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.tratamiento_seguimiento', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: tratamiento_seguimiento.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.tratamiento_seguimiento', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: tratamiento_seguimiento.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.tratamientos', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[tratamientos] (
    	[id_tratamiento] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_medico] [bigint] NOT NULL,
    	[id_cita] [bigint] NULL,
    	[fecha_inicio] [date] NOT NULL,
    	[fecha_fin] [date] NULL,
    	[diagnostico] [nvarchar](500) NULL,
    	[descripcion] [nvarchar](max) NULL,
    	[id_estado_tratamiento] [bigint] NOT NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_tratamiento] ASC),
    	CHECK (([fecha_fin] IS NULL OR [fecha_fin]>=[fecha_inicio]))
    );
    PRINT N'Tabla creada: tratamientos';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.tratamientos', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[tratamientos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: tratamientos.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: tratamientos.id_paciente';
    END
    IF COL_LENGTH(N'dbo.tratamientos', N'id_medico') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[tratamientos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [id_medico] [bigint] NULL;');
            PRINT N'AVISO: tratamientos.id_medico se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [id_medico] [bigint] NOT NULL;');
        PRINT N'Columna agregada: tratamientos.id_medico';
    END
    IF COL_LENGTH(N'dbo.tratamientos', N'id_cita') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [id_cita] [bigint] NULL;');
        PRINT N'Columna agregada: tratamientos.id_cita';
    END
    IF COL_LENGTH(N'dbo.tratamientos', N'fecha_inicio') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[tratamientos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [fecha_inicio] [date] NULL;');
            PRINT N'AVISO: tratamientos.fecha_inicio se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [fecha_inicio] [date] NOT NULL;');
        PRINT N'Columna agregada: tratamientos.fecha_inicio';
    END
    IF COL_LENGTH(N'dbo.tratamientos', N'fecha_fin') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [fecha_fin] [date] NULL;');
        PRINT N'Columna agregada: tratamientos.fecha_fin';
    END
    IF COL_LENGTH(N'dbo.tratamientos', N'diagnostico') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [diagnostico] [nvarchar](500) NULL;');
        PRINT N'Columna agregada: tratamientos.diagnostico';
    END
    IF COL_LENGTH(N'dbo.tratamientos', N'descripcion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [descripcion] [nvarchar](max) NULL;');
        PRINT N'Columna agregada: tratamientos.descripcion';
    END
    IF COL_LENGTH(N'dbo.tratamientos', N'id_estado_tratamiento') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[tratamientos])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [id_estado_tratamiento] [bigint] NULL;');
            PRINT N'AVISO: tratamientos.id_estado_tratamiento se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [id_estado_tratamiento] [bigint] NOT NULL;');
        PRINT N'Columna agregada: tratamientos.id_estado_tratamiento';
    END
    IF COL_LENGTH(N'dbo.tratamientos', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: tratamientos.activo';
    END
    IF COL_LENGTH(N'dbo.tratamientos', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: tratamientos.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.tratamientos', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: tratamientos.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.tratamientos', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: tratamientos.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.tratamientos', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: tratamientos.id_usuario_modificacion';
    END
END
GO

IF OBJECT_ID(N'dbo.usuario_rol', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[usuario_rol] (
    	[id_usuario_rol] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_usuario] [bigint] NOT NULL,
    	[id_rol] [bigint] NOT NULL,
    	[fecha_asignacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	PRIMARY KEY CLUSTERED ([id_usuario_rol] ASC),
    	UNIQUE NONCLUSTERED ([id_usuario] ASC, [id_rol] ASC)
    );
    PRINT N'Tabla creada: usuario_rol';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.usuario_rol', N'id_usuario') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[usuario_rol])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[usuario_rol] ADD [id_usuario] [bigint] NULL;');
            PRINT N'AVISO: usuario_rol.id_usuario se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[usuario_rol] ADD [id_usuario] [bigint] NOT NULL;');
        PRINT N'Columna agregada: usuario_rol.id_usuario';
    END
    IF COL_LENGTH(N'dbo.usuario_rol', N'id_rol') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[usuario_rol])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[usuario_rol] ADD [id_rol] [bigint] NULL;');
            PRINT N'AVISO: usuario_rol.id_rol se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[usuario_rol] ADD [id_rol] [bigint] NOT NULL;');
        PRINT N'Columna agregada: usuario_rol.id_rol';
    END
    IF COL_LENGTH(N'dbo.usuario_rol', N'fecha_asignacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[usuario_rol] ADD [fecha_asignacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: usuario_rol.fecha_asignacion';
    END
    IF COL_LENGTH(N'dbo.usuario_rol', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[usuario_rol] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: usuario_rol.activo';
    END
END
GO

IF OBJECT_ID(N'dbo.usuarios', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[usuarios] (
    	[id_usuario] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_empleado] [bigint] NULL,
    	[nombre_usuario] [nvarchar](100) NOT NULL,
    	[correo] [nvarchar](150) NOT NULL,
    	[hash_password] [nvarchar](255) NOT NULL,
    	[id_estado_usuario] [bigint] NOT NULL,
    	[fecha_ultimo_acceso] [datetime2](7) NULL,
    	[intentos_fallidos] [smallint] NOT NULL DEFAULT ((0)),
    	[requiere_cambio_password] [bit] NOT NULL DEFAULT ((1)),
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_usuario] ASC),
    	UNIQUE NONCLUSTERED ([correo] ASC),
    	UNIQUE NONCLUSTERED ([nombre_usuario] ASC)
    );
    PRINT N'Tabla creada: usuarios';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.usuarios', N'id_empleado') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [id_empleado] [bigint] NULL;');
        PRINT N'Columna agregada: usuarios.id_empleado';
    END
    IF COL_LENGTH(N'dbo.usuarios', N'nombre_usuario') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[usuarios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [nombre_usuario] [nvarchar](100) NULL;');
            PRINT N'AVISO: usuarios.nombre_usuario se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [nombre_usuario] [nvarchar](100) NOT NULL;');
        PRINT N'Columna agregada: usuarios.nombre_usuario';
    END
    IF COL_LENGTH(N'dbo.usuarios', N'correo') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[usuarios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [correo] [nvarchar](150) NULL;');
            PRINT N'AVISO: usuarios.correo se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [correo] [nvarchar](150) NOT NULL;');
        PRINT N'Columna agregada: usuarios.correo';
    END
    IF COL_LENGTH(N'dbo.usuarios', N'hash_password') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[usuarios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [hash_password] [nvarchar](255) NULL;');
            PRINT N'AVISO: usuarios.hash_password se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [hash_password] [nvarchar](255) NOT NULL;');
        PRINT N'Columna agregada: usuarios.hash_password';
    END
    IF COL_LENGTH(N'dbo.usuarios', N'id_estado_usuario') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[usuarios])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [id_estado_usuario] [bigint] NULL;');
            PRINT N'AVISO: usuarios.id_estado_usuario se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [id_estado_usuario] [bigint] NOT NULL;');
        PRINT N'Columna agregada: usuarios.id_estado_usuario';
    END
    IF COL_LENGTH(N'dbo.usuarios', N'fecha_ultimo_acceso') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [fecha_ultimo_acceso] [datetime2](7) NULL;');
        PRINT N'Columna agregada: usuarios.fecha_ultimo_acceso';
    END
    IF COL_LENGTH(N'dbo.usuarios', N'intentos_fallidos') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [intentos_fallidos] [smallint] NOT NULL DEFAULT ((0));');
        PRINT N'Columna agregada: usuarios.intentos_fallidos';
    END
    IF COL_LENGTH(N'dbo.usuarios', N'requiere_cambio_password') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [requiere_cambio_password] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: usuarios.requiere_cambio_password';
    END
    IF COL_LENGTH(N'dbo.usuarios', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: usuarios.activo';
    END
    IF COL_LENGTH(N'dbo.usuarios', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime());');
        PRINT N'Columna agregada: usuarios.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.usuarios', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: usuarios.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.usuarios', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: usuarios.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.usuarios', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: usuarios.id_usuario_modificacion';
    END
END
GO

-- Origen: agregar_toxico_y_vacunas.sql (PARTE 19)
IF OBJECT_ID(N'dbo.vacuna_aplicada', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[vacuna_aplicada] (
    	[id_vacuna_aplicada] [bigint] IDENTITY(1,1) NOT NULL,
    	[id_cita] [bigint] NOT NULL,
    	[id_paciente] [bigint] NOT NULL,
    	[id_tipo_vacuna] [bigint] NOT NULL,
    	[dosis] [nvarchar](50) NULL,
    	[fecha_aplicacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[observaciones] [nvarchar](255) NULL,
    	[activo] [bit] NOT NULL DEFAULT ((1)),
    	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime()),
    	[fecha_modificacion] [datetime2](7) NULL,
    	[id_usuario_creacion] [bigint] NULL,
    	[id_usuario_modificacion] [bigint] NULL,
    	PRIMARY KEY CLUSTERED ([id_vacuna_aplicada] ASC)
    );
    PRINT N'Tabla creada: vacuna_aplicada';
END
ELSE
BEGIN
    IF COL_LENGTH(N'dbo.vacuna_aplicada', N'id_cita') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[vacuna_aplicada])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [id_cita] [bigint] NULL;');
            PRINT N'AVISO: vacuna_aplicada.id_cita se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [id_cita] [bigint] NOT NULL;');
        PRINT N'Columna agregada: vacuna_aplicada.id_cita';
    END
    IF COL_LENGTH(N'dbo.vacuna_aplicada', N'id_paciente') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[vacuna_aplicada])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [id_paciente] [bigint] NULL;');
            PRINT N'AVISO: vacuna_aplicada.id_paciente se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [id_paciente] [bigint] NOT NULL;');
        PRINT N'Columna agregada: vacuna_aplicada.id_paciente';
    END
    IF COL_LENGTH(N'dbo.vacuna_aplicada', N'id_tipo_vacuna') IS NULL
    BEGIN
        IF EXISTS (SELECT 1 FROM [dbo].[vacuna_aplicada])
        BEGIN
            EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [id_tipo_vacuna] [bigint] NULL;');
            PRINT N'AVISO: vacuna_aplicada.id_tipo_vacuna se agregó como NULL porque la tabla ya tiene filas. Llénala y luego cámbiala a NOT NULL.';
        END
        ELSE
            EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [id_tipo_vacuna] [bigint] NOT NULL;');
        PRINT N'Columna agregada: vacuna_aplicada.id_tipo_vacuna';
    END
    IF COL_LENGTH(N'dbo.vacuna_aplicada', N'dosis') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [dosis] [nvarchar](50) NULL;');
        PRINT N'Columna agregada: vacuna_aplicada.dosis';
    END
    IF COL_LENGTH(N'dbo.vacuna_aplicada', N'fecha_aplicacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [fecha_aplicacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: vacuna_aplicada.fecha_aplicacion';
    END
    IF COL_LENGTH(N'dbo.vacuna_aplicada', N'observaciones') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [observaciones] [nvarchar](255) NULL;');
        PRINT N'Columna agregada: vacuna_aplicada.observaciones';
    END
    IF COL_LENGTH(N'dbo.vacuna_aplicada', N'activo') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [activo] [bit] NOT NULL DEFAULT ((1));');
        PRINT N'Columna agregada: vacuna_aplicada.activo';
    END
    IF COL_LENGTH(N'dbo.vacuna_aplicada', N'fecha_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysutcdatetime());');
        PRINT N'Columna agregada: vacuna_aplicada.fecha_creacion';
    END
    IF COL_LENGTH(N'dbo.vacuna_aplicada', N'fecha_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [fecha_modificacion] [datetime2](7) NULL;');
        PRINT N'Columna agregada: vacuna_aplicada.fecha_modificacion';
    END
    IF COL_LENGTH(N'dbo.vacuna_aplicada', N'id_usuario_creacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [id_usuario_creacion] [bigint] NULL;');
        PRINT N'Columna agregada: vacuna_aplicada.id_usuario_creacion';
    END
    IF COL_LENGTH(N'dbo.vacuna_aplicada', N'id_usuario_modificacion') IS NULL
    BEGIN
        EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD [id_usuario_modificacion] [bigint] NULL;');
        PRINT N'Columna agregada: vacuna_aplicada.id_usuario_modificacion';
    END
END
GO

-- =============================================================================
-- PARTE 2: LLAVES FORÁNEAS — solo si esa columna todavía no tiene una llave
-- hacia esa tabla.
-- =============================================================================

-- administracion_medicamento
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.administracion_medicamento')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medicamento_programado'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.medicamento_programado_hospitalizacion'))
   AND OBJECT_ID(N'dbo.fk_administracion_medicamento_programado', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[administracion_medicamento] ADD CONSTRAINT [fk_administracion_medicamento_programado] FOREIGN KEY ([id_medicamento_programado]) REFERENCES [dbo].[medicamento_programado_hospitalizacion] ([id_medicamento_programado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave administracion_medicamento.id_medicamento_programado -> medicamento_programado_hospitalizacion -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.administracion_medicamento')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_empleado'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
   AND OBJECT_ID(N'dbo.fk_administracion_medicamento_empleado', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[administracion_medicamento] ADD CONSTRAINT [fk_administracion_medicamento_empleado] FOREIGN KEY ([id_empleado]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave administracion_medicamento.id_empleado -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- alertas_stock
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.alertas_stock')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_alerta'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[alertas_stock] ADD FOREIGN KEY ([id_estado_alerta]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave alertas_stock.id_estado_alerta -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.alertas_stock')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_item_inventario'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.items_inventario'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[alertas_stock] ADD FOREIGN KEY ([id_item_inventario]) REFERENCES [dbo].[items_inventario] ([id_item_inventario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave alertas_stock.id_item_inventario -> items_inventario -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- aseguradoras
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.aseguradoras')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_entidad'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD FOREIGN KEY ([id_tipo_entidad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave aseguradoras.id_tipo_entidad -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.aseguradoras')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave aseguradoras.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.aseguradoras')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[aseguradoras] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave aseguradoras.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- bitacora_auditoria
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.bitacora_auditoria')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_accion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD FOREIGN KEY ([id_tipo_accion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave bitacora_auditoria.id_tipo_accion -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.bitacora_auditoria')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[bitacora_auditoria] ADD FOREIGN KEY ([id_usuario]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave bitacora_auditoria.id_usuario -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- camas
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.camas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_cama'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[camas] ADD FOREIGN KEY ([id_estado_cama]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave camas.id_estado_cama -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.camas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_habitacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.habitaciones'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[camas] ADD FOREIGN KEY ([id_habitacion]) REFERENCES [dbo].[habitaciones] ([id_habitacion]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave camas.id_habitacion -> habitaciones -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- casos_emergencia
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.casos_emergencia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_caso'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD FOREIGN KEY ([id_estado_caso]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave casos_emergencia.id_estado_caso -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.casos_emergencia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave casos_emergencia.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.casos_emergencia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_nivel_triage'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD FOREIGN KEY ([id_nivel_triage]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave casos_emergencia.id_nivel_triage -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.casos_emergencia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave casos_emergencia.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.casos_emergencia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave casos_emergencia.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.casos_emergencia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave casos_emergencia.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.casos_emergencia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_caso_emergencia_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD CONSTRAINT [fk_caso_emergencia_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave casos_emergencia.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.casos_emergencia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_sala'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.salas'))
   AND OBJECT_ID(N'dbo.fk_caso_emergencia_sala', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[casos_emergencia] ADD CONSTRAINT [fk_caso_emergencia_sala] FOREIGN KEY ([id_sala]) REFERENCES [dbo].[salas] ([id_sala]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave casos_emergencia.id_sala -> salas -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- cat_tipo_catalogo
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.cat_tipo_catalogo')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave cat_tipo_catalogo.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.cat_tipo_catalogo')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[cat_tipo_catalogo] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave cat_tipo_catalogo.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- cat_valor_catalogo
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_catalogo'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_tipo_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD FOREIGN KEY ([id_tipo_catalogo]) REFERENCES [dbo].[cat_tipo_catalogo] ([id_tipo_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave cat_valor_catalogo.id_tipo_catalogo -> cat_tipo_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave cat_valor_catalogo.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[cat_valor_catalogo] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave cat_valor_catalogo.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- citas
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_especialidad'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.especialidades'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_especialidad]) REFERENCES [dbo].[especialidades] ([id_especialidad]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas.id_especialidad -> especialidades -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_estado_cita]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas.id_estado_cita -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_motivo_cancelacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_motivo_cancelacion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas.id_motivo_cancelacion -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_poliza'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.polizas_seguro'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_poliza]) REFERENCES [dbo].[polizas_seguro] ([id_poliza]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas.id_poliza -> polizas_seguro -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_sala'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.salas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_sala]) REFERENCES [dbo].[salas] ([id_sala]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas.id_sala -> salas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_operacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
   AND OBJECT_ID(N'dbo.fk_citas_tipo_operacion', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas] ADD CONSTRAINT [fk_citas_tipo_operacion] FOREIGN KEY ([id_tipo_operacion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas.id_tipo_operacion -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- citas_historial
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas_historial')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas_historial.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas_historial')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_anterior'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD FOREIGN KEY ([id_estado_anterior]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas_historial.id_estado_anterior -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas_historial')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_nuevo'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD FOREIGN KEY ([id_estado_nuevo]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas_historial.id_estado_nuevo -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.citas_historial')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[citas_historial] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave citas_historial.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- consentimientos_informados
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.consentimientos_informados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_consentimiento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_estado_consentimiento]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave consentimientos_informados.id_estado_consentimiento -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.consentimientos_informados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico_responsable'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_medico_responsable]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave consentimientos_informados.id_medico_responsable -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.consentimientos_informados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave consentimientos_informados.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.consentimientos_informados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_parentesco_responsable'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_parentesco_responsable]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave consentimientos_informados.id_parentesco_responsable -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.consentimientos_informados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_testigo'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_testigo]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave consentimientos_informados.id_testigo -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.consentimientos_informados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_consentimiento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.tipos_consentimiento'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_tipo_consentimiento]) REFERENCES [dbo].[tipos_consentimiento] ([id_tipo_consentimiento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave consentimientos_informados.id_tipo_consentimiento -> tipos_consentimiento -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.consentimientos_informados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tratamiento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.tratamientos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_tratamiento]) REFERENCES [dbo].[tratamientos] ([id_tratamiento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave consentimientos_informados.id_tratamiento -> tratamientos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.consentimientos_informados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave consentimientos_informados.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.consentimientos_informados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave consentimientos_informados.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- constancia_medica
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.constancia_medica')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_constancia_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD CONSTRAINT [fk_constancia_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave constancia_medica.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.constancia_medica')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
   AND OBJECT_ID(N'dbo.fk_constancia_paciente', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD CONSTRAINT [fk_constancia_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave constancia_medica.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.constancia_medica')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
   AND OBJECT_ID(N'dbo.fk_constancia_medico', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[constancia_medica] ADD CONSTRAINT [fk_constancia_medico] FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave constancia_medica.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- control_signos_consulta
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.control_signos_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_control_signos_consulta_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD CONSTRAINT [fk_control_signos_consulta_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave control_signos_consulta.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.control_signos_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
   AND OBJECT_ID(N'dbo.fk_control_signos_consulta_paciente', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[control_signos_consulta] ADD CONSTRAINT [fk_control_signos_consulta_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave control_signos_consulta.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- control_signos_hospitalizacion
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.control_signos_hospitalizacion')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_hospitalizacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.hospitalizaciones'))
   AND OBJECT_ID(N'dbo.fk_control_signos_hosp', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[control_signos_hospitalizacion] ADD CONSTRAINT [fk_control_signos_hosp] FOREIGN KEY ([id_hospitalizacion]) REFERENCES [dbo].[hospitalizaciones] ([id_hospitalizacion]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave control_signos_hospitalizacion.id_hospitalizacion -> hospitalizaciones -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- convenio_cobertura
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.convenio_cobertura')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_convenio'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.convenios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[convenio_cobertura] ADD FOREIGN KEY ([id_convenio]) REFERENCES [dbo].[convenios] ([id_convenio]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave convenio_cobertura.id_convenio -> convenios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.convenio_cobertura')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_item'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[convenio_cobertura] ADD FOREIGN KEY ([id_tipo_item]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave convenio_cobertura.id_tipo_item -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- convenios
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.convenios')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_aseguradora'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.aseguradoras'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[convenios] ADD FOREIGN KEY ([id_aseguradora]) REFERENCES [dbo].[aseguradoras] ([id_aseguradora]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave convenios.id_aseguradora -> aseguradoras -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.convenios')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_convenio'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[convenios] ADD FOREIGN KEY ([id_estado_convenio]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave convenios.id_estado_convenio -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.convenios')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[convenios] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave convenios.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.convenios')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[convenios] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave convenios.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- costo_paciente_consulta
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.costo_paciente_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_costo_paciente_consulta_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD CONSTRAINT [fk_costo_paciente_consulta_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave costo_paciente_consulta.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.costo_paciente_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
   AND OBJECT_ID(N'dbo.fk_costo_paciente_consulta_paciente', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD CONSTRAINT [fk_costo_paciente_consulta_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave costo_paciente_consulta.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.costo_paciente_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medicamento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.medicamentos'))
   AND OBJECT_ID(N'dbo.fk_costo_paciente_consulta_medicamento', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD CONSTRAINT [fk_costo_paciente_consulta_medicamento] FOREIGN KEY ([id_medicamento]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave costo_paciente_consulta.id_medicamento -> medicamentos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.costo_paciente_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_servicio'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.servicios'))
   AND OBJECT_ID(N'dbo.fk_costo_paciente_consulta_servicio', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_consulta] ADD CONSTRAINT [fk_costo_paciente_consulta_servicio] FOREIGN KEY ([id_servicio]) REFERENCES [dbo].[servicios] ([id_servicio]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave costo_paciente_consulta.id_servicio -> servicios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- costo_paciente_hospitalizacion
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.costo_paciente_hospitalizacion')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_hospitalizacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.hospitalizaciones'))
   AND OBJECT_ID(N'dbo.fk_costo_paciente_hosp', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD CONSTRAINT [fk_costo_paciente_hosp] FOREIGN KEY ([id_hospitalizacion]) REFERENCES [dbo].[hospitalizaciones] ([id_hospitalizacion]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave costo_paciente_hospitalizacion.id_hospitalizacion -> hospitalizaciones -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.costo_paciente_hospitalizacion')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medicamento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.medicamentos'))
   AND OBJECT_ID(N'dbo.fk_costo_paciente_medicamento', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD CONSTRAINT [fk_costo_paciente_medicamento] FOREIGN KEY ([id_medicamento]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave costo_paciente_hospitalizacion.id_medicamento -> medicamentos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.costo_paciente_hospitalizacion')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_servicio'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.servicios'))
   AND OBJECT_ID(N'dbo.fk_costo_paciente_hospitalizacion_servicio', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[costo_paciente_hospitalizacion] ADD CONSTRAINT [fk_costo_paciente_hospitalizacion_servicio] FOREIGN KEY ([id_servicio]) REFERENCES [dbo].[servicios] ([id_servicio]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave costo_paciente_hospitalizacion.id_servicio -> servicios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- cuentas_por_cobrar
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.cuentas_por_cobrar')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_cxc'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD FOREIGN KEY ([id_estado_cxc]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave cuentas_por_cobrar.id_estado_cxc -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.cuentas_por_cobrar')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_factura'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.facturas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD FOREIGN KEY ([id_factura]) REFERENCES [dbo].[facturas] ([id_factura]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave cuentas_por_cobrar.id_factura -> facturas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.cuentas_por_cobrar')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[cuentas_por_cobrar] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave cuentas_por_cobrar.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- disponibilidad_medico
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.disponibilidad_medico')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_dia_semana'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD FOREIGN KEY ([id_dia_semana]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave disponibilidad_medico.id_dia_semana -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.disponibilidad_medico')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave disponibilidad_medico.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.disponibilidad_medico')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave disponibilidad_medico.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.disponibilidad_medico')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[disponibilidad_medico] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave disponibilidad_medico.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- empleados
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.empleados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_especialidad'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.especialidades'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_especialidad]) REFERENCES [dbo].[especialidades] ([id_especialidad]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave empleados.id_especialidad -> especialidades -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.empleados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_empleado'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_estado_empleado]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave empleados.id_estado_empleado -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.empleados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_genero'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_genero]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave empleados.id_genero -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.empleados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_puesto'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.puestos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_puesto]) REFERENCES [dbo].[puestos] ([id_puesto]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave empleados.id_puesto -> puestos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.empleados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_documento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_tipo_documento]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave empleados.id_tipo_documento -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.empleados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave empleados.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.empleados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave empleados.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- especialidades
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.especialidades')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[especialidades] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave especialidades.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.especialidades')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[especialidades] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave especialidades.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- factura_detalle
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.factura_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave factura_detalle.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.factura_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_factura'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.facturas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD FOREIGN KEY ([id_factura]) REFERENCES [dbo].[facturas] ([id_factura]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave factura_detalle.id_factura -> facturas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.factura_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medicamento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.medicamentos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD FOREIGN KEY ([id_medicamento]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave factura_detalle.id_medicamento -> medicamentos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.factura_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_item'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD FOREIGN KEY ([id_tipo_item]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave factura_detalle.id_tipo_item -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.factura_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tratamiento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.tratamientos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD FOREIGN KEY ([id_tratamiento]) REFERENCES [dbo].[tratamientos] ([id_tratamiento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave factura_detalle.id_tratamiento -> tratamientos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.factura_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_receta_detalle'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.receta_detalle'))
   AND OBJECT_ID(N'dbo.fk_factura_detalle_receta_detalle', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD CONSTRAINT [fk_factura_detalle_receta_detalle] FOREIGN KEY ([id_receta_detalle]) REFERENCES [dbo].[receta_detalle] ([id_receta_detalle]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave factura_detalle.id_receta_detalle -> receta_detalle -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.factura_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_orden_detalle'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.orden_detalle'))
   AND OBJECT_ID(N'dbo.fk_factura_detalle_orden_detalle', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD CONSTRAINT [fk_factura_detalle_orden_detalle] FOREIGN KEY ([id_orden_detalle]) REFERENCES [dbo].[orden_detalle] ([id_orden_detalle]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave factura_detalle.id_orden_detalle -> orden_detalle -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.factura_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_costo_paciente_consulta'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.costo_paciente_consulta'))
   AND OBJECT_ID(N'dbo.fk_factura_detalle_costo_consulta', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD CONSTRAINT [fk_factura_detalle_costo_consulta] FOREIGN KEY ([id_costo_paciente_consulta]) REFERENCES [dbo].[costo_paciente_consulta] ([id_costo_paciente_consulta]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave factura_detalle.id_costo_paciente_consulta -> costo_paciente_consulta -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.factura_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_costo_paciente_hospitalizacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.costo_paciente_hospitalizacion'))
   AND OBJECT_ID(N'dbo.fk_factura_detalle_costo_hospitalizacion', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[factura_detalle] ADD CONSTRAINT [fk_factura_detalle_costo_hospitalizacion] FOREIGN KEY ([id_costo_paciente_hospitalizacion]) REFERENCES [dbo].[costo_paciente_hospitalizacion] ([id_costo_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave factura_detalle.id_costo_paciente_hospitalizacion -> costo_paciente_hospitalizacion -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- facturas
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.facturas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_factura'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD FOREIGN KEY ([id_estado_factura]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave facturas.id_estado_factura -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.facturas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave facturas.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.facturas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_poliza'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.polizas_seguro'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD FOREIGN KEY ([id_poliza]) REFERENCES [dbo].[polizas_seguro] ([id_poliza]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave facturas.id_poliza -> polizas_seguro -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.facturas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_documento_fiscal'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD FOREIGN KEY ([id_tipo_documento_fiscal]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave facturas.id_tipo_documento_fiscal -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.facturas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave facturas.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.facturas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave facturas.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.facturas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_convenio'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.convenios'))
   AND OBJECT_ID(N'dbo.fk_facturas_convenio', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD CONSTRAINT [fk_facturas_convenio] FOREIGN KEY ([id_convenio]) REFERENCES [dbo].[convenios] ([id_convenio]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave facturas.id_convenio -> convenios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.facturas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_facturas_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD CONSTRAINT [fk_facturas_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave facturas.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.facturas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_hospitalizacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.hospitalizaciones'))
   AND OBJECT_ID(N'dbo.fk_facturas_hospitalizacion', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[facturas] ADD CONSTRAINT [fk_facturas_hospitalizacion] FOREIGN KEY ([id_hospitalizacion]) REFERENCES [dbo].[hospitalizaciones] ([id_hospitalizacion]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave facturas.id_hospitalizacion -> hospitalizaciones -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- ficha_clinica_general
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ficha_clinica_general')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_ficha_cg_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD CONSTRAINT [fk_ficha_cg_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ficha_clinica_general.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ficha_clinica_general')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
   AND OBJECT_ID(N'dbo.fk_ficha_cg_paciente', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD CONSTRAINT [fk_ficha_cg_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ficha_clinica_general.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ficha_clinica_general')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
   AND OBJECT_ID(N'dbo.fk_ficha_cg_medico', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ficha_clinica_general] ADD CONSTRAINT [fk_ficha_cg_medico] FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ficha_clinica_general.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- ficha_consulta_externa
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ficha_consulta_externa')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_ficha_ce_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD CONSTRAINT [fk_ficha_ce_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ficha_consulta_externa.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ficha_consulta_externa')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
   AND OBJECT_ID(N'dbo.fk_ficha_ce_paciente', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD CONSTRAINT [fk_ficha_ce_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ficha_consulta_externa.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ficha_consulta_externa')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
   AND OBJECT_ID(N'dbo.fk_ficha_ce_medico', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa] ADD CONSTRAINT [fk_ficha_ce_medico] FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ficha_consulta_externa.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- ficha_consulta_externa_pediatrica
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ficha_consulta_externa_pediatrica')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_ficha_cep_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD CONSTRAINT [fk_ficha_cep_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ficha_consulta_externa_pediatrica.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ficha_consulta_externa_pediatrica')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
   AND OBJECT_ID(N'dbo.fk_ficha_cep_paciente', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD CONSTRAINT [fk_ficha_cep_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ficha_consulta_externa_pediatrica.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ficha_consulta_externa_pediatrica')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
   AND OBJECT_ID(N'dbo.fk_ficha_cep_medico', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ficha_consulta_externa_pediatrica] ADD CONSTRAINT [fk_ficha_cep_medico] FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ficha_consulta_externa_pediatrica.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- habitaciones
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.habitaciones')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_habitacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD FOREIGN KEY ([id_estado_habitacion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave habitaciones.id_estado_habitacion -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.habitaciones')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_habitacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[habitaciones] ADD FOREIGN KEY ([id_tipo_habitacion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave habitaciones.id_tipo_habitacion -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- historial_clinico
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.historial_clinico')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave historial_clinico.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.historial_clinico')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave historial_clinico.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.historial_clinico')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_nivel_confidencialidad'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_nivel_confidencialidad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave historial_clinico.id_nivel_confidencialidad -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.historial_clinico')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave historial_clinico.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.historial_clinico')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_registro'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_tipo_registro]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave historial_clinico.id_tipo_registro -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.historial_clinico')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tratamiento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.tratamientos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_tratamiento]) REFERENCES [dbo].[tratamientos] ([id_tratamiento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave historial_clinico.id_tratamiento -> tratamientos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.historial_clinico')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave historial_clinico.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.historial_clinico')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave historial_clinico.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- hospitalizaciones
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.hospitalizaciones')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cama'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.camas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD FOREIGN KEY ([id_cama]) REFERENCES [dbo].[camas] ([id_cama]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave hospitalizaciones.id_cama -> camas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.hospitalizaciones')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_hospitalizacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD FOREIGN KEY ([id_estado_hospitalizacion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave hospitalizaciones.id_estado_hospitalizacion -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.hospitalizaciones')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico_responsable'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD FOREIGN KEY ([id_medico_responsable]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave hospitalizaciones.id_medico_responsable -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.hospitalizaciones')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave hospitalizaciones.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.hospitalizaciones')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave hospitalizaciones.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.hospitalizaciones')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave hospitalizaciones.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.hospitalizaciones')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_hospitalizaciones_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[hospitalizaciones] ADD CONSTRAINT [fk_hospitalizaciones_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave hospitalizaciones.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- interaccion_medicamentos
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.interaccion_medicamentos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medicamento_1'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.medicamentos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD FOREIGN KEY ([id_medicamento_1]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave interaccion_medicamentos.id_medicamento_1 -> medicamentos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.interaccion_medicamentos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medicamento_2'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.medicamentos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD FOREIGN KEY ([id_medicamento_2]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave interaccion_medicamentos.id_medicamento_2 -> medicamentos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.interaccion_medicamentos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_nivel_severidad'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[interaccion_medicamentos] ADD FOREIGN KEY ([id_nivel_severidad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave interaccion_medicamentos.id_nivel_severidad -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- items_inventario
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.items_inventario')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_item'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_estado_item]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave items_inventario.id_estado_item -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.items_inventario')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medicamento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.medicamentos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_medicamento]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave items_inventario.id_medicamento -> medicamentos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.items_inventario')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_proveedor'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.proveedores'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_proveedor]) REFERENCES [dbo].[proveedores] ([id_proveedor]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave items_inventario.id_proveedor -> proveedores -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.items_inventario')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_item'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_tipo_item]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave items_inventario.id_tipo_item -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.items_inventario')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_unidad_medida'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_unidad_medida]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave items_inventario.id_unidad_medida -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.items_inventario')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave items_inventario.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.items_inventario')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave items_inventario.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- libro_actas
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.libro_actas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
   AND OBJECT_ID(N'dbo.FK_libro_actas_paciente', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD CONSTRAINT [FK_libro_actas_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave libro_actas.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.libro_actas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_atendido_por'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
   AND OBJECT_ID(N'dbo.FK_libro_actas_atendido_por', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD CONSTRAINT [FK_libro_actas_atendido_por] FOREIGN KEY ([id_atendido_por]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave libro_actas.id_atendido_por -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.libro_actas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
   AND OBJECT_ID(N'dbo.FK_libro_actas_usuario_creacion', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD CONSTRAINT [FK_libro_actas_usuario_creacion] FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave libro_actas.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.libro_actas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
   AND OBJECT_ID(N'dbo.FK_libro_actas_usuario_modificacion', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD CONSTRAINT [FK_libro_actas_usuario_modificacion] FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave libro_actas.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.libro_actas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_libro_actas_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[libro_actas] ADD CONSTRAINT [fk_libro_actas_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave libro_actas.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- medicamento_programado_hospitalizacion
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.medicamento_programado_hospitalizacion')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_hospitalizacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.hospitalizaciones'))
   AND OBJECT_ID(N'dbo.fk_medicamento_programado_hosp', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD CONSTRAINT [fk_medicamento_programado_hosp] FOREIGN KEY ([id_hospitalizacion]) REFERENCES [dbo].[hospitalizaciones] ([id_hospitalizacion]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave medicamento_programado_hospitalizacion.id_hospitalizacion -> hospitalizaciones -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.medicamento_programado_hospitalizacion')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medicamento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.medicamentos'))
   AND OBJECT_ID(N'dbo.fk_medicamento_programado_medicamento', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[medicamento_programado_hospitalizacion] ADD CONSTRAINT [fk_medicamento_programado_medicamento] FOREIGN KEY ([id_medicamento]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave medicamento_programado_hospitalizacion.id_medicamento -> medicamentos -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- medicamentos
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.medicamentos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_categoria_medicamento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD FOREIGN KEY ([id_categoria_medicamento]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave medicamentos.id_categoria_medicamento -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.medicamentos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave medicamentos.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.medicamentos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[medicamentos] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave medicamentos.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- movimientos_inventario
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.movimientos_inventario')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_item_inventario'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.items_inventario'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD FOREIGN KEY ([id_item_inventario]) REFERENCES [dbo].[items_inventario] ([id_item_inventario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave movimientos_inventario.id_item_inventario -> items_inventario -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.movimientos_inventario')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_movimiento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD FOREIGN KEY ([id_tipo_movimiento]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave movimientos_inventario.id_tipo_movimiento -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.movimientos_inventario')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tratamiento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.tratamientos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD FOREIGN KEY ([id_tratamiento]) REFERENCES [dbo].[tratamientos] ([id_tratamiento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave movimientos_inventario.id_tratamiento -> tratamientos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.movimientos_inventario')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[movimientos_inventario] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave movimientos_inventario.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- nota_enfermeria_consulta
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.nota_enfermeria_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_nota_enfermeria_consulta_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD CONSTRAINT [fk_nota_enfermeria_consulta_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave nota_enfermeria_consulta.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.nota_enfermeria_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
   AND OBJECT_ID(N'dbo.fk_nota_enfermeria_consulta_paciente', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD CONSTRAINT [fk_nota_enfermeria_consulta_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave nota_enfermeria_consulta.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.nota_enfermeria_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_empleado'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
   AND OBJECT_ID(N'dbo.fk_nota_enfermeria_consulta_empleado', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[nota_enfermeria_consulta] ADD CONSTRAINT [fk_nota_enfermeria_consulta_empleado] FOREIGN KEY ([id_empleado]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave nota_enfermeria_consulta.id_empleado -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- nota_evolucion_consulta
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.nota_evolucion_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_nota_evolucion_consulta_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD CONSTRAINT [fk_nota_evolucion_consulta_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave nota_evolucion_consulta.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.nota_evolucion_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
   AND OBJECT_ID(N'dbo.fk_nota_evolucion_consulta_paciente', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD CONSTRAINT [fk_nota_evolucion_consulta_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave nota_evolucion_consulta.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.nota_evolucion_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
   AND OBJECT_ID(N'dbo.fk_nota_evolucion_consulta_medico', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_consulta] ADD CONSTRAINT [fk_nota_evolucion_consulta_medico] FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave nota_evolucion_consulta.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- nota_evolucion_hospitalizacion
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.nota_evolucion_hospitalizacion')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_hospitalizacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.hospitalizaciones'))
   AND OBJECT_ID(N'dbo.fk_nota_evolucion_hosp_hospitalizacion', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD CONSTRAINT [fk_nota_evolucion_hosp_hospitalizacion] FOREIGN KEY ([id_hospitalizacion]) REFERENCES [dbo].[hospitalizaciones] ([id_hospitalizacion]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave nota_evolucion_hospitalizacion.id_hospitalizacion -> hospitalizaciones -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.nota_evolucion_hospitalizacion')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
   AND OBJECT_ID(N'dbo.fk_nota_evolucion_hosp_medico', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[nota_evolucion_hospitalizacion] ADD CONSTRAINT [fk_nota_evolucion_hosp_medico] FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave nota_evolucion_hospitalizacion.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- notas_credito
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.notas_credito')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_nota_credito'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD FOREIGN KEY ([id_estado_nota_credito]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave notas_credito.id_estado_nota_credito -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.notas_credito')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_factura_original'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.facturas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD FOREIGN KEY ([id_factura_original]) REFERENCES [dbo].[facturas] ([id_factura]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave notas_credito.id_factura_original -> facturas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.notas_credito')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_motivo'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD FOREIGN KEY ([id_motivo]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave notas_credito.id_motivo -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.notas_credito')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave notas_credito.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.notas_credito')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[notas_credito] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave notas_credito.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- notas_enfermeria
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.notas_enfermeria')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_empleado'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[notas_enfermeria] ADD FOREIGN KEY ([id_empleado]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave notas_enfermeria.id_empleado -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.notas_enfermeria')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_hospitalizacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.hospitalizaciones'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[notas_enfermeria] ADD FOREIGN KEY ([id_hospitalizacion]) REFERENCES [dbo].[hospitalizaciones] ([id_hospitalizacion]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave notas_enfermeria.id_hospitalizacion -> hospitalizaciones -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- orden_detalle
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.orden_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_orden'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.ordenes_laboratorio'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[orden_detalle] ADD FOREIGN KEY ([id_orden]) REFERENCES [dbo].[ordenes_laboratorio] ([id_orden]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave orden_detalle.id_orden -> ordenes_laboratorio -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.orden_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_examen'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.tipos_examen'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[orden_detalle] ADD FOREIGN KEY ([id_tipo_examen]) REFERENCES [dbo].[tipos_examen] ([id_tipo_examen]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave orden_detalle.id_tipo_examen -> tipos_examen -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- orden_medica_consulta
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.orden_medica_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_orden_medica_consulta_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD CONSTRAINT [fk_orden_medica_consulta_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave orden_medica_consulta.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.orden_medica_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
   AND OBJECT_ID(N'dbo.fk_orden_medica_consulta_paciente', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD CONSTRAINT [fk_orden_medica_consulta_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave orden_medica_consulta.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.orden_medica_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
   AND OBJECT_ID(N'dbo.fk_orden_medica_consulta_medico', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD CONSTRAINT [fk_orden_medica_consulta_medico] FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave orden_medica_consulta.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.orden_medica_consulta')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_orden'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
   AND OBJECT_ID(N'dbo.fk_orden_medica_consulta_tipo', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[orden_medica_consulta] ADD CONSTRAINT [fk_orden_medica_consulta_tipo] FOREIGN KEY ([id_tipo_orden]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave orden_medica_consulta.id_tipo_orden -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- ordenes_laboratorio
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ordenes_laboratorio')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ordenes_laboratorio.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ordenes_laboratorio')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_orden'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_estado_orden]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ordenes_laboratorio.id_estado_orden -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ordenes_laboratorio')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ordenes_laboratorio.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ordenes_laboratorio')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ordenes_laboratorio.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ordenes_laboratorio')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_prioridad'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_prioridad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ordenes_laboratorio.id_prioridad -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ordenes_laboratorio')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ordenes_laboratorio.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ordenes_laboratorio')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ordenes_laboratorio.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- ordenes_medicas_hospitalizacion
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ordenes_medicas_hospitalizacion')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_hospitalizacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.hospitalizaciones'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD FOREIGN KEY ([id_hospitalizacion]) REFERENCES [dbo].[hospitalizaciones] ([id_hospitalizacion]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ordenes_medicas_hospitalizacion.id_hospitalizacion -> hospitalizaciones -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ordenes_medicas_hospitalizacion')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ordenes_medicas_hospitalizacion.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.ordenes_medicas_hospitalizacion')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_orden'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD FOREIGN KEY ([id_tipo_orden]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave ordenes_medicas_hospitalizacion.id_tipo_orden -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- paciente_alergia
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_alergia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_alergia.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_alergia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_severidad'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD FOREIGN KEY ([id_severidad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_alergia.id_severidad -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_alergia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_alergia'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD FOREIGN KEY ([id_tipo_alergia]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_alergia.id_tipo_alergia -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_alergia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_alergia.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_alergia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_alergia] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_alergia.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- paciente_antecedente
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_antecedente')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_antecedente.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_antecedente')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_antecedente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD FOREIGN KEY ([id_tipo_antecedente]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_antecedente.id_tipo_antecedente -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_antecedente')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_antecedente.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_antecedente')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_antecedente] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_antecedente.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- paciente_contacto_emergencia
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_contacto_emergencia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_contacto_emergencia.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_contacto_emergencia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_parentesco'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD FOREIGN KEY ([id_parentesco]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_contacto_emergencia.id_parentesco -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_contacto_emergencia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_contacto_emergencia.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_contacto_emergencia')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_contacto_emergencia.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- paciente_convenio
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_convenio')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_convenio'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.convenios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD FOREIGN KEY ([id_convenio]) REFERENCES [dbo].[convenios] ([id_convenio]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_convenio.id_convenio -> convenios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_convenio')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_afiliacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD FOREIGN KEY ([id_estado_afiliacion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_convenio.id_estado_afiliacion -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.paciente_convenio')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[paciente_convenio] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave paciente_convenio.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- pacientes
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pacientes')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_civil'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_estado_civil]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pacientes.id_estado_civil -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pacientes')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_estado_paciente]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pacientes.id_estado_paciente -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pacientes')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_genero'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_genero]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pacientes.id_genero -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pacientes')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_nivel_confidencialidad'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_nivel_confidencialidad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pacientes.id_nivel_confidencialidad -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pacientes')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_documento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_tipo_documento]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pacientes.id_tipo_documento -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pacientes')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_sangre'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_tipo_sangre]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pacientes.id_tipo_sangre -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pacientes')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pacientes.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pacientes')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pacientes.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- pagos
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pagos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_pago'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD FOREIGN KEY ([id_estado_pago]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pagos.id_estado_pago -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pagos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_factura'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.facturas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD FOREIGN KEY ([id_factura]) REFERENCES [dbo].[facturas] ([id_factura]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pagos.id_factura -> facturas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pagos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_forma_pago'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD FOREIGN KEY ([id_forma_pago]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pagos.id_forma_pago -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pagos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pagos.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.pagos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[pagos] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave pagos.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- permisos
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.permisos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_modulo'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[permisos] ADD FOREIGN KEY ([id_modulo]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave permisos.id_modulo -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- polizas_seguro
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.polizas_seguro')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_aseguradora'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.aseguradoras'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_aseguradora]) REFERENCES [dbo].[aseguradoras] ([id_aseguradora]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave polizas_seguro.id_aseguradora -> aseguradoras -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.polizas_seguro')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_convenio'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.convenios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_convenio]) REFERENCES [dbo].[convenios] ([id_convenio]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave polizas_seguro.id_convenio -> convenios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.polizas_seguro')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_poliza'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_estado_poliza]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave polizas_seguro.id_estado_poliza -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.polizas_seguro')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave polizas_seguro.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.polizas_seguro')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_ramo'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_ramo]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave polizas_seguro.id_ramo -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.polizas_seguro')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_titularidad'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_titularidad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave polizas_seguro.id_titularidad -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.polizas_seguro')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave polizas_seguro.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.polizas_seguro')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave polizas_seguro.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- proveedores
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.proveedores')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[proveedores] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave proveedores.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.proveedores')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[proveedores] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave proveedores.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- puestos
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.puestos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[puestos] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave puestos.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.puestos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[puestos] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave puestos.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- receta_detalle
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.receta_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medicamento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.medicamentos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD FOREIGN KEY ([id_medicamento]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave receta_detalle.id_medicamento -> medicamentos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.receta_detalle')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_receta'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.recetas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[receta_detalle] ADD FOREIGN KEY ([id_receta]) REFERENCES [dbo].[recetas] ([id_receta]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave receta_detalle.id_receta -> recetas -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- recetas
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.recetas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_receta'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD FOREIGN KEY ([id_estado_receta]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave recetas.id_estado_receta -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.recetas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave recetas.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.recetas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave recetas.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.recetas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tratamiento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.tratamientos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD FOREIGN KEY ([id_tratamiento]) REFERENCES [dbo].[tratamientos] ([id_tratamiento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave recetas.id_tratamiento -> tratamientos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.recetas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave recetas.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.recetas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave recetas.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.recetas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_receta_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[recetas] ADD CONSTRAINT [fk_receta_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave recetas.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- recordatorios
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.recordatorios')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave recordatorios.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.recordatorios')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_envio'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD FOREIGN KEY ([id_estado_envio]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave recordatorios.id_estado_envio -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.recordatorios')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_recordatorio'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[recordatorios] ADD FOREIGN KEY ([id_tipo_recordatorio]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave recordatorios.id_tipo_recordatorio -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- reportes_generados
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.reportes_generados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_reporte'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[reportes_generados] ADD FOREIGN KEY ([id_tipo_reporte]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave reportes_generados.id_tipo_reporte -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.reportes_generados')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[reportes_generados] ADD FOREIGN KEY ([id_usuario]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave reportes_generados.id_usuario -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- resultados_examen
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.resultados_examen')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_resultado'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD FOREIGN KEY ([id_estado_resultado]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave resultados_examen.id_estado_resultado -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.resultados_examen')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico_valida'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD FOREIGN KEY ([id_medico_valida]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave resultados_examen.id_medico_valida -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.resultados_examen')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_orden_detalle'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.orden_detalle'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD FOREIGN KEY ([id_orden_detalle]) REFERENCES [dbo].[orden_detalle] ([id_orden_detalle]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave resultados_examen.id_orden_detalle -> orden_detalle -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.resultados_examen')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave resultados_examen.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.resultados_examen')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[resultados_examen] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave resultados_examen.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- rol_permiso
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.rol_permiso')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_permiso'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.permisos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[rol_permiso] ADD FOREIGN KEY ([id_permiso]) REFERENCES [dbo].[permisos] ([id_permiso]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave rol_permiso.id_permiso -> permisos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.rol_permiso')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_rol'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.roles'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[rol_permiso] ADD FOREIGN KEY ([id_rol]) REFERENCES [dbo].[roles] ([id_rol]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave rol_permiso.id_rol -> roles -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- roles
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.roles')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[roles] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave roles.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.roles')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[roles] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave roles.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- salas
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.salas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_sala'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[salas] ADD FOREIGN KEY ([id_estado_sala]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave salas.id_estado_sala -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.salas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_sala'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[salas] ADD FOREIGN KEY ([id_tipo_sala]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave salas.id_tipo_sala -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.salas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[salas] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave salas.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.salas')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[salas] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave salas.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- tipos_examen
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.tipos_examen')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_categoria_examen'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[tipos_examen] ADD FOREIGN KEY ([id_categoria_examen]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave tipos_examen.id_categoria_examen -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- tratamiento_seguimiento
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.tratamiento_seguimiento')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave tratamiento_seguimiento.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.tratamiento_seguimiento')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tratamiento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.tratamientos'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD FOREIGN KEY ([id_tratamiento]) REFERENCES [dbo].[tratamientos] ([id_tratamiento]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave tratamiento_seguimiento.id_tratamiento -> tratamientos -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.tratamiento_seguimiento')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave tratamiento_seguimiento.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.tratamiento_seguimiento')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[tratamiento_seguimiento] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave tratamiento_seguimiento.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- tratamientos
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.tratamientos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave tratamientos.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.tratamientos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_tratamiento'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD FOREIGN KEY ([id_estado_tratamiento]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave tratamientos.id_estado_tratamiento -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.tratamientos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_medico'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave tratamientos.id_medico -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.tratamientos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave tratamientos.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.tratamientos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave tratamientos.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.tratamientos')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[tratamientos] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave tratamientos.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- usuario_rol
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.usuario_rol')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_rol'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.roles'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[usuario_rol] ADD FOREIGN KEY ([id_rol]) REFERENCES [dbo].[roles] ([id_rol]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave usuario_rol.id_rol -> roles -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.usuario_rol')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[usuario_rol] ADD FOREIGN KEY ([id_usuario]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave usuario_rol.id_usuario -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- usuarios
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.usuarios')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_empleado'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD FOREIGN KEY ([id_empleado]) REFERENCES [dbo].[empleados] ([id_empleado]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave usuarios.id_empleado -> empleados -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.usuarios')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_estado_usuario'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD FOREIGN KEY ([id_estado_usuario]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave usuarios.id_estado_usuario -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.usuarios')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_creacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave usuarios.id_usuario_creacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.usuarios')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_usuario_modificacion'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[usuarios] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave usuarios.id_usuario_modificacion -> usuarios -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- vacuna_aplicada
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.vacuna_aplicada')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_cita'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.citas'))
   AND OBJECT_ID(N'dbo.fk_vacuna_aplicada_cita', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD CONSTRAINT [fk_vacuna_aplicada_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave vacuna_aplicada.id_cita -> citas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.vacuna_aplicada')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_paciente'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.pacientes'))
   AND OBJECT_ID(N'dbo.fk_vacuna_aplicada_paciente', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD CONSTRAINT [fk_vacuna_aplicada_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave vacuna_aplicada.id_paciente -> pacientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.foreign_key_columns fkc
               WHERE fkc.parent_object_id = OBJECT_ID(N'dbo.vacuna_aplicada')
                 AND COL_NAME(fkc.parent_object_id, fkc.parent_column_id) = N'id_tipo_vacuna'
                 AND fkc.referenced_object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
   AND OBJECT_ID(N'dbo.fk_vacuna_aplicada_tipo', N'F') IS NULL
BEGIN
    BEGIN TRY
        EXEC(N'ALTER TABLE [dbo].[vacuna_aplicada] ADD CONSTRAINT [fk_vacuna_aplicada_tipo] FOREIGN KEY ([id_tipo_vacuna]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear la llave vacuna_aplicada.id_tipo_vacuna -> cat_valor_catalogo -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- =============================================================================
-- PARTE 3: ÍNDICES — solo si no existe uno con ese nombre en esa tabla.
-- =============================================================================

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_alertas_stock_item' AND object_id = OBJECT_ID(N'dbo.alertas_stock'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_alertas_stock_item] ON [dbo].[alertas_stock] ([id_item_inventario] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_alertas_stock_item -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_bitacora_tabla_registro' AND object_id = OBJECT_ID(N'dbo.bitacora_auditoria'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_bitacora_tabla_registro] ON [dbo].[bitacora_auditoria] ([tabla_afectada] ASC, [id_registro_afectado] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_bitacora_tabla_registro -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_bitacora_usuario_fecha' AND object_id = OBJECT_ID(N'dbo.bitacora_auditoria'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_bitacora_usuario_fecha] ON [dbo].[bitacora_auditoria] ([id_usuario] ASC, [fecha_hora] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_bitacora_usuario_fecha -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_camas_habitacion' AND object_id = OBJECT_ID(N'dbo.camas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_camas_habitacion] ON [dbo].[camas] ([id_habitacion] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_camas_habitacion -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_casos_emergencia_estado' AND object_id = OBJECT_ID(N'dbo.casos_emergencia'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_casos_emergencia_estado] ON [dbo].[casos_emergencia] ([id_estado_caso] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_casos_emergencia_estado -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_casos_emergencia_llegada' AND object_id = OBJECT_ID(N'dbo.casos_emergencia'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_casos_emergencia_llegada] ON [dbo].[casos_emergencia] ([hora_llegada] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_casos_emergencia_llegada -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_casos_emergencia_paciente' AND object_id = OBJECT_ID(N'dbo.casos_emergencia'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_casos_emergencia_paciente] ON [dbo].[casos_emergencia] ([id_paciente] ASC) WHERE ([id_paciente] IS NOT NULL);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_casos_emergencia_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_cat_valor_tipo' AND object_id = OBJECT_ID(N'dbo.cat_valor_catalogo'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_cat_valor_tipo] ON [dbo].[cat_valor_catalogo] ([id_tipo_catalogo] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_cat_valor_tipo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_citas_activo' AND object_id = OBJECT_ID(N'dbo.citas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_citas_activo] ON [dbo].[citas] ([activo] ASC) WHERE ([activo]=(1));');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_citas_activo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_citas_estado' AND object_id = OBJECT_ID(N'dbo.citas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_citas_estado] ON [dbo].[citas] ([id_estado_cita] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_citas_estado -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_citas_medico_fecha' AND object_id = OBJECT_ID(N'dbo.citas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_citas_medico_fecha] ON [dbo].[citas] ([id_medico] ASC, [fecha_hora_inicio] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_citas_medico_fecha -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_citas_paciente' AND object_id = OBJECT_ID(N'dbo.citas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_citas_paciente] ON [dbo].[citas] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_citas_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_citas_poliza' AND object_id = OBJECT_ID(N'dbo.citas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_citas_poliza] ON [dbo].[citas] ([id_poliza] ASC) WHERE ([id_poliza] IS NOT NULL);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_citas_poliza -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_citas_historial_cita' AND object_id = OBJECT_ID(N'dbo.citas_historial'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_citas_historial_cita] ON [dbo].[citas_historial] ([id_cita] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_citas_historial_cita -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_consentimientos_paciente' AND object_id = OBJECT_ID(N'dbo.consentimientos_informados'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_consentimientos_paciente] ON [dbo].[consentimientos_informados] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_consentimientos_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_convenios_aseguradora' AND object_id = OBJECT_ID(N'dbo.convenios'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_convenios_aseguradora] ON [dbo].[convenios] ([id_aseguradora] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_convenios_aseguradora -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_cxc_estado' AND object_id = OBJECT_ID(N'dbo.cuentas_por_cobrar'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_cxc_estado] ON [dbo].[cuentas_por_cobrar] ([id_estado_cxc] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_cxc_estado -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_cxc_paciente' AND object_id = OBJECT_ID(N'dbo.cuentas_por_cobrar'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_cxc_paciente] ON [dbo].[cuentas_por_cobrar] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_cxc_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_disponibilidad_medico' AND object_id = OBJECT_ID(N'dbo.disponibilidad_medico'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_disponibilidad_medico] ON [dbo].[disponibilidad_medico] ([id_medico] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_disponibilidad_medico -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_empleados_activo' AND object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_empleados_activo] ON [dbo].[empleados] ([activo] ASC) WHERE ([activo]=(1));');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_empleados_activo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_empleados_especialidad' AND object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_empleados_especialidad] ON [dbo].[empleados] ([id_especialidad] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_empleados_especialidad -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_empleados_puesto' AND object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_empleados_puesto] ON [dbo].[empleados] ([id_puesto] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_empleados_puesto -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_empleados_documento' AND object_id = OBJECT_ID(N'dbo.empleados'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE UNIQUE NONCLUSTERED INDEX [ux_empleados_documento] ON [dbo].[empleados] ([id_tipo_documento] ASC, [numero_documento] ASC) WHERE ([numero_documento] IS NOT NULL);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ux_empleados_documento -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_factura_detalle_factura' AND object_id = OBJECT_ID(N'dbo.factura_detalle'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_factura_detalle_factura] ON [dbo].[factura_detalle] ([id_factura] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_factura_detalle_factura -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_facturas_activo' AND object_id = OBJECT_ID(N'dbo.facturas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_facturas_activo] ON [dbo].[facturas] ([activo] ASC) WHERE ([activo]=(1));');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_facturas_activo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_facturas_estado' AND object_id = OBJECT_ID(N'dbo.facturas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_facturas_estado] ON [dbo].[facturas] ([id_estado_factura] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_facturas_estado -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_facturas_paciente' AND object_id = OBJECT_ID(N'dbo.facturas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_facturas_paciente] ON [dbo].[facturas] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_facturas_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_facturas_poliza' AND object_id = OBJECT_ID(N'dbo.facturas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_facturas_poliza] ON [dbo].[facturas] ([id_poliza] ASC) WHERE ([id_poliza] IS NOT NULL);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_facturas_poliza -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_historial_paciente_fecha' AND object_id = OBJECT_ID(N'dbo.historial_clinico'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_historial_paciente_fecha] ON [dbo].[historial_clinico] ([id_paciente] ASC, [fecha] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_historial_paciente_fecha -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_hospitalizaciones_activas' AND object_id = OBJECT_ID(N'dbo.hospitalizaciones'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_hospitalizaciones_activas] ON [dbo].[hospitalizaciones] ([id_cama] ASC) WHERE ([fecha_egreso] IS NULL);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_hospitalizaciones_activas -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_hospitalizaciones_paciente' AND object_id = OBJECT_ID(N'dbo.hospitalizaciones'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_hospitalizaciones_paciente] ON [dbo].[hospitalizaciones] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_hospitalizaciones_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_items_inventario_bajo_stock' AND object_id = OBJECT_ID(N'dbo.items_inventario'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_items_inventario_bajo_stock] ON [dbo].[items_inventario] ([bajo_stock] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_items_inventario_bajo_stock -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_items_inventario_tipo' AND object_id = OBJECT_ID(N'dbo.items_inventario'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_items_inventario_tipo] ON [dbo].[items_inventario] ([id_tipo_item] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_items_inventario_tipo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_movimientos_item_fecha' AND object_id = OBJECT_ID(N'dbo.movimientos_inventario'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_movimientos_item_fecha] ON [dbo].[movimientos_inventario] ([id_item_inventario] ASC, [fecha_movimiento] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_movimientos_item_fecha -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_notas_credito_factura' AND object_id = OBJECT_ID(N'dbo.notas_credito'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_notas_credito_factura] ON [dbo].[notas_credito] ([id_factura_original] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_notas_credito_factura -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_notas_enfermeria_hosp' AND object_id = OBJECT_ID(N'dbo.notas_enfermeria'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_notas_enfermeria_hosp] ON [dbo].[notas_enfermeria] ([id_hospitalizacion] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_notas_enfermeria_hosp -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_orden_detalle_orden' AND object_id = OBJECT_ID(N'dbo.orden_detalle'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_orden_detalle_orden] ON [dbo].[orden_detalle] ([id_orden] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_orden_detalle_orden -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_ordenes_lab_paciente' AND object_id = OBJECT_ID(N'dbo.ordenes_laboratorio'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_ordenes_lab_paciente] ON [dbo].[ordenes_laboratorio] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_ordenes_lab_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_ordenes_medicas_hosp' AND object_id = OBJECT_ID(N'dbo.ordenes_medicas_hospitalizacion'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_ordenes_medicas_hosp] ON [dbo].[ordenes_medicas_hospitalizacion] ([id_hospitalizacion] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_ordenes_medicas_hosp -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_alergia_paciente' AND object_id = OBJECT_ID(N'dbo.paciente_alergia'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_alergia_paciente] ON [dbo].[paciente_alergia] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_alergia_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_antecedente_paciente' AND object_id = OBJECT_ID(N'dbo.paciente_antecedente'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_antecedente_paciente] ON [dbo].[paciente_antecedente] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_antecedente_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_contacto_emergencia_paciente' AND object_id = OBJECT_ID(N'dbo.paciente_contacto_emergencia'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_contacto_emergencia_paciente] ON [dbo].[paciente_contacto_emergencia] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_contacto_emergencia_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_paciente_convenio_paciente' AND object_id = OBJECT_ID(N'dbo.paciente_convenio'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_paciente_convenio_paciente] ON [dbo].[paciente_convenio] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_paciente_convenio_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_pacientes_activo' AND object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_pacientes_activo] ON [dbo].[pacientes] ([activo] ASC) WHERE ([activo]=(1));');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_pacientes_activo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_pacientes_nombre' AND object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_pacientes_nombre] ON [dbo].[pacientes] ([primer_apellido] ASC, [primer_nombre] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_pacientes_nombre -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_pacientes_documento' AND object_id = OBJECT_ID(N'dbo.pacientes'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE UNIQUE NONCLUSTERED INDEX [ux_pacientes_documento] ON [dbo].[pacientes] ([id_tipo_documento] ASC, [numero_documento] ASC) WHERE ([numero_documento] IS NOT NULL);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ux_pacientes_documento -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_pagos_factura' AND object_id = OBJECT_ID(N'dbo.pagos'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_pagos_factura] ON [dbo].[pagos] ([id_factura] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_pagos_factura -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_polizas_seguro_aseguradora' AND object_id = OBJECT_ID(N'dbo.polizas_seguro'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_polizas_seguro_aseguradora] ON [dbo].[polizas_seguro] ([id_aseguradora] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_polizas_seguro_aseguradora -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_polizas_seguro_estado' AND object_id = OBJECT_ID(N'dbo.polizas_seguro'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_polizas_seguro_estado] ON [dbo].[polizas_seguro] ([id_estado_poliza] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_polizas_seguro_estado -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_polizas_seguro_paciente' AND object_id = OBJECT_ID(N'dbo.polizas_seguro'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_polizas_seguro_paciente] ON [dbo].[polizas_seguro] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_polizas_seguro_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_polizas_seguro_certificado' AND object_id = OBJECT_ID(N'dbo.polizas_seguro'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE UNIQUE NONCLUSTERED INDEX [ux_polizas_seguro_certificado] ON [dbo].[polizas_seguro] ([id_aseguradora] ASC, [numero_poliza] ASC, [numero_certificado] ASC) WHERE ([numero_certificado] IS NOT NULL);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ux_polizas_seguro_certificado -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_receta_detalle_receta' AND object_id = OBJECT_ID(N'dbo.receta_detalle'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_receta_detalle_receta] ON [dbo].[receta_detalle] ([id_receta] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_receta_detalle_receta -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_recetas_paciente' AND object_id = OBJECT_ID(N'dbo.recetas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_recetas_paciente] ON [dbo].[recetas] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_recetas_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_recordatorios_cita' AND object_id = OBJECT_ID(N'dbo.recordatorios'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_recordatorios_cita] ON [dbo].[recordatorios] ([id_cita] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_recordatorios_cita -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_recordatorios_pendientes' AND object_id = OBJECT_ID(N'dbo.recordatorios'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_recordatorios_pendientes] ON [dbo].[recordatorios] ([fecha_programada] ASC) WHERE ([fecha_envio] IS NULL);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_recordatorios_pendientes -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_resultados_orden_detalle' AND object_id = OBJECT_ID(N'dbo.resultados_examen'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_resultados_orden_detalle] ON [dbo].[resultados_examen] ([id_orden_detalle] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_resultados_orden_detalle -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_seguimiento_tratamiento' AND object_id = OBJECT_ID(N'dbo.tratamiento_seguimiento'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_seguimiento_tratamiento] ON [dbo].[tratamiento_seguimiento] ([id_tratamiento] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_seguimiento_tratamiento -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_tratamientos_estado' AND object_id = OBJECT_ID(N'dbo.tratamientos'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_tratamientos_estado] ON [dbo].[tratamientos] ([id_estado_tratamiento] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_tratamientos_estado -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ix_tratamientos_paciente' AND object_id = OBJECT_ID(N'dbo.tratamientos'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE NONCLUSTERED INDEX [ix_tratamientos_paciente] ON [dbo].[tratamientos] ([id_paciente] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ix_tratamientos_paciente -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_tipos_consentimiento_codigo' AND object_id = OBJECT_ID(N'dbo.tipos_consentimiento'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE UNIQUE NONCLUSTERED INDEX [ux_tipos_consentimiento_codigo] ON [dbo].[tipos_consentimiento] ([codigo] ASC);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ux_tipos_consentimiento_codigo -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_facturas_id_cita' AND object_id = OBJECT_ID(N'dbo.facturas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE UNIQUE NONCLUSTERED INDEX [ux_facturas_id_cita] ON [dbo].[facturas] ([id_cita] ASC) WHERE ([id_cita] IS NOT NULL);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ux_facturas_id_cita -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_libro_actas_id_cita' AND object_id = OBJECT_ID(N'dbo.libro_actas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE UNIQUE NONCLUSTERED INDEX [ux_libro_actas_id_cita] ON [dbo].[libro_actas] ([id_cita] ASC) WHERE ([id_cita] IS NOT NULL);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ux_libro_actas_id_cita -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'uq_facturas_hospitalizacion' AND object_id = OBJECT_ID(N'dbo.facturas'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE UNIQUE NONCLUSTERED INDEX [uq_facturas_hospitalizacion] ON [dbo].[facturas] ([id_hospitalizacion] ASC) WHERE ([id_hospitalizacion] IS NOT NULL);');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice uq_facturas_hospitalizacion -> ' + ERROR_MESSAGE();
    END CATCH
END
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'ux_usuarios_empleado_activo' AND object_id = OBJECT_ID(N'dbo.usuarios'))
BEGIN
    BEGIN TRY
        EXEC(N'CREATE UNIQUE NONCLUSTERED INDEX [ux_usuarios_empleado_activo] ON [dbo].[usuarios] ([id_empleado] ASC) WHERE ([id_empleado] IS NOT NULL AND [activo] = (1));');
    END TRY
    BEGIN CATCH
        PRINT N'AVISO: no se pudo crear el índice ux_usuarios_empleado_activo -> ' + ERROR_MESSAGE();
    END CATCH
END
GO

-- =============================================================================
-- PARTE 4: VISTAS (Reportes y Estadísticas)
-- =============================================================================

CREATE OR ALTER VIEW [dbo].[vw_indicadores_clinicos] AS
SELECT
    DATEFROMPARTS(YEAR(c.fecha_hora_inicio), MONTH(c.fecha_hora_inicio), 1) AS mes,
    cv_estado.codigo                                                        AS estado_cita,
    COUNT(*)                                                                AS total_citas
FROM citas c
JOIN cat_valor_catalogo cv_estado ON cv_estado.id_valor_catalogo = c.id_estado_cita
WHERE c.activo = 1
GROUP BY DATEFROMPARTS(YEAR(c.fecha_hora_inicio), MONTH(c.fecha_hora_inicio), 1), cv_estado.codigo
GO

CREATE OR ALTER VIEW [dbo].[vw_indicadores_financieros] AS
SELECT
    DATEFROMPARTS(YEAR(f.fecha_emision), MONTH(f.fecha_emision), 1) AS mes,
    cv_estado.codigo                                                 AS estado_factura,
    SUM(f.total)                                                     AS monto_total,
    COUNT(*)                                                         AS cantidad_facturas
FROM facturas f
JOIN cat_valor_catalogo cv_estado ON cv_estado.id_valor_catalogo = f.id_estado_factura
WHERE f.activo = 1
GROUP BY DATEFROMPARTS(YEAR(f.fecha_emision), MONTH(f.fecha_emision), 1), cv_estado.codigo
GO

-- Descripciones de tablas (extended properties)
IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE name = N'MS_Description' AND major_id = OBJECT_ID(N'dbo.bitacora_auditoria') AND minor_id = 0)
    EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Trazabilidad genérica de cambios. Se alimenta desde la capa de aplicación o desde triggers por tabla si se requiere auditoría automática total.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'bitacora_auditoria';
IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE name = N'MS_Description' AND major_id = OBJECT_ID(N'dbo.casos_emergencia') AND minor_id = 0)
    EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Caso de atención prioritaria en la sala de emergencias (triaje). Puede no tener paciente registrado todavía (walk-in): en ese caso se usa nombre_paciente en vez de id_paciente.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'casos_emergencia';
IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE name = N'MS_Description' AND major_id = OBJECT_ID(N'dbo.cat_tipo_catalogo') AND minor_id = 0)
    EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Agrupa cada familia de catálogo (ESTADO_CITA, TIPO_DOCUMENTO, etc.)' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'cat_tipo_catalogo';
IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE name = N'MS_Description' AND major_id = OBJECT_ID(N'dbo.cat_valor_catalogo') AND minor_id = 0)
    EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Valores de cada catálogo. Referenciada por casi todo el esquema.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'cat_valor_catalogo';
IF NOT EXISTS (SELECT 1 FROM sys.extended_properties WHERE name = N'MS_Description' AND major_id = OBJECT_ID(N'dbo.polizas_seguro') AND minor_id = 0)
    EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Póliza/certificado de seguro médico de un paciente.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'polizas_seguro';
GO

-- =============================================================================
-- PARTE 5: CATÁLOGOS (cat_tipo_catalogo / cat_valor_catalogo)
-- Unión de sembrar_catalogos.sql, categorizar_tipos_catalogo.sql,
-- sembrar_tipo_reporte.sql, sembrar_tipo_consentimiento_compromiso_pago.sql,
-- sembrar_tipo_consulta.sql, motor_consultas_schema.sql y los catálogos que
-- solo existían creados a mano (ver 00_instalacion_completa.sql, PARTE 9).
-- Solo se insertan los tipos/valores cuyo código no existe todavía.
-- =============================================================================
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @Tipo TABLE (n INT IDENTITY(1,1), codigo NVARCHAR(50), nombre NVARCHAR(150), modulo NVARCHAR(50), descripcion NVARCHAR(255));
INSERT INTO @Tipo (codigo, nombre, modulo, descripcion) VALUES
 ('TIPO_ITEM_INVENTARIO',       N'Tipo de item de inventario',       'FARMACIA', NULL),
 ('TIPO_MOVIMIENTO_INVENTARIO', N'Tipo de movimiento de inventario', 'FARMACIA', NULL),
 ('ESTADO_PAGO',                N'Estado de pago',                   'FACTURACION_COBROS', NULL),
 ('ESTADO_FACTURA',             N'Estado de factura',                'FACTURACION_COBROS', NULL),
 ('ESTADO_CXC',                 N'Estado de cuenta por cobrar',      'FACTURACION_COBROS', NULL),
 ('ESTADO_ALERTA_STOCK',        N'Estado de alerta de stock',        'FARMACIA', NULL),
 ('MODULO_SISTEMA',             N'Módulo del sistema',               'GENERAL', NULL),
 ('CATEGORIA_EXAMEN',           N'Categoría de examen',              'LABORATORIO', NULL),
 ('TIPO_ENTIDAD_ASEGURADORA',   N'Tipo de entidad aseguradora',      'SEGUROS_MEDICOS', NULL),
 ('TIPO_HABITACION',            N'Tipo de habitación',               'HOSPITALIZACION', NULL),
 ('ESTADO_HABITACION',          N'Estado de habitación',             'HOSPITALIZACION', NULL),
 ('ESTADO_CAMA',                N'Estado de cama',                   'HOSPITALIZACION', NULL),
 ('FORMA_PAGO',                 N'Forma de pago',                    'FACTURACION_COBROS', NULL),
 ('UNIDAD_MEDIDA',              N'Unidad de medida',                 'FARMACIA', NULL),
 ('ESTADO_ITEM_INVENTARIO',     N'Estado de item de inventario',     'FARMACIA', NULL),
 ('ESTADO_RECETA',              N'Estado de receta',                 'FARMACIA', NULL),
 ('CATEGORIA_MEDICAMENTO',      N'Categoría de medicamento',         'FARMACIA', NULL),
 ('ESTADO_CONVENIO',            N'Estado de convenio',               'SEGUROS_MEDICOS', NULL),
 ('ESTADO_EMPLEADO',            N'Estado de empleado',               'MANTENIMIENTO', NULL),
 ('ESTADO_USUARIO',             N'Estado de usuario',                'MANTENIMIENTO', NULL),
 ('GENERO',                     N'Género',                           'RECEPCION', NULL),
 ('TIPO_DOCUMENTO',             N'Tipo de documento',                'RECEPCION', NULL),
 ('TIPO_ITEM_FACTURA',          N'Tipo de ítem de factura',          'FACTURACION_COBROS', NULL),
 ('TIPO_SALA',                  N'Tipo de sala',                     'GENERAL', NULL),
 ('ESTADO_SALA',                N'Estado de sala',                   'GENERAL', NULL),
 ('SEVERIDAD',                  N'Nivel de severidad',               'RECEPCION', NULL),
 ('TIPO_ACCION_AUDITORIA',      N'Tipo de acción de auditoría',      'MANTENIMIENTO', NULL),
 ('ESTADO_CIVIL',               N'Estado civil',                     'RECEPCION', NULL),
 ('TIPO_SANGRE',                N'Tipo de sangre',                   'RECEPCION', NULL),
 ('NIVEL_CONFIDENCIALIDAD',     N'Nivel de confidencialidad',        'RECEPCION', NULL),
 ('ESTADO_PACIENTE',            N'Estado del paciente',              'RECEPCION', NULL),
 ('PARENTESCO',                 N'Parentesco',                       'RECEPCION', NULL),
 ('TIPO_ALERGIA',               N'Tipo de alergia',                  'RECEPCION', NULL),
 ('TIPO_ANTECEDENTE',           N'Tipo de antecedente',              'RECEPCION', NULL),
 ('ESTADO_CITA',                N'Estado de cita',                   'RECEPCION', NULL),
 ('MOTIVO_CANCELACION',         N'Motivo de cancelación',            'RECEPCION', NULL),
 ('DIA_SEMANA',                 N'Día de la semana',                 'RECEPCION', NULL),
 ('TIPO_RECORDATORIO',          N'Tipo de recordatorio',             'RECEPCION', NULL),
 ('ESTADO_ENVIO',               N'Estado de envío',                  'RECEPCION', NULL),
 ('TIPO_CONSULTA',              N'Tipo de consulta',                 'RECEPCION', NULL),
 ('RAMO_SEGURO',                N'Ramo de seguro',                   'SEGUROS_MEDICOS', NULL),
 ('TITULARIDAD_POLIZA',         N'Titularidad de póliza',            'SEGUROS_MEDICOS', NULL),
 ('ESTADO_POLIZA',              N'Estado de póliza',                 'SEGUROS_MEDICOS', NULL),
 ('TIPO_ENTIDAD_CONVENIO',      N'Tipo de entidad de convenio',      'SEGUROS_MEDICOS', NULL),
 ('ESTADO_AFILIACION',          N'Estado de afiliación',             'SEGUROS_MEDICOS', NULL),
 ('TIPO_REGISTRO_CLINICO',      N'Tipo de registro clínico',         'EXPEDIENTES_CLINICOS', NULL),
 ('ESTADO_TRATAMIENTO',         N'Estado de tratamiento',            'EXPEDIENTES_CLINICOS', NULL),
 ('TIPO_REPORTE',               N'Tipo de reporte',                  'REPORTES', N'Reportes e indicadores disponibles en el módulo de Reportes y Estadísticas'),
 ('TIPO_CONSENTIMIENTO',        N'Tipo de consentimiento',           'EMERGENCIAS', NULL),
 ('ESTADO_CONSENTIMIENTO',      N'Estado de consentimiento',         'EMERGENCIAS', NULL),
 ('ESTADO_ORDEN_LABORATORIO',   N'Estado de orden de laboratorio',   'LABORATORIO', NULL),
 ('PRIORIDAD_ORDEN',            N'Prioridad de orden',               'LABORATORIO', NULL),
 ('ESTADO_HOSPITALIZACION',     N'Estado de hospitalización',        'HOSPITALIZACION', NULL),
 ('TIPO_ORDEN_HOSPITALIZACION', N'Tipo de orden de hospitalización', 'HOSPITALIZACION', NULL),
 ('TIPO_DOCUMENTO_FISCAL',      N'Tipo de documento fiscal',         'FACTURACION_COBROS', NULL),
 ('NIVEL_TRIAGE',               N'Nivel de triage',                  'EMERGENCIAS', NULL),
 ('ESTADO_CASO_EMERGENCIA',     N'Estado de caso de emergencia',     'EMERGENCIAS', NULL),
 -- Exacto: InventarioFarmaciaService.cs busca "ESTADO_ALERTA" (sin _STOCK).
 ('ESTADO_ALERTA',              N'Estado de alerta',                 'FARMACIA', NULL),
 -- Solo el tipo, sin valores: el equipo clínico los agrega desde Mantenimiento.
 ('TIPO_OPERACION',             N'Tipo de operación',                'HOSPITALIZACION', NULL),
 ('ESTADO_RESULTADO',           N'Estado del resultado de examen',   'LABORATORIO', NULL),
 -- agregar_toxico_y_vacunas.sql: solo el tipo, sin valores (se agregan desde Mantenimiento).
 ('TIPO_VACUNA',                N'Tipo de vacuna',                   'EXPEDIENTES_CLINICOS', NULL),
 -- agregar_destino_medicamento.sql
 ('DESTINO_MEDICAMENTO',        N'Destino del medicamento',          'FARMACIA', NULL);

-- Solo los tipos cuyo código todavía no existe.
INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, descripcion, codigo_modulo)
SELECT t.codigo, t.nombre, t.descripcion, t.modulo FROM @Tipo t
WHERE NOT EXISTS (SELECT 1 FROM dbo.cat_tipo_catalogo c WHERE c.codigo = t.codigo)
ORDER BY t.n;
PRINT N'Tipos de catálogo agregados: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

-- A los tipos que ya existían sin módulo, se les pone el suyo.
UPDATE c SET c.codigo_modulo = t.modulo
FROM dbo.cat_tipo_catalogo c JOIN @Tipo t ON t.codigo = c.codigo
WHERE c.codigo_modulo IS NULL;

DECLARE @Valor TABLE (n INT IDENTITY(1,1), tipo NVARCHAR(50), codigo NVARCHAR(50), nombre NVARCHAR(150), orden SMALLINT, descripcion NVARCHAR(255) NULL);
INSERT INTO @Valor (tipo, codigo, nombre, orden, descripcion) VALUES
 ('TIPO_ITEM_INVENTARIO','MEDICAMENTO',N'Medicamento',1,NULL),
 ('TIPO_ITEM_INVENTARIO','INSUMO',N'Insumo',2,NULL),

 ('TIPO_MOVIMIENTO_INVENTARIO','ENTRADA',N'Entrada',1,NULL),
 ('TIPO_MOVIMIENTO_INVENTARIO','SALIDA',N'Salida',2,NULL),
 ('TIPO_MOVIMIENTO_INVENTARIO','AJUSTE',N'Ajuste',3,NULL),
 ('TIPO_MOVIMIENTO_INVENTARIO','MERMA',N'Merma',4,NULL),

 ('ESTADO_PAGO','APLICADO',N'Aplicado',1,NULL),
 ('ESTADO_PAGO','ANULADO',N'Anulado',2,NULL),

 ('ESTADO_FACTURA','EMITIDA',N'Emitida',1,NULL),
 ('ESTADO_FACTURA','PAGADA',N'Pagada',2,NULL),
 ('ESTADO_FACTURA','ANULADA',N'Anulada',3,NULL),
 ('ESTADO_FACTURA','PENDIENTE',N'Pendiente',4,NULL),

 ('ESTADO_CXC','PENDIENTE',N'Pendiente',1,NULL),
 ('ESTADO_CXC','SALDADA',N'Saldada',2,NULL),

 ('ESTADO_ALERTA_STOCK','PENDIENTE',N'Pendiente',1,NULL),
 ('ESTADO_ALERTA_STOCK','ATENDIDA',N'Atendida',2,NULL),

 ('MODULO_SISTEMA','RECEPCION',N'Recepción',1,NULL),
 ('MODULO_SISTEMA','SEGUROS_MEDICOS',N'Seguros Médicos',2,NULL),
 ('MODULO_SISTEMA','EXPEDIENTES_CLINICOS',N'Expedientes Clínicos',3,NULL),
 ('MODULO_SISTEMA','LABORATORIO',N'Laboratorio y Diagnóstico',4,NULL),
 ('MODULO_SISTEMA','EMERGENCIAS',N'Emergencias',5,NULL),
 ('MODULO_SISTEMA','HOSPITALIZACION',N'Hospitalización',6,NULL),
 ('MODULO_SISTEMA','FARMACIA',N'Farmacia',7,NULL),
 ('MODULO_SISTEMA','FACTURACION_COBROS',N'Facturación y Cobros',8,NULL),
 ('MODULO_SISTEMA','MANTENIMIENTO',N'Mantenimiento',9,NULL),

 ('CATEGORIA_EXAMEN','LABORATORIO',N'Laboratorio',1,NULL),
 ('CATEGORIA_EXAMEN','IMAGEN_DIAGNOSTICO',N'Imagen / Diagnóstico',2,NULL),

 ('TIPO_ENTIDAD_ASEGURADORA','ASEGURADORA',N'Aseguradora',1,NULL),
 ('TIPO_ENTIDAD_ASEGURADORA','MUTUALIDAD',N'Mutualidad',2,NULL),
 ('TIPO_ENTIDAD_ASEGURADORA','COOPERATIVA',N'Cooperativa',3,NULL),

 ('TIPO_HABITACION','INDIVIDUAL',N'Individual',1,NULL),
 ('TIPO_HABITACION','COMPARTIDA',N'Compartida',2,NULL),
 ('TIPO_HABITACION','UCI',N'UCI',3,NULL),

 ('ESTADO_HABITACION','DISPONIBLE',N'Disponible',1,NULL),
 ('ESTADO_HABITACION','OCUPADA',N'Ocupada',2,NULL),
 ('ESTADO_HABITACION','LIMPIEZA',N'En limpieza',3,NULL),
 ('ESTADO_HABITACION','MANTENIMIENTO',N'En mantenimiento',4,NULL),

 -- Exacto: CamasService.cs y el frontend solo reconocen LIBRE (no DISPONIBLE).
 ('ESTADO_CAMA','LIBRE',N'Disponible',1,NULL),
 ('ESTADO_CAMA','OCUPADA',N'Ocupada',2,NULL),
 ('ESTADO_CAMA','MANTENIMIENTO',N'En mantenimiento',3,NULL),

 ('FORMA_PAGO','EFECTIVO',N'Efectivo',1,NULL),
 ('FORMA_PAGO','TARJETA',N'Tarjeta',2,NULL),
 ('FORMA_PAGO','TRANSFERENCIA',N'Transferencia',3,NULL),
 ('FORMA_PAGO','CHEQUE',N'Cheque',4,NULL),
 ('FORMA_PAGO','DEPOSITO',N'Depósito',5,NULL),

 ('UNIDAD_MEDIDA','UNIDAD',N'Unidad',1,NULL),
 ('UNIDAD_MEDIDA','CAJA',N'Caja',2,NULL),
 ('UNIDAD_MEDIDA','FRASCO',N'Frasco',3,NULL),

 ('ESTADO_ITEM_INVENTARIO','DISPONIBLE',N'Disponible',1,NULL),
 ('ESTADO_ITEM_INVENTARIO','AGOTADO',N'Agotado',2,NULL),
 ('ESTADO_ITEM_INVENTARIO','DESCONTINUADO',N'Descontinuado',3,NULL),

 ('ESTADO_RECETA','EMITIDA',N'Emitida',1,NULL),
 ('ESTADO_RECETA','SURTIDA',N'Surtida',2,NULL),
 ('ESTADO_RECETA','CANCELADA',N'Cancelada',3,NULL),

 ('CATEGORIA_MEDICAMENTO','ANALGESICO',N'Analgésico',1,NULL),
 ('CATEGORIA_MEDICAMENTO','ANTIBIOTICO',N'Antibiótico',2,NULL),
 ('CATEGORIA_MEDICAMENTO','ANTIINFLAMATORIO',N'Antiinflamatorio',3,NULL),
 ('CATEGORIA_MEDICAMENTO','ANTIALERGICO',N'Antialérgico',4,NULL),
 ('CATEGORIA_MEDICAMENTO','GASTROINTESTINAL',N'Gastrointestinal',5,NULL),
 ('CATEGORIA_MEDICAMENTO','OTRO',N'Otro',6,NULL),

 ('ESTADO_CONVENIO','VIGENTE',N'Vigente',1,NULL),
 ('ESTADO_CONVENIO','VENCIDO',N'Vencido',2,NULL),
 ('ESTADO_CONVENIO','SUSPENDIDO',N'Suspendido',3,NULL),
 ('ESTADO_CONVENIO','ACTIVO',N'Activo',4,NULL),

 ('ESTADO_EMPLEADO','ACTIVO',N'Activo',1,NULL),
 ('ESTADO_EMPLEADO','INACTIVO',N'Inactivo',2,NULL),
 ('ESTADO_EMPLEADO','SUSPENDIDO',N'Suspendido',3,NULL),

 ('ESTADO_USUARIO','ACTIVO',N'Activo',1,NULL),
 ('ESTADO_USUARIO','BLOQUEADO',N'Bloqueado',2,NULL),
 ('ESTADO_USUARIO','INACTIVO',N'Inactivo',3,NULL),

 ('GENERO','MASCULINO',N'Masculino',1,NULL),
 ('GENERO','FEMENINO',N'Femenino',2,NULL),
 ('GENERO','OTRO',N'Otro',3,NULL),

 ('TIPO_DOCUMENTO','DPI',N'DPI',1,NULL),
 ('TIPO_DOCUMENTO','PASAPORTE',N'Pasaporte',2,NULL),
 ('TIPO_DOCUMENTO','NIT',N'NIT',3,NULL),
 ('TIPO_DOCUMENTO','PARTIDA',N'Partida de nacimiento',4,NULL),

 ('TIPO_ITEM_FACTURA','CONSULTA',N'Consulta',1,NULL),
 ('TIPO_ITEM_FACTURA','TRATAMIENTO',N'Tratamiento',2,NULL),
 ('TIPO_ITEM_FACTURA','MEDICAMENTO',N'Medicamento',3,NULL),
 ('TIPO_ITEM_FACTURA','PROCEDIMIENTO',N'Procedimiento',4,NULL),

 ('TIPO_SALA','CONSULTORIO',N'Consultorio',1,NULL),
 ('TIPO_SALA','QUIROFANO',N'Quirófano',2,NULL),
 ('TIPO_SALA','PROCEDIMIENTOS',N'Sala de procedimientos',3,NULL),
 ('TIPO_SALA','ESPERA',N'Sala de espera',4,NULL),
 ('TIPO_SALA','EMERGENCIA',N'Emergencia',5,NULL),

 ('ESTADO_SALA','DISPONIBLE',N'Disponible',1,NULL),
 ('ESTADO_SALA','OCUPADA',N'Ocupada',2,NULL),
 ('ESTADO_SALA','MANTENIMIENTO',N'En mantenimiento',3,NULL),
 ('ESTADO_SALA','FUERA_SERVICIO',N'Fuera de servicio',4,NULL),

 ('SEVERIDAD','LEVE',N'Leve',1,NULL),
 ('SEVERIDAD','MODERADA',N'Moderada',2,NULL),
 ('SEVERIDAD','SEVERA',N'Severa',3,NULL),

 ('TIPO_ACCION_AUDITORIA','CREAR',N'Crear',1,NULL),
 ('TIPO_ACCION_AUDITORIA','MODIFICAR',N'Modificar',2,NULL),
 ('TIPO_ACCION_AUDITORIA','ELIMINAR_LOGICO',N'Eliminar (baja lógica)',3,NULL),

 ('ESTADO_CIVIL','SOLTERO',N'Soltero/a',1,NULL),
 ('ESTADO_CIVIL','CASADO',N'Casado/a',2,NULL),
 ('ESTADO_CIVIL','DIVORCIADO',N'Divorciado/a',3,NULL),
 ('ESTADO_CIVIL','VIUDO',N'Viudo/a',4,NULL),
 ('ESTADO_CIVIL','UNION',N'Unión de hecho',5,NULL),

 ('TIPO_SANGRE','O_POS',N'O+',1,NULL),
 ('TIPO_SANGRE','O_NEG',N'O-',2,NULL),
 ('TIPO_SANGRE','A_POS',N'A+',3,NULL),
 ('TIPO_SANGRE','A_NEG',N'A-',4,NULL),
 ('TIPO_SANGRE','B_POS',N'B+',5,NULL),
 ('TIPO_SANGRE','B_NEG',N'B-',6,NULL),
 ('TIPO_SANGRE','AB_POS',N'AB+',7,NULL),
 ('TIPO_SANGRE','AB_NEG',N'AB-',8,NULL),

 ('NIVEL_CONFIDENCIALIDAD','NORMAL',N'Normal',1,NULL),
 ('NIVEL_CONFIDENCIALIDAD','RESERVADO',N'Reservado',2,NULL),
 ('NIVEL_CONFIDENCIALIDAD','CONFIDENCIAL',N'Confidencial',3,NULL),

 ('ESTADO_PACIENTE','ACTIVO',N'Activo',1,NULL),
 ('ESTADO_PACIENTE','INACTIVO',N'Inactivo',2,NULL),
 ('ESTADO_PACIENTE','FALLECIDO',N'Fallecido',3,NULL),

 ('PARENTESCO','PADRE',N'Padre',1,NULL),
 ('PARENTESCO','MADRE',N'Madre',2,NULL),
 ('PARENTESCO','CONYUGE',N'Cónyuge',3,NULL),
 ('PARENTESCO','HIJO',N'Hijo/a',4,NULL),
 ('PARENTESCO','HERMANO',N'Hermano/a',5,NULL),
 ('PARENTESCO','OTRO',N'Otro',6,NULL),

 ('TIPO_ALERGIA','MEDICAMENTO',N'Medicamento',1,NULL),
 ('TIPO_ALERGIA','ALIMENTO',N'Alimento',2,NULL),
 ('TIPO_ALERGIA','AMBIENTAL',N'Ambiental',3,NULL),

 ('TIPO_ANTECEDENTE','PERSONAL',N'Personal',1,NULL),
 ('TIPO_ANTECEDENTE','FAMILIAR',N'Familiar',2,NULL),
 ('TIPO_ANTECEDENTE','QUIRURGICO',N'Quirúrgico',3,NULL),

 ('ESTADO_CITA','PROGRAMADA',N'Programada',1,NULL),
 ('ESTADO_CITA','CONFIRMADA',N'Confirmada',2,NULL),
 ('ESTADO_CITA','EN_ATENCION',N'En atención',3,NULL),
 ('ESTADO_CITA','ATENDIDA',N'Atendida',4,NULL),
 ('ESTADO_CITA','CANCELADA',N'Cancelada',5,NULL),

 ('MOTIVO_CANCELACION','SOLICITUD_PACIENTE',N'Solicitud del paciente',1,NULL),
 ('MOTIVO_CANCELACION','AUSENCIA_MEDICO',N'Ausencia del médico',2,NULL),
 ('MOTIVO_CANCELACION','NO_SE_PRESENTO',N'Paciente no se presentó',3,NULL),
 ('MOTIVO_CANCELACION','OTRO',N'Otro',4,NULL),

 ('DIA_SEMANA','LUNES',N'Lunes',1,NULL),
 ('DIA_SEMANA','MARTES',N'Martes',2,NULL),
 ('DIA_SEMANA','MIERCOLES',N'Miércoles',3,NULL),
 ('DIA_SEMANA','JUEVES',N'Jueves',4,NULL),
 ('DIA_SEMANA','VIERNES',N'Viernes',5,NULL),
 ('DIA_SEMANA','SABADO',N'Sábado',6,NULL),
 ('DIA_SEMANA','DOMINGO',N'Domingo',7,NULL),

 ('TIPO_RECORDATORIO','SMS',N'SMS',1,NULL),
 ('TIPO_RECORDATORIO','EMAIL',N'Correo electrónico',2,NULL),
 ('TIPO_RECORDATORIO','LLAMADA',N'Llamada',3,NULL),

 ('ESTADO_ENVIO','PENDIENTE',N'Pendiente',1,NULL),
 ('ESTADO_ENVIO','ENVIADO',N'Enviado',2,NULL),
 ('ESTADO_ENVIO','FALLIDO',N'Fallido',3,NULL),

 ('TIPO_CONSULTA','PRIMERA_VEZ',N'Primera vez',1,NULL),
 ('TIPO_CONSULTA','RECONSULTA',N'Reconsulta',2,NULL),

 ('RAMO_SEGURO','GASTOS_MAYORES',N'Gastos médicos mayores',1,NULL),
 ('RAMO_SEGURO','GASTOS_MENORES',N'Gastos médicos menores',2,NULL),
 ('RAMO_SEGURO','HOSPITALARIO',N'Hospitalario',3,NULL),
 ('RAMO_SEGURO','CORPORATIVO',N'Corporativo',4,NULL),

 ('TITULARIDAD_POLIZA','TITULAR',N'Titular',1,NULL),
 ('TITULARIDAD_POLIZA','DEPENDIENTE',N'Dependiente',2,NULL),

 ('ESTADO_POLIZA','VIGENTE',N'Vigente',1,NULL),
 ('ESTADO_POLIZA','VENCIDA',N'Vencida',2,NULL),
 ('ESTADO_POLIZA','SUSPENDIDA',N'Suspendida',3,NULL),

 ('TIPO_ENTIDAD_CONVENIO','ASEGURADORA',N'Aseguradora',1,NULL),
 ('TIPO_ENTIDAD_CONVENIO','EMPRESA',N'Empresa',2,NULL),

 ('ESTADO_AFILIACION','ACTIVA',N'Activa',1,NULL),
 ('ESTADO_AFILIACION','INACTIVA',N'Inactiva',2,NULL),
 ('ESTADO_AFILIACION','SUSPENDIDA',N'Suspendida',3,NULL),

 ('TIPO_REGISTRO_CLINICO','FICHA_PEDIATRICA',N'Ficha de consulta pediátrica',1,NULL),
 ('TIPO_REGISTRO_CLINICO','FICHA_EXTERNA',N'Ficha de consulta externa',2,NULL),
 ('TIPO_REGISTRO_CLINICO','INGRESADO',N'Expediente de paciente ingresado',3,NULL),
 ('TIPO_REGISTRO_CLINICO','EVOLUCION',N'Evolución y signos vitales',4,NULL),

 ('ESTADO_TRATAMIENTO','EN_CURSO',N'En curso',1,NULL),
 ('ESTADO_TRATAMIENTO','FINALIZADO',N'Finalizado',2,NULL),
 ('ESTADO_TRATAMIENTO','SUSPENDIDO',N'Suspendido',3,NULL),

 ('MODULO_SISTEMA','GENERAL',N'General',10,NULL),
 ('MODULO_SISTEMA','REPORTES',N'Reportes y Estadísticas',11,NULL),

 ('TIPO_REPORTE','INDICADORES_CLINICOS',N'Indicadores clínicos',1,N'Citas por mes y estado (vw_indicadores_clinicos)'),
 ('TIPO_REPORTE','INDICADORES_FINANCIEROS',N'Indicadores financieros',2,N'Facturación por mes y estado (vw_indicadores_financieros)'),

 -- Exacto: Emergencias -> Hoja de compromiso de pago.
 ('TIPO_CONSENTIMIENTO','COMPROMISO_PAGO',N'Compromiso de pago',1,N'Consentimiento de compromiso de pago (Emergencias)'),
 ('ESTADO_CONSENTIMIENTO','FIRMADO',N'Firmado',1,NULL),
 ('ESTADO_CONSENTIMIENTO','REVOCADO',N'Revocado',2,NULL),

 -- Exacto: orden-formulario.ts valida transiciones con estos 5 códigos.
 ('ESTADO_ORDEN_LABORATORIO','PENDIENTE',N'Solicitada',1,NULL),
 ('ESTADO_ORDEN_LABORATORIO','EN_PROCESO',N'En proceso',2,NULL),
 ('ESTADO_ORDEN_LABORATORIO','COMPLETADA',N'Completada',3,NULL),
 ('ESTADO_ORDEN_LABORATORIO','CANCELADA',N'Cancelada',4,NULL),
 ('ESTADO_ORDEN_LABORATORIO','RECHAZADA',N'Rechazada',5,NULL),

 ('PRIORIDAD_ORDEN','NORMAL',N'Normal',1,NULL),
 ('PRIORIDAD_ORDEN','URGENTE',N'Urgente',2,NULL),

 -- Exacto: CamasService.cs y HospitalizacionesService.cs exigen ACTIVA.
 ('ESTADO_HOSPITALIZACION','ACTIVA',N'Activa',1,NULL),
 ('ESTADO_HOSPITALIZACION','ALTA',N'Alta',2,NULL),
 ('ESTADO_HOSPITALIZACION','TRASLADADA',N'Trasladada',3,NULL),

 ('TIPO_ORDEN_HOSPITALIZACION','MEDICA',N'Médica',1,NULL),
 ('TIPO_ORDEN_HOSPITALIZACION','ENFERMERIA',N'Enfermería',2,NULL),

 -- El frontend y el backend asumen que el primer valor (id más bajo) es Factura.
 ('TIPO_DOCUMENTO_FISCAL','FACTURA',N'Factura',1,NULL),
 ('TIPO_DOCUMENTO_FISCAL','NOTA_CREDITO',N'Nota de crédito',2,NULL),

 ('NIVEL_TRIAGE','ROJO',N'Rojo — crítico / resucitación',1,NULL),
 ('NIVEL_TRIAGE','AMARILLO',N'Amarillo — urgente',2,NULL),
 ('NIVEL_TRIAGE','VERDE',N'Verde — menos urgente',3,NULL),
 ('NIVEL_TRIAGE','NEGRO',N'Negro — fallecido',4,NULL),

 ('ESTADO_CASO_EMERGENCIA','EN_ESPERA',N'En espera',1,NULL),
 ('ESTADO_CASO_EMERGENCIA','EN_ATENCION',N'En atención',2,NULL),
 ('ESTADO_CASO_EMERGENCIA','ATENDIDO',N'Atendido',3,NULL),
 ('ESTADO_CASO_EMERGENCIA','REFERIDO',N'Referido a otro centro',4,NULL),
 ('ESTADO_CASO_EMERGENCIA','CANCELADO',N'Cancelado',5,NULL),

 ('ESTADO_ALERTA','PENDIENTE',N'Pendiente',1,NULL),
 ('ESTADO_ALERTA','ATENDIDA',N'Atendida',2,NULL),

 ('ESTADO_RESULTADO','PRELIMINAR',N'Preliminar',1,NULL),
 ('ESTADO_RESULTADO','FINAL',N'Final',2,NULL),
 ('ESTADO_RESULTADO','CORREGIDO',N'Corregido',3,NULL),

 -- Consulta de solo exámenes (sin médico obligatorio).
 ('TIPO_CONSULTA','LABORATORIOS',N'Laboratorios',3,NULL),

 -- agregar_toxico_y_vacunas.sql
 ('TIPO_ANTECEDENTE','TOXICO',N'Tóxico',4,NULL),

 -- agregar_destino_medicamento.sql
 ('DESTINO_MEDICAMENTO','FARMACIA',N'Farmacia',1,NULL),
 ('DESTINO_MEDICAMENTO','CLINICA',N'Clínica',2,NULL),
 ('DESTINO_MEDICAMENTO','AMBOS',N'Ambos',3,NULL),

 -- agregar_tipo_item_factura_servicio.sql
 ('TIPO_ITEM_FACTURA','SERVICIO',N'Servicio',5,NULL);

IF EXISTS (SELECT 1 FROM @Valor v WHERE NOT EXISTS (SELECT 1 FROM @Tipo t WHERE t.codigo = v.tipo))
    THROW 50000, 'Hay valores de catálogo cuyo tipo no está en @Tipo.', 1;

INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, descripcion, orden)
SELECT t.id_tipo_catalogo, v.codigo, v.nombre, v.descripcion, v.orden
FROM @Valor v
JOIN dbo.cat_tipo_catalogo t ON t.codigo = v.tipo
WHERE NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo x
                  WHERE x.id_tipo_catalogo = t.id_tipo_catalogo AND x.codigo = v.codigo)
ORDER BY v.n;
PRINT N'Valores de catálogo agregados: ' + CAST(@@ROWCOUNT AS NVARCHAR(10));

COMMIT TRANSACTION;
GO

-- =============================================================================
-- PARTE 6: tipos_consentimiento (tabla física, distinta del catálogo
-- TIPO_CONSENTIMIENTO): fila COMPROMISO_PAGO que usa Emergencias.
-- =============================================================================
IF NOT EXISTS (SELECT 1 FROM dbo.tipos_consentimiento WHERE codigo = 'COMPROMISO_PAGO')
    INSERT INTO dbo.tipos_consentimiento (codigo, nombre, plantilla_texto)
    VALUES ('COMPROMISO_PAGO', N'Compromiso de pago', NULL);
GO

-- =============================================================================
-- PARTE 7: usuario 'admin' + rol ADMIN con acceso a los 9 módulos, y el
-- empleado de relleno de Laboratorio — cada cosa solo si no existe.
--   - Si ya tienes el usuario 'admin', no se toca (ni su contraseña).
--   - El rol se llama exactamente 'ADMIN' porque MatrizAcceso.cs autoriza por
--     el nombre del rol en el token.
--   - "Laboratorio (Sin médico asignado)" no tiene especialidad a propósito:
--     así nunca aparece en los selectores de médico, y consulta-formulario.ts
--     lo asigna solo a las consultas de tipo LABORATORIOS.
-- =============================================================================
SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @IdEstadoEmpleadoActivo BIGINT = (
    SELECT v.id_valor_catalogo FROM dbo.cat_valor_catalogo v
    JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
    WHERE t.codigo = 'ESTADO_EMPLEADO' AND v.codigo = 'ACTIVO');
DECLARE @IdEstadoUsuarioActivo BIGINT = (
    SELECT v.id_valor_catalogo FROM dbo.cat_valor_catalogo v
    JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
    WHERE t.codigo = 'ESTADO_USUARIO' AND v.codigo = 'ACTIVO');

IF NOT EXISTS (SELECT 1 FROM dbo.puestos WHERE nombre = N'Administrador del Sistema')
    INSERT INTO dbo.puestos (nombre) VALUES (N'Administrador del Sistema');
IF NOT EXISTS (SELECT 1 FROM dbo.puestos WHERE nombre = N'Laboratorio (sin médico)')
    INSERT INTO dbo.puestos (nombre) VALUES (N'Laboratorio (sin médico)');

-- Empleado de relleno de Laboratorio.
IF NOT EXISTS (SELECT 1 FROM dbo.empleados WHERE primer_nombre = N'Laboratorio' AND primer_apellido = N'(Sin médico asignado)')
    INSERT INTO dbo.empleados (primer_nombre, primer_apellido, id_puesto, id_especialidad, fecha_ingreso, id_estado_empleado)
    VALUES (N'Laboratorio', N'(Sin médico asignado)',
            (SELECT id_puesto FROM dbo.puestos WHERE nombre = N'Laboratorio (sin médico)'), NULL,
            CAST(SYSUTCDATETIME() AS DATE), @IdEstadoEmpleadoActivo);

-- Usuario 'admin' (con su empleado de relleno) solo si no existe.
DECLARE @IdUsuarioAdmin BIGINT = (SELECT id_usuario FROM dbo.usuarios WHERE nombre_usuario = N'admin');
IF @IdUsuarioAdmin IS NULL
BEGIN
    INSERT INTO dbo.empleados (primer_nombre, primer_apellido, fecha_ingreso, id_puesto, id_estado_empleado)
    VALUES (N'Administrador', N'Sistema', CAST(SYSUTCDATETIME() AS DATE),
            (SELECT id_puesto FROM dbo.puestos WHERE nombre = N'Administrador del Sistema'), @IdEstadoEmpleadoActivo);
    DECLARE @IdEmpleadoAdmin BIGINT = SCOPE_IDENTITY();

    -- Contraseña: la misma que en la máquina original (hash BCrypt, nunca texto plano).
    INSERT INTO dbo.usuarios (id_empleado, nombre_usuario, correo, hash_password, id_estado_usuario,
                              intentos_fallidos, requiere_cambio_password)
    VALUES (@IdEmpleadoAdmin, N'admin', N'admin@medicentro.gt',
            N'$2a$11$QwbA/SzojVTXDqYPne.oVeiGKZnboACL5rgMtNr096JR7qbaOlnnK',
            @IdEstadoUsuarioActivo, 0, 0);
    SET @IdUsuarioAdmin = SCOPE_IDENTITY();
    PRINT N'Usuario admin creado.';
END

DECLARE @Modulos TABLE (n INT IDENTITY(1,1), codigo NVARCHAR(50), nombre NVARCHAR(150));
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

INSERT INTO dbo.permisos (codigo, nombre, id_modulo, descripcion)
SELECT 'ACCESO_' + m.codigo, N'Acceso a ' + m.nombre, cv.id_valor_catalogo, N'Permite ver y usar el módulo ' + m.nombre
FROM @Modulos m
JOIN dbo.cat_valor_catalogo cv ON cv.codigo = m.codigo
JOIN dbo.cat_tipo_catalogo ct ON ct.id_tipo_catalogo = cv.id_tipo_catalogo AND ct.codigo = 'MODULO_SISTEMA'
WHERE NOT EXISTS (SELECT 1 FROM dbo.permisos p WHERE p.codigo = 'ACCESO_' + m.codigo)
ORDER BY m.n;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE nombre = N'ADMIN')
    INSERT INTO dbo.roles (nombre, descripcion, id_usuario_creacion)
    VALUES (N'ADMIN', N'Acceso total a todos los módulos del sistema', @IdUsuarioAdmin);
DECLARE @IdRolAdmin BIGINT = (SELECT id_rol FROM dbo.roles WHERE nombre = N'ADMIN');

INSERT INTO dbo.rol_permiso (id_rol, id_permiso)
SELECT @IdRolAdmin, p.id_permiso FROM dbo.permisos p
WHERE p.codigo LIKE 'ACCESO[_]%'
  AND NOT EXISTS (SELECT 1 FROM dbo.rol_permiso rp WHERE rp.id_rol = @IdRolAdmin AND rp.id_permiso = p.id_permiso)
ORDER BY p.id_permiso;

IF NOT EXISTS (SELECT 1 FROM dbo.usuario_rol WHERE id_usuario = @IdUsuarioAdmin AND id_rol = @IdRolAdmin)
    INSERT INTO dbo.usuario_rol (id_usuario, id_rol) VALUES (@IdUsuarioAdmin, @IdRolAdmin);

COMMIT TRANSACTION;
GO

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- 1) Debe listar 9 filas (una por módulo) para el usuario 'admin'.
SELECT u.nombre_usuario, r.nombre AS rol, p.codigo AS permiso, cv.codigo AS modulo
FROM dbo.usuarios u
JOIN dbo.usuario_rol ur ON ur.id_usuario = u.id_usuario AND ur.activo = 1
JOIN dbo.roles r ON r.id_rol = ur.id_rol
JOIN dbo.rol_permiso rp ON rp.id_rol = r.id_rol AND rp.activo = 1
JOIN dbo.permisos p ON p.id_permiso = rp.id_permiso
JOIN dbo.cat_valor_catalogo cv ON cv.id_valor_catalogo = p.id_modulo
WHERE u.nombre_usuario = N'admin'
ORDER BY cv.orden;

-- 2) Valores activos por catálogo. En una base nueva solo TIPO_OPERACION y
--    TIPO_VACUNA salen en 0 (los demás deben tener al menos 1).
SELECT t.codigo AS tipo, t.codigo_modulo AS modulo, COUNT(v.id_valor_catalogo) AS valores_activos
FROM dbo.cat_tipo_catalogo t
LEFT JOIN dbo.cat_valor_catalogo v ON v.id_tipo_catalogo = t.id_tipo_catalogo AND v.activo = 1
GROUP BY t.codigo, t.codigo_modulo
ORDER BY t.codigo_modulo, t.codigo;
GO

-- Por si se activó NOEXEC al inicio.
-- 3) Tablas del script que NO existen en la base (debe salir vacío).
SELECT t.nombre AS tabla_faltante FROM (VALUES
    (N'administracion_medicamento'),
    (N'alertas_stock'),
    (N'aseguradoras'),
    (N'bitacora_auditoria'),
    (N'camas'),
    (N'casos_emergencia'),
    (N'cat_tipo_catalogo'),
    (N'cat_valor_catalogo'),
    (N'citas'),
    (N'citas_historial'),
    (N'consentimientos_informados'),
    (N'constancia_medica'),
    (N'control_signos_consulta'),
    (N'control_signos_hospitalizacion'),
    (N'convenio_cobertura'),
    (N'convenios'),
    (N'costo_paciente_consulta'),
    (N'costo_paciente_hospitalizacion'),
    (N'cuentas_por_cobrar'),
    (N'disponibilidad_medico'),
    (N'empleados'),
    (N'especialidades'),
    (N'factura_detalle'),
    (N'facturas'),
    (N'ficha_clinica_general'),
    (N'ficha_consulta_externa'),
    (N'ficha_consulta_externa_pediatrica'),
    (N'habitaciones'),
    (N'historial_clinico'),
    (N'hospitalizaciones'),
    (N'interaccion_medicamentos'),
    (N'items_inventario'),
    (N'libro_actas'),
    (N'medicamento_programado_hospitalizacion'),
    (N'medicamentos'),
    (N'movimientos_inventario'),
    (N'nota_enfermeria_consulta'),
    (N'nota_evolucion_consulta'),
    (N'nota_evolucion_hospitalizacion'),
    (N'notas_credito'),
    (N'notas_enfermeria'),
    (N'orden_detalle'),
    (N'orden_medica_consulta'),
    (N'ordenes_laboratorio'),
    (N'ordenes_medicas_hospitalizacion'),
    (N'paciente_alergia'),
    (N'paciente_antecedente'),
    (N'paciente_contacto_emergencia'),
    (N'paciente_convenio'),
    (N'pacientes'),
    (N'pagos'),
    (N'permisos'),
    (N'polizas_seguro'),
    (N'proveedores'),
    (N'puestos'),
    (N'receta_detalle'),
    (N'recetas'),
    (N'recordatorios'),
    (N'reportes_generados'),
    (N'resultados_examen'),
    (N'rol_permiso'),
    (N'roles'),
    (N'salas'),
    (N'servicios'),
    (N'tipos_consentimiento'),
    (N'tipos_examen'),
    (N'tratamiento_seguimiento'),
    (N'tratamientos'),
    (N'usuario_rol'),
    (N'usuarios'),
    (N'vacuna_aplicada')
) t(nombre) WHERE OBJECT_ID(N'dbo.' + t.nombre, N'U') IS NULL;
GO

SET NOEXEC OFF;
GO
