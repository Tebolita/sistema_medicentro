import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Cama, HabitacionCompleta, HabitacionInput, HabitacionesService } from '../../service/habitaciones.service';
import { CatalogosService } from '../../service/catalogos.service';
import { TIPOS_HABITACION, ESTADOS_HABITACION, ESTADOS_CAMA } from '../habitaciones-catalogos';

@Component({
  selector: 'app-habitacion-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './habitacion-formulario.html',
  styleUrl: './habitacion-formulario.css',
})
export class HabitacionFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private habitacionesService = inject(HabitacionesService);

  private catalogos = inject(CatalogosService);
  private tiposApi = this.catalogos.obtener('TIPO_HABITACION');
  tipos = computed(() => {
    const api = this.tiposApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_HABITACION;
  });
  private estadosApi = this.catalogos.obtener('ESTADO_HABITACION');
  estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_HABITACION;
  });
  private estadosCamaApi = this.catalogos.obtener('ESTADO_CAMA');
  estadosCama = computed(() => {
    const api = this.estadosCamaApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_CAMA;
  });

  idHabitacion = signal(0);
  esNueva = computed(() => this.idHabitacion() === 0);
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    numero: ['', Validators.required],
    piso: this.fb.control<number | null>(null),
    idTipoHabitacion: this.fb.control<number | null>(null),
    idEstadoHabitacion: this.fb.control<number | null>(null, Validators.required),
  });

  // --- Camas (solo en edición: una habitación nueva todavía no tiene id
  // para colgarles camas) ---
  camas = signal<Cama[]>([]);
  errorCamas = signal('');
  editandoCama = signal<number | null>(null); // null = agregando una nueva, id = editando esa
  mostrandoFormCama = signal(false);
  guardandoCama = signal(false);

  camaForm = this.fb.nonNullable.group({
    numeroCama: ['', Validators.required],
    idEstadoCama: this.fb.control<number | null>(null, Validators.required),
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.habitacionesService.obtenerPorId(Number(idParam)).subscribe({
        next: (r) => this.cargar(r),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(r: HabitacionCompleta): void {
    this.idHabitacion.set(r.habitacion.idHabitacion);
    this.form.patchValue({
      numero: r.habitacion.numero,
      piso: r.habitacion.piso,
      idTipoHabitacion: r.habitacion.idTipoHabitacion,
      idEstadoHabitacion: r.habitacion.idEstadoHabitacion,
    });
    this.camas.set(r.camas.filter((c) => c.activo));
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: HabitacionInput = {
      numero: v.numero.trim(),
      piso: v.piso,
      idTipoHabitacion: v.idTipoHabitacion,
      idEstadoHabitacion: v.idEstadoHabitacion!,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNueva()
      ? this.habitacionesService.crear(input)
      : this.habitacionesService.actualizar(this.idHabitacion(), input);
    peticion.subscribe({
      next: (r) => {
        if (this.esNueva()) {
          // Recién creada: ahora sí tiene id, se queda en esta pantalla
          // (en modo edición) para poder agregarle camas sin salir.
          this.router.navigate(['/home/mantenimiento/habitaciones', r.habitacion.idHabitacion]);
          return;
        }
        this.guardando.set(false);
        this.router.navigate(['/home/mantenimiento/habitaciones']);
      },
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }

  nuevaCama(): void {
    this.editandoCama.set(null);
    this.camaForm.reset({ numeroCama: '', idEstadoCama: null });
    this.errorCamas.set('');
    this.mostrandoFormCama.set(true);
  }

  editarCama(cama: Cama): void {
    this.editandoCama.set(cama.idCama);
    this.camaForm.reset({ numeroCama: cama.numeroCama, idEstadoCama: cama.idEstadoCama });
    this.errorCamas.set('');
    this.mostrandoFormCama.set(true);
  }

  cancelarCama(): void {
    this.mostrandoFormCama.set(false);
  }

  guardarCama(): void {
    this.camaForm.markAllAsTouched();
    if (this.camaForm.invalid) {
      return;
    }
    const v = this.camaForm.getRawValue();
    const input = { numeroCama: v.numeroCama.trim(), idEstadoCama: v.idEstadoCama! };
    const idCama = this.editandoCama();

    this.guardandoCama.set(true);
    this.errorCamas.set('');
    const peticion = idCama
      ? this.habitacionesService.editarCama(this.idHabitacion(), idCama, input)
      : this.habitacionesService.agregarCama(this.idHabitacion(), input);
    peticion.subscribe({
      next: (cama) => {
        this.camas.update((lista) =>
          idCama ? lista.map((c) => (c.idCama === cama.idCama ? cama : c)) : [...lista, cama],
        );
        this.guardandoCama.set(false);
        this.mostrandoFormCama.set(false);
      },
      error: (err: Error) => {
        this.errorCamas.set(err.message);
        this.guardandoCama.set(false);
      },
    });
  }

  eliminarCama(cama: Cama): void {
    if (!confirm(`¿Quitar la cama "${cama.numeroCama}" de esta habitación?`)) {
      return;
    }
    this.errorCamas.set('');
    this.habitacionesService.eliminarCama(this.idHabitacion(), cama.idCama).subscribe({
      next: () => this.camas.update((lista) => lista.filter((c) => c.idCama !== cama.idCama)),
      error: (err: Error) => this.errorCamas.set(err.message),
    });
  }

  estadoCamaLabel(idEstadoCama: number): string {
    return this.estadosCama().find((e) => e.id === idEstadoCama)?.label ?? '—';
  }
}
