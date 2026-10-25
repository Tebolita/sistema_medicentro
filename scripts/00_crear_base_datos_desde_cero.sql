-- =============================================================================
-- CREAR LA BASE DE DATOS MEDICENTRO DESDE CERO — un solo script
-- =============================================================================
-- Reemplaza la secuencia vieja:
--     MEDICENTRO_schema_version_Arturo_final.sql  (esquema SSMS)
--   + 00_instalacion_completa.sql                  (ALTERs + catálogos + admin)
--   + motor_consultas_schema.sql, agregar_*.sql, corregir_*.sql, sembrar_*.sql,
--     categorizar_tipos_catalogo.sql, unico_empleado_por_usuario.sql, etc.
--
-- Diferencia clave: aquí no hay ningún ALTER TABLE ... ADD <columna>. Cada
-- columna que esos scripts agregaban después ya viene dentro de su
-- CREATE TABLE, igual que los DEFAULT y CHECK. Lo único que queda como ALTER
-- son las llaves foráneas (PARTE 2), porque hay referencias circulares entre
-- tablas (usuarios <-> empleados, casi todo -> usuarios por la auditoría).
--
-- También crea dos tablas que ningún script definía:
--   - libro_actas: existía solo en la base de desarrollo (creada a mano);
--     definición copiada de ahí + la columna id_cita del motor de consultas.
--   - constancia_medica: venía de motor_consultas_schema.sql.
--
-- Cómo usarlo:
--   - SSMS: abrir y ejecutar (F5) conectado a cualquier base (usa master).
--   - sqlcmd: sqlcmd -S <servidor> -E -b -f 65001 -i 00_crear_base_datos_desde_cero.sql
--   - Requiere SQL Server 2019 o superior. A diferencia del esquema SSMS
--     original, NO fija rutas de archivos .mdf/.ldf, COMPATIBILITY_LEVEL 170,
--     LEDGER ni OPTIMIZED_LOCKING (solo existen en SQL Server 2022/2025), así
--     que corre igual en otra máquina u otra versión.
--   - Si la base MEDICENTRO ya existe, el script se detiene sin tocar nada.
--     Para recrearla, bórrala tú primero (DROP DATABASE MEDICENTRO) — este
--     script nunca borra nada por su cuenta.
--
-- Al terminar queda:
--   - Todas las tablas, llaves, índices y vistas.
--   - Todos los catálogos (cat_tipo_catalogo / cat_valor_catalogo) con su
--     módulo, incluidos los códigos exactos que el backend exige.
--   - Usuario 'admin' (admin@medicentro.gt, misma contraseña que la máquina
--     original) con el rol ADMIN y acceso a los 9 módulos.
--   - Empleado de relleno "Laboratorio (Sin médico asignado)" para las
--     consultas de solo exámenes.
--
-- Lo que NO hace (igual que antes, son plantillas para editar a mano):
-- insertar_usuario.sql, insertar_convenio.sql, insertar_poliza.sql y
-- datos_prueba_farmacia_facturacion.sql.
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

-- Si ya existe, se detiene. SET NOEXEC ON hace que el resto del archivo solo
-- se compile sin ejecutarse (en SSMS, un THROW solo cortaría este bloque y
-- los siguientes seguirían corriendo contra master).
IF DB_ID(N'MEDICENTRO') IS NOT NULL
BEGIN
    RAISERROR(N'La base MEDICENTRO ya existe. Este script es solo para crearla desde cero: bórrala primero o usa otro servidor. No se ejecutó nada.', 16, 1);
    SET NOEXEC ON;
END
GO

CREATE DATABASE [MEDICENTRO];
GO

ALTER DATABASE [MEDICENTRO] SET RECOVERY FULL;
ALTER DATABASE [MEDICENTRO] SET PAGE_VERIFY CHECKSUM;
GO

USE [MEDICENTRO];
GO

IF DB_NAME() <> N'MEDICENTRO'
BEGIN
    RAISERROR(N'No se pudo entrar a la base MEDICENTRO recién creada. No se ejecutó nada más.', 16, 1);
    SET NOEXEC ON;
END
GO

-- =============================================================================
-- PARTE 1: TABLAS (con todas las columnas, DEFAULT y CHECK ya incluidos)
-- =============================================================================

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
GO

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
GO

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
GO

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
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql
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
GO

-- Incluye columnas agregadas por: categorizar_tipos_catalogo.sql
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
GO

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
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql
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
GO

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
GO

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
GO

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
GO

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
GO

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
GO

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
GO

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
GO

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
GO

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
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql, agregar_factura_detalle_orden_detalle.sql
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
	PRIMARY KEY CLUSTERED ([id_factura_detalle] ASC)
);
GO

-- Incluye columnas agregadas por: agregar_columna_comprobante_url.sql, motor_consultas_schema.sql
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
	PRIMARY KEY CLUSTERED ([id_factura] ASC),
	UNIQUE NONCLUSTERED ([serie] ASC, [numero_documento] ASC)
);
GO

-- Incluye columnas agregadas por: sembrar_catalogos.sql
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
GO

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
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql
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
GO

-- Incluye columnas agregadas por: sembrar_catalogos.sql
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
GO

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
GO

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
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql
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
	PRIMARY KEY CLUSTERED ([id_medicamento] ASC)
);
GO

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
GO

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
GO

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
GO

CREATE TABLE [dbo].[orden_detalle] (
	[id_orden_detalle] [bigint] IDENTITY(1,1) NOT NULL,
	[id_orden] [bigint] NOT NULL,
	[id_tipo_examen] [bigint] NOT NULL,
	[activo] [bit] NOT NULL DEFAULT ((1)),
	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
	PRIMARY KEY CLUSTERED ([id_orden_detalle] ASC)
);
GO

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
GO

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
GO

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
GO

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
GO

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
GO

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
GO

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
	PRIMARY KEY CLUSTERED ([id_paciente] ASC),
	UNIQUE NONCLUSTERED ([codigo_expediente] ASC)
);
GO

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
GO

-- Incluye columnas agregadas por: sembrar_catalogos.sql
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
GO

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
GO

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
GO

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
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql
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
GO

-- Incluye columnas agregadas por: motor_consultas_schema.sql
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
GO

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
GO

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
GO

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
GO

CREATE TABLE [dbo].[rol_permiso] (
	[id_rol_permiso] [bigint] IDENTITY(1,1) NOT NULL,
	[id_rol] [bigint] NOT NULL,
	[id_permiso] [bigint] NOT NULL,
	[activo] [bit] NOT NULL DEFAULT ((1)),
	[fecha_creacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
	PRIMARY KEY CLUSTERED ([id_rol_permiso] ASC),
	UNIQUE NONCLUSTERED ([id_rol] ASC, [id_permiso] ASC)
);
GO

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
GO

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
GO

-- Incluye columnas agregadas por: sembrar_catalogos.sql, agregar_codigo_tipos_consentimiento.sql
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
GO

-- Incluye columnas agregadas por: sembrar_catalogos.sql, corregir_precio_venta_publico_examen_null.sql
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
GO

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
GO

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
GO

CREATE TABLE [dbo].[usuario_rol] (
	[id_usuario_rol] [bigint] IDENTITY(1,1) NOT NULL,
	[id_usuario] [bigint] NOT NULL,
	[id_rol] [bigint] NOT NULL,
	[fecha_asignacion] [datetime2](7) NOT NULL DEFAULT (sysdatetime()),
	[activo] [bit] NOT NULL DEFAULT ((1)),
	PRIMARY KEY CLUSTERED ([id_usuario_rol] ASC),
	UNIQUE NONCLUSTERED ([id_usuario] ASC, [id_rol] ASC)
);
GO

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
GO

-- =============================================================================
-- PARTE 2: LLAVES FORÁNEAS
-- Van después de crear todas las tablas porque hay referencias circulares
-- (usuarios <-> empleados, casi todo -> usuarios por la auditoría).
-- =============================================================================

-- alertas_stock
ALTER TABLE [dbo].[alertas_stock] ADD FOREIGN KEY ([id_estado_alerta]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[alertas_stock] ADD FOREIGN KEY ([id_item_inventario]) REFERENCES [dbo].[items_inventario] ([id_item_inventario]);
GO

-- aseguradoras
ALTER TABLE [dbo].[aseguradoras] ADD FOREIGN KEY ([id_tipo_entidad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[aseguradoras] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[aseguradoras] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- bitacora_auditoria
ALTER TABLE [dbo].[bitacora_auditoria] ADD FOREIGN KEY ([id_tipo_accion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[bitacora_auditoria] ADD FOREIGN KEY ([id_usuario]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- camas
ALTER TABLE [dbo].[camas] ADD FOREIGN KEY ([id_estado_cama]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[camas] ADD FOREIGN KEY ([id_habitacion]) REFERENCES [dbo].[habitaciones] ([id_habitacion]);
GO

-- casos_emergencia
ALTER TABLE [dbo].[casos_emergencia] ADD FOREIGN KEY ([id_estado_caso]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[casos_emergencia] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[casos_emergencia] ADD FOREIGN KEY ([id_nivel_triage]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[casos_emergencia] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[casos_emergencia] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[casos_emergencia] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[casos_emergencia] ADD CONSTRAINT [fk_caso_emergencia_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);
ALTER TABLE [dbo].[casos_emergencia] ADD CONSTRAINT [fk_caso_emergencia_sala] FOREIGN KEY ([id_sala]) REFERENCES [dbo].[salas] ([id_sala]);
GO

-- cat_tipo_catalogo
ALTER TABLE [dbo].[cat_tipo_catalogo] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[cat_tipo_catalogo] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- cat_valor_catalogo
ALTER TABLE [dbo].[cat_valor_catalogo] ADD FOREIGN KEY ([id_tipo_catalogo]) REFERENCES [dbo].[cat_tipo_catalogo] ([id_tipo_catalogo]);
ALTER TABLE [dbo].[cat_valor_catalogo] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[cat_valor_catalogo] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- citas
ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_especialidad]) REFERENCES [dbo].[especialidades] ([id_especialidad]);
ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_estado_cita]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_motivo_cancelacion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_poliza]) REFERENCES [dbo].[polizas_seguro] ([id_poliza]);
ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_sala]) REFERENCES [dbo].[salas] ([id_sala]);
ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[citas] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[citas] ADD CONSTRAINT [fk_citas_tipo_operacion] FOREIGN KEY ([id_tipo_operacion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
GO

-- citas_historial
ALTER TABLE [dbo].[citas_historial] ADD FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);
ALTER TABLE [dbo].[citas_historial] ADD FOREIGN KEY ([id_estado_anterior]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[citas_historial] ADD FOREIGN KEY ([id_estado_nuevo]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[citas_historial] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- consentimientos_informados
ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_estado_consentimiento]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_medico_responsable]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_parentesco_responsable]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_testigo]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_tipo_consentimiento]) REFERENCES [dbo].[tipos_consentimiento] ([id_tipo_consentimiento]);
ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_tratamiento]) REFERENCES [dbo].[tratamientos] ([id_tratamiento]);
ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[consentimientos_informados] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- constancia_medica
ALTER TABLE [dbo].[constancia_medica] ADD CONSTRAINT [fk_constancia_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);
ALTER TABLE [dbo].[constancia_medica] ADD CONSTRAINT [fk_constancia_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[constancia_medica] ADD CONSTRAINT [fk_constancia_medico] FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);
GO

-- convenio_cobertura
ALTER TABLE [dbo].[convenio_cobertura] ADD FOREIGN KEY ([id_convenio]) REFERENCES [dbo].[convenios] ([id_convenio]);
ALTER TABLE [dbo].[convenio_cobertura] ADD FOREIGN KEY ([id_tipo_item]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
GO

-- convenios
ALTER TABLE [dbo].[convenios] ADD FOREIGN KEY ([id_aseguradora]) REFERENCES [dbo].[aseguradoras] ([id_aseguradora]);
ALTER TABLE [dbo].[convenios] ADD FOREIGN KEY ([id_estado_convenio]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[convenios] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[convenios] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- cuentas_por_cobrar
ALTER TABLE [dbo].[cuentas_por_cobrar] ADD FOREIGN KEY ([id_estado_cxc]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[cuentas_por_cobrar] ADD FOREIGN KEY ([id_factura]) REFERENCES [dbo].[facturas] ([id_factura]);
ALTER TABLE [dbo].[cuentas_por_cobrar] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
GO

-- disponibilidad_medico
ALTER TABLE [dbo].[disponibilidad_medico] ADD FOREIGN KEY ([id_dia_semana]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[disponibilidad_medico] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[disponibilidad_medico] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[disponibilidad_medico] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- empleados
ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_especialidad]) REFERENCES [dbo].[especialidades] ([id_especialidad]);
ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_estado_empleado]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_genero]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_puesto]) REFERENCES [dbo].[puestos] ([id_puesto]);
ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_tipo_documento]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[empleados] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- especialidades
ALTER TABLE [dbo].[especialidades] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[especialidades] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- factura_detalle
ALTER TABLE [dbo].[factura_detalle] ADD FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);
ALTER TABLE [dbo].[factura_detalle] ADD FOREIGN KEY ([id_factura]) REFERENCES [dbo].[facturas] ([id_factura]);
ALTER TABLE [dbo].[factura_detalle] ADD FOREIGN KEY ([id_medicamento]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);
ALTER TABLE [dbo].[factura_detalle] ADD FOREIGN KEY ([id_tipo_item]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[factura_detalle] ADD FOREIGN KEY ([id_tratamiento]) REFERENCES [dbo].[tratamientos] ([id_tratamiento]);
ALTER TABLE [dbo].[factura_detalle] ADD CONSTRAINT [fk_factura_detalle_receta_detalle] FOREIGN KEY ([id_receta_detalle]) REFERENCES [dbo].[receta_detalle] ([id_receta_detalle]);
ALTER TABLE [dbo].[factura_detalle] ADD CONSTRAINT [fk_factura_detalle_orden_detalle] FOREIGN KEY ([id_orden_detalle]) REFERENCES [dbo].[orden_detalle] ([id_orden_detalle]);
GO

-- facturas
ALTER TABLE [dbo].[facturas] ADD FOREIGN KEY ([id_estado_factura]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[facturas] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[facturas] ADD FOREIGN KEY ([id_poliza]) REFERENCES [dbo].[polizas_seguro] ([id_poliza]);
ALTER TABLE [dbo].[facturas] ADD FOREIGN KEY ([id_tipo_documento_fiscal]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[facturas] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[facturas] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[facturas] ADD CONSTRAINT [fk_facturas_convenio] FOREIGN KEY ([id_convenio]) REFERENCES [dbo].[convenios] ([id_convenio]);
ALTER TABLE [dbo].[facturas] ADD CONSTRAINT [fk_facturas_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);
GO

-- habitaciones
ALTER TABLE [dbo].[habitaciones] ADD FOREIGN KEY ([id_estado_habitacion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[habitaciones] ADD FOREIGN KEY ([id_tipo_habitacion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
GO

-- historial_clinico
ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);
ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_nivel_confidencialidad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_tipo_registro]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_tratamiento]) REFERENCES [dbo].[tratamientos] ([id_tratamiento]);
ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[historial_clinico] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- hospitalizaciones
ALTER TABLE [dbo].[hospitalizaciones] ADD FOREIGN KEY ([id_cama]) REFERENCES [dbo].[camas] ([id_cama]);
ALTER TABLE [dbo].[hospitalizaciones] ADD FOREIGN KEY ([id_estado_hospitalizacion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[hospitalizaciones] ADD FOREIGN KEY ([id_medico_responsable]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[hospitalizaciones] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[hospitalizaciones] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[hospitalizaciones] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[hospitalizaciones] ADD CONSTRAINT [fk_hospitalizaciones_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);
GO

-- interaccion_medicamentos
ALTER TABLE [dbo].[interaccion_medicamentos] ADD FOREIGN KEY ([id_medicamento_1]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);
ALTER TABLE [dbo].[interaccion_medicamentos] ADD FOREIGN KEY ([id_medicamento_2]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);
ALTER TABLE [dbo].[interaccion_medicamentos] ADD FOREIGN KEY ([id_nivel_severidad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
GO

-- items_inventario
ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_estado_item]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_medicamento]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);
ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_proveedor]) REFERENCES [dbo].[proveedores] ([id_proveedor]);
ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_tipo_item]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_unidad_medida]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[items_inventario] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- libro_actas
ALTER TABLE [dbo].[libro_actas] ADD CONSTRAINT [FK_libro_actas_paciente] FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[libro_actas] ADD CONSTRAINT [FK_libro_actas_atendido_por] FOREIGN KEY ([id_atendido_por]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[libro_actas] ADD CONSTRAINT [FK_libro_actas_usuario_creacion] FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[libro_actas] ADD CONSTRAINT [FK_libro_actas_usuario_modificacion] FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[libro_actas] ADD CONSTRAINT [fk_libro_actas_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);
GO

-- medicamentos
ALTER TABLE [dbo].[medicamentos] ADD FOREIGN KEY ([id_categoria_medicamento]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[medicamentos] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[medicamentos] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- movimientos_inventario
ALTER TABLE [dbo].[movimientos_inventario] ADD FOREIGN KEY ([id_item_inventario]) REFERENCES [dbo].[items_inventario] ([id_item_inventario]);
ALTER TABLE [dbo].[movimientos_inventario] ADD FOREIGN KEY ([id_tipo_movimiento]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[movimientos_inventario] ADD FOREIGN KEY ([id_tratamiento]) REFERENCES [dbo].[tratamientos] ([id_tratamiento]);
ALTER TABLE [dbo].[movimientos_inventario] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- notas_credito
ALTER TABLE [dbo].[notas_credito] ADD FOREIGN KEY ([id_estado_nota_credito]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[notas_credito] ADD FOREIGN KEY ([id_factura_original]) REFERENCES [dbo].[facturas] ([id_factura]);
ALTER TABLE [dbo].[notas_credito] ADD FOREIGN KEY ([id_motivo]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[notas_credito] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[notas_credito] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- notas_enfermeria
ALTER TABLE [dbo].[notas_enfermeria] ADD FOREIGN KEY ([id_empleado]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[notas_enfermeria] ADD FOREIGN KEY ([id_hospitalizacion]) REFERENCES [dbo].[hospitalizaciones] ([id_hospitalizacion]);
GO

-- orden_detalle
ALTER TABLE [dbo].[orden_detalle] ADD FOREIGN KEY ([id_orden]) REFERENCES [dbo].[ordenes_laboratorio] ([id_orden]);
ALTER TABLE [dbo].[orden_detalle] ADD FOREIGN KEY ([id_tipo_examen]) REFERENCES [dbo].[tipos_examen] ([id_tipo_examen]);
GO

-- ordenes_laboratorio
ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);
ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_estado_orden]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_prioridad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[ordenes_laboratorio] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- ordenes_medicas_hospitalizacion
ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD FOREIGN KEY ([id_hospitalizacion]) REFERENCES [dbo].[hospitalizaciones] ([id_hospitalizacion]);
ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[ordenes_medicas_hospitalizacion] ADD FOREIGN KEY ([id_tipo_orden]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
GO

-- paciente_alergia
ALTER TABLE [dbo].[paciente_alergia] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[paciente_alergia] ADD FOREIGN KEY ([id_severidad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[paciente_alergia] ADD FOREIGN KEY ([id_tipo_alergia]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[paciente_alergia] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[paciente_alergia] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- paciente_antecedente
ALTER TABLE [dbo].[paciente_antecedente] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[paciente_antecedente] ADD FOREIGN KEY ([id_tipo_antecedente]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[paciente_antecedente] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[paciente_antecedente] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- paciente_contacto_emergencia
ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD FOREIGN KEY ([id_parentesco]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[paciente_contacto_emergencia] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- paciente_convenio
ALTER TABLE [dbo].[paciente_convenio] ADD FOREIGN KEY ([id_convenio]) REFERENCES [dbo].[convenios] ([id_convenio]);
ALTER TABLE [dbo].[paciente_convenio] ADD FOREIGN KEY ([id_estado_afiliacion]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[paciente_convenio] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
GO

-- pacientes
ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_estado_civil]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_estado_paciente]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_genero]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_nivel_confidencialidad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_tipo_documento]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_tipo_sangre]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[pacientes] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- pagos
ALTER TABLE [dbo].[pagos] ADD FOREIGN KEY ([id_estado_pago]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[pagos] ADD FOREIGN KEY ([id_factura]) REFERENCES [dbo].[facturas] ([id_factura]);
ALTER TABLE [dbo].[pagos] ADD FOREIGN KEY ([id_forma_pago]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[pagos] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[pagos] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- permisos
ALTER TABLE [dbo].[permisos] ADD FOREIGN KEY ([id_modulo]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
GO

-- polizas_seguro
ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_aseguradora]) REFERENCES [dbo].[aseguradoras] ([id_aseguradora]);
ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_convenio]) REFERENCES [dbo].[convenios] ([id_convenio]);
ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_estado_poliza]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_ramo]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_titularidad]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[polizas_seguro] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- proveedores
ALTER TABLE [dbo].[proveedores] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[proveedores] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- puestos
ALTER TABLE [dbo].[puestos] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[puestos] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- receta_detalle
ALTER TABLE [dbo].[receta_detalle] ADD FOREIGN KEY ([id_medicamento]) REFERENCES [dbo].[medicamentos] ([id_medicamento]);
ALTER TABLE [dbo].[receta_detalle] ADD FOREIGN KEY ([id_receta]) REFERENCES [dbo].[recetas] ([id_receta]);
GO

-- recetas
ALTER TABLE [dbo].[recetas] ADD FOREIGN KEY ([id_estado_receta]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[recetas] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[recetas] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[recetas] ADD FOREIGN KEY ([id_tratamiento]) REFERENCES [dbo].[tratamientos] ([id_tratamiento]);
ALTER TABLE [dbo].[recetas] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[recetas] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[recetas] ADD CONSTRAINT [fk_receta_cita] FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);
GO

-- recordatorios
ALTER TABLE [dbo].[recordatorios] ADD FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);
ALTER TABLE [dbo].[recordatorios] ADD FOREIGN KEY ([id_estado_envio]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[recordatorios] ADD FOREIGN KEY ([id_tipo_recordatorio]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
GO

-- reportes_generados
ALTER TABLE [dbo].[reportes_generados] ADD FOREIGN KEY ([id_tipo_reporte]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[reportes_generados] ADD FOREIGN KEY ([id_usuario]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- resultados_examen
ALTER TABLE [dbo].[resultados_examen] ADD FOREIGN KEY ([id_estado_resultado]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[resultados_examen] ADD FOREIGN KEY ([id_medico_valida]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[resultados_examen] ADD FOREIGN KEY ([id_orden_detalle]) REFERENCES [dbo].[orden_detalle] ([id_orden_detalle]);
ALTER TABLE [dbo].[resultados_examen] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[resultados_examen] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- rol_permiso
ALTER TABLE [dbo].[rol_permiso] ADD FOREIGN KEY ([id_permiso]) REFERENCES [dbo].[permisos] ([id_permiso]);
ALTER TABLE [dbo].[rol_permiso] ADD FOREIGN KEY ([id_rol]) REFERENCES [dbo].[roles] ([id_rol]);
GO

-- roles
ALTER TABLE [dbo].[roles] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[roles] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- salas
ALTER TABLE [dbo].[salas] ADD FOREIGN KEY ([id_estado_sala]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[salas] ADD FOREIGN KEY ([id_tipo_sala]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[salas] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[salas] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- tipos_examen
ALTER TABLE [dbo].[tipos_examen] ADD FOREIGN KEY ([id_categoria_examen]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
GO

-- tratamiento_seguimiento
ALTER TABLE [dbo].[tratamiento_seguimiento] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[tratamiento_seguimiento] ADD FOREIGN KEY ([id_tratamiento]) REFERENCES [dbo].[tratamientos] ([id_tratamiento]);
ALTER TABLE [dbo].[tratamiento_seguimiento] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[tratamiento_seguimiento] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- tratamientos
ALTER TABLE [dbo].[tratamientos] ADD FOREIGN KEY ([id_cita]) REFERENCES [dbo].[citas] ([id_cita]);
ALTER TABLE [dbo].[tratamientos] ADD FOREIGN KEY ([id_estado_tratamiento]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[tratamientos] ADD FOREIGN KEY ([id_medico]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[tratamientos] ADD FOREIGN KEY ([id_paciente]) REFERENCES [dbo].[pacientes] ([id_paciente]);
ALTER TABLE [dbo].[tratamientos] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[tratamientos] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- usuario_rol
ALTER TABLE [dbo].[usuario_rol] ADD FOREIGN KEY ([id_rol]) REFERENCES [dbo].[roles] ([id_rol]);
ALTER TABLE [dbo].[usuario_rol] ADD FOREIGN KEY ([id_usuario]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- usuarios
ALTER TABLE [dbo].[usuarios] ADD FOREIGN KEY ([id_empleado]) REFERENCES [dbo].[empleados] ([id_empleado]);
ALTER TABLE [dbo].[usuarios] ADD FOREIGN KEY ([id_estado_usuario]) REFERENCES [dbo].[cat_valor_catalogo] ([id_valor_catalogo]);
ALTER TABLE [dbo].[usuarios] ADD FOREIGN KEY ([id_usuario_creacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
ALTER TABLE [dbo].[usuarios] ADD FOREIGN KEY ([id_usuario_modificacion]) REFERENCES [dbo].[usuarios] ([id_usuario]);
GO

-- =============================================================================
-- PARTE 3: ÍNDICES
-- =============================================================================

CREATE NONCLUSTERED INDEX [ix_alertas_stock_item] ON [dbo].[alertas_stock] ([id_item_inventario] ASC);
CREATE NONCLUSTERED INDEX [ix_bitacora_tabla_registro] ON [dbo].[bitacora_auditoria] ([tabla_afectada] ASC, [id_registro_afectado] ASC);
CREATE NONCLUSTERED INDEX [ix_bitacora_usuario_fecha] ON [dbo].[bitacora_auditoria] ([id_usuario] ASC, [fecha_hora] ASC);
CREATE NONCLUSTERED INDEX [ix_camas_habitacion] ON [dbo].[camas] ([id_habitacion] ASC);
CREATE NONCLUSTERED INDEX [ix_casos_emergencia_estado] ON [dbo].[casos_emergencia] ([id_estado_caso] ASC);
CREATE NONCLUSTERED INDEX [ix_casos_emergencia_llegada] ON [dbo].[casos_emergencia] ([hora_llegada] ASC);
CREATE NONCLUSTERED INDEX [ix_casos_emergencia_paciente] ON [dbo].[casos_emergencia] ([id_paciente] ASC) WHERE ([id_paciente] IS NOT NULL);
CREATE NONCLUSTERED INDEX [ix_cat_valor_tipo] ON [dbo].[cat_valor_catalogo] ([id_tipo_catalogo] ASC);
CREATE NONCLUSTERED INDEX [ix_citas_activo] ON [dbo].[citas] ([activo] ASC) WHERE ([activo]=(1));
CREATE NONCLUSTERED INDEX [ix_citas_estado] ON [dbo].[citas] ([id_estado_cita] ASC);
CREATE NONCLUSTERED INDEX [ix_citas_medico_fecha] ON [dbo].[citas] ([id_medico] ASC, [fecha_hora_inicio] ASC);
CREATE NONCLUSTERED INDEX [ix_citas_paciente] ON [dbo].[citas] ([id_paciente] ASC);
CREATE NONCLUSTERED INDEX [ix_citas_poliza] ON [dbo].[citas] ([id_poliza] ASC) WHERE ([id_poliza] IS NOT NULL);
CREATE NONCLUSTERED INDEX [ix_citas_historial_cita] ON [dbo].[citas_historial] ([id_cita] ASC);
CREATE NONCLUSTERED INDEX [ix_consentimientos_paciente] ON [dbo].[consentimientos_informados] ([id_paciente] ASC);
CREATE NONCLUSTERED INDEX [ix_convenios_aseguradora] ON [dbo].[convenios] ([id_aseguradora] ASC);
CREATE NONCLUSTERED INDEX [ix_cxc_estado] ON [dbo].[cuentas_por_cobrar] ([id_estado_cxc] ASC);
CREATE NONCLUSTERED INDEX [ix_cxc_paciente] ON [dbo].[cuentas_por_cobrar] ([id_paciente] ASC);
CREATE NONCLUSTERED INDEX [ix_disponibilidad_medico] ON [dbo].[disponibilidad_medico] ([id_medico] ASC);
CREATE NONCLUSTERED INDEX [ix_empleados_activo] ON [dbo].[empleados] ([activo] ASC) WHERE ([activo]=(1));
CREATE NONCLUSTERED INDEX [ix_empleados_especialidad] ON [dbo].[empleados] ([id_especialidad] ASC);
CREATE NONCLUSTERED INDEX [ix_empleados_puesto] ON [dbo].[empleados] ([id_puesto] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [ux_empleados_documento] ON [dbo].[empleados] ([id_tipo_documento] ASC, [numero_documento] ASC) WHERE ([numero_documento] IS NOT NULL);
CREATE NONCLUSTERED INDEX [ix_factura_detalle_factura] ON [dbo].[factura_detalle] ([id_factura] ASC);
CREATE NONCLUSTERED INDEX [ix_facturas_activo] ON [dbo].[facturas] ([activo] ASC) WHERE ([activo]=(1));
CREATE NONCLUSTERED INDEX [ix_facturas_estado] ON [dbo].[facturas] ([id_estado_factura] ASC);
CREATE NONCLUSTERED INDEX [ix_facturas_paciente] ON [dbo].[facturas] ([id_paciente] ASC);
CREATE NONCLUSTERED INDEX [ix_facturas_poliza] ON [dbo].[facturas] ([id_poliza] ASC) WHERE ([id_poliza] IS NOT NULL);
CREATE NONCLUSTERED INDEX [ix_historial_paciente_fecha] ON [dbo].[historial_clinico] ([id_paciente] ASC, [fecha] ASC);
CREATE NONCLUSTERED INDEX [ix_hospitalizaciones_activas] ON [dbo].[hospitalizaciones] ([id_cama] ASC) WHERE ([fecha_egreso] IS NULL);
CREATE NONCLUSTERED INDEX [ix_hospitalizaciones_paciente] ON [dbo].[hospitalizaciones] ([id_paciente] ASC);
CREATE NONCLUSTERED INDEX [ix_items_inventario_bajo_stock] ON [dbo].[items_inventario] ([bajo_stock] ASC);
CREATE NONCLUSTERED INDEX [ix_items_inventario_tipo] ON [dbo].[items_inventario] ([id_tipo_item] ASC);
CREATE NONCLUSTERED INDEX [ix_movimientos_item_fecha] ON [dbo].[movimientos_inventario] ([id_item_inventario] ASC, [fecha_movimiento] ASC);
CREATE NONCLUSTERED INDEX [ix_notas_credito_factura] ON [dbo].[notas_credito] ([id_factura_original] ASC);
CREATE NONCLUSTERED INDEX [ix_notas_enfermeria_hosp] ON [dbo].[notas_enfermeria] ([id_hospitalizacion] ASC);
CREATE NONCLUSTERED INDEX [ix_orden_detalle_orden] ON [dbo].[orden_detalle] ([id_orden] ASC);
CREATE NONCLUSTERED INDEX [ix_ordenes_lab_paciente] ON [dbo].[ordenes_laboratorio] ([id_paciente] ASC);
CREATE NONCLUSTERED INDEX [ix_ordenes_medicas_hosp] ON [dbo].[ordenes_medicas_hospitalizacion] ([id_hospitalizacion] ASC);
CREATE NONCLUSTERED INDEX [ix_alergia_paciente] ON [dbo].[paciente_alergia] ([id_paciente] ASC);
CREATE NONCLUSTERED INDEX [ix_antecedente_paciente] ON [dbo].[paciente_antecedente] ([id_paciente] ASC);
CREATE NONCLUSTERED INDEX [ix_contacto_emergencia_paciente] ON [dbo].[paciente_contacto_emergencia] ([id_paciente] ASC);
CREATE NONCLUSTERED INDEX [ix_paciente_convenio_paciente] ON [dbo].[paciente_convenio] ([id_paciente] ASC);
CREATE NONCLUSTERED INDEX [ix_pacientes_activo] ON [dbo].[pacientes] ([activo] ASC) WHERE ([activo]=(1));
CREATE NONCLUSTERED INDEX [ix_pacientes_nombre] ON [dbo].[pacientes] ([primer_apellido] ASC, [primer_nombre] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [ux_pacientes_documento] ON [dbo].[pacientes] ([id_tipo_documento] ASC, [numero_documento] ASC) WHERE ([numero_documento] IS NOT NULL);
CREATE NONCLUSTERED INDEX [ix_pagos_factura] ON [dbo].[pagos] ([id_factura] ASC);
CREATE NONCLUSTERED INDEX [ix_polizas_seguro_aseguradora] ON [dbo].[polizas_seguro] ([id_aseguradora] ASC);
CREATE NONCLUSTERED INDEX [ix_polizas_seguro_estado] ON [dbo].[polizas_seguro] ([id_estado_poliza] ASC);
CREATE NONCLUSTERED INDEX [ix_polizas_seguro_paciente] ON [dbo].[polizas_seguro] ([id_paciente] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [ux_polizas_seguro_certificado] ON [dbo].[polizas_seguro] ([id_aseguradora] ASC, [numero_poliza] ASC, [numero_certificado] ASC) WHERE ([numero_certificado] IS NOT NULL);
CREATE NONCLUSTERED INDEX [ix_receta_detalle_receta] ON [dbo].[receta_detalle] ([id_receta] ASC);
CREATE NONCLUSTERED INDEX [ix_recetas_paciente] ON [dbo].[recetas] ([id_paciente] ASC);
CREATE NONCLUSTERED INDEX [ix_recordatorios_cita] ON [dbo].[recordatorios] ([id_cita] ASC);
CREATE NONCLUSTERED INDEX [ix_recordatorios_pendientes] ON [dbo].[recordatorios] ([fecha_programada] ASC) WHERE ([fecha_envio] IS NULL);
CREATE NONCLUSTERED INDEX [ix_resultados_orden_detalle] ON [dbo].[resultados_examen] ([id_orden_detalle] ASC);
CREATE NONCLUSTERED INDEX [ix_seguimiento_tratamiento] ON [dbo].[tratamiento_seguimiento] ([id_tratamiento] ASC);
CREATE NONCLUSTERED INDEX [ix_tratamientos_estado] ON [dbo].[tratamientos] ([id_estado_tratamiento] ASC);
CREATE NONCLUSTERED INDEX [ix_tratamientos_paciente] ON [dbo].[tratamientos] ([id_paciente] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [ux_tipos_consentimiento_codigo] ON [dbo].[tipos_consentimiento] ([codigo] ASC);
CREATE UNIQUE NONCLUSTERED INDEX [ux_facturas_id_cita] ON [dbo].[facturas] ([id_cita] ASC) WHERE ([id_cita] IS NOT NULL);
CREATE UNIQUE NONCLUSTERED INDEX [ux_libro_actas_id_cita] ON [dbo].[libro_actas] ([id_cita] ASC) WHERE ([id_cita] IS NOT NULL);
CREATE UNIQUE NONCLUSTERED INDEX [ux_usuarios_empleado_activo] ON [dbo].[usuarios] ([id_empleado] ASC) WHERE ([id_empleado] IS NOT NULL AND [activo] = (1));
GO

-- =============================================================================
-- PARTE 4: VISTAS (Reportes y Estadísticas)
-- =============================================================================

CREATE VIEW [dbo].[vw_indicadores_clinicos] AS
SELECT
    DATEFROMPARTS(YEAR(c.fecha_hora_inicio), MONTH(c.fecha_hora_inicio), 1) AS mes,
    cv_estado.codigo                                                        AS estado_cita,
    COUNT(*)                                                                AS total_citas
FROM citas c
JOIN cat_valor_catalogo cv_estado ON cv_estado.id_valor_catalogo = c.id_estado_cita
WHERE c.activo = 1
GROUP BY DATEFROMPARTS(YEAR(c.fecha_hora_inicio), MONTH(c.fecha_hora_inicio), 1), cv_estado.codigo
GO

CREATE VIEW [dbo].[vw_indicadores_financieros] AS
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
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Trazabilidad genérica de cambios. Se alimenta desde la capa de aplicación o desde triggers por tabla si se requiere auditoría automática total.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'bitacora_auditoria';
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Caso de atención prioritaria en la sala de emergencias (triaje). Puede no tener paciente registrado todavía (walk-in): en ese caso se usa nombre_paciente en vez de id_paciente.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'casos_emergencia';
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Agrupa cada familia de catálogo (ESTADO_CITA, TIPO_DOCUMENTO, etc.)' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'cat_tipo_catalogo';
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Valores de cada catálogo. Referenciada por casi todo el esquema.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'cat_valor_catalogo';
EXEC sys.sp_addextendedproperty @name=N'MS_Description', @value=N'Póliza/certificado de seguro médico de un paciente.' , @level0type=N'SCHEMA',@level0name=N'dbo', @level1type=N'TABLE',@level1name=N'polizas_seguro';
GO

-- =============================================================================
-- PARTE 5: CATÁLOGOS (cat_tipo_catalogo / cat_valor_catalogo)
-- Unión de sembrar_catalogos.sql, categorizar_tipos_catalogo.sql,
-- sembrar_tipo_reporte.sql, sembrar_tipo_consentimiento_compromiso_pago.sql,
-- sembrar_tipo_consulta.sql, motor_consultas_schema.sql y los catálogos que
-- solo existían creados a mano (ver 00_instalacion_completa.sql, PARTE 9).
-- Los valores se insertan en un orden fijo, así los ids salen siempre iguales.
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
 ('ESTADO_RESULTADO',           N'Estado del resultado de examen',   'LABORATORIO', NULL);

INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, descripcion, codigo_modulo)
SELECT codigo, nombre, descripcion, modulo FROM @Tipo ORDER BY n;

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
 ('TIPO_CONSULTA','LABORATORIOS',N'Laboratorios',3,NULL);

IF EXISTS (SELECT 1 FROM @Valor v WHERE NOT EXISTS (SELECT 1 FROM @Tipo t WHERE t.codigo = v.tipo))
    THROW 50000, 'Hay valores de catálogo cuyo tipo no está en @Tipo.', 1;

INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, descripcion, orden)
SELECT t.id_tipo_catalogo, v.codigo, v.nombre, v.descripcion, v.orden
FROM @Valor v
JOIN dbo.cat_tipo_catalogo t ON t.codigo = v.tipo
ORDER BY v.n;

COMMIT TRANSACTION;
GO

-- =============================================================================
-- PARTE 6: tipos_consentimiento (tabla física, distinta del catálogo
-- TIPO_CONSENTIMIENTO): fila COMPROMISO_PAGO que usa Emergencias.
-- =============================================================================
INSERT INTO dbo.tipos_consentimiento (codigo, nombre, plantilla_texto)
VALUES ('COMPROMISO_PAGO', N'Compromiso de pago', NULL);
GO

-- =============================================================================
-- PARTE 7: usuario 'admin' + rol ADMIN con acceso a los 9 módulos, y el
-- empleado de relleno de Laboratorio.
--   - El empleado detrás de 'admin' es un relleno ("Administrador Sistema"):
--     edítalo desde Mantenimiento -> Empleados con los datos reales.
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

INSERT INTO dbo.puestos (nombre) VALUES (N'Administrador del Sistema'), (N'Laboratorio (sin médico)');

INSERT INTO dbo.empleados (primer_nombre, primer_apellido, fecha_ingreso, id_puesto, id_estado_empleado)
VALUES (N'Administrador', N'Sistema', CAST(SYSUTCDATETIME() AS DATE),
        (SELECT id_puesto FROM dbo.puestos WHERE nombre = N'Administrador del Sistema'), @IdEstadoEmpleadoActivo);
DECLARE @IdEmpleadoAdmin BIGINT = SCOPE_IDENTITY();

INSERT INTO dbo.empleados (primer_nombre, primer_apellido, id_puesto, id_especialidad, fecha_ingreso, id_estado_empleado)
VALUES (N'Laboratorio', N'(Sin médico asignado)',
        (SELECT id_puesto FROM dbo.puestos WHERE nombre = N'Laboratorio (sin médico)'), NULL,
        CAST(SYSUTCDATETIME() AS DATE), @IdEstadoEmpleadoActivo);

-- Contraseña: la misma que en la máquina original (hash BCrypt, nunca texto plano).
INSERT INTO dbo.usuarios (id_empleado, nombre_usuario, correo, hash_password, id_estado_usuario,
                          intentos_fallidos, requiere_cambio_password)
VALUES (@IdEmpleadoAdmin, N'admin', N'admin@medicentro.gt',
        N'$2a$11$QwbA/SzojVTXDqYPne.oVeiGKZnboACL5rgMtNr096JR7qbaOlnnK',
        @IdEstadoUsuarioActivo, 0, 0);
DECLARE @IdUsuarioAdmin BIGINT = SCOPE_IDENTITY();

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
ORDER BY m.n;

INSERT INTO dbo.roles (nombre, descripcion, id_usuario_creacion)
VALUES (N'ADMIN', N'Acceso total a todos los módulos del sistema', @IdUsuarioAdmin);
DECLARE @IdRolAdmin BIGINT = SCOPE_IDENTITY();

INSERT INTO dbo.rol_permiso (id_rol, id_permiso)
SELECT @IdRolAdmin, id_permiso FROM dbo.permisos WHERE codigo LIKE 'ACCESO[_]%' ORDER BY id_permiso;

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

-- 2) Valores activos por catálogo. Solo TIPO_OPERACION debe salir en 0.
SELECT t.codigo AS tipo, t.codigo_modulo AS modulo, COUNT(v.id_valor_catalogo) AS valores_activos
FROM dbo.cat_tipo_catalogo t
LEFT JOIN dbo.cat_valor_catalogo v ON v.id_tipo_catalogo = t.id_tipo_catalogo AND v.activo = 1
GROUP BY t.codigo, t.codigo_modulo
ORDER BY t.codigo_modulo, t.codigo;
GO

-- Por si la base ya existía y se activó NOEXEC al inicio.
SET NOEXEC OFF;
GO
