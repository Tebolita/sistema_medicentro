// Catálogos de ejemplo para Emergencias.
//
// "Atención prioritaria" no tiene tabla propia en el esquema compartido (no
// aparece en el mapa de módulos) — NIVELES_TRIAGE y ESTADOS_CASO son mock
// puro, inspirados en el estándar clínico de triaje por colores (Manchester/
// ESI), documentado como pendiente de confirmar con el cliente en
// PENDIENTES.md.
//
// "Hoja de compromiso de pago" sí se apoya en tablas reales: se modela como
// un `ConsentimientoInformado` cuyo `idTipoConsentimiento` es el que se
// define acá (ver consentimiento.model.ts).

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export const NIVELES_TRIAGE: OpcionCatalogo[] = [
  { id: 1, label: 'Rojo · Resucitación (inmediato)' },
  { id: 2, label: 'Naranja · Emergencia (muy urgente)' },
  { id: 3, label: 'Amarillo · Urgente' },
  { id: 4, label: 'Verde · Menos urgente' },
  { id: 5, label: 'Azul · No urgente' },
];

export const ESTADOS_CASO: OpcionCatalogo[] = [
  { id: 1, label: 'Esperando' },
  { id: 2, label: 'En atención' },
  { id: 3, label: 'Atendido' },
  { id: 4, label: 'Referido / trasladado' },
];

export const TIPO_CONSENTIMIENTO_COMPROMISO_PAGO = 1;

export const TIPOS_CONSENTIMIENTO: OpcionCatalogo[] = [
  { id: TIPO_CONSENTIMIENTO_COMPROMISO_PAGO, label: 'Compromiso de pago - Emergencia' },
];

export const ESTADOS_CONSENTIMIENTO: OpcionCatalogo[] = [
  { id: 1, label: 'Pendiente de firma' },
  { id: 2, label: 'Firmado' },
  { id: 3, label: 'Revocado' },
];

export const PARENTESCOS: OpcionCatalogo[] = [
  { id: 1, label: 'Padre' },
  { id: 2, label: 'Madre' },
  { id: 3, label: 'Cónyuge' },
  { id: 4, label: 'Hijo/a' },
  { id: 5, label: 'Hermano/a' },
  { id: 6, label: 'Otro' },
];
