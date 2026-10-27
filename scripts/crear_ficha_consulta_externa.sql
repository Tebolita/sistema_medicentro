-- =============================================================================
-- Crea dbo.ficha_consulta_externa: ficha clínica "Consulta Externa Adulto"
-- del Sanatorio Medicentro, digitalizada a partir del formulario de papel.
-- 1:1 con la cita (igual patrón que constancia_medica). Los datos generales
-- del paciente (carnet, DPI, nombre, fecha de nacimiento, edad) no se
-- guardan aquí: ya viven en pacientes/citas y se arman al imprimir. Los
-- antecedentes FAM/MED/QX/TOX y las alergias tampoco: ya existen
-- estructurados en el expediente del paciente (pacientes.alergias/
-- antecedentes, TOX incluido como un valor más — ver
-- agregar_toxico_y_vacunas.sql) y se arman al imprimir. Las vacunas
-- tampoco: se registran por consulta en vacuna_aplicada (ver ese mismo
-- script), no sueltas en texto libre aquí.
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 18 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esta parte.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ficha_consulta_externa' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.ficha_consulta_externa (
        id_ficha                    BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_cita                     BIGINT NOT NULL,
        id_paciente                 BIGINT NOT NULL,
        id_medico                   BIGINT NOT NULL,
        peso                        NUMERIC(6,2) NULL,
        talla                       NUMERIC(6,2) NULL,
        presion_arterial            NVARCHAR(20) NULL,
        frecuencia_cardiaca         INT NULL,
        frecuencia_respiratoria     INT NULL,
        temperatura                 NUMERIC(5,2) NULL,
        motivo_historia_actual      NVARCHAR(MAX) NOT NULL,
        examen_fisico               NVARCHAR(MAX) NULL,
        plan_diagnostico            NVARCHAR(MAX) NULL,
        plan_terapeutico            NVARCHAR(MAX) NULL,
        estudios_complementarios    NVARCHAR(MAX) NULL,
        activo                      BIT NOT NULL DEFAULT 1,
        fecha_creacion              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion          DATETIME2 NULL,
        id_usuario_creacion         BIGINT NULL,
        id_usuario_modificacion     BIGINT NULL,
        CONSTRAINT fk_ficha_ce_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita),
        CONSTRAINT fk_ficha_ce_paciente FOREIGN KEY (id_paciente) REFERENCES dbo.pacientes (id_paciente),
        CONSTRAINT fk_ficha_ce_medico FOREIGN KEY (id_medico) REFERENCES dbo.empleados (id_empleado),
        CONSTRAINT uq_ficha_ce_cita UNIQUE (id_cita)
    );
END
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ficha_consulta_externa' AND schema_id = SCHEMA_ID('dbo'))
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'uq_ficha_ce_cita')
    ALTER TABLE dbo.ficha_consulta_externa ADD CONSTRAINT uq_ficha_ce_cita UNIQUE (id_cita);
GO

-- Defensivo: si esta base ya había corrido una versión anterior de este
-- script (con antecedentes_toxicos/vacunas como texto libre), se quitan —
-- ver agregar_toxico_y_vacunas.sql.
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.ficha_consulta_externa') AND name = 'antecedentes_toxicos')
    ALTER TABLE dbo.ficha_consulta_externa DROP COLUMN antecedentes_toxicos;
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.ficha_consulta_externa') AND name = 'vacunas')
    ALTER TABLE dbo.ficha_consulta_externa DROP COLUMN vacunas;
GO

-- Verificación: debe devolver la tabla.
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.ficha_consulta_externa) AS filas
FROM sys.tables t
WHERE t.name = 'ficha_consulta_externa';
GO
