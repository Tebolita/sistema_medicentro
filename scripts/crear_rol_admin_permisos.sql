-- =============================================================================
-- Crear rol ADMINISTRADOR con un permiso por cada módulo del sistema y
-- asignárselo al usuario con id_usuario = 2.
-- Toca: permisos -> roles -> rol_permiso -> usuario_rol
-- Idempotente: se puede correr varias veces sin duplicar nada.
--
-- Cómo lo usa el front (ver src/app/service/permisos-menu.service.ts):
--   usuario -> usuario_rol (activo) -> rol_permiso -> permisos.id_modulo
--   -> cat_valor_catalogo (MODULO_SISTEMA).codigo -> sección del menú
-- Requiere que MODULO_SISTEMA esté sembrado (scripts/sembrar_catalogos.sql).
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

-- -----------------------------------------------------------------------------
-- 1) EDITA AQUÍ
-- -----------------------------------------------------------------------------
DECLARE
    @IdUsuario     BIGINT        = 2,
    -- Debe llamarse exactamente 'ADMIN': el backend (MatrizAcceso.cs) autoriza
    -- por el nombre del rol que va en el token, no por rol_permiso.
    @NombreRol     NVARCHAR(100) = N'ADMIN',
    @DescripcionRol NVARCHAR(255) = N'Acceso total a todos los módulos del sistema';

IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = @IdUsuario)
    THROW 50000, 'El usuario indicado no existe en la tabla usuarios.', 1;

-- -----------------------------------------------------------------------------
-- 2) Validar que el catálogo MODULO_SISTEMA tenga los 9 módulos
-- -----------------------------------------------------------------------------
DECLARE @Modulos TABLE (codigo NVARCHAR(50) PRIMARY KEY, nombre NVARCHAR(150));
INSERT INTO @Modulos (codigo, nombre) VALUES
    ('RECEPCION',            N'Recepción'),
    ('SEGUROS_MEDICOS',      N'Seguros Médicos'),
    ('EXPEDIENTES_CLINICOS', N'Expedientes Clínicos'),
    ('LABORATORIO',          N'Laboratorio y Diagnóstico'),
    ('EMERGENCIAS',          N'Emergencias'),
    ('HOSPITALIZACION',      N'Hospitalización'),
    ('FARMACIA',             N'Farmacia'),
    ('FACTURACION_COBROS',   N'Facturación y Cobros'),
    ('MANTENIMIENTO',        N'Mantenimiento');

IF EXISTS (
    SELECT 1
    FROM @Modulos m
    WHERE NOT EXISTS (
        SELECT 1
        FROM cat_valor_catalogo cv
        JOIN cat_tipo_catalogo ct ON ct.id_tipo_catalogo = cv.id_tipo_catalogo
        WHERE ct.codigo = 'MODULO_SISTEMA' AND cv.codigo = m.codigo
    )
)
    THROW 50001, 'Faltan valores del catálogo MODULO_SISTEMA. Corre primero scripts/sembrar_catalogos.sql.', 1;

-- -----------------------------------------------------------------------------
-- 3) Permisos: uno por módulo (código ACCESO_<MODULO>), si no existe ya
-- -----------------------------------------------------------------------------
INSERT INTO permisos (codigo, nombre, id_modulo, descripcion)
SELECT
    'ACCESO_' + m.codigo,
    N'Acceso a ' + m.nombre,
    cv.id_valor_catalogo,
    N'Permite ver y usar el módulo ' + m.nombre
FROM @Modulos m
JOIN cat_valor_catalogo cv ON cv.codigo = m.codigo
JOIN cat_tipo_catalogo ct  ON ct.id_tipo_catalogo = cv.id_tipo_catalogo AND ct.codigo = 'MODULO_SISTEMA'
WHERE NOT EXISTS (SELECT 1 FROM permisos p WHERE p.codigo = 'ACCESO_' + m.codigo);

-- Reactivar por si alguno existía inactivo
UPDATE p SET activo = 1, fecha_modificacion = SYSDATETIME()
FROM permisos p
JOIN @Modulos m ON p.codigo = 'ACCESO_' + m.codigo
WHERE p.activo = 0;

-- -----------------------------------------------------------------------------
-- 4) Rol Administrador
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM roles WHERE nombre = @NombreRol)
    INSERT INTO roles (nombre, descripcion, id_usuario_creacion)
    VALUES (@NombreRol, @DescripcionRol, @IdUsuario);
ELSE
    UPDATE roles SET activo = 1, fecha_modificacion = SYSDATETIME(), id_usuario_modificacion = @IdUsuario
    WHERE nombre = @NombreRol AND activo = 0;

DECLARE @IdRol BIGINT = (SELECT id_rol FROM roles WHERE nombre = @NombreRol);

-- -----------------------------------------------------------------------------
-- 5) rol_permiso: todos los permisos de módulo al rol Administrador
-- -----------------------------------------------------------------------------
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT @IdRol, p.id_permiso
FROM permisos p
JOIN @Modulos m ON p.codigo = 'ACCESO_' + m.codigo
WHERE NOT EXISTS (
    SELECT 1 FROM rol_permiso rp WHERE rp.id_rol = @IdRol AND rp.id_permiso = p.id_permiso
);

UPDATE rp SET activo = 1
FROM rol_permiso rp
JOIN permisos p ON p.id_permiso = rp.id_permiso
JOIN @Modulos m ON p.codigo = 'ACCESO_' + m.codigo
WHERE rp.id_rol = @IdRol AND rp.activo = 0;

-- -----------------------------------------------------------------------------
-- 6) usuario_rol: asignar Administrador al usuario 2
-- -----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM usuario_rol WHERE id_usuario = @IdUsuario AND id_rol = @IdRol)
    INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (@IdUsuario, @IdRol);
ELSE
    UPDATE usuario_rol SET activo = 1
    WHERE id_usuario = @IdUsuario AND id_rol = @IdRol AND activo = 0;

COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;

-- -----------------------------------------------------------------------------
-- Verificación: debe listar 9 filas (una por módulo) para el usuario 2
-- -----------------------------------------------------------------------------
SELECT
    u.id_usuario, u.nombre_usuario,
    r.nombre  AS rol,
    p.codigo  AS permiso,
    cv.codigo AS modulo,
    ur.activo AS usuario_rol_activo,
    rp.activo AS rol_permiso_activo
FROM usuarios u
JOIN usuario_rol ur       ON ur.id_usuario = u.id_usuario
JOIN roles r              ON r.id_rol = ur.id_rol
JOIN rol_permiso rp       ON rp.id_rol = r.id_rol
JOIN permisos p           ON p.id_permiso = rp.id_permiso
JOIN cat_valor_catalogo cv ON cv.id_valor_catalogo = p.id_modulo
WHERE u.id_usuario = 2 AND r.nombre = N'ADMIN'
ORDER BY cv.orden;
