// "COSTO PACIENTE" de una consulta externa puntual — misma idea que
// CostoPacienteHospitalizacion, pero ligada a la cita. idMedicamento es
// opcional, solo para prellenar descripción/valor desde el catálogo.

export interface CostoPacienteConsulta {
  idCostoPacienteConsulta: number;
  idCita: number;
  idPaciente: number;
  idMedicamento: number | null;
  fecha: string;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/costos-paciente-consulta
// ============================================================

// POST /api/costos-paciente-consulta
export interface CostoPacienteConsultaRequest {
  idCita: number;
  idPaciente: number;
  idMedicamento: number | null;
  fecha: string;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
}
