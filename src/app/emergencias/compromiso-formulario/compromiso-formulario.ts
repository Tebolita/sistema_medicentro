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
import { CompromisoPago, CompromisosPagoService } from '../compromisos-pago.service';
import { ESTADOS_CONSENTIMIENTO, PARENTESCOS, TIPO_CONSENTIMIENTO_COMPROMISO_PAGO } from '../emergencias-catalogos';
import { MEDICOS } from '../../consultas-externas/consultas-catalogos';
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
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

@Component({
  selector: 'app-compromiso-formulario',
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
  templateUrl: './compromiso-formulario.html',
  styleUrl: './compromiso-formulario.css',
})
export class CompromisoFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private compromisosService = inject(CompromisosPagoService);
  private pacientesService = inject(PacientesService);

  pacientes = this.pacientesService.listar;
  medicos = MEDICOS;
  parentescos = PARENTESCOS;
  estadosConsentimiento = ESTADOS_CONSENTIMIENTO;

  idConsentimiento = signal(0);
  esNuevo = computed(() => this.idConsentimiento() === 0);

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedicoResponsable: this.fb.control<number | null>(null, Validators.required),
    nombreResponsable: ['', Validators.required],
    idParentescoResponsable: this.fb.control<number | null>(null, Validators.required),
    telefonoResponsable: ['', Validators.required],
    fechaFirma: this.fb.control<Date | null>(null),
    idEstadoConsentimiento: [1, Validators.required],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      const id = Number(idParam);
      const registro = this.compromisosService.obtener(id);
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

  private cargar(registro: CompromisoPago): void {
    this.idConsentimiento.set(registro.consentimiento.idConsentimiento);
    this.form.patchValue({
      idPaciente: registro.consentimiento.idPaciente,
      idMedicoResponsable: registro.consentimiento.idMedicoResponsable,
      nombreResponsable: registro.nombreResponsable,
      idParentescoResponsable: registro.idParentescoResponsable,
      telefonoResponsable: registro.telefonoResponsable,
      fechaFirma: registro.consentimiento.fechaFirma ? parseIsoDateLocal(registro.consentimiento.fechaFirma) : null,
      idEstadoConsentimiento: registro.consentimiento.idEstadoConsentimiento,
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    const idConsentimiento = this.idConsentimiento();

    const registro: CompromisoPago = {
      consentimiento: {
        idConsentimiento,
        idPaciente: v.idPaciente!,
        idTipoConsentimiento: TIPO_CONSENTIMIENTO_COMPROMISO_PAGO,
        idTratamiento: null,
        idMedicoResponsable: v.idMedicoResponsable!,
        idTestigo: null,
        fechaFirma: toIsoDate(v.fechaFirma),
        firmaDigitalHash: null,
        firmaDigitalUrl: null,
        idEstadoConsentimiento: v.idEstadoConsentimiento,
        activo: true,
        fechaCreacion: this.esNuevo()
          ? new Date().toISOString()
          : (this.compromisosService.obtener(idConsentimiento)?.consentimiento.fechaCreacion ?? new Date().toISOString()),
        fechaModificacion: this.esNuevo() ? null : new Date().toISOString(),
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      nombreResponsable: v.nombreResponsable,
      idParentescoResponsable: v.idParentescoResponsable!,
      telefonoResponsable: v.telefonoResponsable,
    };

    this.compromisosService.guardar(registro);
    this.router.navigate(['/home/emergencias/compromisos']);
  }
}
