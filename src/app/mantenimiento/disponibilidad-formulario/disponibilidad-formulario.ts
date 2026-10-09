import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  DIAS_SEMANA,
  Disponibilidad,
  DisponibilidadInput,
  DisponibilidadesService,
} from '../../service/disponibilidades.service';
import { MedicosService } from '../../service/medicos.service';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';

@Component({
  selector: 'app-disponibilidad-formulario',
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
  templateUrl: './disponibilidad-formulario.html',
  styleUrl: './disponibilidad-formulario.css',
})
export class DisponibilidadFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private disponibilidadesService = inject(DisponibilidadesService);
  private medicosService = inject(MedicosService);

  medicos = this.medicosService.listar;
  dias = DIAS_SEMANA;

  idDisponibilidad = signal(0);
  esNueva = computed(() => this.idDisponibilidad() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Disponibilidad | null>(null);

  form = this.fb.nonNullable.group({
    idMedico: this.fb.control<number | null>(null, Validators.required),
    idDiaSemana: this.fb.control<number | null>(null, Validators.required),
    horaInicio: ['', Validators.required], // input type="time" (HH:mm)
    horaFin: ['', Validators.required],
  });

  constructor() {
    afterNextRender(() => this.medicosService.cargar());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.disponibilidadesService.obtenerPorId(Number(idParam)).subscribe({
        next: (d) => this.cargar(d),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(d: Disponibilidad): void {
    this.idDisponibilidad.set(d.idDisponibilidad);
    this.registro.set(d);
    this.form.patchValue({
      idMedico: d.idMedico,
      idDiaSemana: d.idDiaSemana,
      horaInicio: d.horaInicio.slice(0, 5),
      horaFin: d.horaFin.slice(0, 5),
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    if (v.horaFin <= v.horaInicio) {
      this.errorMsg.set('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }
    const input: DisponibilidadInput = {
      idMedico: v.idMedico!,
      idDiaSemana: v.idDiaSemana!,
      horaInicio: `${v.horaInicio}:00`,
      horaFin: `${v.horaFin}:00`,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNueva()
      ? this.disponibilidadesService.crear(input)
      : this.disponibilidadesService.actualizar(this.idDisponibilidad(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/disponibilidad-medicos']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
