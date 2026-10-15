import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  BitacoraItem,
  Cama,
  Habitacion,
  HabitacionCompleta,
  HabitacionInput,
  HabitacionesService,
  UsuarioOpcion,
} from '../../service/habitaciones.service';
import { CatalogosService } from '../../service/catalogos.service';
import { TIPOS_HABITACION, ESTADOS_HABITACION, ESTADOS_CAMA } from '../habitaciones-catalogos';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

@Component({
  selector: 'app-habitacion-formulario',
  imports: [
    NgClass,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    AuditoriaInfo,
  ],
  templateUrl: './habitacion-formulario.html',
  styleUrl: './habitacion-formulario.css',
})
export class HabitacionFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private habitacionesService = inject(HabitacionesService);
  private notificaciones = inject(NotificacionesService);

  private catalogos = inject(CatalogosService);
  private tiposApi = this.catalogos.obtener('TIPO_HABITACION');
  tipos = computed(() => {
    const api = this.tiposApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_HABITACION;
  });
  private estadosApi = this.catalogos.obtener('ESTADO_HABITACION');
  estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_HABITACION;
  });
  private estadosCamaApi = this.catalogos.obtener('ESTADO_CAMA');
  estadosCama = computed(() => {
    const api = this.estadosCamaApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_CAMA;
  });

  idHabitacion = signal(0);
  esNueva = computed(() => this.idHabitacion() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Habitacion | null>(null);

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================
  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  form = this.fb.nonNullable.group({
    numero: ['', Validators.required],
    piso: this.fb.control<number | null>(null),
    idTipoHabitacion: this.fb.control<number | null>(null),
    idEstadoHabitacion: this.fb.control<number | null>(null, Validators.required),
  });

  // --- Camas (solo en edición: una habitación nueva todavía no tiene id
  // para colgarles camas) ---
  camas = signal<Cama[]>([]);
  errorCamas = signal('');
  editandoCama = signal<number | null>(null); // null = agregando una nueva, id = editando esa
  mostrandoFormCama = signal(false);
  guardandoCama = signal(false);

  camaForm = this.fb.nonNullable.group({
    numeroCama: ['', Validators.required],
    idEstadoCama: this.fb.control<number | null>(null, Validators.required),
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.habitacionesService.obtenerPorId(Number(idParam)).subscribe({
        next: (r) => this.cargar(r),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }

    this.habitacionesService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: Error) => console.error('❌ [HabitacionFormulario] Error usuarios:', err.message),
    });
  }

  private cargar(r: HabitacionCompleta): void {
    this.idHabitacion.set(r.habitacion.idHabitacion);
    this.registro.set(r.habitacion);
    this.form.patchValue({
      numero: r.habitacion.numero,
      piso: r.habitacion.piso,
      idTipoHabitacion: r.habitacion.idTipoHabitacion,
      idEstadoHabitacion: r.habitacion.idEstadoHabitacion,
    });
    this.camas.set(r.camas.filter((c) => c.activo));
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: HabitacionInput = {
      numero: v.numero.trim(),
      piso: v.piso,
      idTipoHabitacion: v.idTipoHabitacion,
      idEstadoHabitacion: v.idEstadoHabitacion!,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNueva()
      ? this.habitacionesService.crear(input)
      : this.habitacionesService.actualizar(this.idHabitacion(), input);
    peticion.subscribe({
      next: (r) => {
        this.notificaciones.exito(this.esNueva() ? 'Creado correctamente' : 'Actualizado correctamente');
        if (this.esNueva()) {
          // Recién creada: ahora sí tiene id, se queda en esta pantalla
          // (en modo edición) para poder agregarle camas sin salir.
          this.router.navigate(['/home/mantenimiento/habitaciones', r.habitacion.idHabitacion]);
          return;
        }
        this.guardando.set(false);
        this.router.navigate(['/home/mantenimiento/habitaciones']);
      },
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }

  nuevaCama(): void {
    this.editandoCama.set(null);
    this.camaForm.reset({ numeroCama: '', idEstadoCama: null });
    this.errorCamas.set('');
    this.mostrandoFormCama.set(true);
  }

  editarCama(cama: Cama): void {
    this.editandoCama.set(cama.idCama);
    this.camaForm.reset({ numeroCama: cama.numeroCama, idEstadoCama: cama.idEstadoCama });
    this.errorCamas.set('');
    this.mostrandoFormCama.set(true);
  }

  cancelarCama(): void {
    this.mostrandoFormCama.set(false);
  }

  guardarCama(): void {
    this.camaForm.markAllAsTouched();
    if (this.camaForm.invalid) {
      return;
    }
    const v = this.camaForm.getRawValue();
    const input = { numeroCama: v.numeroCama.trim(), idEstadoCama: v.idEstadoCama! };
    const idCama = this.editandoCama();

    this.guardandoCama.set(true);
    this.errorCamas.set('');
    const peticion = idCama
      ? this.habitacionesService.editarCama(this.idHabitacion(), idCama, input)
      : this.habitacionesService.agregarCama(this.idHabitacion(), input);
    peticion.subscribe({
      next: (cama) => {
        this.camas.update((lista) =>
          idCama ? lista.map((c) => (c.idCama === cama.idCama ? cama : c)) : [...lista, cama],
        );
        this.guardandoCama.set(false);
        this.mostrandoFormCama.set(false);
        this.notificaciones.exito(idCama ? 'Cama actualizada correctamente' : 'Cama agregada correctamente');
      },
      error: (err: Error) => {
        this.errorCamas.set(err.message);
        this.guardandoCama.set(false);
      },
    });
  }

  eliminarCama(cama: Cama): void {
    if (!confirm(`¿Quitar la cama "${cama.numeroCama}" de esta habitación?`)) {
      return;
    }
    this.errorCamas.set('');
    this.habitacionesService.eliminarCama(this.idHabitacion(), cama.idCama).subscribe({
      next: () => {
        this.camas.update((lista) => lista.filter((c) => c.idCama !== cama.idCama));
        this.notificaciones.exito('Cama eliminada correctamente');
      },
      error: (err: Error) => this.errorCamas.set(err.message),
    });
  }

  estadoCamaLabel(idEstadoCama: number): string {
    return this.estadosCama().find((e) => e.id === idEstadoCama)?.label ?? '—';
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idHabitacion();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.habitacionesService.RetornarBitacoraPorRegistro('habitaciones', id).subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error al cargar bitácora:', err.message);
        this.cargandoHistorial.set(false);
        this.notificaciones.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorial(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  accionLabel(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'Creó';
    if (idTipoAccion === 80) return 'Modificó';
    if (idTipoAccion === 81) return 'Eliminó';
    return 'Cambió';
  }

  accionClase(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'accion-crear';
    if (idTipoAccion === 80) return 'accion-modificar';
    if (idTipoAccion === 81) return 'accion-eliminar';
    return 'accion-default';
  }

  accionIcono(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'add_circle';
    if (idTipoAccion === 80) return 'edit';
    if (idTipoAccion === 81) return 'delete';
    return 'history';
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

      const idRegistroReal = this.idHabitacion();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdHabitacion' && idRegistroReal != null) {
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
        if (x.campo.toLowerCase().includes('id habitacion')) return -1;
        if (y.campo.toLowerCase().includes('id habitacion')) return 1;
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
    return /fecha|fechahora|creacion|modificacion/i.test(nombreCampo);
  }
}
