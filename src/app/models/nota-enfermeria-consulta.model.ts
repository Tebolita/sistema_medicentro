// Hoja "ENFERMERIA" de una consulta externa puntual — misma idea que
// NotaEnfermeria (hospitalización), pero ligada a la cita. Puede haber
// varias notas por consulta.

export interface NotaEnfermeriaConsulta {
  idNotaEnfermeriaConsulta: number;
  idCita: number;
  idPaciente: number;
  idEmpleado: number;
  fechaHora: string;
  nota: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/notas-enfermeria-consulta
// ============================================================

// POST /api/notas-enfermeria-consulta
export interface NotaEnfermeriaConsultaRequest {
  idCita: number;
  idPaciente: number;
  idEmpleado: number;
  fechaHora: string;
  nota: string;
}
