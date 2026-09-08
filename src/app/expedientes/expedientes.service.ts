import { Injectable, computed, signal } from '@angular/core';
import { HistorialClinico } from '../models';

@Injectable({ providedIn: 'root' })
export class ExpedientesService {
  private nextId = 4;

  private registros = signal<HistorialClinico[]>([
    {
      idHistorial: 1,
      idPaciente: 3,
      idMedico: 2,
      idCita: null,
      idTratamiento: null,
      idTipoRegistro: 1,
      idNivelConfidencialidad: 1,
      fecha: '2026-08-30T08:20:00',
      motivoConsulta: 'Control de vacunación',
      diagnostico: 'Paciente sana, esquema de vacunación al día',
      notas: null,
      activo: true,
      fechaCreacion: '2026-08-30T08:20:00',
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    },
    {
      idHistorial: 2,
      idPaciente: 2,
      idMedico: 3,
      idCita: null,
      idTratamiento: null,
      idTipoRegistro: 2,
      idNivelConfidencialidad: 1,
      fecha: '2026-08-28T11:00:00',
      motivoConsulta: 'Dolor abdominal recurrente',
      diagnostico: 'Sospecha de gastritis, se solicitan exámenes',
      notas: 'Se indica dieta blanda y control en 8 días.',
      activo: true,
      fechaCreacion: '2026-08-28T11:00:00',
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    },
    {
      idHistorial: 3,
      idPaciente: 1,
      idMedico: 1,
      idCita: null,
      idTratamiento: null,
      idTipoRegistro: 4,
      idNivelConfidencialidad: 1,
      fecha: '2026-08-31T09:15:00',
      motivoConsulta: null,
      diagnostico: null,
      notas: 'PA 120/80 mmHg · FC 76 lpm · Temp 36.7°C · Peso 68 kg. Evolución favorable.',
      activo: true,
      fechaCreacion: '2026-08-31T09:15:00',
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    },
  ]);

  listar = computed(() =>
    this.registros()
      .filter((h) => h.activo)
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
  );

  obtener(id: number): HistorialClinico | undefined {
    return this.registros().find((h) => h.idHistorial === id);
  }

  guardar(registro: HistorialClinico): number {
    const esNuevo = registro.idHistorial === 0;
    if (esNuevo) {
      const idHistorial = this.nextId++;
      this.registros.update((list) => [...list, { ...registro, idHistorial }]);
      return idHistorial;
    }

    this.registros.update((list) =>
      list.map((h) => (h.idHistorial === registro.idHistorial ? registro : h)),
    );
    return registro.idHistorial;
  }

  eliminar(id: number): void {
    this.registros.update((list) =>
      list.map((h) => (h.idHistorial === id ? { ...h, activo: false } : h)),
    );
  }
}
