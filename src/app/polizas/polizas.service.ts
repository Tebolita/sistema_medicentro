import { Injectable, computed, signal } from '@angular/core';
import { PolizaSeguro } from '../models';

@Injectable({ providedIn: 'root' })
export class PolizasService {
  private nextId = 4;

  private registros = signal<PolizaSeguro[]>([
    {
      idPoliza: 1,
      idPaciente: 1,
      idAseguradora: 1,
      idConvenio: null,
      idRamo: 1,
      numeroPoliza: 'RPN-778241',
      numeroCertificado: 'CERT-0091',
      idTitularidad: 1,
      nombreTitular: null,
      nombrePropietario: null,
      codigoAutorizacion: null,
      porcentajeCopago: 20,
      montoCopago: null,
      fechaInicioVigencia: '2026-01-01',
      fechaFinVigencia: '2026-12-31',
      idEstadoPoliza: 1,
      observaciones: null,
      activo: true,
      fechaCreacion: '2026-01-10T09:00:00',
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    },
    {
      idPoliza: 2,
      idPaciente: 2,
      idAseguradora: 4,
      idConvenio: null,
      idRamo: 2,
      numeroPoliza: 'MC-330912',
      numeroCertificado: null,
      idTitularidad: 1,
      nombreTitular: null,
      nombrePropietario: null,
      codigoAutorizacion: 'AUT-58421',
      porcentajeCopago: null,
      montoCopago: 150,
      fechaInicioVigencia: '2025-11-01',
      fechaFinVigencia: '2026-10-31',
      idEstadoPoliza: 1,
      observaciones: 'Requiere autorización telefónica previa a cada consulta.',
      activo: true,
      fechaCreacion: '2026-02-05T11:20:00',
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    },
    {
      idPoliza: 3,
      idPaciente: 3,
      idAseguradora: 3,
      idConvenio: null,
      idRamo: 3,
      numeroPoliza: 'ASSA-119887',
      numeroCertificado: 'CERT-3345',
      idTitularidad: 2,
      nombreTitular: 'Ana Morales',
      nombrePropietario: null,
      codigoAutorizacion: null,
      porcentajeCopago: 10,
      montoCopago: null,
      fechaInicioVigencia: '2026-03-01',
      fechaFinVigencia: '2027-02-28',
      idEstadoPoliza: 1,
      observaciones: null,
      activo: true,
      fechaCreacion: '2026-03-12T08:30:00',
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    },
  ]);

  listar = computed(() =>
    this.registros()
      .filter((p) => p.activo)
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion)),
  );

  obtener(id: number): PolizaSeguro | undefined {
    return this.registros().find((p) => p.idPoliza === id);
  }

  guardar(registro: PolizaSeguro): number {
    const esNueva = registro.idPoliza === 0;
    if (esNueva) {
      const idPoliza = this.nextId++;
      this.registros.update((list) => [...list, { ...registro, idPoliza }]);
      return idPoliza;
    }

    this.registros.update((list) =>
      list.map((p) => (p.idPoliza === registro.idPoliza ? registro : p)),
    );
    return registro.idPoliza;
  }

  eliminar(id: number): void {
    this.registros.update((list) =>
      list.map((p) => (p.idPoliza === id ? { ...p, activo: false } : p)),
    );
  }
}
