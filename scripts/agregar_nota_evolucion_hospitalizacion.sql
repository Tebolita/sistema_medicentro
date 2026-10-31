-- =============================================================================
-- Tabla nota_evolucion_hospitalizacion — "Hoja de Evolución" del MÉDICO
-- durante una hospitalización, distinta de notas_enfermeria (hoja
-- "ENFERMERIA"): mismo papel físico (fecha + evolución), pero cada
-- profesión tiene su propia hoja en el expediente.
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 24 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esta parte.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'nota_evolucion_hospitalizacion' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.nota_evolucion_hospitalizacion (
        id_nota_evolucion  BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_hospitalizacion BIGINT NOT NULL,
        id_medico          BIGINT NOT NULL,
        fecha_hora         DATETIME2 NOT NULL,
        evolucion          NVARCHAR(MAX) NOT NULL,
        activo             BIT NOT NULL DEFAULT 1,
        fecha_creacion     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion DATETIME2 NULL,
        CONSTRAINT fk_nota_evolucion_hosp_hospitalizacion FOREIGN KEY (id_hospitalizacion) REFERENCES dbo.hospitalizaciones (id_hospitalizacion),
        CONSTRAINT fk_nota_evolucion_hosp_medico FOREIGN KEY (id_medico) REFERENCES dbo.empleados (id_empleado)
    );
END
GO

-- Verificación.
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.nota_evolucion_hospitalizacion) AS filas
FROM sys.tables t
WHERE t.name = 'nota_evolucion_hospitalizacion';
GO
