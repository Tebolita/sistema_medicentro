// Listas de ejemplo para "Tipo" y "Estado" en el formulario de Salas. En la
// BD real vendrían de cat_valor_catalogo (códigos TIPO_SALA / ESTADO_SALA);
// el backend no valida idTipoSala/idEstadoSala contra nada, así que aunque
// no estén sembrados no bloquea crear/editar, solo se vería el id crudo.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export const TIPOS_SALA: OpcionCatalogo[] = [
  { id: 1, label: 'Consultorio' },
  { id: 2, label: 'Quirófano' },
  { id: 3, label: 'Sala de procedimientos' },
  { id: 4, label: 'Sala de espera' },
];

export const ESTADOS_SALA: OpcionCatalogo[] = [
  { id: 1, label: 'Disponible' },
  { id: 2, label: 'Ocupada' },
  { id: 3, label: 'En mantenimiento' },
];
