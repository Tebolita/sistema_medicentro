import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  BitacoraItem,
  CasoEmergencia,
  CasosEmergenciaService,
  MedicoOpcion,
  OpcionCatalogo,
  UsuarioOpcion,
} from '../../service/casos-emergencia.service';
import { PacientesService } from '../../service/pacientes.service';
import { SalaService } from '../../service/sala.service';
import { Sala } from '../../models/cita.model';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

const PACIENTE_NO_REGISTRADO = 0;

/**
 * Devuelve la fecha+hora LOCAL en formato "2026-10-06T18:21:17" (SIN la Z).
 */
function fechaHoraLocal(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${dd}T${hh}:${mm}:${ss}`;
}

@Component({
  selector: 'app-caso-formulario',
  imports: [
    NgClass,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './caso-formulario.html',
  styleUrl: './caso-formulario.css',
})
export class CasoFormulario {
  private fb = inject(FormBuilder);
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private casosService = inject(CasosEmergenciaService);
  private pacientesService = inject(PacientesService);
  private salaService = inject(SalaService);
  private notif = inject(NotificacionesService);

  pacientes = this.pacientesService.directorio;
  pacienteNoRegistrado = PACIENTE_NO_REGISTRADO;

  // Dónde se está atendiendo al paciente — se copia a la consulta que se
  // genera sola cuando el caso tiene paciente registrado + médico (ver
  // SOLICITUD_MOTOR_CONSULTAS.md, sección 4).
  salasSignal = signal<Sala[]>([]);
  idCitaGenerada = signal<number | null>(null);

  medicosSignal = signal<MedicoOpcion[]>([]);
  nivelesTriageSignal = signal<OpcionCatalogo[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  idCaso = signal(0);
  esNuevo = computed(() => this.idCaso() === 0);

  guardando = signal(false);
  errorGuardar = signal<string | null>(null);

  // ============================================================
  // Historial de auditoría
  // ============================================================
  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);

  // ✅ Validaciones agregadas: nombrePaciente y motivo
  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    nombrePaciente: [
      '',
      [
        Validators.maxLength(100),
        Validators.minLength(3),
      ],
    ],
    idMedico: this.fb.control<number | null>(null),
    idSala: this.fb.control<number | null>(null),
    idNivelTriage: this.fb.control<number | null>(null, Validators.required),
    idEstadoCaso: this.fb.control<number | null>(null, Validators.required),
    motivo: [
      '',
      [
        Validators.required,
        Validators.maxLength(300),
        Validators.minLength(3),
      ],
    ],
  });

  private idPacienteSeleccionado = signal<number | null>(null);
  esWalkIn = computed(() => this.idPacienteSeleccionado() === PACIENTE_NO_REGISTRADO);

  constructor() {
    this.salaService.RetornarSalas().subscribe({
      next: (resp) => this.salasSignal.set(resp.datos ?? []),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CasoFormulario] Error salas:', err.status);
        this.notif.error('No se pudieron cargar las salas');
      },
    });

    this.casosService.RetornarMedicos().subscribe({
      next: (m) => this.medicosSignal.set(m),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CasoFormulario] Error médicos:', err.status);
        this.notif.error('No se pudieron cargar los médicos');
      },
    });

    this.casosService.RetornarNivelesTriage().subscribe({
      next: (n) => this.nivelesTriageSignal.set(n),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CasoFormulario] Error niveles:', err.status);
        this.notif.error('No se pudieron cargar los niveles de triaje');
      },
    });

    this.casosService.RetornarEstadosCaso().subscribe({
      next: (e) => {
        this.estadosSignal.set(e);
        if (this.esNuevo() && e.length > 0 && !this.form.controls.idEstadoCaso.value) {
          const esperando =
            e.find((x) => x.label.toLowerCase().includes('esper')) ?? e[0];
          this.form.patchValue({ idEstadoCaso: esperando.id });
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CasoFormulario] Error estados:', err.status);
      },
    });

    this.casosService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CasoFormulario] Error usuarios:', err.status);
      },
    });

    this.form.controls.idPaciente.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.idPacienteSeleccionado.set(id));

    // Angular reutiliza esta misma instancia del componente al navegar entre
    // dos casos distintos sin salir de esta ruta: leer el id solo del
    // snapshot hacía que el formulario (y su historial) se quedaran pegados
    // al primer caso que se abrió en la sesión. Suscribirse a paramMap sí
    // reacciona cuando cambia.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const idParam = params.get('id');
      this.resetFormulario();

      if (idParam && idParam !== 'nuevo') {
        const id = Number(idParam);
        const registro = this.casosService.obtener(id);
        if (registro) {
          this.cargar(registro);
        } else {
          this.casosService.obtenerDesdeApi(id).subscribe({
            next: (reg) => this.cargar(reg),
            error: (err: HttpErrorResponse) => {
              console.error('No se pudo cargar el caso', err);
              this.notif.error('No se pudo cargar el caso');
            },
          });
        }
      }
    });
  }

  // Deja el formulario (y el historial) como recién creados antes de cargar
  // un caso distinto o uno nuevo: si no se limpia, el caso anterior se queda
  // mezclado con el nuevo (historial del caso viejo todavía abierto, etc.).
  private resetFormulario(): void {
    this.idCaso.set(0);
    this.form.reset({
      idPaciente: null,
      nombrePaciente: '',
      idMedico: null,
      idSala: null,
      idNivelTriage: null,
      idEstadoCaso: null,
      motivo: '',
    });
    this.idPacienteSeleccionado.set(null);
    this.idCitaGenerada.set(null);
    this.errorGuardar.set(null);
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  private cargar(registro: CasoEmergencia): void {
    this.idCaso.set(registro.idCaso);
    this.form.patchValue({
      idPaciente: registro.idPaciente ?? PACIENTE_NO_REGISTRADO,
      nombrePaciente: registro.nombrePaciente ?? '',
      idMedico: registro.idMedico,
      idSala: registro.idSala,
      idNivelTriage: registro.idNivelTriage,
      idEstadoCaso: registro.idEstadoCaso,
      motivo: registro.motivo,
    });
    this.idPacienteSeleccionado.set(registro.idPaciente ?? PACIENTE_NO_REGISTRADO);
    this.idCitaGenerada.set(registro.idCita);
  }

  guardar(): void {
    this.form.markAllAsTouched();

    if (this.esWalkIn() && !this.form.controls.nombrePaciente.value.trim()) {
      this.form.controls.nombrePaciente.setErrors({ required: true });
    }
    if (this.form.invalid) {
      this.notif.error('Revisá los campos obligatorios');
      return;
    }

    const v = this.form.getRawValue();
    const idCaso = this.idCaso();
    const esWalkIn = v.idPaciente === PACIENTE_NO_REGISTRADO;

    const registro: CasoEmergencia = {
      idCaso,
      idPaciente: esWalkIn ? null : v.idPaciente,
      nombrePaciente: esWalkIn ? v.nombrePaciente : '',
      idMedico: v.idMedico,
      idSala: v.idSala,
      idCita: this.idCitaGenerada(),
      idNivelTriage: v.idNivelTriage!,
      idEstadoCaso: v.idEstadoCaso!,
      motivo: v.motivo,
      horaLlegada: this.esNuevo()
        ? fechaHoraLocal()
        : (this.casosService.obtener(idCaso)?.horaLlegada ?? fechaHoraLocal()),
      activo: true,
      fechaCreacion: this.esNuevo()
        ? fechaHoraLocal()
        : (this.casosService.obtener(idCaso)?.fechaCreacion ?? fechaHoraLocal()),
      fechaModificacion: this.esNuevo() ? null : fechaHoraLocal(),
    };

    this.guardando.set(true);
    this.errorGuardar.set(null);

    this.casosService.guardar(registro).subscribe({
      next: () => {
        this.guardando.set(false);
        this.notif.exito(
          this.esNuevo()
            ? 'Caso de emergencia creado correctamente'
            : 'Caso de emergencia actualizado correctamente',
        );
        this.router.navigate(['/home/emergencias']);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorGuardar.set(
          err.status === 401
            ? 'Tu sesión expiró. Cierra sesión y vuelve a iniciarla.'
            : 'No se pudo guardar el caso. Intenta de nuevo.',
        );
        console.error('Error al guardar caso:', err);
        this.notif.error('No se pudo guardar el caso');
      },
    });
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idCaso();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.casosService.RetornarBitacoraPorRegistro('casos_emergencia', id).subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al cargar bitácora:', err.status);
        this.cargandoHistorial.set(false);
        this.notif.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorial(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  accionLabel(idTipoAccion: number): string {
    return this.accionAuditoria.label(idTipoAccion);
  }

  accionClase(idTipoAccion: number): string {
    return this.accionAuditoria.clase(idTipoAccion);
  }

  accionIcono(idTipoAccion: number): string {
    return this.accionAuditoria.icono(idTipoAccion);
  }

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario ${idUsuario}`;
  }

  formatFechaHora(iso: string): string {
    if (!iso) return '—';
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';
    const fecha = new Date(isoConZona);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  camposCambiados(item: BitacoraItem): Array<{ campo: string; antes: string; despues: string }> {
    try {
      const antes = item.valoresAnteriores ? JSON.parse(item.valoresAnteriores) : {};
      const despues = item.valoresNuevos ? JSON.parse(item.valoresNuevos) : {};

      const camposIgnorados = new Set([
        'IdUsuarioModificacion',
        'FechaModificacion',
        'IdUsuarioCreacion',
      ]);

      const idRegistroReal = this.idCaso();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdCaso' && idRegistroReal != null) {
          a = idRegistroReal;
          d = idRegistroReal;
        }

        if (JSON.stringify(a) === JSON.stringify(d)) continue;

        cambios.push({
          campo: this.formatearNombreCampo(k),
          antes: this.formatearValor(a, k),
          despues: this.formatearValor(d, k),
        });
      }

      cambios.sort((x, y) => {
        if (x.campo.toLowerCase().includes('id caso')) return -1;
        if (y.campo.toLowerCase().includes('id caso')) return 1;
        return x.campo.localeCompare(y.campo);
      });

      return cambios;
    } catch {
      return [];
    }
  }

  private formatearNombreCampo(campo: string): string {
    return campo
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  private formatearValor(valor: any, nombreCampo: string = ''): string {
    if (valor === null || valor === undefined) return '—';

    if (this.esCampoFecha(nombreCampo) && typeof valor === 'string') {
      const fecha = new Date(valor);
      if (!isNaN(fecha.getTime())) {
        return fecha.toLocaleString('es-GT', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  }

  private esCampoFecha(nombreCampo: string): boolean {
    return /fecha|fechahora|creacion|modificacion|hora/i.test(nombreCampo);
  }
}