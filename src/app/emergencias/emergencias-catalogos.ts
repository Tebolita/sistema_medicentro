// Catálogos de Emergencias.
// Los IDs coinciden con los valores insertados en `cat_valor_catalogo`.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

// id_tipo_catalogo = 11, valores 37-41
export const NIVELES_TRIAGE: OpcionCatalogo[] = [
  { id: 37, label: 'Rojo · Resucitación (inmediato)' },
  { id: 38, label: 'Naranja · Emergencia (muy urgente)' },
  { id: 39, label: 'Amarillo · Urgente' },
  { id: 40, label: 'Verde · Menos urgente' },
  { id: 41, label: 'Azul · No urgente' },
];

// id_tipo_catalogo = 12, valores 42-45
export const ESTADOS_CASO: OpcionCatalogo[] = [
  { id: 42, label: 'Esperando' },
  { id: 43, label: 'En atención' },
  { id: 44, label: 'Atendido' },
  { id: 45, label: 'Referido / trasladado' },
];

// id_tipo_catalogo = 13, valor 46
export const TIPO_CONSENTIMIENTO_COMPROMISO_PAGO = 46;

export const TIPOS_CONSENTIMIENTO: OpcionCatalogo[] = [
  { id: 46, label: 'Compromiso de pago - Emergencia' },
];

// id_tipo_catalogo = 14, valores 47-52
export const PARENTESCOS: OpcionCatalogo[] = [
  { id: 47, label: 'Padre' },
  { id: 48, label: 'Madre' },
  { id: 49, label: 'Cónyuge' },
  { id: 50, label: 'Hijo/a' },
  { id: 51, label: 'Hermano/a' },
  { id: 52, label: 'Otro' },
];

// id_tipo_catalogo = 15, valores 53-55
export const ESTADOS_CONSENTIMIENTO: OpcionCatalogo[] = [
  { id: 53, label: 'Pendiente de firma' },
  { id: 54, label: 'Firmado' },
  { id: 55, label: 'Revocado' },
];