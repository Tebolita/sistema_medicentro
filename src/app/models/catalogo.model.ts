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
