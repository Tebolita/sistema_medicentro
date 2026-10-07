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
} from '../casos-emergencia.service';
import { PacientesService } from '../../pacientes/pacientes.service';

const PACIENTE_NO_REGISTRADO = 0;

/**
 * Devuelve la fecha+hora LOCAL en formato "2026-10-06T18:21:17" (SIN la Z).
 * El backend lo interpreta como hora local y lo guarda correctamente.
 * NO usar toISOString() porque devuelve UTC y desfasa 6 horas en Guatemala.
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private casosService = inject(CasosEmergenciaService);
  private pacientesService = inject(PacientesService);

  pacientes = this.pacientesService.directorio;
  pacienteNoRegistrado = PACIENTE_NO_REGISTRADO;

  // Signals para los dropdowns que vienen del backend
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

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    nombrePaciente: [''],
    idMedico: this.fb.control<number | null>(null),
    idNivelTriage: this.fb.control<number | null>(null, Validators.required),
    idEstadoCaso: this.fb.control<number | null>(null, Validators.required),
    motivo: ['', Validators.required],
  });

  private idPacienteSeleccionado = signal<number | null>(null);
  esWalkIn = computed(() => this.idPacienteSeleccionado() === PACIENTE_NO_REGISTRADO);

  constructor() {
    // 1) Cargar médicos del backend
    this.casosService.RetornarMedicos().subscribe({
      next: (m) => {
        console.log('✅ [CasoFormulario] Médicos cargados:', m.length);
        this.medicosSignal.set(m);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasoFormulario] Error médicos:', err.status),
    });

    // 2) Cargar niveles de triaje del backend
    this.casosService.RetornarNivelesTriage().subscribe({
      next: (n) => {
        console.log('✅ [CasoFormulario] Niveles cargados:', n.length);
        this.nivelesTriageSignal.set(n);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasoFormulario] Error niveles:', err.status),
    });

    // 3) Cargar estados del backend + auto-seleccionar "Esperando"
    this.casosService.RetornarEstadosCaso().subscribe({
      next: (e) => {
        console.log('✅ [CasoFormulario] Estados cargados:', e.length);
        this.estadosSignal.set(e);
        if (this.esNuevo() && e.length > 0 && !this.form.controls.idEstadoCaso.value) {
          const esperando =
            e.find((x) => x.label.toLowerCase().includes('esper')) ?? e[0];
          this.form.patchValue({ idEstadoCaso: esperando.id });
        }
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasoFormulario] Error estados:', err.status),
    });

    // 4) Cargar usuarios (para el nombre en la bitácora)
    this.casosService.RetornarUsuarios().subscribe({
      next: (u) => {
        console.log('✅ [CasoFormulario] Usuarios cargados:', u.length);
        this.usuariosSignal.set(u);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasoFormulario] Error usuarios:', err.status),
    });

    // Sincronizar si el usuario selecciona "no registrado"
    this.form.controls.idPaciente.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.idPacienteSeleccionado.set(id));

    // Cargar si es edición
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      const id = Number(idParam);
      const registro = this.casosService.obtener(id);
      if (registro) {
        this.cargar(registro);
      } else {
        this.casosService.obtenerDesdeApi(id).subscribe({
          next: (reg) => this.cargar(reg),
          error: (err: HttpErrorResponse) =>
            console.error('No se pudo cargar el caso', err),
        });
      }
    }
  }

  private cargar(registro: CasoEmergencia): void {
    this.idCaso.set(registro.idCaso);
    this.form.patchValue({
      idPaciente: registro.idPaciente ?? PACIENTE_NO_REGISTRADO,
      nombrePaciente: registro.nombrePaciente ?? '',
      idMedico: registro.idMedico,
      idNivelTriage: registro.idNivelTriage,
      idEstadoCaso: registro.idEstadoCaso,
      motivo: registro.motivo,
    });
    this.idPacienteSeleccionado.set(registro.idPaciente ?? PACIENTE_NO_REGISTRADO);
  }

  guardar(): void {
    this.form.markAllAsTouched();

    if (this.esWalkIn() && !this.form.controls.nombrePaciente.value.trim()) {
      this.form.controls.nombrePaciente.setErrors({ required: true });
    }
    if (this.form.invalid) {
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
        this.router.navigate(['/home/emergencias']);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorGuardar.set(
          err.status === 401
            ? 'Tu sesión expiró. Cierra sesión y vuelve a iniciarla.'
            : 'No se pudo guardar el caso. Revisa la consola.',
        );
        console.error('Error al guardar caso:', err);
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
      },
    });
  }

  cerrarHistorial(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  /** Traduce el id_tipo_accion a texto legible. */
  accionLabel(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'Creó';
    if (idTipoAccion === 80) return 'Modificó';
    if (idTipoAccion === 81) return 'Eliminó';
    return 'Cambió';
  }

  /** Clase CSS según el tipo de acción. */
  accionClase(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'accion-crear';
    if (idTipoAccion === 80) return 'accion-modificar';
    if (idTipoAccion === 81) return 'accion-eliminar';
    return 'accion-default';
  }

  /** Icono Material según el tipo de acción. */
  accionIcono(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'add_circle';
    if (idTipoAccion === 80) return 'edit';
    if (idTipoAccion === 81) return 'delete';
    return 'history';
  }

  /** Traduce el id de usuario a nombre. */
  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario ${idUsuario}`;
  }

  /** Formatea la fecha en hora local. */
  formatFechaHora(iso: string): string {
    if (!iso) return '—';
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';  // ← AGREGAR ESTA LÍNEA
    const fecha = new Date(isoConZona);                        // ← CAMBIAR esto
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /** Devuelve la lista de campos que cambiaron entre valoresAnteriores y valoresNuevos. */
  camposCambiados(item: BitacoraItem): Array<{ campo: string; antes: string; despues: string }> {
    try {
      const antes = item.valoresAnteriores ? JSON.parse(item.valoresAnteriores) : {};
      const despues = item.valoresNuevos ? JSON.parse(item.valoresNuevos) : {};

      // Campos técnicos que no aportan
      const camposIgnorados = new Set([
        'IdUsuarioModificacion',
        'FechaModificacion',
        'IdUsuarioCreacion',
      ]);

      // ID real del registro
      const idRegistroReal = this.idCaso();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        // Parche: el backend guarda mal el IdCaso. Usamos el ID real.
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

      // Ordenar para que el ID quede primero
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
      const fecha = new Date(valor);  // ← SIN la Z (correcto, ya está en local)
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