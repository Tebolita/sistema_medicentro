// Catálogos de ejemplo para Hospitalización. En la BD real estos valores
// vienen de cat_valor_catalogo; CAMAS es un mock que combina `habitaciones` +
// `camas` en una sola opción para simplificar el selector.
//
// TIPOS_ORDEN extiende el grupo TIPO_ORDEN_HOSPITALIZACION (que en el
// esquema solo definía médica/enfermería) con "Medicación" y "Anestesia"
// para poder distinguir los 3 ítems del menú (Órdenes médicas / Control de
// medicamentos / Hoja de anestesia) — es una extensión de VALORES dentro del
// mismo catálogo extensible, no una columna nueva.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export interface CamaOpcion {
  id: number;
  label: string; // "Habitación 101 · Cama A"
  idTipoHabitacion: number;
}

export const TIPOS_HABITACION: OpcionCatalogo[] = [
  { id: 1, label: 'Individual' },
  { id: 2, label: 'Compartida' },
  { id: 3, label: 'UCI' },
];

export const ESTADOS_HOSPITALIZACION: OpcionCatalogo[] = [
  { id: 1, label: 'Activa' },
  { id: 2, label: 'Alta' },
  { id: 3, label: 'Trasladada' },
];

export const TIPO_ORDEN_MEDICA = 1;
export const TIPO_ORDEN_ENFERMERIA = 2;
export const TIPO_ORDEN_MEDICACION = 3;
export const TIPO_ORDEN_ANESTESIA = 4;

export const TIPOS_ORDEN: OpcionCatalogo[] = [
  { id: TIPO_ORDEN_MEDICA, label: 'Orden médica general' },
  { id: TIPO_ORDEN_ENFERMERIA, label: 'Orden de enfermería' },
  { id: TIPO_ORDEN_MEDICACION, label: 'Control de medicamentos' },
  { id: TIPO_ORDEN_ANESTESIA, label: 'Hoja de anestesia' },
];

export const CAMAS: CamaOpcion[] = [
  { id: 1, label: 'Habitación 101 · Cama A', idTipoHabitacion: 1 },
  { id: 2, label: 'Habitación 102 · Cama A', idTipoHabitacion: 2 },
  { id: 3, label: 'Habitación 102 · Cama B', idTipoHabitacion: 2 },
  { id: 4, label: 'UCI · Cama 1', idTipoHabitacion: 3 },
  { id: 5, label: 'UCI · Cama 2', idTipoHabitacion: 3 },
];
