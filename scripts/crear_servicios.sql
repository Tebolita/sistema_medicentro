-- Catálogo de servicios clínicos cobrables (curaciones, nebulizaciones,
-- electrocardiogramas, etc.), con precio obligatorio. Mismo rol que
-- medicamentos para "Costo paciente" (consulta y hospitalización), pero sin
-- receta ni inventario.
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'servicios')
BEGIN
    CREATE TABLE dbo.servicios (
        id_servicio BIGINT IDENTITY(1,1) PRIMARY KEY,
        nombre NVARCHAR(200) NOT NULL,
        descripcion NVARCHAR(500) NULL,
        precio NUMERIC(12,2) NOT NULL,
        activo BIT NOT NULL DEFAULT 1,
        fecha_creacion DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion DATETIME2 NULL,
        id_usuario_creacion BIGINT NULL,
        id_usuario_modificacion BIGINT NULL
    );
END
GO
