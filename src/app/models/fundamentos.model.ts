// Fundamentos: especialidades, puestos, empleados, usuarios, roles y permisos.
// Requeridos por casi todos los demás módulos (empleados -> médicos, usuarios -> auditoría).

export interface Especialidad {
  idEspecialidad: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface Puesto {
  idPuesto: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface Empleado {
  idEmpleado: number;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  fechaNacimiento: string | null;
  idGenero: number | null; // cat GENERO
  idTipoDocumento: number | null; // cat TIPO_DOCUMENTO
  numeroDocumento: string | null;
  idPuesto: number;
  idEspecialidad: number | null; // solo aplica a médicos
  colegiado: string | null; // no. de colegiado activo, aplica a médicos
  fechaIngreso: string;
  fechaEgreso: string | null;
  idEstadoEmpleado: number; // cat ESTADO_EMPLEADO
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface Usuario {
  idUsuario: number;
  idEmpleado: number | null; // NULL permitido: cuentas de servicio/técnicas
  nombreUsuario: string;
  correo: string;
  hashPassword: string; // nunca exponer al cliente; incluido solo por completitud del modelo
  idEstadoUsuario: number; // cat ESTADO_USUARIO
  fechaUltimoAcceso: string | null;
  intentosFallidos: number;
  requiereCambioPassword: boolean;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface Rol {
  idRol: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface Permiso {
  idPermiso: number;
  codigo: string; // ej. 'PACIENTES_EDITAR'
  nombre: string;
  idModulo: number; // cat MODULO_SISTEMA
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface RolPermiso {
  idRolPermiso: number;
  idRol: number;
  idPermiso: number;
  activo: boolean;
  fechaCreacion: string;
}

export interface UsuarioRol {
  idUsuarioRol: number;
  idUsuario: number;
  idRol: number;
  fechaAsignacion: string;
  activo: boolean;
}
