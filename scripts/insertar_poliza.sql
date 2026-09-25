-- =============================================================================
-- Insertar una póliza de seguro (y su aseguradora si no existe)
-- Toca: aseguradoras, cat_tipo_catalogo/cat_valor_catalogo (solo si faltan),
--       polizas_seguro
-- Útil para probar facturas Digefact (id_poliza en facturas).
-- Los ids de catálogo se resuelven por (tipo, código); no se asumen.
-- Re-ejecutable: no duplica la póliza si ya existe ese numero_poliza.
-- =============================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

-- -----------------------------------------------------------------------------
-- 1) EDITA AQUÍ los datos de la póliza
-- -----------------------------------------------------------------------------
DECLARE
    @CodigoExpediente   NVARCHAR(50)  = N'EXP-0001',       -- paciente asegurado (debe existir)
    @NombreAseguradora  NVARCHAR(150) = N'ASSA',           -- se crea si no existe
    @Ramo               VARCHAR(50)   = 'GASTOS_MEDICOS_MAYORES',   -- GASTOS_MEDICOS_MAYORES | GASTOS_MEDICOS_MENORES | HOSPITALARIO | CORPORATIVO
    @Titularidad        VARCHAR(50)   = 'TITULAR',         -- TITULAR | DEPENDIENTE
    @EstadoPoliza       VARCHAR(50)   = 'VIGENTE',         -- VIGENTE | VENCIDA | SUSPENDIDA
    @NumeroPoliza       NVARCHAR(50)  = N'POL-0001',
    @NumeroCertificado  NVARCHAR(50)  = N'CERT-0001',      -- opcional
    @NombreTitular      NVARCHAR(200) = NULL,              -- solo si es dependiente
    @NombrePropietario  NVARCHAR(200) = NULL,
    @CodigoAutorizacion NVARCHAR(50)  = NULL,              -- solo Mi Cope
    @PorcentajeCopago   DECIMAL(5,2)  = 20.00,             -- opcional
    @MontoCopago        DECIMAL(12,2) = NULL,              -- opcional
    @InicioVigencia     DATE          = '2026-01-01',
    @FinVigencia        DATE          = '2026-12-31',
    @Observaciones      NVARCHAR(500) = N'Póliza de prueba';

-- -----------------------------------------------------------------------------
-- 2) Catálogos (se crean solo si faltan)
-- -----------------------------------------------------------------------------
DECLARE @Seed TABLE (tipo VARCHAR(50), tipoNombre VARCHAR(100), codigo VARCHAR(50), nombre VARCHAR(100), orden INT);
INSERT INTO @Seed VALUES
 ('RAMO_SEGURO','Ramo de seguro','GASTOS_MEDICOS_MAYORES','Gastos médicos mayores',1),
 ('RAMO_SEGURO','Ramo de seguro','GASTOS_MEDICOS_MENORES','Gastos médicos menores',2),
 ('RAMO_SEGURO','Ramo de seguro','HOSPITALARIO','Hospitalario',3),
 ('RAMO_SEGURO','Ramo de seguro','CORPORATIVO','Corporativo',4),
 ('TITULARIDAD_POLIZA','Titularidad de póliza','TITULAR','Titular',1),
 ('TITULARIDAD_POLIZA','Titularidad de póliza','DEPENDIENTE','Dependiente',2),
 ('ESTADO_POLIZA','Estado de póliza','VIGENTE','Vigente',1),
 ('ESTADO_POLIZA','Estado de póliza','VENCIDA','Vencida',2),
 ('ESTADO_POLIZA','Estado de póliza','SUSPENDIDA','Suspendida',3);

INSERT INTO cat_tipo_catalogo (codigo, nombre)
SELECT DISTINCT s.tipo, s.tipoNombre FROM @Seed s
WHERE NOT EXISTS (SELECT 1 FROM cat_tipo_catalogo t WHERE t.codigo = s.tipo);

INSERT INTO cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden)
SELECT t.id_tipo_catalogo, s.codigo, s.nombre, s.orden
FROM @Seed s JOIN cat_tipo_catalogo t ON t.codigo = s.tipo
WHERE NOT EXISTS (
    SELECT 1 FROM cat_valor_catalogo v
    WHERE v.id_tipo_catalogo = t.id_tipo_catalogo AND v.codigo = s.codigo);

DECLARE
 @IdRamo BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='RAMO_SEGURO' AND v.codigo=@Ramo),
 @IdTitularidad BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='TITULARIDAD_POLIZA' AND v.codigo=@Titularidad),
 @IdEstado BIGINT = (SELECT v.id_valor_catalogo FROM cat_valor_catalogo v JOIN cat_tipo_catalogo t ON t.id_tipo_catalogo=v.id_tipo_catalogo WHERE t.codigo='ESTADO_POLIZA' AND v.codigo=@EstadoPoliza);

IF @IdRamo IS NULL OR @IdTitularidad IS NULL OR @IdEstado IS NULL
    THROW 50000, 'Ramo, titularidad o estado no válidos. Revisa los valores permitidos junto a cada variable.', 1;

-- -----------------------------------------------------------------------------
-- 3) Paciente y aseguradora
-- -----------------------------------------------------------------------------
DECLARE @IdPaciente BIGINT = (SELECT id_paciente FROM pacientes WHERE codigo_expediente = @CodigoExpediente);
IF @IdPaciente IS NULL
    THROW 50001, 'No existe un paciente con ese código de expediente.', 1;

IF NOT EXISTS (SELECT 1 FROM aseguradoras WHERE nombre = @NombreAseguradora)
    INSERT INTO aseguradoras (nombre) VALUES (@NombreAseguradora);
DECLARE @IdAseguradora BIGINT = (SELECT TOP 1 id_aseguradora FROM aseguradoras WHERE nombre = @NombreAseguradora ORDER BY id_aseguradora);

-- -----------------------------------------------------------------------------
-- 4) Póliza
-- -----------------------------------------------------------------------------
IF EXISTS (SELECT 1 FROM polizas_seguro WHERE numero_poliza = @NumeroPoliza)
    PRINT 'Ya existe una póliza con ese número; no se inserta otra.';
ELSE
    INSERT INTO polizas_seguro (
        id_paciente, id_aseguradora, id_ramo, numero_poliza, numero_certificado,
        id_titularidad, nombre_titular, nombre_propietario, codigo_autorizacion,
        porcentaje_copago, monto_copago, fecha_inicio_vigencia, fecha_fin_vigencia,
        id_estado_poliza, observaciones
    )
    VALUES (
        @IdPaciente, @IdAseguradora, @IdRamo, @NumeroPoliza, @NumeroCertificado,
        @IdTitularidad, @NombreTitular, @NombrePropietario, @CodigoAutorizacion,
        @PorcentajeCopago, @MontoCopago, @InicioVigencia, @FinVigencia,
        @IdEstado, @Observaciones
    );

COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;

-- -----------------------------------------------------------------------------
-- Verificación: usa el id_poliza de aquí para probar facturas Digefact
-- -----------------------------------------------------------------------------
SELECT ps.id_poliza, ps.numero_poliza, p.codigo_expediente, a.nombre AS aseguradora,
       ps.id_ramo, ps.id_titularidad, ps.id_estado_poliza,
       ps.porcentaje_copago, ps.fecha_inicio_vigencia, ps.fecha_fin_vigencia
FROM polizas_seguro ps
JOIN pacientes p ON p.id_paciente = ps.id_paciente
JOIN aseguradoras a ON a.id_aseguradora = ps.id_aseguradora
WHERE ps.numero_poliza = @NumeroPoliza;
