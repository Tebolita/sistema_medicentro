import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Especialidad, EspecialidadInput, EspecialidadesService } from '../../service/especialidades.service';

@Component({
  selector: 'app-especialidad-formulario',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './especialidad-formulario.html',
  styleUrl: './especialidad-formulario.css',
})
export class EspecialidadFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private especialidadesService = inject(EspecialidadesService);

  idEspecialidad = signal(0);
  esNueva = computed(() => this.idEspecialidad() === 0);
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.especialidadesService.obtenerPorId(Number(idParam)).subscribe({
        next: (e) => this.cargar(e),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(e: Especialidad): void {
    this.idEspecialidad.set(e.idEspecialidad);
    this.form.patchValue({ nombre: e.nombre, descripcion: e.descripcion ?? '' });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: EspecialidadInput = { nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNueva()
      ? this.especialidadesService.crear(input)
      : this.especialidadesService.actualizar(this.idEspecialidad(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/especialidades']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
