-- =============================================================================
-- Inserta un convenio corporativo. Columnas confirmadas contra el esquema
-- real (MEDICENTRO_schema_version_Arturo_final.sql) — ya no es una
-- propuesta a ciegas como la primera versión de este script.
--
-- id_aseguradora e id_estado_convenio son OBLIGATORIOS en la tabla (NOT
-- NULL): un convenio siempre depende de una aseguradora y de un estado.
--
-- Toca: aseguradoras (solo si no existe la que pongas), cat_tipo_catalogo/
-- cat_valor_catalogo (solo si falta el catálogo ESTADO_CONVENIO), convenios.
-- Es re-ejecutable: no duplica el convenio si ya existe ese nombre.
-- =============================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

DECLARE
    @NombreConvenio     NVARCHAR(200) = N'Convenio Corporativo Ejemplo, S.A.',
    @NombreAseguradora  NVARCHAR(150) = N'ASSA',
    @EstadoConvenio     VARCHAR(50)   = 'VIGENTE',  -- VIGENTE | VENCIDO | SUSPENDIDO
    @FechaInicio        DATE          = '2026-01-01',
    @FechaFin           DATE          = '2026-12-31',
    @PorcentajeCobertura DECIMAL(5,2) = 80.00,       -- opcional
    @Condiciones        NVARCHAR(MAX) = N'Convenio de prueba';

-- Catálogo ESTADO_CONVENIO (se crea si no existe)
IF NOT EXISTS (SELECT 1 FROM cat_tipo_catalogo WHERE codigo = 'ESTADO_CONVENIO')
    INSERT INTO cat_tipo_catalogo (codigo, nombre) VALUES ('ESTADO_CONVENIO', 'Estado de convenio');

INSERT INTO cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden)
SELECT t.id_tipo_catalogo, v.codigo, v.nombre, v.orden
FROM cat_tipo_catalogo t
CROSS APPLY (VALUES ('VIGENTE','Vigente',1), ('VENCIDO','Vencido',2), ('SUSPENDIDO','Suspendido',3)) AS v(codigo, nombre, orden)
WHERE t.codigo = 'ESTADO_CONVENIO'
  AND NOT EXISTS (SELECT 1 FROM cat_valor_catalogo cv WHERE cv.id_tipo_catalogo = t.id_tipo_catalogo AND cv.codigo = v.codigo);

DECLARE @IdEstadoConvenio BIGINT = (
    SELECT cv.id_valor_catalogo FROM cat_valor_catalogo cv
    JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo = cv.id_tipo_catalogo
    WHERE t.codigo = 'ESTADO_CONVENIO' AND cv.codigo = @EstadoConvenio
);
IF @IdEstadoConvenio IS NULL
    THROW 50000, 'Estado de convenio no válido.', 1;

-- Aseguradora (se crea si no existe)
IF NOT EXISTS (SELECT 1 FROM aseguradoras WHERE nombre = @NombreAseguradora)
    INSERT INTO aseguradoras (nombre) VALUES (@NombreAseguradora);
DECLARE @IdAseguradora BIGINT = (SELECT TOP 1 id_aseguradora FROM aseguradoras WHERE nombre = @NombreAseguradora ORDER BY id_aseguradora);

IF EXISTS (SELECT 1 FROM convenios WHERE nombre_convenio = @NombreConvenio)
    PRINT 'Ya existe un convenio con ese nombre; no se inserta otro.';
ELSE
    INSERT INTO convenios (id_aseguradora, nombre_convenio, fecha_inicio, fecha_fin, porcentaje_cobertura_general, condiciones, id_estado_convenio)
    VALUES (@IdAseguradora, @NombreConvenio, @FechaInicio, @FechaFin, @PorcentajeCobertura, @Condiciones, @IdEstadoConvenio);

COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- -----------------------------------------------------------------------------
-- Verificación
-- -----------------------------------------------------------------------------
SELECT c.id_convenio, c.nombre_convenio, a.nombre AS aseguradora, c.fecha_inicio, c.fecha_fin, c.id_estado_convenio
FROM convenios c JOIN aseguradoras a ON a.id_aseguradora = c.id_aseguradora
WHERE c.nombre_convenio = @NombreConvenio;
