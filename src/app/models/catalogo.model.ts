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

// Códigos de los catálogos de Recepción, tal como están en cat_tipo_catalogo.
// Usarlos desde aquí evita errores de dedo al llamar al servicio.
export const CODIGOS_CATALOGO = {
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
} as const;