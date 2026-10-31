-- =============================================================================
-- Tabla nota_evolucion_consulta — "Hoja de Evolución" ligada a la cita
-- (consulta externa) en vez de a una hospitalización, para poder dejar
-- seguimiento aunque el paciente no esté ingresado. Igual patrón que
-- orden_medica_consulta: varias notas por consulta, sin UNIQUE sobre id_cita.
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 23 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esta parte.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'nota_evolucion_consulta' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.nota_evolucion_consulta (
        id_nota_evolucion_consulta BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_cita                    BIGINT NOT NULL,
        id_paciente                 BIGINT NOT NULL,
        id_medico                   BIGINT NOT NULL,
        fecha_hora                  DATETIME2 NOT NULL,
        evolucion                   NVARCHAR(MAX) NOT NULL,
        activo                      BIT NOT NULL DEFAULT 1,
        fecha_creacion              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion          DATETIME2 NULL,
        id_usuario_creacion         BIGINT NULL,
        id_usuario_modificacion     BIGINT NULL,
        CONSTRAINT fk_nota_evolucion_consulta_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita),
        CONSTRAINT fk_nota_evolucion_consulta_paciente FOREIGN KEY (id_paciente) REFERENCES dbo.pacientes (id_paciente),
        CONSTRAINT fk_nota_evolucion_consulta_medico FOREIGN KEY (id_medico) REFERENCES dbo.empleados (id_empleado)
    );
END
GO

-- Verificación.
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.nota_evolucion_consulta) AS filas
FROM sys.tables t
WHERE t.name = 'nota_evolucion_consulta';
GO
