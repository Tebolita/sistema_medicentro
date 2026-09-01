// Módulo 6: Inventario (incluye el inventario de farmacia).

export interface Proveedor {
  idProveedor: number;
  nombre: string;
  nit: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface ItemInventario {
  idItemInventario: number;
  idMedicamento: number | null; // si el item ES un medicamento
  idProveedor: number | null;
  nombre: string;
  idTipoItem: number; // cat TIPO_ITEM_INVENTARIO (medicamento/material_oficina/utensilio_medico)
  idUnidadMedida: number; // cat UNIDAD_MEDIDA
  stockMinimo: number;
  stockActual: number;
  idEstadoItem: number; // cat ESTADO_ITEM_INVENTARIO
  bajoStock: boolean; // columna calculada (persisted): stock_actual <= stock_minimo
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface MovimientoInventario {
  idMovimiento: number;
  idItemInventario: number;
  idTipoMovimiento: number; // cat TIPO_MOVIMIENTO_INVENTARIO (entrada/salida/ajuste/merma)
  cantidad: number;
  fechaMovimiento: string;
  idTratamiento: number | null; // referencia opcional: consumo por tratamiento
  motivo: string | null;
  activo: boolean;
  fechaCreacion: string;
  idUsuarioCreacion: number | null;
}

export interface AlertaStock {
  idAlertaStock: number;
  idItemInventario: number;
  fechaAlerta: string;
  stockAlMomento: number;
  idEstadoAlerta: number; // cat ESTADO_ALERTA (pendiente/atendida)
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}
