import { Injectable, computed, signal } from '@angular/core';

// Bitácora de recepción (libro de actas físico digitalizado). No existe una
// tabla dedicada en el esquema SQL compartido para esto — es un registro
// simple en memoria mientras no se defina una tabla real en el backend.
export interface ActaIngreso {
  idActa: number;
  idPaciente: number;
  motivoIngreso: string;
  idAtendidoPor: number;
  fechaHora: string;
  observaciones: string | null;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class LibroActasService {
  private nextId = 4;

  private registros = signal<ActaIngreso[]>([
    {
      idActa: 1,
      idPaciente: 1,
      motivoIngreso: 'Consulta externa programada',
      idAtendidoPor: 1,
      fechaHora: '2026-08-31T08:05:00',
      observaciones: null,
      activo: true,
    },
    {
      idActa: 2,
      idPaciente: 2,
      motivoIngreso: 'Reconsulta por dolor abdominal',
      idAtendidoPor: 1,
      fechaHora: '2026-08-31T09:40:00',
      observaciones: 'Llegó 15 minutos tarde a su cita.',
      activo: true,
    },
    {
      idActa: 3,
      idPaciente: 3,
      motivoIngreso: 'Control de vacunación',
      idAtendidoPor: 2,
      fechaHora: '2026-08-30T08:10:00',
      observaciones: null,
      activo: true,
    },
  ]);

  listar = computed(() =>
    this.registros()
      .filter((a) => a.activo)
      .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)),
  );

  agregar(acta: Omit<ActaIngreso, 'idActa' | 'activo'>): void {
    const idActa = this.nextId++;
    this.registros.update((list) => [...list, { ...acta, idActa, activo: true }]);
  }

  eliminar(id: number): void {
    this.registros.update((list) =>
      list.map((a) => (a.idActa === id ? { ...a, activo: false } : a)),
    );
  }
}
