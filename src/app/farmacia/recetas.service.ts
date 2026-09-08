import { Injectable, computed, signal } from '@angular/core';
import { Receta, RecetaDetalle } from '../models';

export interface RecetaCompleta {
  receta: Receta;
  detalles: RecetaDetalle[];
}

@Injectable({ providedIn: 'root' })
export class RecetasService {
  private nextRecetaId = 3;
  private nextDetalleId = 4;

  private registros = signal<RecetaCompleta[]>([
    {
      receta: {
        idReceta: 1,
        idTratamiento: null,
        idPaciente: 1,
        idMedico: 1,
        fechaEmision: '2026-09-05T09:30:00',
        firmaDigitalHash: null,
        firmaDigitalUrl: null,
        idEstadoReceta: 2,
        activo: true,
        fechaCreacion: '2026-09-05T09:30:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      detalles: [
        {
          idRecetaDetalle: 1,
          idReceta: 1,
          idMedicamento: 2,
          dosis: '500mg',
          frecuencia: 'Cada 8 horas',
          duracion: '3 días',
          indicaciones: 'Tomar con alimentos',
          activo: true,
          fechaCreacion: '2026-09-05T09:30:00',
        },
      ],
    },
    {
      receta: {
        idReceta: 2,
        idTratamiento: null,
        idPaciente: 2,
        idMedico: 3,
        fechaEmision: '2026-09-06T15:10:00',
        firmaDigitalHash: null,
        firmaDigitalUrl: null,
        idEstadoReceta: 1,
        activo: true,
        fechaCreacion: '2026-09-06T15:10:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      detalles: [
        {
          idRecetaDetalle: 2,
          idReceta: 2,
          idMedicamento: 1,
          dosis: '500mg',
          frecuencia: 'Cada 8 horas',
          duracion: '7 días',
          indicaciones: null,
          activo: true,
          fechaCreacion: '2026-09-06T15:10:00',
        },
        {
          idRecetaDetalle: 3,
          idReceta: 2,
          idMedicamento: 6,
          dosis: '20mg',
          frecuencia: 'Cada 24 horas',
          duracion: '7 días',
          indicaciones: 'En ayunas',
          activo: true,
          fechaCreacion: '2026-09-06T15:10:00',
        },
      ],
    },
  ]);

  listar = computed(() =>
    this.registros()
      .filter((r) => r.receta.activo)
      .sort((a, b) => b.receta.fechaEmision.localeCompare(a.receta.fechaEmision)),
  );

  obtener(id: number): RecetaCompleta | undefined {
    return this.registros().find((r) => r.receta.idReceta === id);
  }

  guardar(registro: RecetaCompleta): number {
    const esNueva = registro.receta.idReceta === 0;
    if (esNueva) {
      const idReceta = this.nextRecetaId++;
      const nueva: RecetaCompleta = {
        receta: { ...registro.receta, idReceta },
        detalles: registro.detalles.map((d) => ({ ...d, idReceta, idRecetaDetalle: this.nextDetalleId++ })),
      };
      this.registros.update((list) => [...list, nueva]);
      return idReceta;
    }

    this.registros.update((list) =>
      list.map((r) => (r.receta.idReceta === registro.receta.idReceta ? registro : r)),
    );
    return registro.receta.idReceta;
  }

  eliminar(id: number): void {
    this.registros.update((list) =>
      list.map((r) => (r.receta.idReceta === id ? { ...r, receta: { ...r.receta, activo: false } } : r)),
    );
  }
}
