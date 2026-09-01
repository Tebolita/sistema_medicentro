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
