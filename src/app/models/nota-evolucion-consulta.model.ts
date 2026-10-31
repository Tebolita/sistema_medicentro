// "Hoja de Evolución" de una consulta externa puntual — misma idea que
// NotaEnfermeria (hospitalización), pero ligada a la cita: permite dejar
// seguimiento del paciente aunque no esté ingresado. Puede haber varias
// notas por consulta.

export interface NotaEvolucionConsulta {
  idNotaEvolucionConsulta: number;
  idCita: number;
  idPaciente: number;
  idMedico: number;
  fechaHora: string;
  evolucion: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/notas-evolucion-consulta
// ============================================================

// POST /api/notas-evolucion-consulta
export interface NotaEvolucionConsultaRequest {
  idCita: number;
  idPaciente: number;
  idMedico: number;
  fechaHora: string;
  evolucion: string;
}
