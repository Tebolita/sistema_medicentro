import { Injectable, computed, signal } from '@angular/core';
import { Hospitalizacion, OrdenMedicaHospitalizacion } from '../models';

export interface HospitalizacionCompleta {
  hospitalizacion: Hospitalizacion;
  ordenes: OrdenMedicaHospitalizacion[];
}

@Injectable({ providedIn: 'root' })
export class HospitalizacionesService {
  private nextHospitalizacionId = 3;
  private nextOrdenId = 4;

  private registros = signal<HospitalizacionCompleta[]>([
    {
      hospitalizacion: {
        idHospitalizacion: 1,
        idPaciente: 2,
        idCama: 1,
        idMedicoResponsable: 1,
        fechaIngreso: '2026-09-05T10:00:00',
        fechaEgreso: null,
        motivoIngreso: 'Apendicitis aguda, post-operatorio',
        diagnosticoEgreso: null,
        idEstadoHospitalizacion: 1,
        activo: true,
        fechaCreacion: '2026-09-05T10:00:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      ordenes: [
        {
          idOrdenMedica: 1,
          idHospitalizacion: 1,
          idMedico: 1,
          idTipoOrden: 3,
          fechaOrden: '2026-09-05T11:00:00',
          descripcion: 'Ampicilina 1g IV cada 8 horas',
          activo: true,
          fechaCreacion: '2026-09-05T11:00:00',
          fechaModificacion: null,
        },
        {
          idOrdenMedica: 2,
          idHospitalizacion: 1,
          idMedico: 1,
          idTipoOrden: 1,
          fechaOrden: '2026-09-05T10:30:00',
          descripcion: 'Reposo absoluto, control de signos vitales cada 4 horas',
          activo: true,
          fechaCreacion: '2026-09-05T10:30:00',
          fechaModificacion: null,
        },
      ],
    },
    {
      hospitalizacion: {
        idHospitalizacion: 2,
        idPaciente: 1,
        idCama: 4,
        idMedicoResponsable: 3,
        fechaIngreso: '2026-08-30T08:00:00',
        fechaEgreso: '2026-09-02T14:00:00',
        motivoIngreso: 'Neumonía, requiere oxígeno suplementario',
        diagnosticoEgreso: 'Neumonía resuelta, egresa estable',
        idEstadoHospitalizacion: 2,
        activo: true,
        fechaCreacion: '2026-08-30T08:00:00',
        fechaModificacion: '2026-09-02T14:00:00',
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      ordenes: [
        {
          idOrdenMedica: 3,
          idHospitalizacion: 2,
          idMedico: 3,
          idTipoOrden: 4,
          fechaOrden: '2026-08-30T09:00:00',
          descripcion: 'Sin procedimientos que requieran anestesia',
          activo: true,
          fechaCreacion: '2026-08-30T09:00:00',
          fechaModificacion: null,
        },
      ],
    },
  ]);

  listar = computed(() =>
    this.registros()
      .filter((r) => r.hospitalizacion.activo)
      .sort((a, b) => b.hospitalizacion.fechaIngreso.localeCompare(a.hospitalizacion.fechaIngreso)),
  );

  activas = computed(() => this.listar().filter((r) => r.hospitalizacion.idEstadoHospitalizacion === 1));

  obtener(id: number): HospitalizacionCompleta | undefined {
    return this.registros().find((r) => r.hospitalizacion.idHospitalizacion === id);
  }

  guardar(registro: Hospitalizacion): number {
    const esNueva = registro.idHospitalizacion === 0;
    if (esNueva) {
      const idHospitalizacion = this.nextHospitalizacionId++;
      this.registros.update((list) => [
        ...list,
        { hospitalizacion: { ...registro, idHospitalizacion }, ordenes: [] },
      ]);
      return idHospitalizacion;
    }

    this.registros.update((list) =>
      list.map((r) =>
        r.hospitalizacion.idHospitalizacion === registro.idHospitalizacion
          ? { ...r, hospitalizacion: registro }
          : r,
      ),
    );
    return registro.idHospitalizacion;
  }

  agregarOrden(idHospitalizacion: number, orden: Omit<OrdenMedicaHospitalizacion, 'idOrdenMedica' | 'idHospitalizacion' | 'activo'>): void {
    const idOrdenMedica = this.nextOrdenId++;
    this.registros.update((list) =>
      list.map((r) =>
        r.hospitalizacion.idHospitalizacion === idHospitalizacion
          ? { ...r, ordenes: [...r.ordenes, { ...orden, idOrdenMedica, idHospitalizacion, activo: true }] }
          : r,
      ),
    );
  }

  eliminar(id: number): void {
    this.registros.update((list) =>
      list.map((r) =>
        r.hospitalizacion.idHospitalizacion === id
          ? { ...r, hospitalizacion: { ...r.hospitalizacion, activo: false } }
          : r,
      ),
    );
  }
}
