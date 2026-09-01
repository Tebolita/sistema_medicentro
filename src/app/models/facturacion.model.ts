// Módulo 4: Facturación y Cobros (sin integración de pasarela de pagos).

export interface Factura {
  idFactura: number;
  idPaciente: number;
  idTipoDocumentoFiscal: number; // cat TIPO_DOCUMENTO_FISCAL (factura/nota_credito)
  serie: string | null;
  numeroDocumento: string;
  fechaEmision: string;
  subtotal: number;
  descuento: number;
  impuesto: number;
  total: number;
  idEstadoFactura: number; // cat ESTADO_FACTURA
  // Campos FEL: opcionales, "si aplica" según el requerimiento
  numeroAutorizacionFel: string | null;
  fechaCertificacionFel: string | null;
  idConvenio: number | null;
  idPoliza: number | null; // agregado en Módulo 12.1 (pólizas de seguro)
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface FacturaDetalle {
  idFacturaDetalle: number;
  idFactura: number;
  idTipoItem: number; // cat TIPO_ITEM_FACTURA (consulta/tratamiento/medicamento/procedimiento)
  idCita: number | null;
  idTratamiento: number | null;
  idMedicamento: number | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
  subtotal: number;
  activo: boolean;
  fechaCreacion: string;
}

export interface Pago {
  idPago: number;
  idFactura: number;
  fechaPago: string;
  monto: number;
  idFormaPago: number; // cat FORMA_PAGO (efectivo/tarjeta/transferencia/cheque/deposito) - registro interno, no pasarela
  idEstadoPago: number; // cat ESTADO_PAGO
  referenciaPago: string | null; // no. de cheque, últimos 4 dígitos, no. de boleta de depósito, etc.
  observaciones: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface CuentaPorCobrar {
  idCuentaCobrar: number;
  idPaciente: number;
  idFactura: number;
  montoOriginal: number;
  saldoPendiente: number;
  fechaVencimiento: string | null;
  idEstadoCxc: number; // cat ESTADO_CXC (vigente/vencida/pagada)
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface NotaCredito {
  idNotaCredito: number;
  idFacturaOriginal: number;
  numeroDocumento: string;
  fechaEmision: string;
  idMotivo: number; // cat MOTIVO_NOTA_CREDITO (anulación/devolución/ajuste)
  monto: number;
  idEstadoNotaCredito: number; // cat ESTADO_NOTA_CREDITO
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}
