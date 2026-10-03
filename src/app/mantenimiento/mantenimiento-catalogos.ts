// Códigos de catálogo (cat_tipo_catalogo) que el sistema ya usa en algún
// dropdown. El backend NO tiene un endpoint para listar todos los tipos que
// existen (CatalogosController solo tiene GET /{codigoTipo}, asumiendo que
// ya conoces el código), así que esta lista es curada a mano con los que se
// han ido necesitando. "Otro código..." permite escribir uno nuevo que no
// esté en la lista, para los que vengan más adelante.
export interface TipoCatalogoConocido {
  codigo: string;
  nombre: string;
}

export const TIPOS_CATALOGO_CONOCIDOS: TipoCatalogoConocido[] = [
  { codigo: 'ESTADO_FACTURA', nombre: 'Estado de factura' },
  { codigo: 'FORMA_PAGO', nombre: 'Forma de pago' },
  { codigo: 'ESTADO_PAGO', nombre: 'Estado de pago' },
  { codigo: 'TIPO_DOCUMENTO_FISCAL', nombre: 'Tipo de documento fiscal' },
  { codigo: 'TIPO_ITEM_INVENTARIO', nombre: 'Tipo de item de inventario' },
  { codigo: 'TIPO_MOVIMIENTO_INVENTARIO', nombre: 'Tipo de movimiento de inventario' },
  { codigo: 'ESTADO_ITEM_INVENTARIO', nombre: 'Estado de item de inventario' },
  { codigo: 'UNIDAD_MEDIDA', nombre: 'Unidad de medida' },
  { codigo: 'ESTADO_RECETA', nombre: 'Estado de receta' },
  { codigo: 'CATEGORIA_MEDICAMENTO', nombre: 'Categoría de medicamento' },
  { codigo: 'ESTADO_CONVENIO', nombre: 'Estado de convenio' },
];
