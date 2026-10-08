// Médicos: empleados activos con especialidad asignada.
// Se usa en los selectores de médico (ej. Consulta externa).

// ============================================================
// CONSUMO DE LA API  →  /api/empleados/medicos
// ============================================================

// GET /api/empleados/medicos
// Solo empleados activos con id_especialidad, ordenados por apellido y nombre.
// Ejemplo: { idEmpleado: 3, nombreCompleto: 'Roberto Sandoval Pérez',
//            colegiado: '12345', idEspecialidad: 2, correo: null, telefono: null }
export interface Medico {
  idEmpleado: number;
  nombreCompleto: string; // el backend ya lo arma con nombres y apellidos
  colegiado: string | null;
  idEspecialidad: number | null;
  correo: string | null;
  telefono: string | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/especialidades
// ============================================================

// GET /api/especialidades  y  GET /api/especialidades/{id}  (y respuesta de POST y PUT)
// Para mostrar el nombre de la especialidad junto al médico, se cruza
// medico.idEspecialidad con especialidad.idEspecialidad.
export interface EspecialidadMedica {
  idEspecialidad: number;
  nombre: string; // ej. 'Pediatría'
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

// POST /api/especialidades  y  PUT /api/especialidades/{id}
export interface EspecialidadRequest {
  nombre: string;
  descripcion: string | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/empleados
// ============================================================

// GET /api/empleados (lista), GET /api/empleados/{id}, y respuesta de POST y PUT.
// El listado trae solo empleados activos, ordenados por primer apellido.
// Con ?idPuesto=X filtra por puesto (ej. solo recepcionistas para el
// "Atendido por" del libro de actas).
// Se llama EmpleadoDetalle (y no Empleado) para no confundirla con la
// interfaz Empleado de fundamentos.model.ts, que trae campos que el backend
// no devuelve.
export interface EmpleadoDetalle {
  idEmpleado: number;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  fechaNacimiento: string | null; // 'YYYY-MM-DD'
  idGenero: number | null;
  idTipoDocumento: number | null;
  numeroDocumento: string | null;
  idPuesto: number;
  idEspecialidad: number | null;
  colegiado: string | null;
  fechaIngreso: string; // 'YYYY-MM-DD'
  fechaEgreso: string | null;
  idEstadoEmpleado: number; // cat ESTADO_EMPLEADO
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

// POST /api/empleados  y  PUT /api/empleados/{id}
// El puesto (y la especialidad, si se manda) deben existir, o el backend responde 404.
export interface EmpleadoRequest {
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  fechaNacimiento: string | null;
  idGenero: number | null;
  idTipoDocumento: number | null;
  numeroDocumento: string | null;
  idPuesto: number;
  idEspecialidad: number | null;
  colegiado: string | null;
  fechaIngreso: string;
  fechaEgreso: string | null;
  idEstadoEmpleado: number;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/puestos
// ============================================================

// GET /api/puestos  y  GET /api/puestos/{id}  (y respuesta de POST y PUT)
// Sirve para encontrar el id del puesto "Recepcionista" y filtrar empleados.
// Se llama PuestoDetalle por la misma razón que EmpleadoDetalle.
export interface PuestoDetalle {
  idPuesto: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

// POST /api/puestos  y  PUT /api/puestos/{id}
export interface PuestoRequest {
  nombre: string;
  descripcion: string | null;
}