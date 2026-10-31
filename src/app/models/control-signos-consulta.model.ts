// "CONTROL DE SIGNOS" de una consulta externa puntual — misma idea que
// ControlSignosHospitalizacion, pero ligada a la cita. Puede haber varios
// registros por consulta.

export interface ControlSignosConsulta {
  idControlSignosConsulta: number;
  idCita: number;
  idPaciente: number;
  fechaHora: string;
  presionArterial: string | null;
  temperatura: number | null;
  frecuenciaRespiratoria: number | null;
  observaciones: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/control-signos-consulta
// ============================================================

// POST /api/control-signos-consulta
export interface ControlSignosConsultaRequest {
  idCita: number;
  idPaciente: number;
  fechaHora: string;
  presionArterial: string | null;
  temperatura: number | null;
  frecuenciaRespiratoria: number | null;
  observaciones: string | null;
}
