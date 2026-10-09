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

// ============================================================
// CONSUMO DE LA API  →  /api/Polizas
// ============================================================

// GET /api/Polizas (lista), GET /api/Polizas/{id}, y respuesta de POST y PUT
// devuelven PolizaSeguro (interfaz de arriba) tal cual.
// El listado trae solo pólizas activas, de la más reciente a la más antigua.

// POST /api/Polizas  y  PUT /api/Polizas/{id}  (mismo formato para ambos)
// Fechas de vigencia como 'YYYY-MM-DD'. El porcentaje de copago va de 0 a 100.
export interface PolizaRequest {
  idPaciente: number;
  idAseguradora: number;
  idConvenio: number | null;
  idRamo: number;
  numeroPoliza: string;
  numeroCertificado: string | null;
  idTitularidad: number;
  nombreTitular: string | null;
  nombrePropietario: string | null;
  codigoAutorizacion: string | null;
  porcentajeCopago: number | null;
  montoCopago: number | null;
  fechaInicioVigencia: string | null;
  fechaFinVigencia: string | null;
  idEstadoPoliza: number;
  observaciones: string | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/Aseguradoras
// ============================================================

// GET /api/Aseguradoras
// Solo aseguradoras activas, ordenadas por nombre. A diferencia de la interfaz
// Aseguradora de arriba, el backend NO devuelve fechas ni usuarios de auditoría.
export interface AseguradoraListado {
  idAseguradora: number;
  nombre: string;
  nit: string | null;
  idTipoEntidad: number | null;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
}

// ============================================================
// CONSUMO DE LA API  →  /api/Convenios
// ============================================================

// GET /api/Convenios (lista), GET /api/Convenios/{id}, y respuesta de POST y PUT.
// Cada convenio viene con sus afiliados y coberturas activos.
// El listado trae solo convenios activos, ordenados por nombre.
export interface ConvenioCompleto {
  convenio: Convenio;
  afiliados: PacienteConvenio[];
  coberturas: ConvenioCobertura[];
}

// POST /api/Convenios  y  PUT /api/Convenios/{id}
// Solo los datos del convenio. Afiliados y coberturas se manejan con sus
// propios endpoints (abajo), uno por uno.
export interface ConvenioRequest {
  idAseguradora: number;
  nombreConvenio: string;
  fechaInicio: string; // 'YYYY-MM-DD'
  fechaFin: string | null;
  porcentajeCoberturaGeneral: number | null; // 0 a 100
  condiciones: string | null;
  idEstadoConvenio: number;
}

// POST /api/Convenios/{id}/afiliados  y  PUT /api/Convenios/{id}/afiliados/{idPacienteConvenio}
// Un paciente no puede estar afiliado dos veces al mismo convenio (el backend responde 409).
export interface AfiliadoRequest {
  idPaciente: number;
  numeroAfiliado: string | null;
  fechaVinculacion: string; // 'YYYY-MM-DD'
  idEstadoAfiliacion: number;
}

// POST /api/Convenios/{id}/coberturas  y  PUT /api/Convenios/{id}/coberturas/{idConvenioCobertura}
// Solo una cobertura por tipo de ítem en cada convenio (el backend responde 409).
export interface CoberturaRequest {
  idTipoItem: number;
  porcentajeCobertura: number; // 0 a 100
  montoMaximo: number | null;
}