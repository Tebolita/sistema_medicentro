import { Injectable, computed, signal } from '@angular/core';

// Registro de consulta externa. Se apoya en las mismas columnas que la tabla
// `citas` del esquema (ver memoria del proyecto), más `idTipoConsulta` que es
// un campo únicamente de esta UI (primera vez / reconsulta) mientras no
// exista un catálogo real para eso en la BD.
export interface ConsultaExterna {
  idCita: number;
  idPaciente: number;
  idMedico: number | null;
  fechaHoraInicio: string; // ISO datetime
  idEstadoCita: number;
  idTipoConsulta: number | null;
  motivoConsulta: string | null;
  notas: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

@Injectable({ providedIn: 'root' })
export class ConsultasExternasService {
  private nextId = 4;

  private registros = signal<ConsultaExterna[]>([
    {
      idCita: 1,
      idPaciente: 1,
      idMedico: 1,
      fechaHoraInicio: '2026-09-02T09:00:00',
      idEstadoCita: 2,
      idTipoConsulta: 2,
      motivoConsulta: 'Control de presión arterial',
      notas: null,
      activo: true,
      fechaCreacion: '2026-08-28T10:00:00',
      fechaModificacion: null,
    },
    {
      idCita: 2,
      idPaciente: 2,
      idMedico: 3,
      fechaHoraInicio: '2026-09-03T11:30:00',
      idEstadoCita: 1,
      idTipoConsulta: 1,
      motivoConsulta: 'Dolor abdominal recurrente',
      notas: null,
      activo: true,
      fechaCreacion: '2026-08-29T15:20:00',
      fechaModificacion: null,
    },
    {
      idCita: 3,
      idPaciente: 3,
      idMedico: 2,
      fechaHoraInicio: '2026-08-30T08:15:00',
      idEstadoCita: 4,
      idTipoConsulta: 2,
      motivoConsulta: 'Seguimiento de vacunación',
      notas: 'Paciente pediátrico, acompañada por la madre.',
      activo: true,
      fechaCreacion: '2026-08-25T09:00:00',
      fechaModificacion: null,
    },
  ]);

  listar = computed(() =>
    this.registros()
      .filter((c) => c.activo)
      .sort((a, b) => b.fechaHoraInicio.localeCompare(a.fechaHoraInicio)),
  );

  obtener(id: number): ConsultaExterna | undefined {
    return this.registros().find((c) => c.idCita === id);
  }

  guardar(registro: ConsultaExterna): number {
    const esNueva = registro.idCita === 0;
    if (esNueva) {
      const idCita = this.nextId++;
      this.registros.update((list) => [...list, { ...registro, idCita }]);
      return idCita;
    }

    this.registros.update((list) =>
      list.map((c) => (c.idCita === registro.idCita ? registro : c)),
    );
    return registro.idCita;
  }

  eliminar(id: number): void {
    this.registros.update((list) =>
      list.map((c) => (c.idCita === id ? { ...c, activo: false } : c)),
    );
  }
}
