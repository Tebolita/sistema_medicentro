// Ficha clínica "Consulta Externa Adulto" del Sanatorio Medicentro,
// digitalizada a partir del formulario de papel. 1:1 con la cita, igual
// patrón que ConstanciaMedica. Los datos generales del paciente (carnet,
// DPI, nombre, fecha de nacimiento, edad) no se guardan aquí: salen de
// Paciente/Cita al momento de imprimir (ver consulta-atencion.ts).

export interface FichaConsultaExternaAdulto {
  idFicha: number;
  idCita: number;
  idPaciente: number;
  idMedico: number;

  peso: number | null;
  talla: number | null;
  presionArterial: string | null;
  frecuenciaCardiaca: number | null;
  frecuenciaRespiratoria: number | null;
  temperatura: number | null;

  motivoHistoriaActual: string;
  examenFisico: string | null;

  // FAM/MED/QX/TOX y alergias NO viven aquí: ya están estructurados en el
  // expediente del paciente (Paciente.alergias/antecedentes, TOX incluido —
  // ver paciente-formulario) y se arman al imprimir igual que los datos
  // generales. Las vacunas tampoco: se registran por consulta (ver
  // VacunaAplicada), no sueltas en texto libre aquí.
  planDiagnostico: string | null;
  planTerapeutico: string | null;
  estudiosComplementarios: string | null;

  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// ============================================================
// CONSUMO DE LA API  →  /api/fichas-consulta-externa-adulto
// ============================================================

// POST /api/fichas-consulta-externa-adulto  y  PUT /api/fichas-consulta-externa-adulto/{id}
export interface FichaConsultaExternaAdultoRequest {
  idCita: number;
  idPaciente: number;
  idMedico: number;

  peso: number | null;
  talla: number | null;
  presionArterial: string | null;
  frecuenciaCardiaca: number | null;
  frecuenciaRespiratoria: number | null;
  temperatura: number | null;

  motivoHistoriaActual: string;
  examenFisico: string | null;

  planDiagnostico: string | null;
  planTerapeutico: string | null;
  estudiosComplementarios: string | null;
}
