-- =============================================================================
-- Órdenes médicas de consulta externa, ligadas a id_cita — DISTINTA de
-- orden_medica_hospitalizacion (ligada a id_hospitalizacion): esta permite
-- dejar indicaciones a cualquier paciente, no solo a los ingresados.
-- Replica el papel "ÓRDENES MÉDICAS" del Sanatorio Medicentro. Reutiliza el
-- catálogo TIPO_ORDEN_HOSPITALIZACION (MEDICA/ENFERMERIA) para poder
-- imprimir "Médica - <indicación>", igual que el papel.
-- Puede haber varias órdenes por consulta, igual patrón que vacuna_aplicada:
-- no lleva UNIQUE sobre id_cita.
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 21 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esta parte.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'orden_medica_consulta' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.orden_medica_consulta (
        id_orden_medica_consulta BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_cita                  BIGINT NOT NULL,
        id_paciente               BIGINT NOT NULL,
        id_medico                 BIGINT NOT NULL,
        id_tipo_orden             BIGINT NOT NULL,
        fecha_orden               DATETIME2 NOT NULL,
        indicaciones              NVARCHAR(MAX) NOT NULL,
        activo                    BIT NOT NULL DEFAULT 1,
        fecha_creacion            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion        DATETIME2 NULL,
        id_usuario_creacion       BIGINT NULL,
        id_usuario_modificacion   BIGINT NULL,
        CONSTRAINT fk_orden_medica_consulta_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita),
        CONSTRAINT fk_orden_medica_consulta_paciente FOREIGN KEY (id_paciente) REFERENCES dbo.pacientes (id_paciente),
        CONSTRAINT fk_orden_medica_consulta_medico FOREIGN KEY (id_medico) REFERENCES dbo.empleados (id_empleado),
        CONSTRAINT fk_orden_medica_consulta_tipo FOREIGN KEY (id_tipo_orden) REFERENCES dbo.cat_valor_catalogo (id_valor_catalogo)
    );
END
GO

-- Defensivo: si la tabla ya se había creado con una versión anterior de este
-- script (sin id_tipo_orden), se agrega la columna aparte.
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'orden_medica_consulta' AND schema_id = SCHEMA_ID('dbo'))
   AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.orden_medica_consulta') AND name = 'id_tipo_orden')
BEGIN
    ALTER TABLE dbo.orden_medica_consulta ADD id_tipo_orden BIGINT NULL;
END
GO

-- Verificación.
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.orden_medica_consulta) AS filas
FROM sys.tables t
WHERE t.name = 'orden_medica_consulta';
GO
