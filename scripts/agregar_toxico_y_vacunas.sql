-- =============================================================================
-- Refuerza el expediente del paciente y la consulta en vez de repetir texto
-- libre en la ficha clínica:
--   - TIPO_ANTECEDENTE gana el código TOXICO ("Tóxico" — tabaco, alcohol,
--     drogas...), un valor más junto a Personal/Familiar/Quirúrgico; se
--     registra igual que los demás en Pacientes -> Antecedentes, sin tocar
--     ninguna pantalla (el dropdown ya sale del catálogo).
--   - Catálogo TIPO_VACUNA (sin valores fijos — el equipo clínico agrega las
--     que maneje desde Mantenimiento -> Catálogos, como TIPO_OPERACION).
--   - Tabla vacuna_aplicada: qué vacunas se inyectaron en CADA consulta (no
--     es historial reutilizable del paciente como alergias/antecedentes, es
--     un registro por cita — un paciente puede recibir varias vacunas
--     distintas en la misma consulta, de ahí que no sea 1:1 con la cita).
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 19 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esta parte.
-- =============================================================================
USE MEDICENTRO;
GO

BEGIN TRANSACTION;
BEGIN TRY

DECLARE @IdTipoAntecedente BIGINT = (SELECT id_tipo_catalogo FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_ANTECEDENTE');
IF @IdTipoAntecedente IS NULL
    THROW 50000, 'No existe el tipo de catálogo TIPO_ANTECEDENTE — revisa que los catálogos base estén sembrados.', 1;

IF NOT EXISTS (SELECT 1 FROM dbo.cat_valor_catalogo WHERE id_tipo_catalogo = @IdTipoAntecedente AND codigo = 'TOXICO')
    INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden, activo, fecha_creacion)
    VALUES (@IdTipoAntecedente, 'TOXICO', N'Tóxico', 4, 1, SYSUTCDATETIME());

IF NOT EXISTS (SELECT 1 FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_VACUNA')
    INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, codigo_modulo, activo, fecha_creacion)
    VALUES ('TIPO_VACUNA', N'Tipo de vacuna', 'EXPEDIENTES_CLINICOS', 1, SYSUTCDATETIME());

COMMIT TRANSACTION;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'vacuna_aplicada' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.vacuna_aplicada (
        id_vacuna_aplicada       BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_cita                  BIGINT NOT NULL,
        id_paciente               BIGINT NOT NULL,
        id_tipo_vacuna            BIGINT NOT NULL,
        dosis                     NVARCHAR(50) NULL,
        fecha_aplicacion          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        observaciones             NVARCHAR(255) NULL,
        activo                    BIT NOT NULL DEFAULT 1,
        fecha_creacion            DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion        DATETIME2 NULL,
        id_usuario_creacion       BIGINT NULL,
        id_usuario_modificacion   BIGINT NULL,
        CONSTRAINT fk_vacuna_aplicada_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita),
        CONSTRAINT fk_vacuna_aplicada_paciente FOREIGN KEY (id_paciente) REFERENCES dbo.pacientes (id_paciente),
        CONSTRAINT fk_vacuna_aplicada_tipo FOREIGN KEY (id_tipo_vacuna) REFERENCES dbo.cat_valor_catalogo (id_valor_catalogo)
    );
END
GO

-- Verificación: debe devolver TOXICO en TIPO_ANTECEDENTE, TIPO_VACUNA
-- creado y la tabla vacuna_aplicada lista.
SELECT v.codigo, v.nombre
FROM dbo.cat_valor_catalogo v
JOIN dbo.cat_tipo_catalogo t ON t.id_tipo_catalogo = v.id_tipo_catalogo
WHERE t.codigo = 'TIPO_ANTECEDENTE' AND v.codigo = 'TOXICO';

SELECT codigo, nombre FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_VACUNA';

SELECT t.name AS tabla FROM sys.tables t WHERE t.name = 'vacuna_aplicada';
GO
