-- =============================================================================
-- Orden de Rayos X: digitalización de la boleta de referencia a estudio de
-- imagen (Lugar y fecha / Nombre del paciente / Edad / Estudio requerido /
-- Datos clínicos / Médico referente / Teléfono / Correo electrónico), con
-- el encabezado del Sanatorio Medicentro. 1:1 con la cita, igual patrón
-- que ficha_clinica_general.
--   - Nombre/edad del paciente, fecha y médico referente NO viven en esta
--     tabla: salen de pacientes/citas al imprimir.
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 38 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esta parte.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'orden_rayos_x' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.orden_rayos_x (
        id_orden_rayos_x          BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_cita                   BIGINT NOT NULL,
        id_paciente               BIGINT NOT NULL,
        id_medico                 BIGINT NOT NULL,
        estudio_requerido         NVARCHAR(MAX) NOT NULL,
        datos_clinicos            NVARCHAR(MAX) NULL,
        telefono                  NVARCHAR(50) NULL,
        correo_electronico        NVARCHAR(150) NULL,
        activo                    BIT NOT NULL DEFAULT 1,
        fecha_creacion            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion        DATETIME2 NULL,
        id_usuario_creacion       BIGINT NULL,
        id_usuario_modificacion   BIGINT NULL,
        CONSTRAINT fk_orden_rx_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita),
        CONSTRAINT fk_orden_rx_paciente FOREIGN KEY (id_paciente) REFERENCES dbo.pacientes (id_paciente),
        CONSTRAINT fk_orden_rx_medico FOREIGN KEY (id_medico) REFERENCES dbo.empleados (id_empleado),
        CONSTRAINT uq_orden_rx_cita UNIQUE (id_cita)
    );
END
GO

-- Verificación.
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.orden_rayos_x) AS filas
FROM sys.tables t
WHERE t.name = 'orden_rayos_x';
GO
