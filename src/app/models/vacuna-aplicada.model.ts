// Vacuna inyectada en una consulta puntual — a diferencia de las alergias y
// antecedentes del paciente (historial reutilizable entre consultas), esto
// es un registro por cita: un paciente puede recibir varias vacunas
// distintas en la misma consulta.

export interface VacunaAplicada {
  idVacunaAplicada: number;
  idCita: number;
  idPaciente: number;
  idTipoVacuna: number; // cat TIPO_VACUNA
  dosis: string | null;
  fechaAplicacion: string;
  observaciones: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/vacunas-aplicadas
// ============================================================

// POST /api/vacunas-aplicadas
export interface VacunaAplicadaRequest {
  idCita: number;
  idPaciente: number;
  idTipoVacuna: number;
  dosis: string | null;
  fechaAplicacion: string;
  observaciones: string | null;
}
