// Orden médica dejada en una consulta externa puntual — DISTINTA de
// OrdenMedicaHospitalizacion (ligada a id_hospitalizacion): esta se liga a
// la cita, para poder dejar indicaciones a cualquier paciente, no solo a
// los ingresados. Puede haber varias órdenes por consulta.

export interface OrdenMedicaConsulta {
  idOrdenMedicaConsulta: number;
  idCita: number;
  idPaciente: number;
  idMedico: number;
  idTipoOrden: number; // cat TIPO_ORDEN_HOSPITALIZACION (MEDICA/ENFERMERIA), reutilizado
  fechaOrden: string;
  indicaciones: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/ordenes-medicas-consulta
// ============================================================

// POST /api/ordenes-medicas-consulta
export interface OrdenMedicaConsultaRequest {
  idCita: number;
  idPaciente: number;
  idMedico: number;
  idTipoOrden: number;
  fechaOrden: string;
  indicaciones: string;
}
