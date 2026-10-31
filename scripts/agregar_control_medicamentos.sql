-- =============================================================================
-- "Hoja de Control de Medicamentos": medicamento_programado_hospitalizacion
-- (cada fila es un medicamento programado, con su hora, para una
-- hospitalización) + administracion_medicamento (cada vez que se administra
-- una dosis se agrega un registro aquí — equivale a tachar un día en la
-- cuadrícula del papel físico).
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 27/28 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esas partes.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'medicamento_programado_hospitalizacion' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.medicamento_programado_hospitalizacion (
        id_medicamento_programado BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_hospitalizacion        BIGINT NOT NULL,
        id_medicamento            BIGINT NOT NULL,
        hora                      TIME NOT NULL,
        fecha_inicial             DATETIME2 NOT NULL,
        observaciones             NVARCHAR(255) NULL,
        activo                    BIT NOT NULL DEFAULT 1,
        fecha_creacion            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion        DATETIME2 NULL,
        id_usuario_creacion       BIGINT NULL,
        id_usuario_modificacion   BIGINT NULL,
        CONSTRAINT fk_medicamento_programado_hosp FOREIGN KEY (id_hospitalizacion) REFERENCES dbo.hospitalizaciones (id_hospitalizacion),
        CONSTRAINT fk_medicamento_programado_medicamento FOREIGN KEY (id_medicamento) REFERENCES dbo.medicamentos (id_medicamento)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'administracion_medicamento' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.administracion_medicamento (
        id_administracion         BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_medicamento_programado BIGINT NOT NULL,
        id_empleado               BIGINT NOT NULL,
        fecha_hora                DATETIME2 NOT NULL,
        activo                    BIT NOT NULL DEFAULT 1,
        fecha_creacion            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT fk_administracion_medicamento_programado FOREIGN KEY (id_medicamento_programado) REFERENCES dbo.medicamento_programado_hospitalizacion (id_medicamento_programado),
        CONSTRAINT fk_administracion_medicamento_empleado FOREIGN KEY (id_empleado) REFERENCES dbo.empleados (id_empleado)
    );
END
GO

-- Verificación.
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.medicamento_programado_hospitalizacion) AS filas
FROM sys.tables t WHERE t.name = 'medicamento_programado_hospitalizacion';
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.administracion_medicamento) AS filas
FROM sys.tables t WHERE t.name = 'administracion_medicamento';
GO
