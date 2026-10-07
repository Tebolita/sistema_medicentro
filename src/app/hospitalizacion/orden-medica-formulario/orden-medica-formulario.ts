import { Component, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  HospitalizacionesService,
  MedicoOpcion,
  OpcionCatalogo,
} from '../hospitalizaciones.service';
import { PacientesService } from '../../pacientes/pacientes.service';

/** Devuelve "2026-10-06T18:21:30" (hora local, sin Z). */
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
  selector: 'app-orden-medica-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    SlicePipe,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './orden-medica-formulario.html',
  styleUrl: './orden-medica-formulario.css',
})
export class OrdenMedicaFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private hospitalizacionesService = inject(HospitalizacionesService);
  private pacientesService = inject(PacientesService);

  medicosSignal = signal<MedicoOpcion[]>([]);
  tiposOrdenSignal = signal<OpcionCatalogo[]>([]);

  hospitalizacionesActivas = this.hospitalizacionesService.activas;

  hospitalizacionFija = signal<number | null>(null);

  guardando = signal(false);
  errorGuardar = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    idHospitalizacion: this.fb.control<number | null>(null, Validators.required),
    idTipoOrden: this.fb.control<number | null>(null, Validators.required),
    idMedico: this.fb.control<number | null>(null, Validators.required),
    descripcion: ['', Validators.required],
  });

  constructor() {
    // ✅ Deshabilitar control desde el inicio si viene ?hospitalizacion=X
    const hospitalizacionParam = this.route.snapshot.queryParamMap.get('hospitalizacion');
    if (hospitalizacionParam) {
      const id = Number(hospitalizacionParam);
      this.hospitalizacionFija.set(id);
      this.form.patchValue({ idHospitalizacion: id });
      this.form.controls.idHospitalizacion.disable();
    }

    // 1) Médicos del backend
    this.hospitalizacionesService.RetornarMedicos().subscribe({
      next: (m) => {
        console.log('✅ [OrdenMedicaFormulario] Médicos cargados:', m.length);
        this.medicosSignal.set(m);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [OrdenMedicaFormulario] Error médicos:', err.status),
    });

    // 2) Tipos de orden del backend
    this.hospitalizacionesService.RetornarTiposOrden().subscribe({
      next: (t) => {
        console.log('✅ [OrdenMedicaFormulario] Tipos de orden cargados:', t.length);
        this.tiposOrdenSignal.set(t);

        const tipoParam = this.route.snapshot.queryParamMap.get('tipo');
        if (tipoParam && !this.form.controls.idTipoOrden.value) {
          const tipoId = Number(tipoParam);
          if (t.some((x) => x.id === tipoId)) {
            this.form.patchValue({ idTipoOrden: tipoId });
          }
        }
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [OrdenMedicaFormulario] Error tipos de orden:', err.status),
    });

    // 3) Otros query params
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const hospitalizacionParam = params.get('hospitalizacion');
      if (hospitalizacionParam) {
        const id = Number(hospitalizacionParam);
        if (this.hospitalizacionFija() !== id) {
          this.hospitalizacionFija.set(id);
          this.form.patchValue({ idHospitalizacion: id });
          if (!this.form.controls.idHospitalizacion.disabled) {
            this.form.controls.idHospitalizacion.disable();
          }
        }
      }
    });
  }

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.directorio().find((pac) => pac.idPaciente === idPaciente);
    return p ? [p.primerNombre, p.primerApellido].filter(Boolean).join(' ') : '—';
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();

    this.guardando.set(true);
    this.errorGuardar.set(null);

    this.hospitalizacionesService
      .agregarOrden(v.idHospitalizacion!, {
        idMedico: v.idMedico!,
        idTipoOrden: v.idTipoOrden!,
        // ✅ CAMBIO: hora local en lugar de UTC
        fechaOrden: fechaHoraLocal(),
        descripcion: v.descripcion,
        fechaCreacion: fechaHoraLocal(),
        fechaModificacion: null,
      })
      .subscribe({
        next: () => {
          this.guardando.set(false);
          this.router.navigate(['/home/hospitalizacion', v.idHospitalizacion], {
            queryParams: { refresh: Date.now() },
          });
        },
        error: (err: HttpErrorResponse) => {
          this.guardando.set(false);
          this.errorGuardar.set(
            err.status === 401
              ? 'Tu sesión expiró. Cierra sesión y vuelve a iniciarla.'
              : 'No se pudo guardar la orden. Revisa la consola.',
          );
          console.error('Error al guardar orden médica:', err);
        },
      });
  }
}