// Valores de catálogo de ejemplo para Consulta externa. ESTADOS_CITA y
// TIPOS_CONSULTA en la BD real vendrían de cat_valor_catalogo (grupos
// ESTADO_CITA / similar). MEDICOS es un mock temporal: el esquema aún no
// expone un listado de médicos propio (solo empleados + puestos en
// Fundamentos), así que se reemplaza cuando esa API exista.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export interface Medico {
  id: number;
  nombre: string;
  especialidad: string;
}

export const ESTADOS_CITA: OpcionCatalogo[] = [
  { id: 1, label: 'Programada' },
  { id: 2, label: 'Confirmada' },
  { id: 3, label: 'En atención' },
  { id: 4, label: 'Atendida' },
  { id: 5, label: 'Cancelada' },
];

export const TIPOS_CONSULTA: OpcionCatalogo[] = [
  { id: 1, label: 'Primera vez' },
  { id: 2, label: 'Reconsulta' },
];

export const MEDICOS: Medico[] = [
  { id: 1, nombre: 'Dr. Roberto Sandoval', especialidad: 'Medicina General' },
  { id: 2, nombre: 'Dra. Claudia Estrada', especialidad: 'Pediatría' },
  { id: 3, nombre: 'Dr. Luis Fernández', especialidad: 'Ginecología' },
];
