import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  TipoConsentimiento,
  TipoConsentimientoInput,
  TiposConsentimientoService,
} from '../../service/tipos-consentimiento.service';

@Component({
  selector: 'app-tipo-consentimiento-formulario',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './tipo-consentimiento-formulario.html',
  styleUrl: './tipo-consentimiento-formulario.css',
})
export class TipoConsentimientoFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tiposService = inject(TiposConsentimientoService);

  idTipoConsentimiento = signal(0);
  esNuevo = computed(() => this.idTipoConsentimiento() === 0);
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_]+$/)]],
    nombre: ['', Validators.required],
    plantillaTexto: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.tiposService.obtenerPorId(Number(idParam)).subscribe({
        next: (t) => this.cargar(t),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(t: TipoConsentimiento): void {
    this.idTipoConsentimiento.set(t.idTipoConsentimiento);
    this.form.patchValue({
      codigo: t.codigo,
      nombre: t.nombre,
      plantillaTexto: t.plantillaTexto ?? '',
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: TipoConsentimientoInput = {
      codigo: v.codigo.trim().toUpperCase(),
      nombre: v.nombre.trim(),
      plantillaTexto: v.plantillaTexto.trim() || null,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNuevo()
      ? this.tiposService.crear(input)
      : this.tiposService.actualizar(this.idTipoConsentimiento(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/tipos-consentimiento']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
