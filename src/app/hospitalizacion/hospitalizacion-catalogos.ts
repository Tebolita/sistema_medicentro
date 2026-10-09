// Catálogos de Hospitalización.
// Los IDs coinciden con los valores insertados en `cat_valor_catalogo`.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export interface CamaOpcion {
  id: number;
  label: string;                  // "Habitación 101 · Cama A"
  idTipoHabitacion: number;
  idHabitacion: number;           // ✅ NUEVO — necesario para el PUT
  numeroCama: string;             // ✅ NUEVO — necesario para el PUT
  idEstadoCama: number;           // ✅ NUEVO — 62 Libre / 63 Ocupada / 64 Mantenimiento
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

export const ESTADO_CAMA_LIBRE = 62;
export const ESTADO_CAMA_OCUPADA = 63;

// id_tipo_catalogo = 19, valores 65-67
export const ESTADOS_HOSPITALIZACION: OpcionCatalogo[] = [
  { id: 65, label: 'Activa' },
  { id: 66, label: 'Alta' },
  { id: 67, label: 'Trasladada' },
];

export const ESTADO_HOSPITALIZACION_ACTIVA = 65;

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