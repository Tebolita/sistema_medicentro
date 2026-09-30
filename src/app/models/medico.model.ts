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