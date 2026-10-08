// Libro de actas (Recepción): bitácora de ingresos de pacientes.
// Tabla libro_actas 

// ============================================================
// CONSUMO DE LA API  →  /api/Actas
// ============================================================

// GET /api/Actas (lista), GET /api/Actas/{id}, y respuesta de POST y PUT.
// El listado trae solo actas activas, de la más reciente a la más antigua.
export interface Acta {
  idActa: number;
  idPaciente: number;
  motivoIngreso: string;
  idAtendidoPor: number; // empleado de recepción (idEmpleado)
  fechaHora: string;
  observaciones: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null; // lo llena el backend con el usuario de la sesión
  idUsuarioModificacion: number | null;
}

// POST /api/Actas  y  PUT /api/Actas/{id}  (mismo formato para ambos)

export interface ActaRequest {
  idPaciente: number;
  motivoIngreso: string;
  idAtendidoPor: number;
  fechaHora?: string | null;
  observaciones: string | null;
}