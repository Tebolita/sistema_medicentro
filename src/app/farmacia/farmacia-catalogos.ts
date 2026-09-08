// Catálogos de ejemplo para Farmacia. En la BD real estos valores vienen de
// cat_valor_catalogo; MEDICAMENTOS es un mock de la tabla real `medicamentos`.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export interface MedicamentoOpcion {
  id: number;
  nombre: string;
  presentacion: string;
  requiereReceta: boolean;
}

export const MEDICAMENTOS: MedicamentoOpcion[] = [
  { id: 1, nombre: 'Amoxicilina 500mg', presentacion: 'Cápsulas', requiereReceta: true },
  { id: 2, nombre: 'Paracetamol 500mg', presentacion: 'Tabletas', requiereReceta: false },
  { id: 3, nombre: 'Ibuprofeno 400mg', presentacion: 'Tabletas', requiereReceta: false },
  { id: 4, nombre: 'Loratadina 10mg', presentacion: 'Tabletas', requiereReceta: false },
  { id: 5, nombre: 'Ampicilina 1g inyectable', presentacion: 'Vial', requiereReceta: true },
  { id: 6, nombre: 'Omeprazol 20mg', presentacion: 'Cápsulas', requiereReceta: false },
];

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
