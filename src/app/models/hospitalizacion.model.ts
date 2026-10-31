// Módulo 10: Hospitalización / Habitaciones (módulo opcional en el diseño original).

export interface Habitacion {
  idHabitacion: number;
  numero: string;
  piso: number | null;
  idTipoHabitacion: number | null; // cat TIPO_HABITACION (individual/compartida/uci)
  idEstadoHabitacion: number; // cat ESTADO_HABITACION
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface Cama {
  idCama: number;
  idHabitacion: number;
  numeroCama: string;
  idEstadoCama: number; // cat ESTADO_CAMA
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface Hospitalizacion {
  idHospitalizacion: number;
  idPaciente: number;
  // Consulta que la originó, si se inició desde la atención de una
  // consulta (ver SOLICITUD_MOTOR_CONSULTAS.md).
  idCita: number | null;
  idCama: number;
  idMedicoResponsable: number;
  fechaIngreso: string;
  fechaEgreso: string | null;
  motivoIngreso: string;
  diagnosticoEgreso: string | null;
  idEstadoHospitalizacion: number; // cat ESTADO_HOSPITALIZACION (activa/alta/trasladada)
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface OrdenMedicaHospitalizacion {
  idOrdenMedica: number;
  idHospitalizacion: number;
  idMedico: number;
  idTipoOrden: number; // cat TIPO_ORDEN_HOSPITALIZACION (medica/enfermeria)
  fechaOrden: string;
  descripcion: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface NotaEnfermeria {
  idNotaEnfermeria: number;
  idHospitalizacion: number;
  idEmpleado: number;
  fechaHora: string;
  nota: string;
  signosVitales: string | null; // JSON string: {"temperatura":..,"presion":..,"pulso":..}
  activo: boolean;
  fechaCreacion: string;
}

// "Hoja de Evolución" del MÉDICO durante una hospitalización — distinta de
// NotaEnfermeria (hoja "ENFERMERIA"): mismo papel físico, pero cada
// profesión tiene su propia hoja.
export interface NotaEvolucionHospitalizacion {
  idNotaEvolucion: number;
  idHospitalizacion: number;
  idMedico: number;
  fechaHora: string;
  evolucion: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

// "Hoja de Control de Medicamentos": cada fila es un medicamento programado
// (con su hora) para una hospitalización. Las marcas de administración
// viven aparte (AdministracionMedicamento), una por cada dosis dada —
// equivale a tachar un día en la cuadrícula del papel físico.
export interface MedicamentoProgramadoHospitalizacion {
  idMedicamentoProgramado: number;
  idHospitalizacion: number;
  idMedicamento: number;
  hora: string; // "HH:mm:ss"
  fechaInicial: string;
  observaciones: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  administraciones: AdministracionMedicamento[];
}

export interface AdministracionMedicamento {
  idAdministracion: number;
  idMedicamentoProgramado: number;
  idEmpleado: number;
  fechaHora: string;
  fechaCreacion: string;
}

// "CONTROL DE SIGNOS": bitácora de signos vitales durante una
// hospitalización — varias filas a lo largo del tiempo.
export interface ControlSignosHospitalizacion {
  idControlSignos: number;
  idHospitalizacion: number;
  fechaHora: string;
  presionArterial: string | null; // "P/A"
  temperatura: number | null;
  frecuenciaRespiratoria: number | null; // "F.R."
  observaciones: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

// "COSTO PACIENTE": bitácora manual de todo lo que genera costo durante una
// hospitalización (medicamentos administrados, insumos, procedimientos...).
// idMedicamento es opcional, solo para prellenar descripción/valor desde
// el catálogo.
export interface CostoPacienteHospitalizacion {
  idCostoPaciente: number;
  idHospitalizacion: number;
  idMedicamento: number | null;
  fecha: string;
  descripcion: string;
  cantidad: number;
  valorUnitario: number;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}
