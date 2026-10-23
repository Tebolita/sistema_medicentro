// Módulo: Constancia médica (ver SOLICITUD_MOTOR_CONSULTAS.md, sección 1).
// Siempre va al final de una consulta, 1:1 con la cita. Se imprime, no se
// firma digitalmente.

export interface ConstanciaMedica {
  idConstancia: number;
  idCita: number;
  idPaciente: number;
  idMedico: number;
  diagnostico: string | null;
  contenido: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/constancias-medicas
// ============================================================

// POST /api/constancias-medicas  y  PUT /api/constancias-medicas/{id}
export interface ConstanciaMedicaRequest {
  idCita: number;
  idPaciente: number;
  idMedico: number;
  diagnostico: string | null;
  contenido: string;
}
