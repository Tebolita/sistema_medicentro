// Catálogos de ejemplo para Laboratorio y Diagnóstico. En la BD real
// idCategoriaExamen/idPrioridad/idEstadoOrden vienen de cat_valor_catalogo;
// TIPOS_EXAMEN es un mock de la tabla real `tipos_examen`.

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export interface TipoExamenOpcion {
  id: number;
  nombre: string;
  idCategoriaExamen: number; // 1 = Laboratorio, 2 = Imagen/Diagnóstico
}

export const CATEGORIAS_EXAMEN: OpcionCatalogo[] = [
  { id: 1, label: 'Laboratorio' },
  { id: 2, label: 'Imagen / Diagnóstico' },
];

export const TIPOS_EXAMEN: TipoExamenOpcion[] = [
  { id: 1, nombre: 'Hemograma completo', idCategoriaExamen: 1 },
  { id: 2, nombre: 'Perfil lipídico', idCategoriaExamen: 1 },
  { id: 3, nombre: 'Examen general de orina', idCategoriaExamen: 1 },
  { id: 4, nombre: 'Electrocardiograma', idCategoriaExamen: 2 },
  { id: 5, nombre: 'Rayos X de tórax', idCategoriaExamen: 2 },
  { id: 6, nombre: 'Ultrasonido abdominal', idCategoriaExamen: 2 },
];

export const PRIORIDADES_ORDEN: OpcionCatalogo[] = [
  { id: 1, label: 'Normal' },
  { id: 2, label: 'Urgente' },
];

export const ESTADOS_ORDEN: OpcionCatalogo[] = [
  { id: 1, label: 'Solicitada' },
  { id: 2, label: 'En proceso' },
  { id: 3, label: 'Completada' },
  { id: 4, label: 'Cancelada' },
];
