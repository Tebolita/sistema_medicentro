-- Arregla el gap de facturación encontrado: los "costos de paciente"
-- (costo_paciente_consulta / costo_paciente_hospitalizacion) se guardaban
-- pero nunca se reflejaban en ninguna factura, a diferencia de recetas y
-- exámenes de laboratorio (que sí tienen su columna de enlace en
-- factura_detalle). Agrega esas dos columnas de enlace, más
-- id_hospitalizacion en facturas para que una hospitalización (que puede no
-- tener cita de origen) también pueda tener su propia factura automática.
-- Idempotente.
SET QUOTED_IDENTIFIER ON;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.factura_detalle') AND name = 'id_costo_paciente_consulta')
    ALTER TABLE dbo.factura_detalle ADD id_costo_paciente_consulta BIGINT NULL
        CONSTRAINT fk_factura_detalle_costo_consulta REFERENCES dbo.costo_paciente_consulta(id_costo_paciente_consulta);

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.factura_detalle') AND name = 'id_costo_paciente_hospitalizacion')
    ALTER TABLE dbo.factura_detalle ADD id_costo_paciente_hospitalizacion BIGINT NULL
        CONSTRAINT fk_factura_detalle_costo_hospitalizacion REFERENCES dbo.costo_paciente_hospitalizacion(id_costo_paciente);

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.facturas') AND name = 'id_hospitalizacion')
    ALTER TABLE dbo.facturas ADD id_hospitalizacion BIGINT NULL
        CONSTRAINT fk_facturas_hospitalizacion REFERENCES dbo.hospitalizaciones(id_hospitalizacion);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_facturas_hospitalizacion' AND object_id = OBJECT_ID('dbo.facturas'))
    CREATE UNIQUE INDEX uq_facturas_hospitalizacion ON dbo.facturas(id_hospitalizacion)
        WHERE id_hospitalizacion IS NOT NULL;
GO
