-- =============================================================================
-- "CONTROL DE SIGNOS": bitácora de signos vitales (fecha+hora, P/A,
-- temperatura, F.R., observaciones) — control_signos_hospitalizacion
-- (durante una hospitalización) y control_signos_consulta (ligada a la
-- cita, consulta externa). Varias filas a lo largo del tiempo, no es un
-- solo snapshot como en la ficha clínica.
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 29/30 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esas partes.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'control_signos_hospitalizacion' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.control_signos_hospitalizacion (
        id_control_signos       BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_hospitalizacion      BIGINT NOT NULL,
        fecha_hora              DATETIME2 NOT NULL,
        presion_arterial        NVARCHAR(20) NULL,
        temperatura             NUMERIC(5,2) NULL,
        frecuencia_respiratoria INT NULL,
        observaciones           NVARCHAR(255) NULL,
        activo                  BIT NOT NULL DEFAULT 1,
        fecha_creacion          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion      DATETIME2 NULL,
        CONSTRAINT fk_control_signos_hosp FOREIGN KEY (id_hospitalizacion) REFERENCES dbo.hospitalizaciones (id_hospitalizacion)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'control_signos_consulta' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.control_signos_consulta (
        id_control_signos_consulta BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_cita                    BIGINT NOT NULL,
        id_paciente                 BIGINT NOT NULL,
        fecha_hora                  DATETIME2 NOT NULL,
        presion_arterial             NVARCHAR(20) NULL,
        temperatura                  NUMERIC(5,2) NULL,
        frecuencia_respiratoria      INT NULL,
        observaciones                NVARCHAR(255) NULL,
        activo                       BIT NOT NULL DEFAULT 1,
        fecha_creacion               DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion           DATETIME2 NULL,
        id_usuario_creacion          BIGINT NULL,
        id_usuario_modificacion      BIGINT NULL,
        CONSTRAINT fk_control_signos_consulta_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita),
        CONSTRAINT fk_control_signos_consulta_paciente FOREIGN KEY (id_paciente) REFERENCES dbo.pacientes (id_paciente)
    );
END
GO

-- Verificación.
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.control_signos_hospitalizacion) AS filas
FROM sys.tables t WHERE t.name = 'control_signos_hospitalizacion';
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.control_signos_consulta) AS filas
FROM sys.tables t WHERE t.name = 'control_signos_consulta';
GO
