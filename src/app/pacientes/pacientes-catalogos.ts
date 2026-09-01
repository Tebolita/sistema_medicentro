// Valores de catálogo de ejemplo para la UI de Pacientes. En la BD real estos
// vienen de cat_valor_catalogo (ver shared/menu-data ready-map en memoria del
// proyecto). Reemplazar por la llamada a la API de catálogos cuando exista.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export const GENEROS: OpcionCatalogo[] = [
  { id: 1, label: 'Masculino' },
  { id: 2, label: 'Femenino' },
  { id: 3, label: 'Otro' },
];

export const TIPOS_DOCUMENTO: OpcionCatalogo[] = [
  { id: 1, label: 'DPI' },
  { id: 2, label: 'Pasaporte' },
  { id: 3, label: 'Partida de nacimiento' },
];

export const ESTADOS_CIVILES: OpcionCatalogo[] = [
  { id: 1, label: 'Soltero/a' },
  { id: 2, label: 'Casado/a' },
  { id: 3, label: 'Divorciado/a' },
  { id: 4, label: 'Viudo/a' },
  { id: 5, label: 'Unión de hecho' },
];

export const TIPOS_SANGRE: OpcionCatalogo[] = [
  { id: 1, label: 'O+' },
  { id: 2, label: 'O-' },
  { id: 3, label: 'A+' },
  { id: 4, label: 'A-' },
  { id: 5, label: 'B+' },
  { id: 6, label: 'B-' },
  { id: 7, label: 'AB+' },
  { id: 8, label: 'AB-' },
];

export const NIVELES_CONFIDENCIALIDAD: OpcionCatalogo[] = [
  { id: 1, label: 'Normal' },
  { id: 2, label: 'Reservado' },
  { id: 3, label: 'Confidencial' },
];

export const ESTADOS_PACIENTE: OpcionCatalogo[] = [
  { id: 1, label: 'Activo' },
  { id: 2, label: 'Inactivo' },
  { id: 3, label: 'Fallecido' },
];

export const PARENTESCOS: OpcionCatalogo[] = [
  { id: 1, label: 'Padre' },
  { id: 2, label: 'Madre' },
  { id: 3, label: 'Cónyuge' },
  { id: 4, label: 'Hijo/a' },
  { id: 5, label: 'Hermano/a' },
  { id: 6, label: 'Otro' },
];

export const TIPOS_ALERGIA: OpcionCatalogo[] = [
  { id: 1, label: 'Medicamento' },
  { id: 2, label: 'Alimento' },
  { id: 3, label: 'Ambiental' },
];

export const SEVERIDADES: OpcionCatalogo[] = [
  { id: 1, label: 'Leve' },
  { id: 2, label: 'Moderada' },
  { id: 3, label: 'Severa' },
];

export const TIPOS_ANTECEDENTE: OpcionCatalogo[] = [
  { id: 1, label: 'Personal' },
  { id: 2, label: 'Familiar' },
  { id: 3, label: 'Quirúrgico' },
];
