import { Component, computed, inject, signal } from '@angular/core';
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
} from '../hospitalizaciones.service';
import { CamaOpcion } from '../hospitalizacion-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

/**
 * Toma un Date del datepicker y le añade la HORA ACTUAL (hora local).
 * Devuelve "2026-10-06T18:21:30" (sin Z) para que el backend lo guarde como local.
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
  selector: 'app-hospitalizacion-formulario',
  imports: [
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
  camas = signal<CamaOpcion[]>([]);

  idHospitalizacion = signal(0);
  esNueva = computed(() => this.idHospitalizacion() === 0);
  registro = signal<HospitalizacionCompleta | undefined>(undefined);

  guardando = signal(false);
  errorGuardar = signal<string | null>(null);

  ordenEditando = signal<OrdenMedicaHospitalizacion | null>(null);
  guardandoOrden = signal(false);

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
    // 1) Camas del backend
    this.hospitalizacionesService.RetornarCamas().subscribe({
      next: (camas) => {
        console.log('✅ [HospitalizacionFormulario] Camas cargadas:', camas.length);
        this.camas.set(camas);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionFormulario] Error camas:', err.status),
    });

    // 2) Médicos del backend
    this.hospitalizacionesService.RetornarMedicos().subscribe({
      next: (m) => {
        console.log('✅ [HospitalizacionFormulario] Médicos cargados:', m.length);
        this.medicosSignal.set(m);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionFormulario] Error médicos:', err.status),
    });

    // 3) Estados del backend + auto-seleccionar "Activa"
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

    // 4) Tipos de orden del backend
    this.hospitalizacionesService.RetornarTiposOrden().subscribe({
      next: (t) => {
        console.log('✅ [HospitalizacionFormulario] Tipos de orden cargados:', t.length);
        this.tiposOrdenSignal.set(t);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionFormulario] Error tipos de orden:', err.status),
    });

    // 5) Recargar detalle si hay query params
    this.route.queryParamMap.subscribe(() => {
      const idParam = this.route.snapshot.paramMap.get('id');
      if (!idParam || idParam === 'nuevo') return;

      const id = Number(idParam);
      this.cargarDesdeBackend(id);
    });
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

    const registro: Hospitalizacion = {
      idHospitalizacion,
      idPaciente: v.idPaciente!,
      idCama: v.idCama!,
      idMedicoResponsable: v.idMedicoResponsable!,
      // ✅ CAMBIO: toIsoDateTime añade la hora actual (antes usaba toIsoDate)
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
        this.guardando.set(false);
        const id =
          resp?.datos?.hospitalizacion?.idHospitalizacion ??
          resp?.datos?.idHospitalizacion ??
          0;
        this.router.navigate(['/home/hospitalizacion', id]);
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
}