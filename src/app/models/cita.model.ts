// Módulo 2: Citas / Agendamiento.

export interface Sala {
  idSala: number;
  nombre: string;
  idTipoSala: number | null; // cat TIPO_SALA
  idEstadoSala: number; // cat ESTADO_SALA (disponible/mantenimiento)
  capacidad: number;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface DisponibilidadMedico {
  idDisponibilidad: number;
  idMedico: number;
  idDiaSemana: number; // cat DIA_SEMANA
  horaInicio: string; // TIME, formato 'HH:mm:ss'
  horaFin: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface Cita {
  idCita: number;
  idPaciente: number;
  idMedico: number;
  idEspecialidad: number | null;
  idSala: number | null;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  idEstadoCita: number; // cat ESTADO_CITA
  idMotivoCancelacion: number | null; // cat MOTIVO_CANCELACION
  motivoConsulta: string | null;
  notas: string | null;
  idPoliza: number | null; // agregado en Módulo 12.1 (pólizas de seguro)
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface CitaHistorial {
  idCitaHistorial: number;
  idCita: number;
  idEstadoAnterior: number | null;
  idEstadoNuevo: number;
  motivo: string | null;
  fechaHoraAnterior: string | null; // para reprogramaciones: horario previo
  fechaHoraNueva: string | null;
  fechaCambio: string;
  idUsuarioCreacion: number | null;
  activo: boolean;
}

export interface Recordatorio {
  idRecordatorio: number;
  idCita: number;
  idTipoRecordatorio: number; // cat TIPO_RECORDATORIO (sms/email/llamada)
  fechaProgramada: string;
  fechaEnvio: string | null;
  idEstadoEnvio: number; // cat ESTADO_ENVIO
  detalleError: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/Citas
// ============================================================

// ---------- Lo que el backend DEVUELVE ----------

// GET /api/Citas (lista), GET /api/Citas/{id}, y respuesta de POST y PUT.
// Cada cita viene con su historial de cambios de estado/horario.
// El listado trae solo citas activas, de la más reciente a la más antigua.
export interface CitaCompleta {
  cita: Cita;
  historial: CitaHistorial[];
}

// GET /api/Citas/{id}/historial  →  CitaHistorial[]
// GET /api/Citas/{id}/recordatorios  →  Recordatorio[]
// GET /api/Recordatorios/pendientes  →  Recordatorio[]
// (usan las interfaces de arriba tal cual)

// ---------- Lo que el front ENVÍA ----------

// POST /api/Citas  y  PUT /api/Citas/{id}  (el mismo formato para ambos)
// Fechas con hora: 'YYYY-MM-DDTHH:mm:ss'. La hora de fin debe ser posterior
// a la de inicio, o el backend responde 400.
export interface CitaRequest {
  idPaciente: number;
  idMedico: number;
  idEspecialidad: number | null;
  idSala: number | null;
  fechaHoraInicio: string;
  fechaHoraFin: string;
  idEstadoCita: number;
  idMotivoCancelacion: number | null;
  motivoConsulta: string | null;
  notas: string | null;
  idPoliza: number | null;
  // Solo al editar: el porqué del cambio (reprogramación, cancelación...).
  // Queda guardado en el historial. Al crear se ignora.
  motivoCambio?: string | null;
}

// POST /api/Citas/{id}/recordatorios  y  PUT /api/Citas/{id}/recordatorios/{idRecordatorio}
export interface RecordatorioRequest {
  idTipoRecordatorio: number;
  fechaProgramada: string;
  fechaEnvio: string | null;
  idEstadoEnvio: number;
  detalleError: string | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/Salas
// ============================================================

// GET devuelve Sala / Sala[] (interfaz de arriba).
// POST /api/Salas  y  PUT /api/Salas/{id}. La capacidad mínima es 1.
export interface SalaRequest {
  nombre: string;
  idTipoSala: number | null;
  idEstadoSala: number;
  capacidad: number;
}

// ============================================================
// CONSUMO DE LA API  →  /api/disponibilidad-medico
// ============================================================

// GET devuelve DisponibilidadMedico / DisponibilidadMedico[] (interfaz de arriba).
// POST y PUT. Horas en formato 'HH:mm:ss'; la hora de fin debe ser posterior.
export interface DisponibilidadRequest {
  idMedico: number;
  idDiaSemana: number;
  horaInicio: string;
  horaFin: string;
}