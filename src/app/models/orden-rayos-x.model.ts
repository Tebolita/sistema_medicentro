// Orden de Rayos X: digitalización de la boleta de referencia a estudio de
// imagen (Estudio requerido / Datos clínicos / Médico referente), impresa
// con el encabezado del Sanatorio Medicentro. 1:1 con la cita, igual patrón
// que FichaClinicaGeneral. Nombre y edad del paciente, lugar/fecha y médico
// referente salen de Paciente/Cita al imprimir (ver consulta-atencion.ts),
// no se repiten aquí.

export interface OrdenRayosX {
  idOrdenRayosX: number;
  idCita: number;
  idPaciente: number;
  idMedico: number;

  estudioRequerido: string; // Ej. "RX Tórax PA y Parrilla Costal Derecha"
  datosClinicos: string | null; // Ej. "Por caída"
  telefono: string | null;
  correoElectronico: string | null;

  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/ordenes-rayos-x
// ============================================================

// POST /api/ordenes-rayos-x  y  PUT /api/ordenes-rayos-x/{id}
export interface OrdenRayosXRequest {
  idCita: number;
  idPaciente: number;
  idMedico: number;

  estudioRequerido: string;
  datosClinicos: string | null;
  telefono: string | null;
  correoElectronico: string | null;
}
