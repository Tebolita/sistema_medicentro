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
