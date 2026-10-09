// Listas de ejemplo para Habitaciones/Camas. En la BD real vendrían de
// cat_valor_catalogo (TIPO_HABITACION / ESTADO_HABITACION / ESTADO_CAMA);
// el backend no valida ninguno de estos tres ids contra nada, así que
// aunque no estén sembrados no bloquea crear/editar.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export const TIPOS_HABITACION: OpcionCatalogo[] = [
  { id: 1, label: 'Individual' },
  { id: 2, label: 'Compartida' },
  { id: 3, label: 'UCI' },
];

export const ESTADOS_HABITACION: OpcionCatalogo[] = [
  { id: 1, label: 'Disponible' },
  { id: 2, label: 'Ocupada' },
  { id: 3, label: 'En limpieza' },
  { id: 4, label: 'En mantenimiento' },
];

export const ESTADOS_CAMA: OpcionCatalogo[] = [
  { id: 1, label: 'Disponible' },
  { id: 2, label: 'Ocupada' },
  { id: 3, label: 'En mantenimiento' },
];
