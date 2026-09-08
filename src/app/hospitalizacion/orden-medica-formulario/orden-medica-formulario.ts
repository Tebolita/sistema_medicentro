import { Component, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HospitalizacionesService } from '../hospitalizaciones.service';
import { TIPOS_ORDEN } from '../hospitalizacion-catalogos';
import { MEDICOS } from '../../consultas-externas/consultas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

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

  medicos = MEDICOS;
  tiposOrden = TIPOS_ORDEN;
  hospitalizacionesActivas = this.hospitalizacionesService.activas;

  // Si se llega desde el detalle de una hospitalización, ya se sabe cuál es
  // y el select queda bloqueado; si se llega desde el menú, hay que elegirla.
  hospitalizacionFija = signal<number | null>(null);

  form = this.fb.nonNullable.group({
    idHospitalizacion: this.fb.control<number | null>(null, Validators.required),
    idTipoOrden: this.fb.control<number | null>(null, Validators.required),
    idMedico: this.fb.control<number | null>(null, Validators.required),
    descripcion: ['', Validators.required],
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const tipoParam = params.get('tipo');
      if (tipoParam) {
        this.form.patchValue({ idTipoOrden: Number(tipoParam) });
      }
      const hospitalizacionParam = params.get('hospitalizacion');
      if (hospitalizacionParam) {
        const id = Number(hospitalizacionParam);
        this.hospitalizacionFija.set(id);
        this.form.patchValue({ idHospitalizacion: id });
      }
    });
  }

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.listar().find((pac) => pac.idPaciente === idPaciente);
    return p ? [p.primerNombre, p.primerApellido].filter(Boolean).join(' ') : '—';
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    this.hospitalizacionesService.agregarOrden(v.idHospitalizacion!, {
      idMedico: v.idMedico!,
      idTipoOrden: v.idTipoOrden!,
      fechaOrden: new Date().toISOString(),
      descripcion: v.descripcion,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: null,
    });

    this.router.navigate(['/home/hospitalizacion', v.idHospitalizacion]);
  }
}
