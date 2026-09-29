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