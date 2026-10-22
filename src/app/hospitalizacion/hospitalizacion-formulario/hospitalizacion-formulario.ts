import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
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
  CamaOpcion,
  HospitalizacionCompleta,
  HospitalizacionesService,
  MedicoOpcion,
  OpcionCatalogo,
  BitacoraItem,
  UsuarioOpcion,
} from '../../service/hospitalizaciones.service';
import { PacientesService } from '../../service/pacientes.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

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
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private hospitalizacionesService = inject(HospitalizacionesService);
  private pacientesService = inject(PacientesService);
  private notif = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);

  pacientes = this.pacientesService.directorio;

  medicosSignal = signal<MedicoOpcion[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);
  tiposOrdenSignal = signal<OpcionCatalogo[]>([]);

  camasLibres = signal<CamaOpcion[]>([]);
  camasTodas = signal<CamaOpcion[]>([]);
  camaOriginal = signal<CamaOpcion | null>(null);

  idHospitalizacion = signal(0);
  esNueva = computed(() => this.idHospitalizacion() === 0);
  registro = signal<HospitalizacionCompleta | undefined>(undefined);

  guardando = signal(false);
  errorGuardar = signal<string | null>(null);

  ordenEditando = signal<OrdenMedicaHospitalizacion | null>(null);
  guardandoOrden = signal(false);

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
    motivoIngreso: [
      '',
      [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(300),
      ],
    ],
    idEstadoHospitalizacion: this.fb.control<number | null>(null, Validators.required),
    fechaEgreso: this.fb.control<Date | null>(null),
    diagnosticoEgreso: ['', [Validators.maxLength(300)]],
  });

  constructor() {
    this.hospitalizacionesService.precargarCatalogosCamas();

    this.hospitalizacionesService.RetornarCamas().subscribe({
      next: (camas) => {
        this.camasTodas.set(camas);
        this.actualizarCamasLibres();
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error camas:', err.status);
        this.notif.error('No se pudieron cargar las camas');
      },
    });

    this.hospitalizacionesService.RetornarMedicos().subscribe({
      next: (m) => this.medicosSignal.set(m),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error médicos:', err.status);
      },
    });

    this.hospitalizacionesService.RetornarEstadosHospitalizacion().subscribe({
      next: (e) => {
        this.estadosSignal.set(e);
        if (this.esNueva() && e.length > 0 && !this.form.controls.idEstadoHospitalizacion.value) {
          const activa = e.find((x) => x.label.toLowerCase().includes('activ')) ?? e[0];
          this.form.patchValue({ idEstadoHospitalizacion: activa.id });
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error estados:', err.status);
      },
    });

    this.hospitalizacionesService.RetornarTiposOrden().subscribe({
      next: (t) => this.tiposOrdenSignal.set(t),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error tipos de orden:', err.status);
      },
    });

    this.hospitalizacionesService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error usuarios:', err.status);
      },
    });

    // Angular reutiliza esta misma instancia del componente al navegar entre
    // dos hospitalizaciones distintas sin salir de esta ruta: suscribirse
    // solo a queryParamMap (leyendo el id del snapshot adentro) no reacciona
    // si lo único que cambia es el :id del path, así que el formulario (y su
    // historial) se quedaban pegados a la primera hospitalización abierta.
    // Suscribirse directo a paramMap sí reacciona cuando cambia.
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      this.resetFormulario();
      if (!idParam || idParam === 'nuevo') return;

      const id = Number(idParam);
      this.cargarDesdeBackend(id);
    });
  }

  // Deja el formulario (y el historial) como recién creados antes de cargar
  // una hospitalización distinta o una nueva: si no se limpia, la anterior
  // se queda mezclada con la nueva (cama, historial abierto, etc.).
  private resetFormulario(): void {
    this.idHospitalizacion.set(0);
    this.registro.set(undefined);
    this.form.reset({
      idPaciente: null,
      idCama: null,
      idMedicoResponsable: null,
      fechaIngreso: new Date(),
      motivoIngreso: '',
      idEstadoHospitalizacion: null,
      fechaEgreso: null,
      diagnosticoEgreso: '',
    });
    this.ordenEditando.set(null);
    this.errorGuardar.set(null);
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
    this.registroHistorial.set(null);
  }

  private actualizarCamasLibres(): void {
    const todas = this.camasTodas();
    const idCamaActual = this.form.controls.idCama.value;
    const camaActual = todas.find((c) => c.id === idCamaActual) ?? null;
    this.camaOriginal.set(camaActual);

    const idLibre = this.hospitalizacionesService.idPorCodigo('ESTADO_CAMA', 'LIBRE');

    if (idLibre == null) {
      this.camasLibres.set(todas);
      return;
    }

    const libres = todas.filter((c) => c.idEstadoCama === idLibre);

    if (camaActual && camaActual.idEstadoCama !== idLibre) {
      this.camasLibres.set([camaActual, ...libres]);
    } else {
      this.camasLibres.set(libres);
    }
  }

  private cargarDesdeBackend(id: number): void {
    this.hospitalizacionesService.obtenerDesdeApi(id).subscribe({
      next: (reg) => this.cargar(reg),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error al refrescar detalle:', err.status);
        this.notif.error('No se pudo cargar el detalle');
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
          this.notif.exito('Orden médica actualizada correctamente');
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoOrden.set(false);
          console.error('❌ Error al actualizar orden:', err);
          this.notif.error('No se pudo actualizar la orden');
        },
      });
  }

  async eliminarOrden(orden: OrdenMedicaHospitalizacion): Promise<void> {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;

    if (!(await this.confirmacion.confirmar(`¿Eliminar la orden "${orden.descripcion}"?`))) return;

    this.hospitalizacionesService
      .eliminarOrden(idHospitalizacion, orden.idOrdenMedica)
      .subscribe({
        next: () => {
          this.cargarDesdeBackend(idHospitalizacion);
          this.notif.exito('Orden médica eliminada correctamente');
        },
        error: (err: HttpErrorResponse) => {
          console.error('❌ Error al eliminar orden:', err);
          this.notif.error('No se pudo eliminar la orden');
        },
      });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notif.error('Revisá los campos obligatorios');
      return;
    }

    const v = this.form.getRawValue();
    const idHospitalizacion = this.idHospitalizacion();
    const camaSeleccionada = this.camasTodas().find((c) => c.id === v.idCama) ?? null;
    const camaOriginal = this.camaOriginal();
    const cambioEstado = this.esNueva()
      ? true
      : camaOriginal?.id !== camaSeleccionada?.id;

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

        if (cambioEstado) {
          this.aplicarCambioDeCama(camaOriginal, camaSeleccionada, id);
        } else {
          this.guardando.set(false);
          this.notif.exito(
            this.esNueva()
              ? 'Ingreso hospitalario creado correctamente'
              : 'Ingreso hospitalario actualizado correctamente',
          );
          this.router.navigate(['/home/hospitalizacion', id]);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorGuardar.set(
          err.status === 401
            ? 'Tu sesión expiró. Cierra sesión y vuelve a iniciarla.'
            : 'No se pudo guardar el ingreso. Intenta de nuevo.',
        );
        console.error('Error al guardar hospitalización:', err);
        this.notif.error('No se pudo guardar el ingreso');
      },
    });
  }

  private aplicarCambioDeCama(
    camaAnterior: CamaOpcion | null,
    camaNueva: CamaOpcion | null,
    idHospitalizacion: number,
  ): void {
    const idOcupada = this.hospitalizacionesService.idPorCodigo('ESTADO_CAMA', 'OCUPADA');
    const idLibre = this.hospitalizacionesService.idPorCodigo('ESTADO_CAMA', 'LIBRE');
    const idActiva = this.hospitalizacionesService.idPorCodigo('ESTADO_HOSPITALIZACION', 'ACTIVA');

    if (idOcupada == null || idLibre == null || idActiva == null) {
      this.guardando.set(false);
      console.error('❌ No se pudieron resolver los IDs de catálogo');
      this.notif.error(
        'No se pudo actualizar el estado de las camas. Verificá los catálogos.',
      );
      this.router.navigate(['/home/hospitalizacion', idHospitalizacion]);
      return;
    }

    const estadoFinal: number =
      this.form.controls.idEstadoHospitalizacion.value === idActiva
        ? idOcupada
        : idLibre;

    const operaciones: any[] = [];

    if (camaAnterior && camaAnterior.id !== camaNueva?.id) {
      operaciones.push(
        this.hospitalizacionesService.actualizarEstadoCama(camaAnterior, idLibre),
      );
    }

    if (camaNueva) {
      operaciones.push(
        this.hospitalizacionesService.actualizarEstadoCama(camaNueva, estadoFinal),
      );
    }

    if (operaciones.length === 0) {
      this.guardando.set(false);
      this.notif.exito(
        this.esNueva()
          ? 'Ingreso hospitalario creado correctamente'
          : 'Ingreso hospitalario actualizado correctamente',
      );
      this.router.navigate(['/home/hospitalizacion', idHospitalizacion]);
      return;
    }

    let idx = 0;
    const siguiente = () => {
      if (idx >= operaciones.length) {
        this.guardando.set(false);
        this.notif.exito(
          this.esNueva()
            ? 'Ingreso hospitalario creado correctamente'
            : 'Ingreso hospitalario actualizado correctamente',
        );
        this.router.navigate(['/home/hospitalizacion', idHospitalizacion]);
        return;
      }
      const op = operaciones[idx++];
      op.subscribe({
        next: () => siguiente(),
        error: (err: HttpErrorResponse) => {
          console.error('❌ Error al actualizar estado de cama:', err.status);
          this.notif.error('No se pudo actualizar el estado de una cama');
          siguiente();
        },
      });
    };
    siguiente();
  }

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
        this.notif.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorial(): void {
    this.historialAbierto.set(false);
    this.registroHistorial.set(null);
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

      // ✅ idRegistroAfectado viene directo del backend y NO está corrupto.
      const idReal = item.idRegistroAfectado;

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        // ✅ FIX: para IdOrdenMedica, reemplazamos el valor corrupto
        //    con el id real. "antes" como null, "después" como id real,
        //    así NUNCA son iguales y siempre se muestra.
        if (k === 'IdOrdenMedica' && idReal != null) {
          a = null;
          d = String(idReal);
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

    if (/id ?medico/i.test(nombreCampo) && valor != null) {
      const nombre = this.medicoLabel(Number(valor));
      if (nombre && nombre !== '—') return nombre;
    }

    if (this.esCampoFecha(nombreCampo) && typeof valor === 'string') {
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