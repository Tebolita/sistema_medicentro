// Catálogos de ejemplo para Farmacia. En la BD real estos valores vienen de
// cat_valor_catalogo.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export const UNIDADES_MEDIDA: OpcionCatalogo[] = [
  { id: 1, label: 'Unidad' },
  { id: 2, label: 'Caja' },
  { id: 3, label: 'Frasco' },
];

export const ESTADOS_ITEM_INVENTARIO: OpcionCatalogo[] = [
  { id: 1, label: 'Disponible' },
  { id: 2, label: 'Agotado' },
  { id: 3, label: 'Descontinuado' },
];

export const TIPO_MOVIMIENTO_ENTRADA = 1;
export const TIPO_MOVIMIENTO_SALIDA = 2;
export const TIPO_MOVIMIENTO_AJUSTE = 3;
export const TIPO_MOVIMIENTO_MERMA = 4;

export const TIPOS_MOVIMIENTO: OpcionCatalogo[] = [
  { id: TIPO_MOVIMIENTO_ENTRADA, label: 'Entrada (compra/reabastecimiento)' },
  { id: TIPO_MOVIMIENTO_SALIDA, label: 'Salida (venta/dispensación)' },
  { id: TIPO_MOVIMIENTO_AJUSTE, label: 'Ajuste de inventario' },
  { id: TIPO_MOVIMIENTO_MERMA, label: 'Merma / vencimiento' },
];

export const ESTADOS_RECETA: OpcionCatalogo[] = [
  { id: 1, label: 'Emitida' },
  { id: 2, label: 'Surtida' },
  { id: 3, label: 'Cancelada' },
];
