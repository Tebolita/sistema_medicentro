import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Interaccion, InteraccionInput, InteraccionesService } from '../../service/interacciones.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { CatalogosService } from '../../service/catalogos.service';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';

// Mismos códigos/ids de ejemplo que ya usa Pacientes para 'SEVERIDAD'
// (pacientes-catalogos.ts) — de respaldo mientras ese catálogo no haya
// corrido todavía contra la base (ya se agregó a sembrar_catalogos.sql).
const SEVERIDADES_EJEMPLO = [
  { id: 1, label: 'Leve' },
  { id: 2, label: 'Moderada' },
  { id: 3, label: 'Severa' },
];

@Component({
  selector: 'app-interaccion-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    AuditoriaInfo,
  ],
  templateUrl: './interaccion-formulario.html',
  styleUrl: './interaccion-formulario.css',
})
export class InteraccionFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private interaccionesService = inject(InteraccionesService);
  private medicamentosService = inject(MedicamentosService);

  medicamentos = this.medicamentosService.listar;

  private catalogos = inject(CatalogosService);
  private severidadApi = this.catalogos.obtener('SEVERIDAD');
  severidades = computed(() => {
    const api = this.severidadApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : SEVERIDADES_EJEMPLO;
  });

  idInteraccion = signal(0);
  esNueva = computed(() => this.idInteraccion() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Interaccion | null>(null);

  form = this.fb.nonNullable.group({
    idMedicamento1: this.fb.control<number | null>(null, Validators.required),
    idMedicamento2: this.fb.control<number | null>(null, Validators.required),
    idNivelSeveridad: this.fb.control<number | null>(null, Validators.required),
    descripcion: ['', Validators.required],
  });

  constructor() {
    afterNextRender(() => this.medicamentosService.cargar());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.interaccionesService.obtenerPorId(Number(idParam)).subscribe({
        next: (i) => this.cargar(i),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(i: Interaccion): void {
    this.idInteraccion.set(i.idInteraccion);
    this.registro.set(i);
    this.form.patchValue({
      idMedicamento1: i.idMedicamento1,
      idMedicamento2: i.idMedicamento2,
      idNivelSeveridad: i.idNivelSeveridad,
      descripcion: i.descripcion,
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    if (v.idMedicamento1 === v.idMedicamento2) {
      this.errorMsg.set('Un medicamento no puede interactuar consigo mismo.');
      return;
    }
    const input: InteraccionInput = {
      idMedicamento1: v.idMedicamento1!,
      idMedicamento2: v.idMedicamento2!,
      idNivelSeveridad: v.idNivelSeveridad!,
      descripcion: v.descripcion.trim(),
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNueva()
      ? this.interaccionesService.crear(input)
      : this.interaccionesService.actualizar(this.idInteraccion(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/interacciones']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
