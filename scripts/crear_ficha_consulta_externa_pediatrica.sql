-- =============================================================================
-- Crea dbo.ficha_consulta_externa_pediatrica: ficha "Expediente Clínico
-- Pediátrico" del Sanatorio Medicentro, digitalizada a partir del
-- formulario de papel. 1:1 con la cita (igual patrón que
-- ficha_consulta_externa, la de adulto — ver crear_ficha_consulta_externa.sql).
-- Los datos generales del paciente (nombre, fecha de nacimiento, edad,
-- padre/encargado) no se guardan aquí: ya viven en pacientes/citas y se
-- arman al imprimir. Los antecedentes FAM/QX/TX/MEDICOS/ALERG tampoco: ya
-- existen estructurados en el expediente del paciente (pacientes.alergias/
-- antecedentes), igual que en la ficha de adulto.
-- Idempotente: se puede correr las veces que haga falta.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ficha_consulta_externa_pediatrica' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.ficha_consulta_externa_pediatrica (
        id_ficha                    BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_cita                     BIGINT NOT NULL,
        id_paciente                 BIGINT NOT NULL,
        id_medico                   BIGINT NOT NULL,

        motivo_consulta             NVARCHAR(MAX) NOT NULL,
        historia_clinica            NVARCHAR(MAX) NULL,

        -- Antecedentes perinatales
        lugar_nacimiento            NVARCHAR(200) NULL,
        tipo_parto                  NVARCHAR(100) NULL,
        pan                         NVARCHAR(100) NULL,
        llanto_al_nacer             NVARCHAR(200) NULL,
        complicaciones              NVARCHAR(MAX) NULL,
        alimentacion_lm             BIT NULL,
        alimentacion_tiempo         NVARCHAR(100) NULL,
        formula                     NVARCHAR(200) NULL,
        inmunizaciones_completas    BIT NULL,
        inmunizaciones_en           NVARCHAR(100) NULL,

        -- Crecimiento y desarrollo
        sonrisa_social              NVARCHAR(100) NULL,
        se_sento                    NVARCHAR(100) NULL,
        camino                      NVARCHAR(100) NULL,
        hablo                       NVARCHAR(100) NULL,

        revision_por_sistemas       NVARCHAR(MAX) NULL,

        -- Examen físico (datos positivos)
        peso                        NUMERIC(6,2) NULL,
        talla                       NUMERIC(6,2) NULL,
        cc                          NUMERIC(6,2) NULL,
        pe                          NUMERIC(6,2) NULL,
        te                          NUMERIC(6,2) NULL,
        pt                          NUMERIC(6,2) NULL,
        imc                         NUMERIC(6,2) NULL,
        fr                          INT NULL,
        fc                          INT NULL,
        temperatura                 NUMERIC(5,2) NULL,
        pa                          NVARCHAR(20) NULL,
        downes                      NVARCHAR(50) NULL,
        fr_ea_c_r                   NVARCHAR(200) NULL,
        examen_fisico               NVARCHAR(MAX) NULL,

        plan_diagnostico            NVARCHAR(MAX) NULL,
        plan_terapeutico            NVARCHAR(MAX) NULL,
        plan_educacional            NVARCHAR(MAX) NULL,

        activo                      BIT NOT NULL DEFAULT 1,
        fecha_creacion              DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion          DATETIME2 NULL,
        id_usuario_creacion         BIGINT NULL,
        id_usuario_modificacion     BIGINT NULL,
        CONSTRAINT fk_ficha_cep_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita),
        CONSTRAINT fk_ficha_cep_paciente FOREIGN KEY (id_paciente) REFERENCES dbo.pacientes (id_paciente),
        CONSTRAINT fk_ficha_cep_medico FOREIGN KEY (id_medico) REFERENCES dbo.empleados (id_empleado),
        CONSTRAINT uq_ficha_cep_cita UNIQUE (id_cita)
    );
END
GO

-- Verificación: debe devolver la tabla.
SELECT t.name AS tabla, (SELECT COUNT(*) FROM dbo.ficha_consulta_externa_pediatrica) AS filas
FROM sys.tables t
WHERE t.name = 'ficha_consulta_externa_pediatrica';
GO
