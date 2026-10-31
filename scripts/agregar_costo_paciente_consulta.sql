-- =============================================================================
-- Tabla costo_paciente_consulta — "COSTO PACIENTE" ligado a la cita
-- (consulta externa) en vez de a una hospitalización. id_medicamento es
-- opcional, solo para prellenar descripción/valor desde el catálogo.
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 32 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esa parte.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'costo_paciente_consulta' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.costo_paciente_consulta (
        id_costo_paciente_consulta BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_cita                    BIGINT NOT NULL,
        id_paciente                 BIGINT NOT NULL,
        id_medicamento               BIGINT NULL,
        fecha                        DATETIME2 NOT NULL,
        descripcion                  NVARCHAR(255) NOT NULL,
        cantidad                     NUMERIC(10,2) NOT NULL,
        valor_unitario               NUMERIC(12,2) NOT NULL,
        activo                       BIT NOT NULL DEFAULT 1,
        fecha_creacion               DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion           DATETIME2 NULL,
        id_usuario_creacion          BIGINT NULL,
        id_usuario_modificacion      BIGINT NULL,
        CONSTRAINT fk_costo_paciente_consulta_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita),
        CONSTRAINT fk_costo_paciente_consulta_paciente FOREIGN KEY (id_paciente) REFERENCES dbo.pacientes (id_paciente),
        CONSTRAINT fk_costo_paciente_consulta_medicamento FOREIGN KEY (id_medicamento) REFERENCES dbo.medicamentos (id_medicamento)
    );
END
GO

-- Verificación.
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.costo_paciente_consulta) AS filas
FROM sys.tables t WHERE t.name = 'costo_paciente_consulta';
GO
