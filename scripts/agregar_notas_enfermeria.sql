-- =============================================================================
-- Tabla notas_enfermeria — "Hoja de Evolución" de una hospitalización
-- (fecha + evolución + quién la escribió). El backend ya tenía entidad/
-- servicio/controlador para esto (api/Hospitalizaciones/{id}/notas-enfermeria),
-- pero la tabla nunca se había creado. signos_vitales es JSON libre opcional,
-- el backend no lo valida, solo lo guarda.
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 22 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esta parte.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'notas_enfermeria' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.notas_enfermeria (
        id_nota_enfermeria BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_hospitalizacion BIGINT NOT NULL,
        id_empleado        BIGINT NOT NULL,
        fecha_hora         DATETIME2 NOT NULL,
        nota               NVARCHAR(MAX) NOT NULL,
        signos_vitales     NVARCHAR(MAX) NULL,
        activo             BIT NOT NULL DEFAULT 1,
        fecha_creacion     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        CONSTRAINT fk_notas_enfermeria_hospitalizacion FOREIGN KEY (id_hospitalizacion) REFERENCES dbo.hospitalizaciones (id_hospitalizacion),
        CONSTRAINT fk_notas_enfermeria_empleado FOREIGN KEY (id_empleado) REFERENCES dbo.empleados (id_empleado)
    );
END
GO

-- Verificación.
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.notas_enfermeria) AS filas
FROM sys.tables t
WHERE t.name = 'notas_enfermeria';
GO
