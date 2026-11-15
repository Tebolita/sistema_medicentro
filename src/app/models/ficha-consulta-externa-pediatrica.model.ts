// Ficha clínica "Expediente Clínico Pediátrico" del Sanatorio Medicentro,
// digitalizada a partir del formulario de papel. 1:1 con la cita, igual
// patrón que FichaConsultaExternaAdulto. Los datos generales del paciente
// (carnet, nombre, fecha de nacimiento, edad, padre/encargado) no se
// guardan aquí: salen de Paciente/Cita al momento de imprimir (ver
// consulta-atencion.ts).

export interface FichaConsultaExternaPediatrica {
  idFicha: number;
  idCita: number;
  idPaciente: number;
  idMedico: number;

  motivoConsulta: string;
  historiaClinica: string | null;

  // Antecedentes perinatales.
  lugarNacimiento: string | null;
  tipoParto: string | null;
  pan: string | null;
  llantoAlNacer: string | null;
  complicaciones: string | null;
  alimentacionLm: boolean | null;
  alimentacionTiempo: string | null;
  formula: string | null;
  inmunizacionesCompletas: boolean | null;
  inmunizacionesEn: string | null;

  // FAM/QX/TX/MEDICOS/ALERG salen del expediente del paciente
  // (Paciente.alergias/antecedentes), igual que en la ficha de adulto.

  // Crecimiento y desarrollo.
  sonrisaSocial: string | null;
  seSento: string | null;
  camino: string | null;
  hablo: string | null;

  revisionPorSistemas: string | null;

  // Examen físico (datos positivos).
  peso: number | null;
  talla: number | null;
  cc: number | null;
  pe: number | null;
  te: number | null;
  pt: number | null;
  imc: number | null;
  fr: number | null;
  fc: number | null;
  temperatura: number | null;
  pa: string | null;
  downes: string | null;
  frEaCr: string | null;
  examenFisico: string | null;

  planDiagnostico: string | null;
  planTerapeutico: string | null;
  planEducacional: string | null;

  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/fichas-consulta-externa-pediatrica
// ============================================================

// POST /api/fichas-consulta-externa-pediatrica  y  PUT .../{id}
export interface FichaConsultaExternaPediatricaRequest {
  idCita: number;
  idPaciente: number;
  idMedico: number;

  motivoConsulta: string;
  historiaClinica: string | null;

  lugarNacimiento: string | null;
  tipoParto: string | null;
  pan: string | null;
  llantoAlNacer: string | null;
  complicaciones: string | null;
  alimentacionLm: boolean | null;
  alimentacionTiempo: string | null;
  formula: string | null;
  inmunizacionesCompletas: boolean | null;
  inmunizacionesEn: string | null;

  sonrisaSocial: string | null;
  seSento: string | null;
  camino: string | null;
  hablo: string | null;

  revisionPorSistemas: string | null;

  peso: number | null;
  talla: number | null;
  cc: number | null;
  pe: number | null;
  te: number | null;
  pt: number | null;
  imc: number | null;
  fr: number | null;
  fc: number | null;
  temperatura: number | null;
  pa: string | null;
  downes: string | null;
  frEaCr: string | null;
  examenFisico: string | null;

  planDiagnostico: string | null;
  planTerapeutico: string | null;
  planEducacional: string | null;
}
