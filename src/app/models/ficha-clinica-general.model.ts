// Ficha clínica "General" del Sanatorio Medicentro Barberena (papel rosa
// digitalizado), DISTINTA de FichaConsultaExternaAdulto — trae antecedentes
// gineco-obstétricos, prenatales, revisión por sistemas y examen físico por
// aparatos. 1:1 con la cita, igual patrón que la otra ficha. Los datos
// generales (nombre, edad, dirección, estado civil, religión, ocupación)
// salen de Paciente/Cita al imprimir (ver consulta-atencion.ts); los
// antecedentes FAM/MED/QX/hábitos y alergias salen del expediente del
// paciente, no se repiten aquí.

export interface FichaClinicaGeneral {
  idFicha: number;
  idCita: number;
  idPaciente: number;
  idMedico: number;

  motivoConsulta: string; // "M. de C."
  historiaEnfermedad: string | null; // "Hx. De la Enf."

  prenatales: string | null;
  vacunacion: string | null;
  menarquia: string | null;
  ciclo: string | null;
  dolor: string | null;
  ultimaRegla: string | null;
  revisionSistemas: string | null; // "R.X Sistemas"

  estadoGeneral: string | null;
  presionArterial: string | null;
  pulso: number | null;
  respiracion: number | null;
  temperatura: number | null;
  pielFaneras: string | null;
  cabezaCuello: string | null;
  cardioPulmonar: string | null;
  abdomen: string | null;
  dorsoRaquis: string | null;
  extremidades: string | null;
  neurologico: string | null;
  otros: string | null;

  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/fichas-clinica-general
// ============================================================

// POST /api/fichas-clinica-general  y  PUT /api/fichas-clinica-general/{id}
export interface FichaClinicaGeneralRequest {
  idCita: number;
  idPaciente: number;
  idMedico: number;

  motivoConsulta: string;
  historiaEnfermedad: string | null;

  prenatales: string | null;
  vacunacion: string | null;
  menarquia: string | null;
  ciclo: string | null;
  dolor: string | null;
  ultimaRegla: string | null;
  revisionSistemas: string | null;

  estadoGeneral: string | null;
  presionArterial: string | null;
  pulso: number | null;
  respiracion: number | null;
  temperatura: number | null;
  pielFaneras: string | null;
  cabezaCuello: string | null;
  cardioPulmonar: string | null;
  abdomen: string | null;
  dorsoRaquis: string | null;
  extremidades: string | null;
  neurologico: string | null;
  otros: string | null;
}
