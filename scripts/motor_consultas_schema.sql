-- =============================================================================
-- Cambios de esquema propuestos en SOLICITUD_MOTOR_CONSULTAS.md. Es solo el
-- "qué" (columnas/tabla nueva) — el código que las usa (entidades, DTOs,
-- controllers, Angular) todavía no existe; es el siguiente paso una vez se
-- apruebe el documento.
--
-- Es re-ejecutable: cada ALTER/CREATE solo corre si falta. Ya se corrió una
-- vez (Fase 1: requiere_operacion/notas_operacion en citas, id_cita en
-- recetas); esta versión agrega las piezas que quedaron pendientes de las
-- decisiones de la sección 12: UNIQUE en constancia_medica, id_sala en
-- casos_emergencia, e id_tipo_operacion en citas (con su catálogo nuevo).
-- =============================================================================

SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;
BEGIN TRY

-- ----------------------------------------------------------------------------
-- 1. Constancia médica (tabla nueva) — ver sección 1 del documento.
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'constancia_medica' AND schema_id = SCHEMA_ID('dbo'))
BEGIN
    CREATE TABLE dbo.constancia_medica (
        id_constancia           BIGINT IDENTITY(1,1) PRIMARY KEY,
        id_cita                 BIGINT NOT NULL,
        id_paciente             BIGINT NOT NULL,
        id_medico               BIGINT NOT NULL,
        diagnostico             NVARCHAR(500) NULL,
        contenido               NVARCHAR(MAX) NOT NULL,
        activo                  BIT NOT NULL DEFAULT 1,
        fecha_creacion          DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        fecha_modificacion      DATETIME2 NULL,
        id_usuario_creacion     BIGINT NULL,
        id_usuario_modificacion BIGINT NULL,
        CONSTRAINT fk_constancia_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita),
        CONSTRAINT fk_constancia_paciente FOREIGN KEY (id_paciente) REFERENCES dbo.pacientes (id_paciente),
        CONSTRAINT fk_constancia_medico FOREIGN KEY (id_medico) REFERENCES dbo.empleados (id_empleado),
        CONSTRAINT uq_constancia_cita UNIQUE (id_cita)
    );
END

-- Por si la tabla ya existía de una corrida anterior sin el UNIQUE (decisión
-- de la sección 12: una constancia por consulta, 1:1).
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'constancia_medica' AND schema_id = SCHEMA_ID('dbo'))
AND NOT EXISTS (SELECT 1 FROM sys.key_constraints WHERE name = 'uq_constancia_cita')
    ALTER TABLE dbo.constancia_medica ADD CONSTRAINT uq_constancia_cita UNIQUE (id_cita);

-- ----------------------------------------------------------------------------
-- 2. Emergencias -> Cita automática — ver sección 4. La sala también se
--    copia a la cita generada, no solo el médico (decisión de la sección 12).
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.casos_emergencia') AND name = 'id_cita')
    ALTER TABLE dbo.casos_emergencia ADD id_cita BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.casos_emergencia') AND name = 'id_sala')
    ALTER TABLE dbo.casos_emergencia ADD id_sala BIGINT NULL;

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_caso_emergencia_cita'
)
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.casos_emergencia') AND name = 'id_cita')
    ALTER TABLE dbo.casos_emergencia
        ADD CONSTRAINT fk_caso_emergencia_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita);

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_caso_emergencia_sala')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.casos_emergencia') AND name = 'id_sala')
    ALTER TABLE dbo.casos_emergencia
        ADD CONSTRAINT fk_caso_emergencia_sala FOREIGN KEY (id_sala) REFERENCES dbo.salas (id_sala);

-- ----------------------------------------------------------------------------
-- 3. Marcar cita para operación — ver sección 5. id_tipo_operacion apunta a
--    un catálogo nuevo (TIPO_OPERACION, sembrado más abajo sin valores: el
--    equipo clínico los agrega desde Mantenimiento → Catálogos).
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.citas') AND name = 'requiere_operacion')
    ALTER TABLE dbo.citas ADD requiere_operacion BIT NOT NULL DEFAULT 0;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.citas') AND name = 'id_tipo_operacion')
    ALTER TABLE dbo.citas ADD id_tipo_operacion BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.citas') AND name = 'notas_operacion')
    ALTER TABLE dbo.citas ADD notas_operacion NVARCHAR(500) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_citas_tipo_operacion')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.citas') AND name = 'id_tipo_operacion')
    ALTER TABLE dbo.citas
        ADD CONSTRAINT fk_citas_tipo_operacion FOREIGN KEY (id_tipo_operacion) REFERENCES dbo.cat_valor_catalogo (id_valor_catalogo);

-- Catálogo TIPO_OPERACION: solo el TIPO, sin valores — los tipos de
-- operación/cirugía son conocimiento clínico, no algo que deba inventar
-- este script. Se asigna al módulo HOSPITALIZACION (misma lógica que
-- categorizar_tipos_catalogo.sql): una operación normalmente implica
-- ingreso hospitalario.
IF NOT EXISTS (SELECT 1 FROM dbo.cat_tipo_catalogo WHERE codigo = 'TIPO_OPERACION')
    INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, codigo_modulo, activo, fecha_creacion)
    VALUES ('TIPO_OPERACION', N'Tipo de operación', 'HOSPITALIZACION', 1, SYSUTCDATETIME());

-- ----------------------------------------------------------------------------
-- 4. Receta ligada a su cita — ver SOLICITUD_EXPEDIENTE_UNIFICADO.md, 2.1.
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.recetas') AND name = 'id_cita')
    ALTER TABLE dbo.recetas ADD id_cita BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_receta_cita')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.recetas') AND name = 'id_cita')
    ALTER TABLE dbo.recetas
        ADD CONSTRAINT fk_receta_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita);

-- ----------------------------------------------------------------------------
-- 5. Medicamento externo en receta_detalle — ver sección 8.
--    id_medicamento pasa a NULL-able; se agrega el nombre libre y el CHECK
--    que obliga a llenar uno u otro, nunca ambos ni ninguno.
-- ----------------------------------------------------------------------------
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.receta_detalle') AND name = 'id_medicamento' AND is_nullable = 0
)
    ALTER TABLE dbo.receta_detalle ALTER COLUMN id_medicamento BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.receta_detalle') AND name = 'nombre_medicamento_externo')
    ALTER TABLE dbo.receta_detalle ADD nombre_medicamento_externo NVARCHAR(200) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'ck_receta_detalle_medicamento')
    ALTER TABLE dbo.receta_detalle
        ADD CONSTRAINT ck_receta_detalle_medicamento CHECK (
            (id_medicamento IS NOT NULL AND nombre_medicamento_externo IS NULL) OR
            (id_medicamento IS NULL AND nombre_medicamento_externo IS NOT NULL)
        );

-- ----------------------------------------------------------------------------
-- 6. Factura ligada a la línea de receta que la originó — ver sección 7
--    (necesario para saber qué descontar de inventario al pagar).
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.factura_detalle') AND name = 'id_receta_detalle')
    ALTER TABLE dbo.factura_detalle ADD id_receta_detalle BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_factura_detalle_receta_detalle')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.factura_detalle') AND name = 'id_receta_detalle')
    ALTER TABLE dbo.factura_detalle
        ADD CONSTRAINT fk_factura_detalle_receta_detalle FOREIGN KEY (id_receta_detalle) REFERENCES dbo.receta_detalle (id_receta_detalle);

-- ----------------------------------------------------------------------------
-- 7. Cantidad por medicamento en receta_detalle — para poder detectar si hay
--    stock suficiente (cruzando contra item_inventario.stock_actual por
--    id_medicamento). Sin valor por defecto real: las filas viejas quedan en
--    1 solo para no dejar NULL en una columna NOT NULL; no es un dato preciso
--    histórico, es un relleno de migración.
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.receta_detalle') AND name = 'cantidad')
BEGIN
    ALTER TABLE dbo.receta_detalle ADD cantidad DECIMAL(10,2) NULL;
    UPDATE dbo.receta_detalle SET cantidad = 1 WHERE cantidad IS NULL;
    ALTER TABLE dbo.receta_detalle ALTER COLUMN cantidad DECIMAL(10,2) NOT NULL;
END

-- ----------------------------------------------------------------------------
-- 8. Hospitalización ligada a la cita que la originó — mismo motivo que
--    id_cita en recetas/ordenes_laboratorio (sección 4 anterior): sin esto,
--    al volver a abrir la atención de una consulta no hay forma de saber
--    si ya se inició una hospitalización desde ella.
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.hospitalizaciones') AND name = 'id_cita')
    ALTER TABLE dbo.hospitalizaciones ADD id_cita BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_hospitalizaciones_cita')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.hospitalizaciones') AND name = 'id_cita')
    ALTER TABLE dbo.hospitalizaciones
        ADD CONSTRAINT fk_hospitalizaciones_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita);

-- ----------------------------------------------------------------------------
-- 9. Factura automática en Q0.00 por cita, y precio de venta al público por
--    medicamento (para poder calcular esa factura sola): toda cita nueva
--    genera su factura en Q0, y cada medicamento de receta agregado durante
--    la atención se refleja como línea de esa factura con el PVP del
--    medicamento. Una cita tiene como máximo una factura (índice único
--    filtrado: deja cualquier cantidad de NULL para facturas manuales/legado
--    sin cita).
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'id_cita')
    ALTER TABLE dbo.facturas ADD id_cita BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_facturas_cita')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'id_cita')
    ALTER TABLE dbo.facturas
        ADD CONSTRAINT fk_facturas_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_facturas_id_cita' AND object_id = OBJECT_ID('dbo.facturas'))
    CREATE UNIQUE INDEX ux_facturas_id_cita ON dbo.facturas (id_cita) WHERE id_cita IS NOT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.medicamentos') AND name = 'precio_venta_publico')
BEGIN
    ALTER TABLE dbo.medicamentos ADD precio_venta_publico DECIMAL(12,2) NULL;
    UPDATE dbo.medicamentos SET precio_venta_publico = 0 WHERE precio_venta_publico IS NULL;
    ALTER TABLE dbo.medicamentos ALTER COLUMN precio_venta_publico DECIMAL(12,2) NOT NULL;
END

-- ----------------------------------------------------------------------------
-- 10. Catálogo ESTADO_RESULTADO (preliminar/final/corregido) — nunca se
--     sembró; sin esto no hay nada que elegir al cargar un resultado de
--     examen desde el frontend ("subida de archivo adjunto en laboratorio").
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM dbo.cat_tipo_catalogo WHERE codigo = 'ESTADO_RESULTADO')
    INSERT INTO dbo.cat_tipo_catalogo (codigo, nombre, codigo_modulo, activo, fecha_creacion)
    VALUES ('ESTADO_RESULTADO', N'Estado del resultado de examen', 'LABORATORIO', 1, SYSUTCDATETIME());

INSERT INTO dbo.cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden)
SELECT t.id_tipo_catalogo, v.codigo, v.nombre, v.orden
FROM dbo.cat_tipo_catalogo t
CROSS JOIN (VALUES
    ('PRELIMINAR', N'Preliminar', 1),
    ('FINAL', N'Final', 2),
    ('CORREGIDO', N'Corregido', 3)
) AS v(codigo, nombre, orden)
WHERE t.codigo = 'ESTADO_RESULTADO'
AND NOT EXISTS (
    SELECT 1 FROM dbo.cat_valor_catalogo existente
    WHERE existente.id_tipo_catalogo = t.id_tipo_catalogo AND existente.codigo = v.codigo
);

-- ----------------------------------------------------------------------------
-- 11. Acta ligada a la cita que la originó — el libro de actas deja de ser
--     un formulario suelto de Recepción al ingreso del paciente: ahora se
--     llena desde la atención de la consulta, como paso de cierre (igual
--     que la constancia médica). Nullable porque las actas de antes de este
--     cambio no tienen cita; una cita tiene como máximo una acta (índice
--     único filtrado, mismo criterio que facturas.id_cita).
-- ----------------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.libro_actas') AND name = 'id_cita')
    ALTER TABLE dbo.libro_actas ADD id_cita BIGINT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_libro_actas_cita')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.libro_actas') AND name = 'id_cita')
    ALTER TABLE dbo.libro_actas
        ADD CONSTRAINT fk_libro_actas_cita FOREIGN KEY (id_cita) REFERENCES dbo.citas (id_cita);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ux_libro_actas_id_cita' AND object_id = OBJECT_ID('dbo.libro_actas'))
    CREATE UNIQUE INDEX ux_libro_actas_id_cita ON dbo.libro_actas (id_cita) WHERE id_cita IS NOT NULL;

COMMIT TRANSACTION;

END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;
    THROW;
END CATCH;
