-- Agrega el valor SERVICIO al catálogo TIPO_ITEM_FACTURA (ya existe el tipo,
-- con CONSULTA/TRATAMIENTO/MEDICAMENTO/PROCEDIMIENTO) — lo usa
-- FacturasService.SincronizarLineasDesdeCostosPacienteConsultaAsync /
-- ...HospitalizacionAsync para las líneas que vienen de "Costo paciente".
-- Idempotente.
IF EXISTS (SELECT 1 FROM cat_tipo_catalogo WHERE codigo = 'TIPO_ITEM_FACTURA')
BEGIN
    INSERT INTO cat_valor_catalogo (id_tipo_catalogo, codigo, nombre, orden)
    SELECT t.id_tipo_catalogo, 'SERVICIO', N'Servicio', 5
    FROM cat_tipo_catalogo t
    WHERE t.codigo = 'TIPO_ITEM_FACTURA'
      AND NOT EXISTS (
        SELECT 1 FROM cat_valor_catalogo v
        WHERE v.id_tipo_catalogo = t.id_tipo_catalogo AND v.codigo = 'SERVICIO');
END
GO
