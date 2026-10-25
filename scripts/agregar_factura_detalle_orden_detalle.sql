-- =============================================================================
-- Agrega factura_detalle.id_orden_detalle: liga una línea de factura al
-- examen de laboratorio que la originó (mismo patrón que id_receta_detalle
-- con los medicamentos de receta), necesario para que la factura cobre
-- automáticamente los exámenes con el precio de tipos_examen.
-- Idempotente: se puede correr las veces que haga falta. Ya incluido como
-- PARTE 17 de 00_instalacion_completa.sql; este script es solo para
-- aplicarlo rápido a una base que ya corrió ese script antes de esta parte.
-- =============================================================================
USE MEDICENTRO;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.factura_detalle') AND name = 'id_orden_detalle')
    ALTER TABLE dbo.factura_detalle ADD id_orden_detalle BIGINT NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_factura_detalle_orden_detalle')
AND EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.factura_detalle') AND name = 'id_orden_detalle')
    ALTER TABLE dbo.factura_detalle ADD CONSTRAINT fk_factura_detalle_orden_detalle FOREIGN KEY (id_orden_detalle) REFERENCES dbo.orden_detalle (id_orden_detalle);
GO

-- Verificación: debe devolver la columna.
SELECT c.name, c.is_nullable
FROM sys.columns c
WHERE c.object_id = OBJECT_ID('dbo.factura_detalle') AND c.name = 'id_orden_detalle';
GO
