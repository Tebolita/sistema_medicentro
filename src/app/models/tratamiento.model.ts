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

// ============================================================
// CONSUMO DE LA API  →  /api/expedientes
// ============================================================

// GET /api/expedientes (lista), GET /api/expedientes/{id}, y respuesta de POST y PUT
// devuelven HistorialClinico (interfaz de arriba) tal cual.
// El listado trae solo registros activos, del más reciente al más antiguo.

// POST /api/expedientes  y  PUT /api/expedientes/{id}  (mismo formato para ambos)
// La fecha lleva hora: 'YYYY-MM-DDTHH:mm:ss'.
// El paciente y el médico deben existir, o el backend responde 404.
export interface HistorialClinicoRequest {
  idPaciente: number;
  idMedico: number;
  idCita: number | null;
  idTratamiento: number | null;
  idTipoRegistro: number;
  idNivelConfidencialidad: number | null;
  fecha: string;
  motivoConsulta: string | null;
  diagnostico: string | null;
  notas: string | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/Tratamientos
// ============================================================

// GET /api/Tratamientos (lista), GET /api/Tratamientos/{id}, y respuesta de POST y PUT.
// Cada tratamiento viene con sus seguimientos activos, del más reciente al más antiguo.
// El listado trae solo tratamientos activos, ordenados por fecha de inicio descendente.
export interface TratamientoCompleto {
  tratamiento: Tratamiento;
  seguimientos: TratamientoSeguimiento[];
}

// POST /api/Tratamientos  y  PUT /api/Tratamientos/{id}
// Solo los datos del tratamiento; los seguimientos van por su propio endpoint.
// Fechas como 'YYYY-MM-DD'.
export interface TratamientoRequest {
  idPaciente: number;
  idMedico: number;
  idCita: number | null;
  fechaInicio: string;
  fechaFin: string | null;
  diagnostico: string | null;
  descripcion: string | null;
  idEstadoTratamiento: number;
}

// POST /api/Tratamientos/{id}/seguimientos  y  PUT /api/Tratamientos/{id}/seguimientos/{idSeguimiento}
// La fecha lleva hora: 'YYYY-MM-DDTHH:mm:ss'. Las notas de evolución son obligatorias.
export interface SeguimientoRequest {
  idMedico: number;
  fecha: string;
  notasEvolucion: string;
}