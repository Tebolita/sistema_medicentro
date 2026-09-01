// Módulo 5: Seguridad y Control de Acceso.
// Roles, permisos y usuarios viven en fundamentos.model.ts porque el resto
// del esquema depende de `usuarios` desde el inicio. Aquí solo la bitácora.

export interface BitacoraAuditoria {
  idBitacora: number;
  idUsuario: number | null;
  idTipoAccion: number; // cat TIPO_ACCION_AUDITORIA (crear/modificar/eliminar_logico/consultar/login)
  tablaAfectada: string;
  idRegistroAfectado: number | null;
  valoresAnteriores: string | null; // JSON string
  valoresNuevos: string | null; // JSON string
  ipOrigen: string | null;
  fechaHora: string;
  activo: boolean;
}
