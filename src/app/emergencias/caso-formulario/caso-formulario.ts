import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CasoEmergencia, CasosEmergenciaService } from '../casos-emergencia.service';
import { ESTADOS_CASO, NIVELES_TRIAGE } from '../emergencias-catalogos';
import { MEDICOS } from '../../consultas-externas/consultas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

// Valor especial del select de paciente para el caso de un paciente que
// llega sin expediente todavía (walk-in) — no es un id real.
const PACIENTE_NO_REGISTRADO = 0;

@Component({
  selector: 'app-caso-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './caso-formulario.html',
  styleUrl: './caso-formulario.css',
})
export class CasoFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private casosService = inject(CasosEmergenciaService);
  private pacientesService = inject(PacientesService);

  pacientes = this.pacientesService.directorio;
  medicos = MEDICOS;
  nivelesTriage = NIVELES_TRIAGE;
  estadosCaso = ESTADOS_CASO;
  pacienteNoRegistrado = PACIENTE_NO_REGISTRADO;

  idCaso = signal(0);
  esNuevo = computed(() => this.idCaso() === 0);

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    nombrePaciente: [''],
    idMedico: this.fb.control<number | null>(null),
    idNivelTriage: this.fb.control<number | null>(null, Validators.required),
    idEstadoCaso: [1, Validators.required],
    motivo: ['', Validators.required],
  });

  private idPacienteSeleccionado = signal<number | null>(null);
  esWalkIn = computed(() => this.idPacienteSeleccionado() === PACIENTE_NO_REGISTRADO);

  constructor() {
    this.form.controls.idPaciente.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.idPacienteSeleccionado.set(id));

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      const id = Number(idParam);
      const registro = this.casosService.obtener(id);
      if (registro) {
        this.cargar(registro);
      }
    }
  }

  private cargar(registro: CasoEmergencia): void {
    this.idCaso.set(registro.idCaso);
    this.form.patchValue({
      idPaciente: registro.idPaciente ?? PACIENTE_NO_REGISTRADO,
      nombrePaciente: registro.nombrePaciente,
      idMedico: registro.idMedico,
      idNivelTriage: registro.idNivelTriage,
      idEstadoCaso: registro.idEstadoCaso,
      motivo: registro.motivo,
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.esWalkIn() && !this.form.controls.nombrePaciente.value.trim()) {
      this.form.controls.nombrePaciente.setErrors({ required: true });
    }
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    const idCaso = this.idCaso();
    const esWalkIn = v.idPaciente === PACIENTE_NO_REGISTRADO;

    const registro: CasoEmergencia = {
      idCaso,
      idPaciente: esWalkIn ? null : v.idPaciente,
      nombrePaciente: esWalkIn ? v.nombrePaciente : '',
      idMedico: v.idMedico,
      idNivelTriage: v.idNivelTriage!,
      idEstadoCaso: v.idEstadoCaso,
      motivo: v.motivo,
      horaLlegada: this.esNuevo()
        ? new Date().toISOString()
        : (this.casosService.obtener(idCaso)?.horaLlegada ?? new Date().toISOString()),
      activo: true,
      fechaCreacion: this.esNuevo()
        ? new Date().toISOString()
        : (this.casosService.obtener(idCaso)?.fechaCreacion ?? new Date().toISOString()),
      fechaModificacion: this.esNuevo() ? null : new Date().toISOString(),
    };

    this.casosService.guardar(registro);
    this.router.navigate(['/home/emergencias']);
  }
}
