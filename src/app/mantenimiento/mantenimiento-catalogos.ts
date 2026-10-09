// Códigos de catálogo (cat_tipo_catalogo) que el sistema ya usa en algún
// dropdown. El backend SÍ tiene GET /api/catalogos (lista todos los que
// existen), así que esto ya no es la fuente de verdad de qué catálogos hay
// — solo le da un ícono más específico a los que reconoce por código (ver
// catalogos-lista.ts: si el código no está acá, usa un ícono genérico).
export interface TipoCatalogoConocido {
  codigo: string;
  nombre: string;
  // A qué módulo pertenece, para agrupar visualmente la pantalla de
  // Catálogos. Va el slug real de un MenuSection (ver menu-data.ts) para
  // que el nombre del grupo se resuelva con nombreGrupo() a partir del
  // título real de ese módulo — así no hay que escribirlo a mano ni
  // arriesgarse a un typo que separe en dos grupos lo que debería ser uno
  // solo cuando se agregue un catálogo nuevo.
  grupo: string;
  icono: string;
}

export const TIPOS_CATALOGO_CONOCIDOS: TipoCatalogoConocido[] = [
  { codigo: 'ESTADO_FACTURA', nombre: 'Estado de factura', grupo: 'facturacion-cobros', icono: 'receipt' },
  { codigo: 'FORMA_PAGO', nombre: 'Forma de pago', grupo: 'facturacion-cobros', icono: 'credit_card' },
  { codigo: 'ESTADO_PAGO', nombre: 'Estado de pago', grupo: 'facturacion-cobros', icono: 'payments' },
  {
    codigo: 'TIPO_DOCUMENTO_FISCAL',
    nombre: 'Tipo de documento fiscal',
    grupo: 'facturacion-cobros',
    icono: 'description',
  },
  { codigo: 'ESTADO_CONVENIO', nombre: 'Estado de convenio', grupo: 'facturacion-cobros', icono: 'handshake' },
  {
    codigo: 'TIPO_ITEM_INVENTARIO',
    nombre: 'Tipo de item de inventario',
    grupo: 'farmacia',
    icono: 'inventory_2',
  },
  {
    codigo: 'TIPO_MOVIMIENTO_INVENTARIO',
    nombre: 'Tipo de movimiento de inventario',
    grupo: 'farmacia',
    icono: 'swap_vert',
  },
  {
    codigo: 'ESTADO_ITEM_INVENTARIO',
    nombre: 'Estado de item de inventario',
    grupo: 'farmacia',
    icono: 'inventory',
  },
  { codigo: 'UNIDAD_MEDIDA', nombre: 'Unidad de medida', grupo: 'farmacia', icono: 'straighten' },
  { codigo: 'ESTADO_RECETA', nombre: 'Estado de receta', grupo: 'farmacia', icono: 'receipt_long' },
  { codigo: 'CATEGORIA_MEDICAMENTO', nombre: 'Categoría de medicamento', grupo: 'farmacia', icono: 'medication' },
  {
    codigo: 'TIPO_ENTIDAD_ASEGURADORA',
    nombre: 'Tipo de entidad aseguradora',
    grupo: 'seguros-medicos',
    icono: 'health_and_safety',
  },
  { codigo: 'MODULO_SISTEMA', nombre: 'Módulo del sistema', grupo: 'General', icono: 'apps' },
  {
    codigo: 'CATEGORIA_EXAMEN',
    nombre: 'Categoría de examen',
    grupo: 'laboratorio-diagnostico',
    icono: 'biotech',
  },
];
