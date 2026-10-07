// Catálogos de Hospitalización.
// Los IDs coinciden con los valores insertados en `cat_valor_catalogo`.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export interface CamaOpcion {
  id: number;
  label: string; // "Habitación 101 · Cama A"
  idTipoHabitacion: number;
}

// id_tipo_catalogo = 16, valores 56-58
export const TIPOS_HABITACION: OpcionCatalogo[] = [
  { id: 56, label: 'Individual' },
  { id: 57, label: 'Compartida' },
  { id: 58, label: 'UCI' },
];

// id_tipo_catalogo = 17, valores 59-61
export const ESTADOS_HABITACION: OpcionCatalogo[] = [
  { id: 59, label: 'Disponible' },
  { id: 60, label: 'Ocupada' },
  { id: 61, label: 'Mantenimiento' },
];

// id_tipo_catalogo = 18, valores 62-64
export const ESTADOS_CAMA: OpcionCatalogo[] = [
  { id: 62, label: 'Libre' },
  { id: 63, label: 'Ocupada' },
  { id: 64, label: 'Mantenimiento' },
];

// id_tipo_catalogo = 19, valores 65-67
export const ESTADOS_HOSPITALIZACION: OpcionCatalogo[] = [
  { id: 65, label: 'Activa' },
  { id: 66, label: 'Alta' },
  { id: 67, label: 'Trasladada' },
];

// id_tipo_catalogo = 20, valores 68-71
export const TIPO_ORDEN_MEDICA = 68;
export const TIPO_ORDEN_ENFERMERIA = 69;
export const TIPO_ORDEN_MEDICACION = 70;
export const TIPO_ORDEN_ANESTESIA = 71;

export const TIPOS_ORDEN: OpcionCatalogo[] = [
  { id: TIPO_ORDEN_MEDICA, label: 'Orden médica general' },
  { id: TIPO_ORDEN_ENFERMERIA, label: 'Orden de enfermería' },
  { id: TIPO_ORDEN_MEDICACION, label: 'Control de medicamentos' },
  { id: TIPO_ORDEN_ANESTESIA, label: 'Hoja de anestesia' },
];

// ⚠️ CAMAS — por ahora sigue siendo mock.
// Cuando tengamos datos en la tabla `camas` de la BD, se reemplaza por un
// fetch dinámico al backend.
export const CAMAS: CamaOpcion[] = [
  { id: 1, label: 'Habitación 101 · Cama A', idTipoHabitacion: 56 },
  { id: 2, label: 'Habitación 102 · Cama A', idTipoHabitacion: 57 },
  { id: 3, label: 'Habitación 102 · Cama B', idTipoHabitacion: 57 },
  { id: 4, label: 'UCI · Cama 1', idTipoHabitacion: 58 },
  { id: 5, label: 'UCI · Cama 2', idTipoHabitacion: 58 },
];