// Motor de catálogos genérico (cat_tipo_catalogo / cat_valor_catalogo).
// Casi todo campo "tipo/estado/categoría" del resto del esquema es un FK
// (id_valor_catalogo) hacia ValorCatalogo, agrupado por el `codigo` de su
// TipoCatalogo (ej. 'ESTADO_CITA', 'FORMA_PAGO', 'RAMO_SEGURO').

export interface TipoCatalogo {
  idTipoCatalogo: number;
  codigo: string; // ej. 'ESTADO_CITA'
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface ValorCatalogo {
  idValorCatalogo: number;
  idTipoCatalogo: number;
  codigo: string; // ej. 'AGENDADA'
  nombre: string;
  descripcion: string | null;
  orden: number;
  metadata: string | null; // JSON string (color UI, etc.)
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/catalogos/{codigoTipo}
// ============================================================

// GET /api/catalogos/{codigoTipo}
// Cada opción de un catálogo, solo las activas y ya ordenadas por `orden`.
// Ejemplo: { id: 15, codigo: 'MASCULINO', nombre: 'Masculino', orden: 1 }
// El `id` es el que se guarda en el registro (ej. paciente.idGenero).
export interface CatalogoOpcion {
  id: number;
  codigo: string;
  nombre: string;
  orden: number;
}

// Códigos de los catálogos de Recepción, Seguros y Expedientes, tal como
// están en cat_tipo_catalogo. Usarlos desde aquí evita errores de dedo al
// llamar al servicio. Ejemplo: RetornarCatalogo(CODIGOS_CATALOGO.GENERO)
export const CODIGOS_CATALOGO = {
  // Pacientes
  GENERO: 'GENERO',
  TIPO_DOCUMENTO: 'TIPO_DOCUMENTO',
  ESTADO_CIVIL: 'ESTADO_CIVIL',
  TIPO_SANGRE: 'TIPO_SANGRE',
  NIVEL_CONFIDENCIALIDAD: 'NIVEL_CONFIDENCIALIDAD',
  ESTADO_PACIENTE: 'ESTADO_PACIENTE',
  PARENTESCO: 'PARENTESCO',
  TIPO_ALERGIA: 'TIPO_ALERGIA',
  SEVERIDAD: 'SEVERIDAD',
  TIPO_ANTECEDENTE: 'TIPO_ANTECEDENTE',

  // Citas, salas, disponibilidad y recordatorios
  ESTADO_CITA: 'ESTADO_CITA',
  MOTIVO_CANCELACION: 'MOTIVO_CANCELACION',
  TIPO_SALA: 'TIPO_SALA',
  ESTADO_SALA: 'ESTADO_SALA',
  DIA_SEMANA: 'DIA_SEMANA',
  TIPO_RECORDATORIO: 'TIPO_RECORDATORIO',
  ESTADO_ENVIO: 'ESTADO_ENVIO',

  // Seguros médicos
  RAMO_SEGURO: 'RAMO_SEGURO',
  TITULARIDAD_POLIZA: 'TITULARIDAD_POLIZA',
  ESTADO_POLIZA: 'ESTADO_POLIZA',
  TIPO_ENTIDAD_CONVENIO: 'TIPO_ENTIDAD_CONVENIO',
  ESTADO_CONVENIO: 'ESTADO_CONVENIO',
  ESTADO_AFILIACION: 'ESTADO_AFILIACION',

  // Expedientes clínicos y tratamientos
  TIPO_REGISTRO_CLINICO: 'TIPO_REGISTRO_CLINICO',
  ESTADO_TRATAMIENTO: 'ESTADO_TRATAMIENTO',
} as const;