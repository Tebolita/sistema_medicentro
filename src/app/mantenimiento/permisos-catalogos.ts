// Lista de ejemplo para "Módulo" en el formulario de Permisos. En la BD
// real viene de cat_valor_catalogo (código MODULO_SISTEMA, ver
// scripts/sembrar_catalogos.sql) — el backend valida que el id exista en
// cat_valor_catalogo (de cualquier tipo), así que sin sembrar ese catálogo
// esta lista de ejemplo no sirve para guardar, solo se vería el id crudo.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export const MODULOS_SISTEMA: OpcionCatalogo[] = [
  { id: 1, label: 'Recepción' },
  { id: 2, label: 'Seguros Médicos' },
  { id: 3, label: 'Expedientes Clínicos' },
  { id: 4, label: 'Laboratorio y Diagnóstico' },
  { id: 5, label: 'Emergencias' },
  { id: 6, label: 'Hospitalización' },
  { id: 7, label: 'Farmacia' },
  { id: 8, label: 'Facturación y Cobros' },
  { id: 9, label: 'Mantenimiento' },
];
