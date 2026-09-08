// Valores de catálogo de ejemplo para Seguros Médicos / Pólizas. En la BD
// real, ramo/titularidad/estado vienen de cat_valor_catalogo. ASEGURADORAS
// es un mock (tabla `aseguradoras` real, aquí simplificada) con las
// entidades mencionadas en la entrevista de recepción (Mediprocesos agrupa
// RPN, Roblered y ASSA; Mi Cope se gestiona aparte con código de
// autorización telefónica).

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export interface AseguradoraOpcion {
  id: number;
  nombre: string;
  grupo: 'Mediprocesos' | 'Mi Cope' | 'Otra';
}

export const ASEGURADORAS: AseguradoraOpcion[] = [
  { id: 1, nombre: 'RPN', grupo: 'Mediprocesos' },
  { id: 2, nombre: 'Roblered', grupo: 'Mediprocesos' },
  { id: 3, nombre: 'ASSA', grupo: 'Mediprocesos' },
  { id: 4, nombre: 'Mi Cope', grupo: 'Mi Cope' },
];

export const RAMOS_SEGURO: OpcionCatalogo[] = [
  { id: 1, label: 'Gastos médicos mayores' },
  { id: 2, label: 'Gastos médicos menores' },
  { id: 3, label: 'Hospitalario' },
  { id: 4, label: 'Corporativo' },
];

export const TITULARIDADES: OpcionCatalogo[] = [
  { id: 1, label: 'Titular' },
  { id: 2, label: 'Dependiente' },
];

export const ESTADOS_POLIZA: OpcionCatalogo[] = [
  { id: 1, label: 'Vigente' },
  { id: 2, label: 'Vencida' },
  { id: 3, label: 'Suspendida' },
];
