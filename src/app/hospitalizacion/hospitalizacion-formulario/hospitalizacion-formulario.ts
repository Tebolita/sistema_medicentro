import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Hospitalizacion } from '../../models';
import { HospitalizacionCompleta, HospitalizacionesService } from '../hospitalizaciones.service';
import { CAMAS, ESTADOS_HOSPITALIZACION, TIPOS_ORDEN } from '../hospitalizacion-catalogos';
import { MEDICOS } from '../../consultas-externas/consultas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

function toIsoDate(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

@Component({
  selector: 'app-hospitalizacion-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
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

  pacientes = this.pacientesService.listar;
  medicos = MEDICOS;
  camas = CAMAS;
  estadosHospitalizacion = ESTADOS_HOSPITALIZACION;
  tiposOrden = TIPOS_ORDEN;

  idHospitalizacion = signal(0);
  esNueva = computed(() => this.idHospitalizacion() === 0);
  registro = signal<HospitalizacionCompleta | undefined>(undefined);

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idCama: this.fb.control<number | null>(null, Validators.required),
    idMedicoResponsable: this.fb.control<number | null>(null, Validators.required),
    fechaIngreso: this.fb.control<Date | null>(new Date(), Validators.required),
    motivoIngreso: ['', Validators.required],
    idEstadoHospitalizacion: [1, Validators.required],
    fechaEgreso: this.fb.control<Date | null>(null),
    diagnosticoEgreso: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      const id = Number(idParam);
      const registro = this.hospitalizacionesService.obtener(id);
      if (registro) {
        this.cargar(registro);
      }
    }
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
    const p = this.pacientesService.listar().find((pac) => pac.idPaciente === idPaciente);
    return p ? [p.primerNombre, p.primerApellido].filter(Boolean).join(' ') : '—';
  }

  medicoLabel(idMedico: number): string {
    return MEDICOS.find((m) => m.id === idMedico)?.nombre ?? '—';
  }

  tipoOrdenLabel(idTipoOrden: number): string {
    return TIPOS_ORDEN.find((t) => t.id === idTipoOrden)?.label ?? '—';
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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
      fechaIngreso: toIsoDate(v.fechaIngreso)!,
      fechaEgreso: toIsoDate(v.fechaEgreso),
      motivoIngreso: v.motivoIngreso,
      diagnosticoEgreso: v.diagnosticoEgreso || null,
      idEstadoHospitalizacion: v.idEstadoHospitalizacion,
      activo: true,
      fechaCreacion: this.esNueva()
        ? new Date().toISOString()
        : (this.hospitalizacionesService.obtener(idHospitalizacion)?.hospitalizacion.fechaCreacion ?? new Date().toISOString()),
      fechaModificacion: this.esNueva() ? null : new Date().toISOString(),
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    };

    const id = this.hospitalizacionesService.guardar(registro);
    this.router.navigate(['/home/hospitalizacion', id]);
  }
}
