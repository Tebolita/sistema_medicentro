// Lista de ejemplo para "Tipo de entidad" en el formulario de Aseguradoras.
// En la BD real vendría de cat_valor_catalogo (código TIPO_ENTIDAD_ASEGURADORA);
// el backend no valida este id contra nada, así que aunque no esté sembrado
// no bloquea crear/editar, solo se vería el id crudo en vez del nombre.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export const TIPOS_ENTIDAD_ASEGURADORA: OpcionCatalogo[] = [
  { id: 1, label: 'Aseguradora' },
  { id: 2, label: 'Mutualidad' },
  { id: 3, label: 'Cooperativa' },
];
