-- =============================================================================
-- "COSTO PACIENTE": bitácora manual de todo lo que genera costo durante una
-- hospitalización (medicamentos administrados, insumos, procedimientos...).
-- id_medicamento es opcional, solo para prellenar descripción/valor desde
-- el catálogo — el renglón se puede capturar libre para cosas que no son
-- medicamentos. Solo Hospitalización: en consulta externa el costo ya se
-- factura automático vía recetas.
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 31 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esa parte.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'costo_paciente_hospitalizacion' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.costo_paciente_hospitalizacion (
        id_costo_paciente       BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_hospitalizacion      BIGINT NOT NULL,
        id_medicamento          BIGINT NULL,
        fecha                   DATETIME2 NOT NULL,
        descripcion              NVARCHAR(255) NOT NULL,
        cantidad                 NUMERIC(10,2) NOT NULL,
        valor_unitario           NUMERIC(12,2) NOT NULL,
        activo                   BIT NOT NULL DEFAULT 1,
        fecha_creacion           DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion       DATETIME2 NULL,
        id_usuario_creacion      BIGINT NULL,
        id_usuario_modificacion  BIGINT NULL,
        CONSTRAINT fk_costo_paciente_hosp FOREIGN KEY (id_hospitalizacion) REFERENCES dbo.hospitalizaciones (id_hospitalizacion),
        CONSTRAINT fk_costo_paciente_medicamento FOREIGN KEY (id_medicamento) REFERENCES dbo.medicamentos (id_medicamento)
    );
END
GO

-- Verificación.
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.costo_paciente_hospitalizacion) AS filas
FROM sys.tables t WHERE t.name = 'costo_paciente_hospitalizacion';
GO
