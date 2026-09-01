import { Injectable, computed, signal } from '@angular/core';
import {
  Paciente,
  PacienteAlergia,
  PacienteAntecedente,
  PacienteContactoEmergencia,
} from '../models';

// Registro compuesto: es lo que la pantalla de detalle de un paciente
// necesita ver/editar de una sola vez (ficha + sus tablas relacionadas).
export interface PacienteCompleto {
  paciente: Paciente;
  contactos: PacienteContactoEmergencia[];
  alergias: PacienteAlergia[];
  antecedentes: PacienteAntecedente[];
}

function calcularEdad(fechaNacimiento: string): number {
  // `new Date('YYYY-MM-DD')` parsea como medianoche UTC, corriendo la fecha
  // un día hacia atrás en husos horarios negativos (ej. Guatemala, UTC-6).
  // Se construye en hora local para evitar ese corrimiento.
  const [y, m, d] = fechaNacimiento.split('-').map(Number);
  const nacimiento = new Date(y, m - 1, d);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumple) {
    edad--;
  }
  return edad;
}

// Servicio en memoria mientras no exista la API real de Pacientes. Conserva
// la misma forma que tendrán las respuestas del backend (PacienteCompleto)
// para que cambiar a HttpClient más adelante sea solo cuestión de reemplazar
// los métodos de abajo por llamadas HTTP.
@Injectable({ providedIn: 'root' })
export class PacientesService {
  private nextPacienteId = 4;
  private nextSubId = 1;

  private registros = signal<PacienteCompleto[]>([
    {
      paciente: {
        idPaciente: 1,
        codigoExpediente: 'EXP-0001',
        primerNombre: 'María',
        segundoNombre: 'Elena',
        primerApellido: 'García',
        segundoApellido: 'López',
        fechaNacimiento: '1990-04-12',
        idGenero: 2,
        idTipoDocumento: 1,
        numeroDocumento: '2589 65412 0101',
        idEstadoCivil: 2,
        telefonoPrincipal: '5512-3344',
        telefonoSecundario: null,
        correo: 'maria.garcia@example.com',
        direccion: '4a calle 12-30 zona 5, Guatemala',
        idTipoSangre: 3,
        idNivelConfidencialidad: 1,
        idEstadoPaciente: 1,
        activo: true,
        fechaCreacion: '2026-01-15T08:00:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      contactos: [
        {
          idContactoEmergencia: 1,
          idPaciente: 1,
          nombreCompleto: 'Carlos García',
          idParentesco: 1,
          telefono: '5599-1122',
          direccion: null,
          activo: true,
          fechaCreacion: '2026-01-15T08:00:00',
          fechaModificacion: null,
          idUsuarioCreacion: null,
          idUsuarioModificacion: null,
        },
      ],
      alergias: [
        {
          idAlergia: 1,
          idPaciente: 1,
          idTipoAlergia: 1,
          descripcion: 'Penicilina',
          idSeveridad: 3,
          fechaDiagnostico: '2015-06-01',
          activo: true,
          fechaCreacion: '2026-01-15T08:00:00',
          fechaModificacion: null,
          idUsuarioCreacion: null,
          idUsuarioModificacion: null,
        },
      ],
      antecedentes: [
        {
          idAntecedente: 1,
          idPaciente: 1,
          idTipoAntecedente: 2,
          descripcion: 'Madre con diabetes tipo 2',
          fechaRegistro: '2026-01-15',
          activo: true,
          fechaCreacion: '2026-01-15T08:00:00',
          fechaModificacion: null,
          idUsuarioCreacion: null,
          idUsuarioModificacion: null,
        },
      ],
    },
    {
      paciente: {
        idPaciente: 2,
        codigoExpediente: 'EXP-0002',
        primerNombre: 'Juan',
        segundoNombre: null,
        primerApellido: 'Pérez',
        segundoApellido: 'Ramírez',
        fechaNacimiento: '1978-11-02',
        idGenero: 1,
        idTipoDocumento: 1,
        numeroDocumento: '1897 45210 0101',
        idEstadoCivil: 1,
        telefonoPrincipal: '4433-2211',
        telefonoSecundario: '2244-5566',
        correo: null,
        direccion: null,
        idTipoSangre: 1,
        idNivelConfidencialidad: 1,
        idEstadoPaciente: 1,
        activo: true,
        fechaCreacion: '2026-02-03T09:30:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      contactos: [],
      alergias: [],
      antecedentes: [],
    },
    {
      paciente: {
        idPaciente: 3,
        codigoExpediente: 'EXP-0003',
        primerNombre: 'Sofía',
        segundoNombre: null,
        primerApellido: 'Morales',
        segundoApellido: null,
        fechaNacimiento: '2019-08-20',
        idGenero: 2,
        idTipoDocumento: 3,
        numeroDocumento: null,
        idEstadoCivil: null,
        telefonoPrincipal: '3322-9988',
        telefonoSecundario: null,
        correo: null,
        direccion: 'Colonia El Progreso, Mixco',
        idTipoSangre: null,
        idNivelConfidencialidad: 1,
        idEstadoPaciente: 1,
        activo: true,
        fechaCreacion: '2026-03-10T14:15:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      contactos: [
        {
          idContactoEmergencia: 2,
          idPaciente: 3,
          nombreCompleto: 'Ana Morales',
          idParentesco: 2,
          telefono: '3322-9988',
          direccion: 'Colonia El Progreso, Mixco',
          activo: true,
          fechaCreacion: '2026-03-10T14:15:00',
          fechaModificacion: null,
          idUsuarioCreacion: null,
          idUsuarioModificacion: null,
        },
      ],
      alergias: [],
      antecedentes: [],
    },
  ]);

  listar = computed(() =>
    this.registros()
      .filter((r) => r.paciente.activo)
      .map((r) => ({
        ...r.paciente,
        edad: calcularEdad(r.paciente.fechaNacimiento),
      })),
  );

  obtener(id: number): PacienteCompleto | undefined {
    return this.registros().find((r) => r.paciente.idPaciente === id);
  }

  guardar(registro: PacienteCompleto): number {
    const esNuevo = registro.paciente.idPaciente === 0;
    if (esNuevo) {
      const idPaciente = this.nextPacienteId++;
      const nuevo: PacienteCompleto = {
        paciente: { ...registro.paciente, idPaciente },
        contactos: registro.contactos.map((c) => ({ ...c, idPaciente })),
        alergias: registro.alergias.map((a) => ({ ...a, idPaciente })),
        antecedentes: registro.antecedentes.map((a) => ({ ...a, idPaciente })),
      };
      this.registros.update((list) => [...list, nuevo]);
      return idPaciente;
    }

    this.registros.update((list) =>
      list.map((r) => (r.paciente.idPaciente === registro.paciente.idPaciente ? registro : r)),
    );
    return registro.paciente.idPaciente;
  }

  eliminar(id: number): void {
    this.registros.update((list) =>
      list.map((r) =>
        r.paciente.idPaciente === id
          ? { ...r, paciente: { ...r.paciente, activo: false } }
          : r,
      ),
    );
  }

  // Id temporal para filas nuevas en los FormArray (contactos/alergias/antecedentes)
  // antes de que el backend asigne el id real al guardar.
  generarIdTemporal(): number {
    return -this.nextSubId++;
  }

  calcularEdad = calcularEdad;
}
