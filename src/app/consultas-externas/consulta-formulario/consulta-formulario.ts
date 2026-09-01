import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import { ConsultaExterna, ConsultasExternasService } from '../consultas-externas.service';
import { ESTADOS_CITA, MEDICOS, TIPOS_CONSULTA } from '../consultas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

function toIsoDate(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

@Component({
  selector: 'app-consulta-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './consulta-formulario.html',
  styleUrl: './consulta-formulario.css',
})
export class ConsultaFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private consultasService = inject(ConsultasExternasService);
  private pacientesService = inject(PacientesService);

  pacientes = this.pacientesService.listar;
  medicos = MEDICOS;
  tiposConsulta = TIPOS_CONSULTA;
  estadosCita = ESTADOS_CITA;

  idCita = signal(0);
  esNueva = computed(() => this.idCita() === 0);

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedico: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.control<Date | null>(null, Validators.required),
    hora: ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    idTipoConsulta: this.fb.control<number | null>(null, Validators.required),
    idEstadoCita: [1, Validators.required],
    motivoConsulta: [''],
    notas: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      const id = Number(idParam);
      const registro = this.consultasService.obtener(id);
      if (registro) {
        this.cargar(registro);
      }
    } else {
      const idPacienteParam = this.route.snapshot.queryParamMap.get('paciente');
      if (idPacienteParam) {
        this.form.patchValue({ idPaciente: Number(idPacienteParam) });
      }
    }
  }

  private cargar(registro: ConsultaExterna): void {
    this.idCita.set(registro.idCita);
    const fechaHora = new Date(registro.fechaHoraInicio);
    this.form.patchValue({
      idPaciente: registro.idPaciente,
      idMedico: registro.idMedico,
      fecha: parseIsoDateLocal(toIsoDate(fechaHora)!),
      hora: `${String(fechaHora.getHours()).padStart(2, '0')}:${String(fechaHora.getMinutes()).padStart(2, '0')}`,
      idTipoConsulta: registro.idTipoConsulta,
      idEstadoCita: registro.idEstadoCita,
      motivoConsulta: registro.motivoConsulta ?? '',
      notas: registro.notas ?? '',
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    const [horas, minutos] = v.hora.split(':').map(Number);
    const fechaHoraInicio = new Date(v.fecha!);
    fechaHoraInicio.setHours(horas, minutos, 0, 0);

    const idCita = this.idCita();
    const registro: ConsultaExterna = {
      idCita,
      idPaciente: v.idPaciente!,
      idMedico: v.idMedico,
      fechaHoraInicio: fechaHoraInicio.toISOString(),
      idEstadoCita: v.idEstadoCita,
      idTipoConsulta: v.idTipoConsulta,
      motivoConsulta: v.motivoConsulta || null,
      notas: v.notas || null,
      activo: true,
      fechaCreacion: this.esNueva()
        ? new Date().toISOString()
        : (this.consultasService.obtener(idCita)?.fechaCreacion ?? new Date().toISOString()),
      fechaModificacion: this.esNueva() ? null : new Date().toISOString(),
    };

    this.consultasService.guardar(registro);
    this.router.navigate(['/home/consultas']);
  }
}
