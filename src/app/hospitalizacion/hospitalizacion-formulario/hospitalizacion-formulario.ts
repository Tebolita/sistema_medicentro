import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Hospitalizacion, OrdenMedicaHospitalizacion } from '../../models';
import {
  HospitalizacionCompleta,
  HospitalizacionesService,
  MedicoOpcion,
  OpcionCatalogo,
  BitacoraItem,
  UsuarioOpcion,
} from '../hospitalizaciones.service';
import {
  CamaOpcion,
  ESTADO_CAMA_LIBRE,
  ESTADO_CAMA_OCUPADA,
  ESTADO_HOSPITALIZACION_ACTIVA,
} from '../hospitalizacion-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

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
  selector: 'app-hospitalizacion-formulario',
  imports: [
    NgClass,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './hospitalizacion-formulario.html',
  styleUrl: './hospitalizacion-formulario.css',
})
export class HospitalizacionFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private hospitalizacionesService = inject(HospitalizacionesService);
  private pacientesService = inject(PacientesService);

  pacientes = this.pacientesService.directorio;

  medicosSignal = signal<MedicoOpcion[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);
  tiposOrdenSignal = signal<OpcionCatalogo[]>([]);

  /** Camas libres para el dropdown al crear una nueva hospitalización. */
  camasLibres = signal<CamaOpcion[]>([]);

  /** Camas actuales del registro (para poder guardar la cama original). */
  camasTodas = signal<CamaOpcion[]>([]);

  /** Cama seleccionada actualmente en el form (para saber cuál modificar). */
  camaOriginal = signal<CamaOpcion | null>(null);

  idHospitalizacion = signal(0);
  esNueva = computed(() => this.idHospitalizacion() === 0);
  registro = signal<HospitalizacionCompleta | undefined>(undefined);

  guardando = signal(false);
  errorGuardar = signal<string | null>(null);

  ordenEditando = signal<OrdenMedicaHospitalizacion | null>(null);
  guardandoOrden = signal(false);

  // ============================================================
  // Historial de auditoría
  // ============================================================
  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);
  cargandoHistorial = signal(false);
  registroHistorial = signal<{ tabla: string; id: number; titulo: string } | null>(null);

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idCama: this.fb.control<number | null>(null, Validators.required),
    idMedicoResponsable: this.fb.control<number | null>(null, Validators.required),
    fechaIngreso: this.fb.control<Date | null>(new Date(), Validators.required),
    motivoIngreso: ['', Validators.required],
    idEstadoHospitalizacion: this.fb.control<number | null>(null, Validators.required),
    fechaEgreso: this.fb.control<Date | null>(null),
    diagnosticoEgreso: [''],
  });

  constructor() {
    // 1) Camas desde /api/Habitaciones
    this.hospitalizacionesService.RetornarCamas().subscribe({
      next: (camas) => {
        console.log('✅ [HospitalizacionFormulario] Camas totales:', camas.length);
        this.camasTodas.set(camas);
        this.actualizarCamasLibres();
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionFormulario] Error camas:', err.status),
    });

    // 2) Médicos
    this.hospitalizacionesService.RetornarMedicos().subscribe({
      next: (m) => {
        console.log('✅ [HospitalizacionFormulario] Médicos cargados:', m.length);
        this.medicosSignal.set(m);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionFormulario] Error médicos:', err.status),
    });

    // 3) Estados
    this.hospitalizacionesService.RetornarEstadosHospitalizacion().subscribe({
      next: (e) => {
        console.log('✅ [HospitalizacionFormulario] Estados cargados:', e.length);
        this.estadosSignal.set(e);
        if (this.esNueva() && e.length > 0 && !this.form.controls.idEstadoHospitalizacion.value) {
          const activa = e.find((x) => x.label.toLowerCase().includes('activ')) ?? e[0];
          this.form.patchValue({ idEstadoHospitalizacion: activa.id });
        }
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionFormulario] Error estados:', err.status),
    });

    // 4) Tipos de orden
    this.hospitalizacionesService.RetornarTiposOrden().subscribe({
      next: (t) => {
        console.log('✅ [HospitalizacionFormulario] Tipos de orden cargados:', t.length);
        this.tiposOrdenSignal.set(t);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionFormulario] Error tipos de orden:', err.status),
    });

    // 5) Usuarios (para el nombre en la bitácora)
    this.hospitalizacionesService.RetornarUsuarios().subscribe({
      next: (u) => {
        console.log('✅ [HospitalizacionFormulario] Usuarios cargados:', u.length);
        this.usuariosSignal.set(u);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionFormulario] Error usuarios:', err.status),
    });

    // 6) Refrescar detalle si hay id
    this.route.queryParamMap.subscribe(() => {
      const idParam = this.route.snapshot.paramMap.get('id');
      if (!idParam || idParam === 'nuevo') return;

      const id = Number(idParam);
      this.cargarDesdeBackend(id);
    });
  }

  /**
   * Calcula las camas que se muestran en el dropdown.
   * Si es nueva → solo libres.
   * Si es edición → libres + la cama actual del registro (para que aparezca seleccionada).
   */
  private actualizarCamasLibres(): void {
    const todas = this.camasTodas();
    const idCamaActual = this.form.controls.idCama.value;
    const camaActual = todas.find((c) => c.id === idCamaActual) ?? null;
    this.camaOriginal.set(camaActual);

    const libres = todas.filter((c) => c.idEstadoCama === ESTADO_CAMA_LIBRE);

    // Si es edición y la cama actual NO está libre, la agregamos
    // para que el dropdown muestre la selección actual.
    if (camaActual && camaActual.idEstadoCama !== ESTADO_CAMA_LIBRE) {
      this.camasLibres.set([camaActual, ...libres]);
    } else {
      this.camasLibres.set(libres);
    }
  }

  private cargarDesdeBackend(id: number): void {
    this.hospitalizacionesService.obtenerDesdeApi(id).subscribe({
      next: (reg) => {
        this.cargar(reg);
        console.log('✅ [HospitalizacionFormulario] Detalle refrescado. Órdenes:', reg.ordenes.length);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error al refrescar detalle:', err.status);
      },
    });
  }

  private cargar(registro: HospitalizacionCompleta): void {
    this.idHospitalizacion.set(registro.hospitalizacion.idHospitalizacion);
    this.registro.set(registro);
    const h = registro.hospitalizacion;
    this.form.patchValue({
      idPaciente: h.idPaciente,
      idCama: h.idCama,
      idMedicoResponsable: h.idMedicoResponsable,
      fechaIngreso: parseIsoDateLocal(h.fechaIngreso),
      motivoIngreso: h.motivoIngreso,
      idEstadoHospitalizacion: h.idEstadoHospitalizacion,
      fechaEgreso: h.fechaEgreso ? parseIsoDateLocal(h.fechaEgreso) : null,
      diagnosticoEgreso: h.diagnosticoEgreso ?? '',
    });
    // Recalcular camas libres + cama original
    this.actualizarCamasLibres();
  }

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.directorio().find((pac) => pac.idPaciente === idPaciente);
    return p ? [p.primerNombre, p.primerApellido].filter(Boolean).join(' ') : '—';
  }

  medicoLabel(idMedico: number | null): string {
    if (idMedico == null) return '—';
    return this.medicosSignal().find((m) => m.id === idMedico)?.nombre ?? '—';
  }

  tipoOrdenLabel(idTipoOrden: number | null): string {
    if (idTipoOrden == null) return '—';
    return this.tiposOrdenSignal().find((t) => t.id === idTipoOrden)?.label ?? '—';
  }

  formatFecha(iso: any): string {
    const valor = iso?.fechaOrden ?? iso?.fecha_orden ?? iso;
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  abrirEditarOrden(orden: OrdenMedicaHospitalizacion): void {
    this.ordenEditando.set({ ...orden });
  }

  cancelarEditarOrden(): void {
    this.ordenEditando.set(null);
  }

  guardarEdicionOrden(orden: OrdenMedicaHospitalizacion): void {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;

    this.guardandoOrden.set(true);
    this.hospitalizacionesService
      .actualizarOrden(idHospitalizacion, orden.idOrdenMedica, {
        idMedico: orden.idMedico,
        idTipoOrden: orden.idTipoOrden,
        fechaOrden: orden.fechaOrden,
        descripcion: orden.descripcion,
      })
      .subscribe({
        next: () => {
          this.guardandoOrden.set(false);
          this.ordenEditando.set(null);
          this.cargarDesdeBackend(idHospitalizacion);
          console.log('✅ Orden actualizada');
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoOrden.set(false);
          console.error('❌ Error al actualizar orden:', err);
          alert('No se pudo actualizar la orden. Revisa la consola.');
        },
      });
  }

  eliminarOrden(orden: OrdenMedicaHospitalizacion): void {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;

    if (!confirm(`¿Eliminar la orden "${orden.descripcion}"?`)) return;

    this.hospitalizacionesService
      .eliminarOrden(idHospitalizacion, orden.idOrdenMedica)
      .subscribe({
        next: () => {
          this.cargarDesdeBackend(idHospitalizacion);
          console.log('✅ Orden eliminada');
        },
        error: (err: HttpErrorResponse) => {
          console.error('❌ Error al eliminar orden:', err);
          alert('No se pudo eliminar la orden. Revisa la consola.');
        },
      });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    const idHospitalizacion = this.idHospitalizacion();
    const camaSeleccionada = this.camasTodas().find((c) => c.id === v.idCama) ?? null;
    const camaOriginal = this.camaOriginal();
    const cambioEstado = this.esNueva()
      ? true // nueva → siempre marcamos la cama como ocupada
      : camaOriginal?.id !== camaSeleccionada?.id; // edición → solo si cambió la cama

    const registro: Hospitalizacion = {
      idHospitalizacion,
      idPaciente: v.idPaciente!,
      idCama: v.idCama!,
      idMedicoResponsable: v.idMedicoResponsable!,
      fechaIngreso: toIsoDateTime(v.fechaIngreso)!,
      fechaEgreso: toIsoDateTime(v.fechaEgreso),
      motivoIngreso: v.motivoIngreso,
      diagnosticoEgreso: v.diagnosticoEgreso || null,
      idEstadoHospitalizacion: v.idEstadoHospitalizacion!,
      activo: true,
      fechaCreacion: this.esNueva()
        ? toIsoDateTime(new Date())!
        : (this.hospitalizacionesService.obtener(idHospitalizacion)?.hospitalizacion.fechaCreacion ??
            toIsoDateTime(new Date())!),
      fechaModificacion: this.esNueva() ? null : toIsoDateTime(new Date()),
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    };

    this.guardando.set(true);
    this.errorGuardar.set(null);

    this.hospitalizacionesService.guardar(registro).subscribe({
      next: (resp: any) => {
        const id =
          resp?.datos?.hospitalizacion?.idHospitalizacion ??
          resp?.datos?.idHospitalizacion ??
          0;

        // ✅ Si cambió la cama → actualizar estados
        if (cambioEstado) {
          this.aplicarCambioDeCama(camaOriginal, camaSeleccionada, id);
        } else {
          this.guardando.set(false);
          this.router.navigate(['/home/hospitalizacion', id]);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorGuardar.set(
          err.status === 401
            ? 'Tu sesión expiró. Cierra sesión y vuelve a iniciarla.'
            : 'No se pudo guardar el ingreso. Revisa la consola.',
        );
        console.error('Error al guardar hospitalización:', err);
      },
    });
  }

  /**
   * Cambia el estado de las camas:
   *  - La cama ANTERIOR (si había) → Libre.
   *  - La cama NUEVA → Ocupada.
   *  - Si el estado de la hospitalización es Alta/Trasladada, la nueva queda Libre.
   */
  private aplicarCambioDeCama(
    camaAnterior: CamaOpcion | null,
    camaNueva: CamaOpcion | null,
    idHospitalizacion: number,
  ): void {
    const estadoFinal: number =
      this.form.controls.idEstadoHospitalizacion.value === ESTADO_HOSPITALIZACION_ACTIVA
        ? ESTADO_CAMA_OCUPADA
        : ESTADO_CAMA_LIBRE;

    const operaciones: any[] = [];

    // 1. Liberar cama anterior (si cambió)
    if (camaAnterior && camaAnterior.id !== camaNueva?.id) {
      operaciones.push(
        this.hospitalizacionesService.actualizarEstadoCama(camaAnterior, ESTADO_CAMA_LIBRE),
      );
    }

    // 2. Marcar nueva cama con el estado final
    if (camaNueva) {
      operaciones.push(
        this.hospitalizacionesService.actualizarEstadoCama(camaNueva, estadoFinal),
      );
    }

    if (operaciones.length === 0) {
      this.guardando.set(false);
      this.router.navigate(['/home/hospitalizacion', idHospitalizacion]);
      return;
    }

    // Ejecutar en serie. Si la primera falla, avisamos pero seguimos.
    let idx = 0;
    const siguiente = () => {
      if (idx >= operaciones.length) {
        this.guardando.set(false);
        console.log('✅ Estados de camas actualizados');
        this.router.navigate(['/home/hospitalizacion', idHospitalizacion]);
        return;
      }
      const op = operaciones[idx++];
      op.subscribe({
        next: () => siguiente(),
        error: (err: HttpErrorResponse) => {
          console.error('❌ Error al actualizar estado de cama:', err.status);
          siguiente();
        },
      });
    };
    siguiente();
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(tabla: string, id: number, titulo: string): void {
    this.registroHistorial.set({ tabla, id, titulo });
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.hospitalizacionesService.RetornarBitacoraPorRegistro(tabla, id).subscribe({
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
    this.registroHistorial.set(null);
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

  /** Formatea la fecha en hora local (convierte UTC → local). */
  formatFechaHora(iso: string): string {
    if (!iso) return '—';

    // ⚠️ El backend manda el ISO sin la "Z" al final (sin zona horaria),
    // pero es UTC. Le agregamos la Z para que JS lo interprete correctamente.
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

  /** Devuelve la lista de campos que cambiaron entre valoresAnteriores y valoresNuevos. */
  camposCambiados(item: BitacoraItem): Array<{ campo: string; antes: string; despues: string }> {
    try {
      const antes = item.valoresAnteriores ? JSON.parse(item.valoresAnteriores) : {};
      const despues = item.valoresNuevos ? JSON.parse(item.valoresNuevos) : {};

      // Campos técnicos que no aportan al usuario final
      const camposIgnorados = new Set([
        'IdUsuarioModificacion',
        'FechaModificacion',
        'IdUsuarioCreacion',
      ]);

      // ID del registro actual (el correcto, del título)
      const idRegistroReal = this.registroHistorial()?.id ?? null;

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        // ⚠️ Parche: el backend guarda mal el IdHospitalizacion.
        // Si el campo es "IdHospitalizacion", usamos el ID real.
        if (k === 'IdHospitalizacion' && idRegistroReal != null) {
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
        if (x.campo.toLowerCase().includes('id hospitalizacion')) return -1;
        if (y.campo.toLowerCase().includes('id hospitalizacion')) return 1;
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

    // Si el campo es una fecha, formatearla legible (con conversión UTC → local)
    if (this.esCampoFecha(nombreCampo) && typeof valor === 'string') {
      // Le agregamos la "Z" si no la tiene, para interpretar como UTC
      const isoConZona = valor.endsWith('Z') ? valor : valor + 'Z';
      const fecha = new Date(isoConZona);
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