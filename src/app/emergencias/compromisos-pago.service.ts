import { Injectable, computed, signal } from '@angular/core';
import { ConsentimientoInformado } from '../models';
import { TIPO_CONSENTIMIENTO_COMPROMISO_PAGO } from './emergencias-catalogos';

// El "responsable de pago" (nombre/parentesco/teléfono del familiar) no
// tiene columna en `consentimientos_informados` — se guarda acá como un
// campo local aparte, documentado como pendiente en PENDIENTES.md, en vez
// de forzarlo dentro de una columna existente que no le corresponde
// (`idTestigo` es un id de persona del sistema, no un familiar externo).
export interface CompromisoPago {
  consentimiento: ConsentimientoInformado;
  nombreResponsable: string;
  idParentescoResponsable: number;
  telefonoResponsable: string;
}

@Injectable({ providedIn: 'root' })
export class CompromisosPagoService {
  private nextId = 3;

  private registros = signal<CompromisoPago[]>([
    {
      consentimiento: {
        idConsentimiento: 1,
        idPaciente: 2,
        idTipoConsentimiento: TIPO_CONSENTIMIENTO_COMPROMISO_PAGO,
        idTratamiento: null,
        idMedicoResponsable: 3,
        idTestigo: null,
        fechaFirma: '2026-09-07T14:15:00',
        firmaDigitalHash: null,
        firmaDigitalUrl: null,
        idEstadoConsentimiento: 2,
        activo: true,
        fechaCreacion: '2026-09-07T14:15:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      nombreResponsable: 'Marta Ramírez',
      idParentescoResponsable: 3,
      telefonoResponsable: '5588-4477',
    },
    {
      consentimiento: {
        idConsentimiento: 2,
        idPaciente: 3,
        idTipoConsentimiento: TIPO_CONSENTIMIENTO_COMPROMISO_PAGO,
        idTratamiento: null,
        idMedicoResponsable: 2,
        idTestigo: null,
        fechaFirma: null,
        firmaDigitalHash: null,
        firmaDigitalUrl: null,
        idEstadoConsentimiento: 1,
        activo: true,
        fechaCreacion: '2026-09-07T12:55:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      nombreResponsable: 'Ana Morales',
      idParentescoResponsable: 2,
      telefonoResponsable: '3322-9988',
    },
  ]);

  listar = computed(() =>
    this.registros()
      .filter((c) => c.consentimiento.activo)
      .sort((a, b) => b.consentimiento.fechaCreacion.localeCompare(a.consentimiento.fechaCreacion)),
  );

  obtener(id: number): CompromisoPago | undefined {
    return this.registros().find((c) => c.consentimiento.idConsentimiento === id);
  }

  guardar(registro: CompromisoPago): number {
    const esNuevo = registro.consentimiento.idConsentimiento === 0;
    if (esNuevo) {
      const idConsentimiento = this.nextId++;
      const nuevo: CompromisoPago = {
        ...registro,
        consentimiento: { ...registro.consentimiento, idConsentimiento },
      };
      this.registros.update((list) => [...list, nuevo]);
      return idConsentimiento;
    }

    this.registros.update((list) =>
      list.map((c) => (c.consentimiento.idConsentimiento === registro.consentimiento.idConsentimiento ? registro : c)),
    );
    return registro.consentimiento.idConsentimiento;
  }

  eliminar(id: number): void {
    this.registros.update((list) =>
      list.map((c) =>
        c.consentimiento.idConsentimiento === id
          ? { ...c, consentimiento: { ...c.consentimiento, activo: false } }
          : c,
      ),
    );
  }
}
