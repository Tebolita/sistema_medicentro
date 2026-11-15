// Catálogo de servicios clínicos cobrables (curaciones, nebulizaciones,
// electrocardiogramas...). Mismo rol que Medicamento para "Costo paciente"
// (consulta y hospitalización), pero sin receta ni inventario.

export interface Servicio {
  idServicio: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/servicios
// ============================================================

// POST /api/servicios  y  PUT /api/servicios/{id}
export interface ServicioInput {
  nombre: string;
  descripcion: string | null;
  precio: number;
}
