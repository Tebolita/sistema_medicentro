import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  CasoEmergencia,
  CasosEmergenciaService,
  MedicoOpcion,
  OpcionCatalogo,
} from '../casos-emergencia.service';
import { PacientesService } from '../../pacientes/pacientes.service';

const PACIENTE_NO_REGISTRADO = 0;

/**
 * Devuelve la fecha+hora LOCAL en formato "2026-10-06T18:21:17" (SIN la Z).
 * El backend lo interpreta como hora local y lo guarda correctamente.
 * NO usar toISOString() porque devuelve UTC y desfasa 6 horas en Guatemala.
 */
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
  pacienteNoRegistrado = PACIENTE_NO_REGISTRADO;

  // Signals para los dropdowns que vienen del backend
  medicosSignal = signal<MedicoOpcion[]>([]);
  nivelesTriageSignal = signal<OpcionCatalogo[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);

  idCaso = signal(0);
  esNuevo = computed(() => this.idCaso() === 0);

  guardando = signal(false);
  errorGuardar = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    nombrePaciente: [''],
    idMedico: this.fb.control<number | null>(null),
    idNivelTriage: this.fb.control<number | null>(null, Validators.required),
    idEstadoCaso: this.fb.control<number | null>(null, Validators.required),
    motivo: ['', Validators.required],
  });

  private idPacienteSeleccionado = signal<number | null>(null);
  esWalkIn = computed(() => this.idPacienteSeleccionado() === PACIENTE_NO_REGISTRADO);

  constructor() {
    // 1) Cargar médicos del backend
    this.casosService.RetornarMedicos().subscribe({
      next: (m) => {
        console.log('✅ [CasoFormulario] Médicos cargados:', m.length);
        this.medicosSignal.set(m);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasoFormulario] Error médicos:', err.status),
    });

    // 2) Cargar niveles de triaje del backend
    this.casosService.RetornarNivelesTriage().subscribe({
      next: (n) => {
        console.log('✅ [CasoFormulario] Niveles cargados:', n.length);
        this.nivelesTriageSignal.set(n);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasoFormulario] Error niveles:', err.status),
    });

    // 3) Cargar estados del backend + auto-seleccionar "Esperando"
    this.casosService.RetornarEstadosCaso().subscribe({
      next: (e) => {
        console.log('✅ [CasoFormulario] Estados cargados:', e.length);
        this.estadosSignal.set(e);
        if (this.esNuevo() && e.length > 0 && !this.form.controls.idEstadoCaso.value) {
          const esperando =
            e.find((x) => x.label.toLowerCase().includes('esper')) ?? e[0];
          this.form.patchValue({ idEstadoCaso: esperando.id });
        }
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasoFormulario] Error estados:', err.status),
    });

    // Sincronizar si el usuario selecciona "no registrado"
    this.form.controls.idPaciente.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.idPacienteSeleccionado.set(id));

    // Cargar si es edición
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      const id = Number(idParam);
      const registro = this.casosService.obtener(id);
      if (registro) {
        this.cargar(registro);
      } else {
        this.casosService.obtenerDesdeApi(id).subscribe({
          next: (reg) => this.cargar(reg),
          error: (err: HttpErrorResponse) =>
            console.error('No se pudo cargar el caso', err),
        });
      }
    }
  }

  private cargar(registro: CasoEmergencia): void {
    this.idCaso.set(registro.idCaso);
    this.form.patchValue({
      idPaciente: registro.idPaciente ?? PACIENTE_NO_REGISTRADO,
      nombrePaciente: registro.nombrePaciente ?? '',
      idMedico: registro.idMedico,
      idNivelTriage: registro.idNivelTriage,
      idEstadoCaso: registro.idEstadoCaso,
      motivo: registro.motivo,
    });
    this.idPacienteSeleccionado.set(registro.idPaciente ?? PACIENTE_NO_REGISTRADO);
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
      idEstadoCaso: v.idEstadoCaso!,
      motivo: v.motivo,
      // ✅ CAMBIO: usa fechaHoraLocal() en lugar de toISOString()
      horaLlegada: this.esNuevo()
        ? fechaHoraLocal()
        : (this.casosService.obtener(idCaso)?.horaLlegada ?? fechaHoraLocal()),
      activo: true,
      fechaCreacion: this.esNuevo()
        ? fechaHoraLocal()
        : (this.casosService.obtener(idCaso)?.fechaCreacion ?? fechaHoraLocal()),
      fechaModificacion: this.esNuevo() ? null : fechaHoraLocal(),
    };

    this.guardando.set(true);
    this.errorGuardar.set(null);

    this.casosService.guardar(registro).subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigate(['/home/emergencias']);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorGuardar.set(
          err.status === 401
            ? 'Tu sesión expiró. Cierra sesión y vuelve a iniciarla.'
            : 'No se pudo guardar el caso. Revisa la consola.',
        );
        console.error('Error al guardar caso:', err);
      },
    });
  }
}