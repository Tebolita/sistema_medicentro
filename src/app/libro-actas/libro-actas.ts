import { esSinPermiso } from '../service/error.service';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { listaOpcional } from '../shared/lista-opcional';

import { ActaService } from '../service/acta.service';
import { PacienteService } from '../service/paciente.service';
import { EmpleadoService } from '../service/empleado.service';
import { PuestoService } from '../service/puesto.service';
import { UsuariosService } from '../service/usuarios.service';
import { NotificacionesService } from '../shared/notificaciones/notificaciones.service';
import { AuditoriaInfo } from '../shared/auditoria-info/auditoria-info';
import { mensajeError, requeridoSinEspacios } from '../shared/validadores';
import { Acta, ActaRequest } from '../models/acta.model';
import { PacienteListado } from '../models/paciente.model';
import { ConfirmacionService } from '../shared/confirmacion/confirmacion.service';

// Forma que espera el HTML en el selector "Atendido por".
interface Recepcionista {
  id: number;
  nombre: string;
}

type Vista = 'activas' | 'eliminadas';

// Nombre del puesto en la tabla `puestos` (se busca por nombre, no por id).
const PUESTO_RECEPCION = 'recepcionista';

// Largos que acepta el backend (ActaInputDto).
const LARGO_MOTIVO = 500;
const LARGO_OBSERVACIONES = 1000;

// Fecha + hora LOCAL como 'YYYY-MM-DDTHH:mm:ss' (sin 'Z'): si no se manda,
// el backend usa la hora UTC y el acta saldría 6 horas adelantada.
function toIsoDateTimeLocal(value: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}T${p(value.getHours())}:${p(value.getMinutes())}:${p(value.getSeconds())}`;
}

@Component({
  selector: 'app-libro-actas',
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    AuditoriaInfo,
  ],
  templateUrl: './libro-actas.html',
  styleUrl: './libro-actas.css',
})
export class LibroActas {
  private fb = inject(FormBuilder);
  private actaService = inject(ActaService);
  private pacienteService = inject(PacienteService);
  private empleadoService = inject(EmpleadoService);
  private puestoService = inject(PuestoService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private platformId = inject(PLATFORM_ID);
  private confirmacion = inject(ConfirmacionService);

  readonly largoMotivo = LARGO_MOTIVO;
  readonly largoObservaciones = LARGO_OBSERVACIONES;

  mostrarFormulario = signal(false);
  guardando = signal(false);
  cargando = signal(false);
  errorCarga = signal('');

  // Pestaña activa: actas activas o dadas de baja.
  vista = signal<Vista>('activas');

  // Acta que se está editando (null = nueva acta).
  editando = signal<Acta | null>(null);

  // Datos reales desde la API (ya no hay datos de ejemplo).
  private pacientesActivos = signal<PacienteListado[]>([]);
  private pacientesEliminados = signal<PacienteListado[]>([]);
  private recepcionistasApi = signal<Recepcionista[]>([]);
  private actasActivas = signal<Acta[]>([]);
  private actasEliminadas = signal<Acta[]>([]);
  private eliminadasCargadas = false;

  actas = computed(() => (this.vista() === 'activas' ? this.actasActivas() : this.actasEliminadas()));

  // Para una acta nueva solo pacientes activos; al editar se agrega el paciente
  // del acta si fue dado de baja, para que se vea su nombre.
  pacientes = computed(() => {
    const activos = this.pacientesActivos();
    const idActual = this.editando()?.idPaciente;
    const actualEliminado = this.pacientesEliminados().find((p) => p.idPaciente === idActual);
    return actualEliminado ? [...activos, actualEliminado] : activos;
  });

  get recepcionistas() { return this.recepcionistasApi(); }

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    motivoIngreso: ['', [requeridoSinEspacios, Validators.maxLength(LARGO_MOTIVO)]],
    idAtendidoPor: this.fb.control<number | null>(null, Validators.required),
    observaciones: ['', Validators.maxLength(LARGO_OBSERVACIONES)],
  });

  constructor() {
    // En el servidor (SSR) no hay sesión ni token: solo se consulta desde el navegador.
    if (isPlatformBrowser(this.platformId)) {
      this.cargar();
    }
  }

  // Mensaje para mostrar en <mat-error> según el error del campo.
  error(control: AbstractControl | null): string {
    return mensajeError(control);
  }

  private cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    forkJoin({
      actas: this.actaService.RetornarActas(),
      pacientes: this.pacienteService.RetornarPacientes(),
      pacientesEliminados: this.pacienteService.RetornarPacientesEliminados().pipe(listaOpcional()),
      puestos: this.puestoService.RetornarPuestos(),
    }).subscribe({
      next: (r) => {
        this.actasActivas.set(r.actas.datos ?? []);
        this.pacientesActivos.set(r.pacientes.datos ?? []);
        this.pacientesEliminados.set(r.pacientesEliminados.datos ?? []);
        this.cargando.set(false);
        // Si no existe el puesto "Recepcionista" en la base, se listan todos los empleados activos.
        const puesto = (r.puestos.datos ?? []).find((p) => p.nombre.trim().toLowerCase() === PUESTO_RECEPCION);
        this.cargarRecepcionistas(puesto?.idPuesto);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.errorCarga.set('No se pudo cargar el libro de actas: ' + err.message);
      },
    });
  }

  private cargarRecepcionistas(idPuesto?: number): void {
    this.empleadoService.RetornarEmpleados(idPuesto).subscribe({
      next: (resp) =>
        this.recepcionistasApi.set(
          (resp.datos ?? []).map((e) => ({
            id: e.idEmpleado,
            nombre: [e.primerNombre, e.segundoNombre, e.primerApellido, e.segundoApellido].filter(Boolean).join(' '),
          })),
        ),
      error: (err: Error) => this.notificaciones.error('No se pudo cargar el personal de recepción: ' + err.message),
    });
  }

  private cargarActivas(): void {
    this.actaService.RetornarActas().subscribe({
      next: (resp) => this.actasActivas.set(resp.datos ?? []),
      error: (err: Error) => this.errorCarga.set('No se pudo cargar el libro de actas: ' + err.message),
    });
  }

  private cargarEliminadas(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.actaService.RetornarActasEliminadas().subscribe({
      next: (resp) => {
        this.actasEliminadas.set(resp.datos ?? []);
        this.eliminadasCargadas = true;
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        // Sin acceso a lo eliminado: se muestra el mensaje de "no hay registros".
        if (esSinPermiso(err)) {
          this.actasEliminadas.set([]);
          return;
        }
        this.errorCarga.set('No se pudieron cargar las actas eliminadas: ' + err.message);
      },
    });
  }

  verActivas(): void {
    // El error de la pestaña "Eliminadas" no aplica a las activas.
    this.errorCarga.set('');
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.cerrarFormulario();
    this.vista.set('eliminadas');
    // Como no quedaron cargadas, se vuelve a intentar y el mensaje
    // aparece de nuevo si sigue sin acceso.
    if (!this.eliminadasCargadas) {
      this.cargarEliminadas();
    }
  }

  toggleFormulario(): void {
    if (this.mostrarFormulario()) {
      this.cerrarFormulario();
    } else {
      this.editando.set(null);
      this.form.reset();
      this.mostrarFormulario.set(true);
    }
  }

  private cerrarFormulario(): void {
    this.mostrarFormulario.set(false);
    this.editando.set(null);
    this.form.reset();
  }

  editar(a: Acta): void {
    this.editando.set(a);
    this.form.reset({
      idPaciente: a.idPaciente,
      motivoIngreso: a.motivoIngreso,
      idAtendidoPor: a.idAtendidoPor,
      observaciones: a.observaciones ?? '',
    });
    this.mostrarFormulario.set(true);
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  registrar(): void {
    if (this.guardando()) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notificaciones.error('Revisa los campos marcados en rojo.');
      return;
    }
    const v = this.form.getRawValue();
    const acta = this.editando();
    const request: ActaRequest = {
      idPaciente: v.idPaciente!,
      motivoIngreso: v.motivoIngreso.trim(),
      idAtendidoPor: v.idAtendidoPor!,
      observaciones: v.observaciones.trim() || null,
      // Al editar no se manda: el backend conserva la fecha/hora original del ingreso.
      fechaHora: acta ? null : toIsoDateTimeLocal(new Date()),
    };
    const paciente = this.nombrePaciente(request.idPaciente);

    this.guardando.set(true);
    const peticion = acta ? this.actaService.ActualizarActa(acta.idActa, request) : this.actaService.CrearActa(request);
    peticion.subscribe({
      next: (resp) => {
        this.guardando.set(false);
        if (resp.datos) {
          const guardada = resp.datos;
          if (acta) {
            this.actasActivas.update((l) => l.map((x) => (x.idActa === guardada.idActa ? guardada : x)));
          } else {
            // La más reciente va primero, igual que la lista del backend.
            this.actasActivas.update((l) => [guardada, ...l]);
          }
        }
        this.cerrarFormulario();
        this.notificaciones.exito(
          acta ? `Acta de "${paciente}" actualizada correctamente` : `Acta de "${paciente}" registrada correctamente`,
        );
      },
      error: (err: Error) => {
        this.guardando.set(false);
        this.notificaciones.error('No se pudo guardar el acta: ' + err.message);
      },
    });
  }

  async eliminar(a: Acta): Promise<void> {
    const nombre = this.nombrePaciente(a.idPaciente);
    if (!(await this.confirmacion.confirmar(`¿Eliminar el acta de "${nombre}"?`))) {
      return;
    }
    this.actaService.EliminarActa(a.idActa).subscribe({
      next: () => {
        this.actasActivas.update((l) => l.filter((x) => x.idActa !== a.idActa));
        if (this.editando()?.idActa === a.idActa) {
          this.cerrarFormulario();
        }
        // Se vuelve a pedir la lista de eliminadas la próxima vez que se abra
        // la pestaña, para traer quién y cuándo la dio de baja.
        this.eliminadasCargadas = false;
        this.notificaciones.exito(`Acta de "${nombre}" eliminada correctamente`);
      },
      error: (err: Error) => this.notificaciones.error('No se pudo eliminar el acta: ' + err.message),
    });
  }

  async reactivar(a: Acta): Promise<void> {
    const nombre = this.nombrePaciente(a.idPaciente);
    if (!(await this.confirmacion.confirmar(`¿Reactivar el acta de "${nombre}"?`))) {
      return;
    }
    this.actaService.ReactivarActa(a.idActa).subscribe({
      next: () => {
        this.actasEliminadas.update((l) => l.filter((x) => x.idActa !== a.idActa));
        this.cargarActivas();
        this.notificaciones.exito(`Acta de "${nombre}" reactivada correctamente`);
      },
      error: (err: Error) => this.notificaciones.error('No se pudo reactivar el acta: ' + err.message),
    });
  }

  formatFechaHora(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  esPacienteDadoDeBaja(idPaciente: number): boolean {
    return this.pacientesEliminados().some((p) => p.idPaciente === idPaciente);
  }

  nombrePaciente(idPaciente: number): string {
    const p = [...this.pacientesActivos(), ...this.pacientesEliminados()].find((pac) => pac.idPaciente === idPaciente);
    if (!p) {
      return 'Paciente no encontrado';
    }
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
  }

  atendidoPorLabel(idAtendidoPor: number): string {
    return this.recepcionistas.find((r) => r.id === idAtendidoPor)?.nombre ?? '—';
  }

  iniciales(idPaciente: number): string {
    const partes = this.nombrePaciente(idPaciente).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }
}