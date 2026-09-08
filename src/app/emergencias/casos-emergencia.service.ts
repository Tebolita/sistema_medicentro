import { Injectable, computed, signal } from '@angular/core';

// "Atención prioritaria": no existe tabla `casos_emergencia` en el esquema
// compartido, así que este es un registro en memoria (como el resto del
// sistema mientras no haya API), documentado en PENDIENTES.md como pendiente
// de definir con el cliente si se modela como extensión de `citas` o como
// tabla propia.
export interface CasoEmergencia {
  idCaso: number;
  idPaciente: number | null; // null: paciente aún no identificado/registrado
  nombrePaciente: string; // se usa cuando idPaciente es null (walk-in sin expediente)
  idMedico: number | null;
  idNivelTriage: number;
  idEstadoCaso: number;
  motivo: string;
  horaLlegada: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

@Injectable({ providedIn: 'root' })
export class CasosEmergenciaService {
  private nextId = 4;

  private registros = signal<CasoEmergencia[]>([
    {
      idCaso: 1,
      idPaciente: 2,
      nombrePaciente: '',
      idMedico: 1,
      idNivelTriage: 2,
      idEstadoCaso: 2,
      motivo: 'Dolor torácico agudo',
      horaLlegada: '2026-09-07T14:10:00',
      activo: true,
      fechaCreacion: '2026-09-07T14:10:00',
      fechaModificacion: null,
    },
    {
      idCaso: 2,
      idPaciente: null,
      nombrePaciente: 'Carlos Ramírez (no registrado)',
      idMedico: null,
      idNivelTriage: 4,
      idEstadoCaso: 1,
      motivo: 'Herida superficial en mano',
      horaLlegada: '2026-09-07T14:35:00',
      activo: true,
      fechaCreacion: '2026-09-07T14:35:00',
      fechaModificacion: null,
    },
    {
      idCaso: 3,
      idPaciente: 3,
      nombrePaciente: '',
      idMedico: 2,
      idNivelTriage: 3,
      idEstadoCaso: 3,
      motivo: 'Fiebre alta y vómitos',
      horaLlegada: '2026-09-07T12:50:00',
      activo: true,
      fechaCreacion: '2026-09-07T12:50:00',
      fechaModificacion: null,
    },
  ]);

  listar = computed(() =>
    this.registros()
      .filter((c) => c.activo)
      .sort((a, b) => b.horaLlegada.localeCompare(a.horaLlegada)),
  );

  obtener(id: number): CasoEmergencia | undefined {
    return this.registros().find((c) => c.idCaso === id);
  }

  guardar(registro: CasoEmergencia): number {
    const esNuevo = registro.idCaso === 0;
    if (esNuevo) {
      const idCaso = this.nextId++;
      this.registros.update((list) => [...list, { ...registro, idCaso }]);
      return idCaso;
    }

    this.registros.update((list) =>
      list.map((c) => (c.idCaso === registro.idCaso ? registro : c)),
    );
    return registro.idCaso;
  }

  eliminar(id: number): void {
    this.registros.update((list) =>
      list.map((c) => (c.idCaso === id ? { ...c, activo: false } : c)),
    );
  }
}
