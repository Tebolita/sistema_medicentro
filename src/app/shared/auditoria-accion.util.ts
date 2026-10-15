// Traduce el código real de TIPO_ACCION_AUDITORIA (CREAR/MODIFICAR/
// ELIMINAR_LOGICO) a lo que se muestra en los modales de historial. Antes
// cada pantalla comparaba idTipoAccion contra 79/80/81 quemados en el
// código — esos ids son id_valor_catalogo, generados con IDENTITY, así que
// cambian en cada base de datos. Usar el código real (vía
// CatalogosService.codigoPorId('TIPO_ACCION_AUDITORIA', idTipoAccion)) es
// portable entre bases.
export function accionLabelPorCodigo(codigo: string | undefined | null): string {
  if (codigo === 'CREAR') return 'Creó';
  if (codigo === 'MODIFICAR') return 'Modificó';
  if (codigo === 'ELIMINAR_LOGICO') return 'Eliminó';
  return 'Cambió';
}

export function accionClasePorCodigo(codigo: string | undefined | null): string {
  if (codigo === 'CREAR') return 'accion-crear';
  if (codigo === 'MODIFICAR') return 'accion-modificar';
  if (codigo === 'ELIMINAR_LOGICO') return 'accion-eliminar';
  return 'accion-default';
}

export function accionIconoPorCodigo(codigo: string | undefined | null): string {
  if (codigo === 'CREAR') return 'add_circle';
  if (codigo === 'MODIFICAR') return 'edit';
  if (codigo === 'ELIMINAR_LOGICO') return 'delete';
  return 'history';
}
