// Módulo 3: Tratamientos (incluye recetas, interacciones y el historial clínico).

export interface Medicamento {
  idMedicamento: number;
  nombre: string;
  principioActivo: string | null;
  presentacion: string | null; // tableta, jarabe, inyectable...
  concentracion: string | null;
  idCategoriaMedicamento: number | null; // cat CATEGORIA_MEDICAMENTO
  requiereReceta: boolean;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface Tratamiento {
  idTratamiento: number;
  idPaciente: number;
  idMedico: number;
  idCita: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  diagnostico: string | null;
  descripcion: string | null;
  idEstadoTratamiento: number; // cat ESTADO_TRATAMIENTO
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface TratamientoSeguimiento {
  idSeguimiento: number;
  idTratamiento: number;
  idMedico: number;
  fecha: string;
  notasEvolucion: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface Receta {
  idReceta: number;
  idTratamiento: number | null;
  idPaciente: number;
  idMedico: number;
  fechaEmision: string;
  firmaDigitalHash: string | null; // huella de la firma electrónica del médico
  firmaDigitalUrl: string | null; // documento firmado almacenado
  idEstadoReceta: number; // cat ESTADO_RECETA
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface RecetaDetalle {
  idRecetaDetalle: number;
  idReceta: number;
  idMedicamento: number;
  dosis: string;
  frecuencia: string;
  duracion: string | null;
  indicaciones: string | null;
  activo: boolean;
  fechaCreacion: string;
}

export interface InteraccionMedicamento {
  idInteraccion: number;
  idMedicamento1: number;
  idMedicamento2: number;
  idNivelSeveridad: number; // cat SEVERIDAD
  descripcion: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface HistorialClinico {
  idHistorial: number;
  idPaciente: number;
  idMedico: number;
  idCita: number | null;
  idTratamiento: number | null;
  idTipoRegistro: number; // cat TIPO_REGISTRO_CLINICO (consulta/evolución/nota)
  idNivelConfidencialidad: number | null;
  fecha: string;
  motivoConsulta: string | null;
  diagnostico: string | null;
  notas: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}
