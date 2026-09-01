// Módulo 12: Convenios con Aseguradoras/Empresas + Módulo 12.1: Pólizas de Seguro.
// PolizaSeguro es lo que recepción valida contra el carnet físico/digital del
// asegurado (RPN, Roblered, ASSA, Mi Cope, etc.) para calcular el copago.

export interface Aseguradora {
  idAseguradora: number;
  nombre: string;
  nit: string | null;
  idTipoEntidad: number | null; // cat TIPO_ENTIDAD_CONVENIO (aseguradora/empresa)
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface Convenio {
  idConvenio: number;
  idAseguradora: number;
  nombreConvenio: string;
  fechaInicio: string;
  fechaFin: string | null;
  porcentajeCoberturaGeneral: number | null;
  condiciones: string | null;
  idEstadoConvenio: number; // cat ESTADO_CONVENIO (activo/vencido/suspendido)
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface PacienteConvenio {
  idPacienteConvenio: number;
  idPaciente: number;
  idConvenio: number;
  numeroAfiliado: string | null;
  fechaVinculacion: string;
  idEstadoAfiliacion: number; // cat ESTADO_AFILIACION
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface ConvenioCobertura {
  idConvenioCobertura: number;
  idConvenio: number;
  idTipoItem: number; // mismo catálogo TIPO_ITEM_FACTURA
  porcentajeCobertura: number;
  montoMaximo: number | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface PolizaSeguro {
  idPoliza: number;
  idPaciente: number;
  idAseguradora: number;
  idConvenio: number | null; // opcional: si corresponde a un convenio corporativo ya registrado
  idRamo: number; // cat RAMO_SEGURO
  numeroPoliza: string;
  numeroCertificado: string | null;
  idTitularidad: number; // cat TITULARIDAD_POLIZA
  nombreTitular: string | null; // cuando el titular no es el mismo paciente (ej. jefe de familia)
  nombrePropietario: string | null; // razón social / quien contrata la póliza (ej. empresa en seguro corporativo)
  codigoAutorizacion: string | null; // código de preautorización telefónica (ej. seguro "Mi Cope")
  porcentajeCopago: number | null;
  montoCopago: number | null;
  fechaInicioVigencia: string | null;
  fechaFinVigencia: string | null;
  idEstadoPoliza: number; // cat ESTADO_POLIZA
  observaciones: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}
