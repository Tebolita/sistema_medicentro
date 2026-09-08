import { Injectable, computed, signal } from '@angular/core';
import { OrdenDetalle, OrdenLaboratorio } from '../models';

// Registro compuesto: una orden con los exámenes solicitados en ella.
// ResultadoExamen (captura de resultados) queda fuera de este primer
// alcance — la entrevista solo pedía el flujo de solicitud de exámenes.
export interface OrdenCompleta {
  orden: OrdenLaboratorio;
  detalles: OrdenDetalle[];
}

@Injectable({ providedIn: 'root' })
export class LaboratorioService {
  private nextOrdenId = 4;
  private nextDetalleId = 7;

  private registros = signal<OrdenCompleta[]>([
    {
      orden: {
        idOrden: 1,
        idPaciente: 1,
        idMedico: 1,
        idCita: null,
        fechaOrden: '2026-08-29T09:00:00',
        idPrioridad: 1,
        idEstadoOrden: 3,
        notas: null,
        activo: true,
        fechaCreacion: '2026-08-29T09:00:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      detalles: [
        { idOrdenDetalle: 1, idOrden: 1, idTipoExamen: 1, activo: true, fechaCreacion: '2026-08-29T09:00:00' },
        { idOrdenDetalle: 2, idOrden: 1, idTipoExamen: 2, activo: true, fechaCreacion: '2026-08-29T09:00:00' },
      ],
    },
    {
      orden: {
        idOrden: 2,
        idPaciente: 2,
        idMedico: 3,
        idCita: null,
        fechaOrden: '2026-08-30T11:20:00',
        idPrioridad: 2,
        idEstadoOrden: 2,
        notas: 'Paciente refiere dolor abdominal, descartar apendicitis.',
        activo: true,
        fechaCreacion: '2026-08-30T11:20:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      detalles: [
        { idOrdenDetalle: 3, idOrden: 2, idTipoExamen: 6, activo: true, fechaCreacion: '2026-08-30T11:20:00' },
      ],
    },
    {
      orden: {
        idOrden: 3,
        idPaciente: 3,
        idMedico: 2,
        idCita: null,
        fechaOrden: '2026-08-31T08:30:00',
        idPrioridad: 1,
        idEstadoOrden: 1,
        notas: null,
        activo: true,
        fechaCreacion: '2026-08-31T08:30:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      detalles: [
        { idOrdenDetalle: 4, idOrden: 3, idTipoExamen: 4, activo: true, fechaCreacion: '2026-08-31T08:30:00' },
      ],
    },
  ]);

  listar = computed(() => this.registros().filter((r) => r.orden.activo).sort((a, b) => b.orden.fechaOrden.localeCompare(a.orden.fechaOrden)));

  obtener(id: number): OrdenCompleta | undefined {
    return this.registros().find((r) => r.orden.idOrden === id);
  }

  guardar(registro: OrdenCompleta): number {
    const esNueva = registro.orden.idOrden === 0;
    if (esNueva) {
      const idOrden = this.nextOrdenId++;
      const nueva: OrdenCompleta = {
        orden: { ...registro.orden, idOrden },
        detalles: registro.detalles.map((d) => ({ ...d, idOrden, idOrdenDetalle: this.nextDetalleId++ })),
      };
      this.registros.update((list) => [...list, nueva]);
      return idOrden;
    }

    const conIds: OrdenCompleta = {
      orden: registro.orden,
      // Reasigna id a cualquier detalle nuevo (idOrdenDetalle 0), preserva
      // los que ya existían para no perder su identidad al editar la orden.
      detalles: registro.detalles.map((d) => (d.idOrdenDetalle === 0 ? { ...d, idOrdenDetalle: this.nextDetalleId++ } : d)),
    };
    this.registros.update((list) =>
      list.map((r) => (r.orden.idOrden === conIds.orden.idOrden ? conIds : r)),
    );
    return conIds.orden.idOrden;
  }

  eliminar(id: number): void {
    this.registros.update((list) =>
      list.map((r) => (r.orden.idOrden === id ? { ...r, orden: { ...r.orden, activo: false } } : r)),
    );
  }
}
