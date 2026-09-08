// Catálogos de ejemplo para Facturación y Cobros. En la BD real estos
// valores vienen de cat_valor_catalogo.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export const TIPOS_ITEM_FACTURA: OpcionCatalogo[] = [
  { id: 1, label: 'Consulta' },
  { id: 2, label: 'Tratamiento' },
  { id: 3, label: 'Medicamento' },
  { id: 4, label: 'Procedimiento' },
];

export const ESTADOS_FACTURA: OpcionCatalogo[] = [
  { id: 1, label: 'Emitida' },
  { id: 2, label: 'Pagada' },
  { id: 3, label: 'Anulada' },
];

export const FORMAS_PAGO: OpcionCatalogo[] = [
  { id: 1, label: 'Efectivo' },
  { id: 2, label: 'Tarjeta' },
  { id: 3, label: 'Transferencia' },
  { id: 4, label: 'Cheque' },
  { id: 5, label: 'Depósito' },
];

export const ESTADOS_PAGO: OpcionCatalogo[] = [
  { id: 1, label: 'Aplicado' },
  { id: 2, label: 'Anulado' },
];

// IVA Guatemala. No hay columna para la tasa en el esquema (impuesto se
// guarda ya calculado en `Factura.impuesto`); se deja como constante hasta
// que exista un catálogo de tasas de impuesto.
export const TASA_IVA = 0.12;
