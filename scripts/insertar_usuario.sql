-- =============================================================================
-- Insertar un usuario nuevo en MEDICENTRO
-- Toca: empleados -> usuarios -> usuario_rol
-- (roles/puestos/cat_valor_catalogo se resuelven por nombre/codigo, no por id)
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;  -- cualquier error revierte toda la transacción automáticamente, sin dejarla abierta a medias
BEGIN TRANSACTION;

BEGIN TRY

-- -----------------------------------------------------------------------------
-- 1) EDITA AQUÍ los datos del empleado, usuario y rol a asignar
-- -----------------------------------------------------------------------------
DECLARE
    -- Datos del empleado
    @PrimerNombre     NVARCHAR(100) = N'Juan',
    @SegundoNombre    NVARCHAR(100) = NULL,
    @PrimerApellido   NVARCHAR(100) = N'Pérez',
    @SegundoApellido  NVARCHAR(100) = NULL,
    @FechaNacimiento  DATE          = '1990-05-14',
    @NumeroDocumento  NVARCHAR(50)  = N'2589654120101',
    @NombrePuesto     NVARCHAR(150) = N'Recepcionista',   -- debe existir en `puestos`, o se crea si no existe
    @NombreEspecialidad NVARCHAR(150) = NULL,             -- solo si es médico, ej. N'Medicina General'
    @Colegiado        NVARCHAR(50)  = NULL,               -- solo si es médico
    @FechaIngreso     DATE          = '2026-09-10',
    @Telefono         NVARCHAR(30)  = N'5512-3344',
    @CorreoEmpleado   NVARCHAR(150) = N'juan.perez@medicentro.gt',

    -- Datos del usuario (login) 
    @NombreUsuario    NVARCHAR(100) = N'admin',
    @CorreoUsuario    NVARCHAR(150) = N'admin@medicentro.gt',
    @HashPassword     NVARCHAR(255) = N'$2b$12$3vxDI2FQLA9azAZzQ/tEm.SCZcuO0Wl6bXvDoNA2L29amYptCS6tm', -- nunca texto plano: hashear en la app (bcrypt) antes de insertar

    -- Rol a asignar
    @NombreRol        NVARCHAR(100) = N'Recepcion';       -- debe existir en `roles`, o se crea (sin permisos) si no existe

-- -----------------------------------------------------------------------------
-- 2) Resolver catálogos (ESTADO_EMPLEADO / ESTADO_USUARIO). En tu base todavía
--    no existen ni el TIPO ni los VALORES para estos dos grupos, así que se
--    siembran ambos (idéntico patrón al resto del script base .sql).
-- -----------------------------------------------------------------------------
INSERT INTO cat_tipo_catalogo (codigo, nombre)
SELECT v.codigo, v.nombre
FROM (VALUES
    ('ESTADO_EMPLEADO', 'Estado de empleado'),
    ('ESTADO_USUARIO', 'Estado de usuario')
) AS v(codigo, nombre)
WHERE NOT EXISTS (
    SELECT 1 FROM cat_tipo_catalogo existing WHERE existing.codigo = v.codigo
);

INSERT INTO cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden)
SELECT t.id_tipo_catalogo, v.codigo, v.nombre, v.orden
FROM cat_tipo_catalogo t
CROSS APPLY (VALUES
    ('ACTIVO', 'Activo', 1), ('INACTIVO', 'Inactivo', 2), ('SUSPENDIDO', 'Suspendido', 3)
) AS v(codigo, nombre, orden)
WHERE t.codigo = 'ESTADO_EMPLEADO'
  AND NOT EXISTS (
    SELECT 1 FROM cat_valor_catalogo existing
    WHERE existing.id_tipo_catalogo = t.id_tipo_catalogo AND existing.codigo = v.codigo
  );

INSERT INTO cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden)
SELECT t.id_tipo_catalogo, v.codigo, v.nombre, v.orden
FROM cat_tipo_catalogo t
CROSS APPLY (VALUES
    ('ACTIVO', 'Activo', 1), ('BLOQUEADO', 'Bloqueado', 2), ('INACTIVO', 'Inactivo', 3)
) AS v(codigo, nombre, orden)
WHERE t.codigo = 'ESTADO_USUARIO'
  AND NOT EXISTS (
    SELECT 1 FROM cat_valor_catalogo existing
    WHERE existing.id_tipo_catalogo = t.id_tipo_catalogo AND existing.codigo = v.codigo
  );

DECLARE @IdEstadoEmpleadoActivo BIGINT = (
    SELECT cv.id_valor_catalogo
    FROM cat_valor_catalogo cv
    JOIN cat_tipo_catalogo ct ON ct.id_tipo_catalogo = cv.id_tipo_catalogo
    WHERE ct.codigo = 'ESTADO_EMPLEADO' AND cv.codigo = 'ACTIVO'
);

DECLARE @IdEstadoUsuarioActivo BIGINT = (
    SELECT cv.id_valor_catalogo
    FROM cat_valor_catalogo cv
    JOIN cat_tipo_catalogo ct ON ct.id_tipo_catalogo = cv.id_tipo_catalogo
    WHERE ct.codigo = 'ESTADO_USUARIO' AND cv.codigo = 'ACTIVO'
);

IF @IdEstadoEmpleadoActivo IS NULL OR @IdEstadoUsuarioActivo IS NULL
    THROW 50000, 'No se pudieron resolver los catalogos ESTADO_EMPLEADO/ESTADO_USUARIO. Revisa cat_tipo_catalogo y cat_valor_catalogo.', 1;

-- -----------------------------------------------------------------------------
-- 3) Puesto: usarlo si ya existe, crearlo si no
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM puestos WHERE nombre = @NombrePuesto)
BEGIN
    INSERT INTO puestos (nombre) VALUES (@NombrePuesto);
END
DECLARE @IdPuesto BIGINT = (SELECT id_puesto FROM puestos WHERE nombre = @NombrePuesto);

-- Especialidad (solo si aplica, ej. médicos)
DECLARE @IdEspecialidad BIGINT = NULL;
IF @NombreEspecialidad IS NOT NULL
BEGIN
    SET @IdEspecialidad = (SELECT id_especialidad FROM especialidades WHERE nombre = @NombreEspecialidad);
    IF @IdEspecialidad IS NULL
        THROW 50001, 'La especialidad indicada no existe en la tabla especialidades.', 1;
END

-- -----------------------------------------------------------------------------
-- 4) Insertar EMPLEADO
-- -----------------------------------------------------------------------------
INSERT INTO empleados (
    primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
    fecha_nacimiento, numero_documento,
    id_puesto, id_especialidad, colegiado,
    fecha_ingreso, id_estado_empleado,
    telefono, correo
)
VALUES (
    @PrimerNombre, @SegundoNombre, @PrimerApellido, @SegundoApellido,
    @FechaNacimiento, @NumeroDocumento,
    @IdPuesto, @IdEspecialidad, @Colegiado,
    @FechaIngreso, @IdEstadoEmpleadoActivo,
    @Telefono, @CorreoEmpleado
);
DECLARE @IdEmpleado BIGINT = SCOPE_IDENTITY();

-- -----------------------------------------------------------------------------
-- 5) Insertar USUARIO (login), ligado al empleado recién creado
-- -----------------------------------------------------------------------------
INSERT INTO usuarios (
    id_empleado, nombre_usuario, correo, hash_password,
    id_estado_usuario, requiere_cambio_password
)
VALUES (
    @IdEmpleado, @NombreUsuario, @CorreoUsuario, @HashPassword,
    @IdEstadoUsuarioActivo, 1  -- obliga a cambiar contraseña en el primer login
);
DECLARE @IdUsuario BIGINT = SCOPE_IDENTITY();

-- -----------------------------------------------------------------------------
-- 6) Rol: usarlo si ya existe, crearlo (sin permisos) si no, y asignarlo
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM roles WHERE nombre = @NombreRol)
BEGIN
    INSERT INTO roles (nombre) VALUES (@NombreRol);
END
DECLARE @IdRol BIGINT = (SELECT id_rol FROM roles WHERE nombre = @NombreRol);

INSERT INTO usuario_rol (id_usuario, id_rol)
VALUES (@IdUsuario, @IdRol);

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
SELECT
    u.id_usuario, u.nombre_usuario, u.correo,
    e.primer_nombre, e.primer_apellido,
    p.nombre AS puesto,
    r.nombre AS rol
FROM usuarios u
JOIN empleados e ON e.id_empleado = u.id_empleado
JOIN puestos p ON p.id_puesto = e.id_puesto
JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
JOIN roles r ON r.id_rol = ur.id_rol
WHERE u.id_usuario = @IdUsuario;


SELECT
    u.id_usuario, u.nombre_usuario, u.correo,
    e.primer_nombre, e.primer_apellido,
    p.nombre AS puesto,
    r.nombre AS rol
FROM usuarios u
JOIN empleados e ON e.id_empleado = u.id_empleado
JOIN puestos p ON p.id_puesto = e.id_puesto
JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
JOIN roles r ON r.id_rol = ur.id_rol
WHERE u.id_usuario = 1;

SELECT nombre_usuario, id_usuario, hash_password,  * FROM usuarios
