// Módulo 10: Hospitalización / Habitaciones (módulo opcional en el diseño original).

export interface Habitacion {
  idHabitacion: number;
  numero: string;
  piso: number | null;
  idTipoHabitacion: number | null; // cat TIPO_HABITACION (individual/compartida/uci)
  idEstadoHabitacion: number; // cat ESTADO_HABITACION
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface Cama {
  idCama: number;
  idHabitacion: number;
  numeroCama: string;
  idEstadoCama: number; // cat ESTADO_CAMA
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface Hospitalizacion {
  idHospitalizacion: number;
  idPaciente: number;
  idCama: number;
  idMedicoResponsable: number;
  fechaIngreso: string;
  fechaEgreso: string | null;
  motivoIngreso: string;
  diagnosticoEgreso: string | null;
  idEstadoHospitalizacion: number; // cat ESTADO_HOSPITALIZACION (activa/alta/trasladada)
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface OrdenMedicaHospitalizacion {
  idOrdenMedica: number;
  idHospitalizacion: number;
  idMedico: number;
  idTipoOrden: number; // cat TIPO_ORDEN_HOSPITALIZACION (medica/enfermeria)
  fechaOrden: string;
  descripcion: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface NotaEnfermeria {
  idNotaEnfermeria: number;
  idHospitalizacion: number;
  idEmpleado: number;
  fechaHora: string;
  nota: string;
  signosVitales: string | null; // JSON string: {"temperatura":..,"presion":..,"pulso":..}
  activo: boolean;
  fechaCreacion: string;
}
