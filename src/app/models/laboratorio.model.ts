// Módulo 8: Laboratorio e Imágenes (electrocardiogramas, rayos X, ultrasonido, etc.
// se clasifican vía cat CATEGORIA_EXAMEN dentro de TipoExamen).

export interface TipoExamen {
  idTipoExamen: number;
  nombre: string;
  idCategoriaExamen: number; // cat CATEGORIA_EXAMEN (laboratorio/imagen)
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface OrdenLaboratorio {
  idOrden: number;
  idPaciente: number;
  idMedico: number;
  idCita: number | null;
  fechaOrden: string;
  idPrioridad: number | null; // cat PRIORIDAD_ORDEN (normal/urgente)
  idEstadoOrden: number; // cat ESTADO_ORDEN (solicitada/en_proceso/completada/cancelada)
  notas: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface OrdenDetalle {
  idOrdenDetalle: number;
  idOrden: number;
  idTipoExamen: number;
  activo: boolean;
  fechaCreacion: string;
}

export interface ResultadoExamen {
  idResultado: number;
  idOrdenDetalle: number;
  fechaResultado: string;
  resultadoTexto: string | null;
  archivoAdjuntoUrl: string | null;
  idEstadoResultado: number; // cat ESTADO_RESULTADO (preliminar/final/corregido)
  idMedicoValida: number | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}
