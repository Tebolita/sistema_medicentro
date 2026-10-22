// Códigos de catálogo (cat_tipo_catalogo) que el sistema ya usa en algún
// dropdown. El backend SÍ tiene GET /api/catalogos (lista todos los que
// existen, con su módulo real en `codigoModulo` — ver CatalogoTipo en
// catalogos.service.ts), así que esto ya no es la fuente de verdad de qué
// catálogos hay ni de a qué módulo pertenecen: solo le da un ícono más
// específico a los que reconoce por código (ver catalogos-lista.ts: si el
// código no está acá, usa un ícono genérico).
export interface TipoCatalogoConocido {
  codigo: string;
  nombre: string;
  icono: string;
}

export const TIPOS_CATALOGO_CONOCIDOS: TipoCatalogoConocido[] = [
  { codigo: 'ESTADO_FACTURA', nombre: 'Estado de factura', icono: 'receipt' },
  { codigo: 'FORMA_PAGO', nombre: 'Forma de pago', icono: 'credit_card' },
  { codigo: 'ESTADO_PAGO', nombre: 'Estado de pago', icono: 'payments' },
  { codigo: 'TIPO_DOCUMENTO_FISCAL', nombre: 'Tipo de documento fiscal', icono: 'description' },
  { codigo: 'ESTADO_CONVENIO', nombre: 'Estado de convenio', icono: 'handshake' },
  { codigo: 'TIPO_ITEM_INVENTARIO', nombre: 'Tipo de item de inventario', icono: 'inventory_2' },
  { codigo: 'TIPO_MOVIMIENTO_INVENTARIO', nombre: 'Tipo de movimiento de inventario', icono: 'swap_vert' },
  { codigo: 'ESTADO_ITEM_INVENTARIO', nombre: 'Estado de item de inventario', icono: 'inventory' },
  { codigo: 'UNIDAD_MEDIDA', nombre: 'Unidad de medida', icono: 'straighten' },
  { codigo: 'ESTADO_RECETA', nombre: 'Estado de receta', icono: 'receipt_long' },
  { codigo: 'CATEGORIA_MEDICAMENTO', nombre: 'Categoría de medicamento', icono: 'medication' },
  { codigo: 'TIPO_ENTIDAD_ASEGURADORA', nombre: 'Tipo de entidad aseguradora', icono: 'health_and_safety' },
  { codigo: 'MODULO_SISTEMA', nombre: 'Módulo del sistema', icono: 'apps' },
  { codigo: 'CATEGORIA_EXAMEN', nombre: 'Categoría de examen', icono: 'biotech' },
];
