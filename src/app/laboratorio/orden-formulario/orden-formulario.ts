import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import { OrdenDetalle, OrdenLaboratorio } from '../../models';
import {
  BitacoraItem,
  LaboratorioService,
  TipoExamen,
  OpcionCatalogo,
  MedicoOpcion,
  UsuarioOpcion,
} from '../laboratorio.service';
import { PacientesService } from '../../pacientes/pacientes.service';

/**
 * Toma un Date del datepicker y le añade la HORA ACTUAL.
 * Devuelve algo como "2026-10-06T17:52:30".
 */
function toIsoDateTime(value: Date | string | null): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  const ahora = new Date();
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  const hh = String(ahora.getHours()).padStart(2, '0');
  const mm = String(ahora.getMinutes()).padStart(2, '0');
  const ss = String(ahora.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
}

function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

@Component({
  selector: 'app-orden-formulario',
  imports: [
    NgClass,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './orden-formulario.html',
  styleUrl: './orden-formulario.css',
})
export class OrdenFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private laboratorioService = inject(LaboratorioService);
  private pacientesService = inject(PacientesService);

  pacientes = this.pacientesService.directorio;

  medicosSignal = signal<MedicoOpcion[]>([]);
  prioridadesSignal = signal<OpcionCatalogo[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);
  tiposExamen = signal<TipoExamen[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  filtroExamen = signal('');

  examenesFiltrados = computed(() => {
    const term = this.filtroExamen().trim().toLowerCase();
    const lista = this.tiposExamen();
    if (!term) return lista;
    return lista.filter(
      (t) =>
        t.nombre.toLowerCase().includes(term) ||
        (t.descripcion ?? '').toLowerCase().includes(term),
    );
  });

  examenesSeleccionados = signal<Set<number>>(new Set());

  detallesSeleccionados = computed(() => {
    const ids = this.examenesSeleccionados();
    return this.tiposExamen().filter((t) => ids.has(t.idTipoExamen));
  });

  cargandoTipos = signal(false);
  idOrden = signal(0);
  esNueva = computed(() => this.idOrden() === 0);

  guardando = signal(false);
  errorGuardar = signal<string | null>(null);
  seleccionInvalida = signal(false);

  // ============================================================
  // Historial de auditoría
  // ============================================================
  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);

  private detalleIdOriginal = new Map<number, number>();

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedico: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.control<Date | null>(new Date(), Validators.required),
    idPrioridad: this.fb.control<number | null>(null, Validators.required),
    idEstadoOrden: this.fb.control<number | null>(null, Validators.required),
    notas: [''],
  });

  constructor() {
    this.laboratorioService.RetornarMedicos().subscribe({
      next: (m) => {
        console.log('✅ [OrdenFormulario] Médicos cargados:', m.length);
        this.medicosSignal.set(m);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [OrdenFormulario] Error médicos:', err.status),
    });

    this.laboratorioService.RetornarPrioridades().subscribe({
      next: (p) => {
        console.log('✅ [OrdenFormulario] Prioridades cargadas:', p.length);
        this.prioridadesSignal.set(p);
        if (this.esNueva() && p.length > 0 && !this.form.controls.idPrioridad.value) {
          const normal = p.find((x) => x.label.toLowerCase().includes('normal')) ?? p[0];
          this.form.patchValue({ idPrioridad: normal.id });
        }
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [OrdenFormulario] Error prioridades:', err.status),
    });

    this.laboratorioService.RetornarEstadosOrden().subscribe({
      next: (e) => {
        console.log('✅ [OrdenFormulario] Estados cargados:', e.length);
        this.estadosSignal.set(e);
        if (this.esNueva() && e.length > 0 && !this.form.controls.idEstadoOrden.value) {
          const solicitada = e.find((x) => x.label.toLowerCase().includes('solicit')) ?? e[0];
          this.form.patchValue({ idEstadoOrden: solicitada.id });
        }
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [OrdenFormulario] Error estados:', err.status),
    });

    this.cargandoTipos.set(true);
    this.laboratorioService.RetornarTiposExamen().subscribe({
      next: (tipos) => {
        console.log('✅ [OrdenFormulario] Tipos de examen cargados:', tipos.length);
        this.tiposExamen.set(tipos);
        this.cargandoTipos.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ [OrdenFormulario] Error tipos examen:', err.status);
        this.cargandoTipos.set(false);
      },
    });

    // Cargar usuarios (para el nombre en la bitácora)
    this.laboratorioService.RetornarUsuarios().subscribe({
      next: (u) => {
        console.log('✅ [OrdenFormulario] Usuarios cargados:', u.length);
        this.usuariosSignal.set(u);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [OrdenFormulario] Error usuarios:', err.status),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      const id = Number(idParam);
      const registro = this.laboratorioService.obtener(id);
      if (registro) {
        this.cargar(registro);
      } else {
        this.laboratorioService.obtenerDesdeApi(id).subscribe({
          next: (reg) => this.cargar(reg),
          error: (err: HttpErrorResponse) =>
            console.error('No se pudo cargar la orden', err),
        });
      }
      return;
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const idPacienteParam = params.get('paciente');
      if (idPacienteParam) {
        this.form.patchValue({ idPaciente: Number(idPacienteParam) });
      }
    });
  }

  toggleExamen(idTipoExamen: number): void {
    this.examenesSeleccionados.update((set) => {
      const nuevo = new Set(set);
      if (nuevo.has(idTipoExamen)) {
        nuevo.delete(idTipoExamen);
      } else {
        nuevo.add(idTipoExamen);
      }
      return nuevo;
    });
    if (this.examenesSeleccionados().size > 0) {
      this.seleccionInvalida.set(false);
    }
  }

  estaSeleccionado(idTipoExamen: number): boolean {
    return this.examenesSeleccionados().has(idTipoExamen);
  }

  limpiarBusqueda(): void {
    this.filtroExamen.set('');
  }

  private cargar(registro: { orden: OrdenLaboratorio; detalles: OrdenDetalle[] }): void {
    this.idOrden.set(registro.orden.idOrden);
    this.form.patchValue({
      idPaciente: registro.orden.idPaciente,
      idMedico: registro.orden.idMedico,
      fecha: parseIsoDateLocal(registro.orden.fechaOrden),
      idPrioridad: registro.orden.idPrioridad,
      idEstadoOrden: registro.orden.idEstadoOrden,
      notas: registro.orden.notas ?? '',
    });
    this.examenesSeleccionados.set(new Set(registro.detalles.map((d) => d.idTipoExamen)));
    this.detalleIdOriginal = new Map(
      registro.detalles.map((d) => [d.idTipoExamen, d.idOrdenDetalle]),
    );
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.examenesSeleccionados().size === 0) {
      this.seleccionInvalida.set(true);
    }
    if (this.form.invalid || this.examenesSeleccionados().size === 0) {
      return;
    }

    const v = this.form.getRawValue();
    const idOrden = this.idOrden();

    const registro = {
      orden: {
        idOrden,
        idPaciente: v.idPaciente!,
        idMedico: v.idMedico!,
        idCita: null,
        fechaOrden: toIsoDateTime(v.fecha)!,
        idPrioridad: v.idPrioridad!,
        idEstadoOrden: v.idEstadoOrden!,
        notas: v.notas || null,
        activo: true,
        fechaCreacion: this.esNueva()
          ? new Date().toISOString()
          : (this.laboratorioService.obtener(idOrden)?.orden.fechaCreacion ??
              new Date().toISOString()),
        fechaModificacion: this.esNueva() ? null : new Date().toISOString(),
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      detalles: [...this.examenesSeleccionados()].map((idTipoExamen) => ({
        idOrdenDetalle: this.detalleIdOriginal.get(idTipoExamen) ?? 0,
        idOrden,
        idTipoExamen,
        activo: true,
        fechaCreacion: new Date().toISOString(),
      })),
    };

    this.guardando.set(true);
    this.errorGuardar.set(null);

    this.laboratorioService.guardar(registro).subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigate(['/home/laboratorio']);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorGuardar.set('No se pudo guardar la orden. Intenta de nuevo.');
        console.error('Error al guardar la orden', err);
      },
    });
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idOrden();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.laboratorioService
      .RetornarBitacoraPorRegistro('ordenes_laboratorio', id)
      .subscribe({
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

  /** Formatea la fecha en hora local (bitácora). */
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

      const camposIgnorados = new Set([
        'IdUsuarioModificacion',
        'FechaModificacion',
        'IdUsuarioCreacion',
      ]);

      const idRegistroReal = this.idOrden();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        // Parche: el backend guarda mal el IdOrden. Usamos el ID real.
        if (k === 'IdOrden' && idRegistroReal != null) {
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
        if (x.campo.toLowerCase().includes('id orden')) return -1;
        if (y.campo.toLowerCase().includes('id orden')) return 1;
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
    return /fecha|fechahora|creacion|modificacion/i.test(nombreCampo);
  }
}