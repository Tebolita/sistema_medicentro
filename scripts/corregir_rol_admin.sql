-- =============================================================================
-- Corrige el rol de administrador para que el BACKEND lo reconozca.
--
-- El backend (MediCentroBackendV3/Seguridad/MatrizAcceso.cs) no usa
-- rol_permiso: mete en el JWT el roles.nombre de cada rol activo del usuario
-- y solo da acceso total si ese nombre es exactamente 'ADMIN' (sin importar
-- mayúsculas). /api/usuarios, /roles, /permisos y /bitacora-auditoria son
-- solo para ADMIN, por eso con el rol 'Administrador' respondía 403.
--
-- Este script deja un único rol 'ADMIN', con los permisos de módulo
-- (ACCESO_*) y asignado al usuario 2. Idempotente.
-- Después de correrlo: cerrar sesión y volver a entrar (el token se genera
-- en el login, el viejo sigue sin el rol ADMIN).
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRANSACTION;

BEGIN TRY

DECLARE @IdUsuario BIGINT = 2;

IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = @IdUsuario)
    THROW 50000, 'El usuario indicado no existe en la tabla usuarios.', 1;

DECLARE @IdRolAdmin BIGINT = (SELECT id_rol FROM roles WHERE nombre = N'ADMIN');
DECLARE @IdRolViejo BIGINT = (SELECT id_rol FROM roles WHERE nombre = N'Administrador');

-- 1) Si no existe 'ADMIN': renombrar 'Administrador' (o crearlo si tampoco existe)
IF @IdRolAdmin IS NULL
BEGIN
    IF @IdRolViejo IS NOT NULL
    BEGIN
        UPDATE roles
        SET nombre = N'ADMIN', activo = 1,
            fecha_modificacion = SYSDATETIME(), id_usuario_modificacion = @IdUsuario
        WHERE id_rol = @IdRolViejo;
        SET @IdRolAdmin = @IdRolViejo;
        SET @IdRolViejo = NULL;
    END
    ELSE
    BEGIN
        INSERT INTO roles (nombre, descripcion, id_usuario_creacion)
        VALUES (N'ADMIN', N'Acceso total a todos los módulos del sistema', @IdUsuario);
        SET @IdRolAdmin = SCOPE_IDENTITY();
    END
END
ELSE
    UPDATE roles SET activo = 1 WHERE id_rol = @IdRolAdmin AND activo = 0;

-- 2) Permisos de módulo (ACCESO_*) al rol ADMIN
INSERT INTO rol_permiso (id_rol, id_permiso)
SELECT @IdRolAdmin, p.id_permiso
FROM permisos p
WHERE p.codigo LIKE 'ACCESO[_]%'
  AND NOT EXISTS (SELECT 1 FROM rol_permiso rp WHERE rp.id_rol = @IdRolAdmin AND rp.id_permiso = p.id_permiso);

UPDATE rp SET activo = 1
FROM rol_permiso rp
JOIN permisos p ON p.id_permiso = rp.id_permiso
WHERE rp.id_rol = @IdRolAdmin AND p.codigo LIKE 'ACCESO[_]%' AND rp.activo = 0;

-- 3) Asignar ADMIN al usuario 2
IF NOT EXISTS (SELECT 1 FROM usuario_rol WHERE id_usuario = @IdUsuario AND id_rol = @IdRolAdmin)
    INSERT INTO usuario_rol (id_usuario, id_rol) VALUES (@IdUsuario, @IdRolAdmin);
ELSE
    UPDATE usuario_rol SET activo = 1
    WHERE id_usuario = @IdUsuario AND id_rol = @IdRolAdmin AND activo = 0;

-- 4) Si quedó también el rol 'Administrador' aparte (porque ADMIN ya existía),
--    se desactiva para no tener dos roles de admin.
IF @IdRolViejo IS NOT NULL
BEGIN
    UPDATE usuario_rol SET activo = 0 WHERE id_rol = @IdRolViejo;
    UPDATE roles SET activo = 0, fecha_modificacion = SYSDATETIME(), id_usuario_modificacion = @IdUsuario
    WHERE id_rol = @IdRolViejo;
END

COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;

-- -----------------------------------------------------------------------------
-- Verificación 1: roles activos del usuario 2 (lo que irá en el token).
-- Debe aparecer ADMIN.
-- -----------------------------------------------------------------------------
SELECT u.id_usuario, u.nombre_usuario, u.activo AS usuario_activo,
       r.nombre AS rol, r.activo AS rol_activo, ur.activo AS asignacion_activa
FROM usuarios u
JOIN usuario_rol ur ON ur.id_usuario = u.id_usuario
JOIN roles r        ON r.id_rol = ur.id_rol
WHERE u.id_usuario = 2;

-- -----------------------------------------------------------------------------
-- Verificación 2: permisos de módulo del rol ADMIN (deben ser 9)
-- -----------------------------------------------------------------------------
SELECT r.nombre AS rol, p.codigo AS permiso, cv.codigo AS modulo
FROM roles r
JOIN rol_permiso rp        ON rp.id_rol = r.id_rol AND rp.activo = 1
JOIN permisos p            ON p.id_permiso = rp.id_permiso
JOIN cat_valor_catalogo cv ON cv.id_valor_catalogo = p.id_modulo
WHERE r.nombre = N'ADMIN'
ORDER BY cv.orden;
