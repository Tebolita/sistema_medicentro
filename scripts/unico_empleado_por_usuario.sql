-- =============================================================================
-- Un empleado solo puede estar vinculado a UNA cuenta de usuario activa.
-- (Su código de empleado también sirve para iniciar sesión.)
--
-- El backend ya lo valida al crear/editar (UsuariosService), pero el índice
-- lo garantiza también para inserts por SQL o reactivaciones desde
-- "Eliminados". Las cuentas dadas de baja (activo = 0) y las cuentas sin
-- empleado (id_empleado NULL) no cuentan.
-- =============================================================================

SET NOCOUNT ON;

-- -----------------------------------------------------------------------------
-- 1) Revisar duplicados actuales. Si esta consulta devuelve filas, el índice
--    NO se puede crear: hay que quitar el empleado (o dar de baja) a una de
--    las cuentas de cada grupo y volver a correr el script.
-- -----------------------------------------------------------------------------
SELECT u.id_empleado, u.id_usuario, u.nombre_usuario, u.correo, u.fecha_creacion
FROM usuarios u
WHERE u.activo = 1
  AND u.id_empleado IN (
      SELECT id_empleado
      FROM usuarios
      WHERE activo = 1 AND id_empleado IS NOT NULL
      GROUP BY id_empleado
      HAVING COUNT(*) > 1
  )
ORDER BY u.id_empleado, u.fecha_creacion;

-- -----------------------------------------------------------------------------
-- 2) Índice único filtrado (solo si no hay duplicados)
-- -----------------------------------------------------------------------------
IF EXISTS (
    SELECT 1 FROM usuarios
    WHERE activo = 1 AND id_empleado IS NOT NULL
    GROUP BY id_empleado HAVING COUNT(*) > 1
)
BEGIN
    PRINT 'Hay empleados con más de un usuario activo (ver consulta de arriba). Corrígelos y vuelve a correr el script.';
END
ELSE IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_usuarios_empleado_activo' AND object_id = OBJECT_ID('dbo.usuarios'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX ux_usuarios_empleado_activo
        ON dbo.usuarios (id_empleado)
        WHERE id_empleado IS NOT NULL AND activo = 1;
    PRINT 'Índice ux_usuarios_empleado_activo creado.';
END
ELSE
BEGIN
    PRINT 'El índice ux_usuarios_empleado_activo ya existe.';
END
