-- =============================================================================
-- Ficha clínica "General" del Sanatorio Medicentro Barberena (papel rosa),
-- DISTINTA de ficha_consulta_externa — trae antecedentes gineco-obstétricos,
-- prenatales, revisión por sistemas y examen físico por aparatos. 1:1 con
-- la cita, igual patrón que las demás fichas.
--   - pacientes gana religion/ocupacion: son datos propios del paciente (no
--     cambian consulta a consulta), así que se guardan ahí en vez de
--     repetirlos en cada ficha — igual que ya pasa con nombre/dirección/
--     estado civil.
--   - Los antecedentes FAM/MED/QX/hábitos y alergias NO viven en esta tabla:
--     salen del expediente del paciente (pacientes.alergias/antecedentes),
--     igual que en ficha_consulta_externa.
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 20 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esta parte.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.pacientes') AND name = 'religion')
    ALTER TABLE dbo.pacientes ADD religion NVARCHAR(100) NULL;
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.pacientes') AND name = 'ocupacion')
    ALTER TABLE dbo.pacientes ADD ocupacion NVARCHAR(100) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ficha_clinica_general' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.ficha_clinica_general (
        id_ficha                 BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_cita                  BIGINT NOT NULL,
        id_paciente               BIGINT NOT NULL,
        id_medico                 BIGINT NOT NULL,
        motivo_consulta           NVARCHAR(MAX) NOT NULL,
        historia_enfermedad       NVARCHAR(MAX) NULL,
        prenatales                NVARCHAR(MAX) NULL,
        vacunacion                NVARCHAR(MAX) NULL,
        menarquia                 NVARCHAR(50) NULL,
        ciclo                     NVARCHAR(50) NULL,
        dolor                     NVARCHAR(100) NULL,
        ultima_regla              DATETIME2 NULL,
        revision_sistemas         NVARCHAR(MAX) NULL,
        estado_general            NVARCHAR(255) NULL,
        presion_arterial          NVARCHAR(20) NULL,
        pulso                     INT NULL,
        respiracion               INT NULL,
        temperatura               NUMERIC(5,2) NULL,
        piel_faneras              NVARCHAR(MAX) NULL,
        cabeza_cuello             NVARCHAR(MAX) NULL,
        cardio_pulmonar           NVARCHAR(MAX) NULL,
        abdomen                   NVARCHAR(MAX) NULL,
        dorso_raquis              NVARCHAR(MAX) NULL,
        extremidades              NVARCHAR(MAX) NULL,
        neurologico               NVARCHAR(MAX) NULL,
        otros                     NVARCHAR(MAX) NULL,
        activo                    BIT NOT NULL DEFAULT 1,
        fecha_creacion            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion        DATETIME2 NULL,
        id_usuario_creacion       BIGINT NULL,
        id_usuario_modificacion   BIGINT NULL,
        CONSTRAINT fk_ficha_cg_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita),
        CONSTRAINT fk_ficha_cg_paciente FOREIGN KEY (id_paciente) REFERENCES dbo.pacientes (id_paciente),
        CONSTRAINT fk_ficha_cg_medico FOREIGN KEY (id_medico) REFERENCES dbo.empleados (id_empleado),
        CONSTRAINT uq_ficha_cg_cita UNIQUE (id_cita)
    );
END
GO

-- Verificación.
SELECT c.name FROM sys.columns c WHERE c.object_id = OBJECT_ID('dbo.pacientes') AND c.name IN ('religion', 'ocupacion');
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.ficha_clinica_general) AS filas
FROM sys.tables t
WHERE t.name = 'ficha_clinica_general';
GO
