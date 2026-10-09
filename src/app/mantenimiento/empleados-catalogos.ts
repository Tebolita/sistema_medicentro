// Catálogos de ejemplo para el formulario de Empleados. En la BD real estos
// valores vienen de cat_valor_catalogo (códigos GENERO, TIPO_DOCUMENTO,
// ESTADO_EMPLEADO — este último ya confirmado, ver scripts/insertar_usuario.sql).
// EmpleadosService no valida estos tres ids contra ningún catálogo (solo
// valida idPuesto/idEspecialidad), así que si el código no está sembrado
// todavía esto no bloquea crear/editar, solo se ve el id crudo en vez del
// nombre hasta que se siembre.

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
  { id: 3, label: 'NIT' },
];

export const ESTADOS_EMPLEADO: OpcionCatalogo[] = [
  { id: 1, label: 'Activo' },
  { id: 2, label: 'Inactivo' },
  { id: 3, label: 'Suspendido' },
];
