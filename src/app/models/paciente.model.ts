// Módulo 1: Pacientes.

export interface Paciente {
  idPaciente: number;
  codigoExpediente: string;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  fechaNacimiento: string;
  idGenero: number | null; // cat GENERO
  idTipoDocumento: number | null; // cat TIPO_DOCUMENTO
  numeroDocumento: string | null;
  idEstadoCivil: number | null; // cat ESTADO_CIVIL
  telefonoPrincipal: string | null;
  telefonoSecundario: string | null;
  correo: string | null;
  direccion: string | null;
  idTipoSangre: number | null; // cat TIPO_SANGRE
  idNivelConfidencialidad: number | null; // cat NIVEL_CONFIDENCIALIDAD
  idEstadoPaciente: number; // cat ESTADO_PACIENTE
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface PacienteContactoEmergencia {
  idContactoEmergencia: number;
  idPaciente: number;
  nombreCompleto: string;
  idParentesco: number | null; // cat PARENTESCO
  telefono: string;
  direccion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface PacienteAlergia {
  idAlergia: number;
  idPaciente: number;
  idTipoAlergia: number; // cat TIPO_ALERGIA (medicamento/alimento/ambiental)
  descripcion: string;
  idSeveridad: number; // cat SEVERIDAD (leve/moderada/severa)
  fechaDiagnostico: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface PacienteAntecedente {
  idAntecedente: number;
  idPaciente: number;
  idTipoAntecedente: number; // cat TIPO_ANTECEDENTE (personal/familiar/quirúrgico)
  descripcion: string;
  fechaRegistro: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/pacientes
// ============================================================


// ---------- Lo que el backend DEVUELVE ----------

// GET /api/pacientes
// Solo pacientes activos, ordenados por apellido y nombre, con la edad ya calculada.
export interface PacienteListado extends Paciente {
  edad: number;
}

// GET /api/pacientes/{id}  (y también la respuesta de POST y PUT)
// Ficha del paciente + sus tablas relacionadas, todo de una sola vez.
export interface PacienteCompleto {
  paciente: Paciente;
  contactos: PacienteContactoEmergencia[];
  alergias: PacienteAlergia[];
  antecedentes: PacienteAntecedente[];
}

// ---------- Lo que el front ENVÍA ----------

// Campos de la ficha que comparten crear y editar.
// No se envían idPaciente ni codigoExpediente: los genera el backend.
// Las fechas van como texto 'YYYY-MM-DD'.
export interface DatosPacienteRequest {
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  fechaNacimiento: string;
  idGenero: number | null;
  idTipoDocumento: number | null;
  numeroDocumento: string | null;
  idEstadoCivil: number | null;
  telefonoPrincipal: string | null;
  telefonoSecundario: string | null;
  correo: string | null;
  direccion: string | null;
  idTipoSangre: number | null;
  idNivelConfidencialidad: number | null;
  idEstadoPaciente: number;
}

// POST /api/pacientes
export interface CrearContactoRequest {
  nombreCompleto: string;
  idParentesco: number | null;
  telefono: string;
  direccion: string | null;
}

export interface CrearAlergiaRequest {
  idTipoAlergia: number;
  descripcion: string;
  idSeveridad: number;
  fechaDiagnostico: string | null;
}

export interface CrearAntecedenteRequest {
  idTipoAntecedente: number;
  descripcion: string;
  fechaRegistro: string;
}

export interface CrearPacienteRequest extends DatosPacienteRequest {
  contactos: CrearContactoRequest[];
  alergias: CrearAlergiaRequest[];
  antecedentes: CrearAntecedenteRequest[];
}

// PUT /api/pacientes/{id}
// En contactos/alergias/antecedentes: id positivo = fila existente que se actualiza;
// id cero o negativo (generarIdTemporal) = fila nueva. Las filas que no se envíen,
// el backend las da de baja.
export interface EditarContactoRequest extends CrearContactoRequest {
  idContactoEmergencia: number;
}

export interface EditarAlergiaRequest extends CrearAlergiaRequest {
  idAlergia: number;
}

export interface EditarAntecedenteRequest extends CrearAntecedenteRequest {
  idAntecedente: number;
}

export interface EditarPacienteRequest extends DatosPacienteRequest {
  contactos: EditarContactoRequest[];
  alergias: EditarAlergiaRequest[];
  antecedentes: EditarAntecedenteRequest[];
}