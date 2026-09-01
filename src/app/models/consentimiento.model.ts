// Módulo 11: Consentimientos Informados.

export interface TipoConsentimiento {
  idTipoConsentimiento: number;
  nombre: string;
  plantillaTexto: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface ConsentimientoInformado {
  idConsentimiento: number;
  idPaciente: number;
  idTipoConsentimiento: number;
  idTratamiento: number | null;
  idMedicoResponsable: number;
  idTestigo: number | null;
  fechaFirma: string | null;
  firmaDigitalHash: string | null;
  firmaDigitalUrl: string | null;
  idEstadoConsentimiento: number; // cat ESTADO_CONSENTIMIENTO (firmado/revocado)
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}
