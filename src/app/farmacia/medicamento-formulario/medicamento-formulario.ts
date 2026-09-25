import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Medicamento } from '../../models';
import { MedicamentoInput, MedicamentosService } from '../../service/medicamentos.service';

@Component({
  selector: 'app-medicamento-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './medicamento-formulario.html',
  styleUrl: './medicamento-formulario.css',
})
export class MedicamentoFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private medicamentosService = inject(MedicamentosService);

  idMedicamento = signal(0);
  esNuevo = computed(() => this.idMedicamento() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  // La categoría no se edita aquí (no hay catálogo aún): se conserva la original.
  private idCategoria: number | null = null;

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    principioActivo: [''],
    presentacion: [''],
    concentracion: [''],
    requiereReceta: [false],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.medicamentosService.obtenerPorId(Number(idParam)).subscribe({
        next: (m) => this.cargar(m),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(m: Medicamento): void {
    this.idMedicamento.set(m.idMedicamento);
    this.idCategoria = m.idCategoriaMedicamento;
    this.form.patchValue({
      nombre: m.nombre,
      principioActivo: m.principioActivo ?? '',
      presentacion: m.presentacion ?? '',
      concentracion: m.concentracion ?? '',
      requiereReceta: m.requiereReceta,
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: MedicamentoInput = {
      nombre: v.nombre.trim(),
      principioActivo: v.principioActivo.trim() || null,
      presentacion: v.presentacion.trim() || null,
      concentracion: v.concentracion.trim() || null,
      idCategoriaMedicamento: this.idCategoria,
      requiereReceta: v.requiereReceta,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNuevo()
      ? this.medicamentosService.crear(input)
      : this.medicamentosService.actualizar(this.idMedicamento(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/farmacia/medicamentos']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
