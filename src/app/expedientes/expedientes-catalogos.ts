// Catálogo de ejemplo para Expedientes Clínicos. En la BD real
// TIPOS_REGISTRO_CLINICO viene de cat_valor_catalogo (grupo
// TIPO_REGISTRO_CLINICO). Los 4 tipos corresponden 1 a 1 con los ítems del
// menú de esta categoría (ficha pediátrica, ficha externa, expediente de
// ingresado, evolución/signos vitales).

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export const TIPOS_REGISTRO_CLINICO: OpcionCatalogo[] = [
  { id: 1, label: 'Ficha de consulta pediátrica' },
  { id: 2, label: 'Ficha de consulta externa' },
  { id: 3, label: 'Expediente de paciente ingresado' },
  { id: 4, label: 'Evolución y signos vitales' },
];

export const NIVELES_CONFIDENCIALIDAD: OpcionCatalogo[] = [
  { id: 1, label: 'Normal' },
  { id: 2, label: 'Reservado' },
  { id: 3, label: 'Confidencial' },
];
