-- Agrega id_servicio (FK opcional a dbo.servicios) a los dos "costo
-- paciente" — mismo rol que id_medicamento: solo prellena
-- descripcion/valor_unitario, el renglón sigue siendo editable libremente.
-- Idempotente.
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.costo_paciente_consulta') AND name = 'id_servicio')
    ALTER TABLE dbo.costo_paciente_consulta ADD id_servicio BIGINT NULL
        CONSTRAINT fk_costo_paciente_consulta_servicio REFERENCES dbo.servicios(id_servicio);

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.costo_paciente_hospitalizacion') AND name = 'id_servicio')
    ALTER TABLE dbo.costo_paciente_hospitalizacion ADD id_servicio BIGINT NULL
        CONSTRAINT fk_costo_paciente_hospitalizacion_servicio REFERENCES dbo.servicios(id_servicio);
GO
