import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Puesto, PuestoInput, PuestosService } from '../../service/puestos.service';

@Component({
  selector: 'app-puesto-formulario',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './puesto-formulario.html',
  styleUrl: './puesto-formulario.css',
})
export class PuestoFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private puestosService = inject(PuestosService);

  idPuesto = signal(0);
  esNuevo = computed(() => this.idPuesto() === 0);
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.puestosService.obtenerPorId(Number(idParam)).subscribe({
        next: (p) => this.cargar(p),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(p: Puesto): void {
    this.idPuesto.set(p.idPuesto);
    this.form.patchValue({ nombre: p.nombre, descripcion: p.descripcion ?? '' });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: PuestoInput = { nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNuevo()
      ? this.puestosService.crear(input)
      : this.puestosService.actualizar(this.idPuesto(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/puestos']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
