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
import { PolizaSeguro } from '../../models';
import { PolizasService } from '../polizas.service';
import { ASEGURADORAS, ESTADOS_POLIZA, RAMOS_SEGURO, TITULARIDADES } from '../polizas-catalogos';
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
  selector: 'app-poliza-formulario',
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
  templateUrl: './poliza-formulario.html',
  styleUrl: './poliza-formulario.css',
})
export class PolizaFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private polizasService = inject(PolizasService);
  private pacientesService = inject(PacientesService);

  pacientes = this.pacientesService.listar;
  aseguradoras = ASEGURADORAS;
  ramos = RAMOS_SEGURO;
  titularidades = TITULARIDADES;
  estadosPoliza = ESTADOS_POLIZA;

  idPoliza = signal(0);
  esNueva = computed(() => this.idPoliza() === 0);

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idAseguradora: this.fb.control<number | null>(null, Validators.required),
    idRamo: this.fb.control<number | null>(null, Validators.required),
    numeroPoliza: ['', Validators.required],
    numeroCertificado: [''],
    idTitularidad: this.fb.control<number | null>(1, Validators.required),
    nombreTitular: [''],
    codigoAutorizacion: [''],
    porcentajeCopago: this.fb.control<number | null>(null),
    montoCopago: this.fb.control<number | null>(null),
    fechaInicioVigencia: this.fb.control<Date | null>(null),
    fechaFinVigencia: this.fb.control<Date | null>(null),
    idEstadoPoliza: [1, Validators.required],
    observaciones: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      const id = Number(idParam);
      const registro = this.polizasService.obtener(id);
      if (registro) {
        this.cargar(registro);
      }
    }
  }

  private cargar(registro: PolizaSeguro): void {
    this.idPoliza.set(registro.idPoliza);
    this.form.patchValue({
      idPaciente: registro.idPaciente,
      idAseguradora: registro.idAseguradora,
      idRamo: registro.idRamo,
      numeroPoliza: registro.numeroPoliza,
      numeroCertificado: registro.numeroCertificado ?? '',
      idTitularidad: registro.idTitularidad,
      nombreTitular: registro.nombreTitular ?? '',
      codigoAutorizacion: registro.codigoAutorizacion ?? '',
      porcentajeCopago: registro.porcentajeCopago,
      montoCopago: registro.montoCopago,
      fechaInicioVigencia: registro.fechaInicioVigencia ? parseIsoDateLocal(registro.fechaInicioVigencia) : null,
      fechaFinVigencia: registro.fechaFinVigencia ? parseIsoDateLocal(registro.fechaFinVigencia) : null,
      idEstadoPoliza: registro.idEstadoPoliza,
      observaciones: registro.observaciones ?? '',
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    const idPoliza = this.idPoliza();

    const registro: PolizaSeguro = {
      idPoliza,
      idPaciente: v.idPaciente!,
      idAseguradora: v.idAseguradora!,
      idConvenio: null,
      idRamo: v.idRamo!,
      numeroPoliza: v.numeroPoliza,
      numeroCertificado: v.numeroCertificado || null,
      idTitularidad: v.idTitularidad!,
      nombreTitular: v.nombreTitular || null,
      nombrePropietario: null,
      codigoAutorizacion: v.codigoAutorizacion || null,
      porcentajeCopago: v.porcentajeCopago,
      montoCopago: v.montoCopago,
      fechaInicioVigencia: toIsoDate(v.fechaInicioVigencia),
      fechaFinVigencia: toIsoDate(v.fechaFinVigencia),
      idEstadoPoliza: v.idEstadoPoliza,
      observaciones: v.observaciones || null,
      activo: true,
      fechaCreacion: this.esNueva()
        ? new Date().toISOString()
        : (this.polizasService.obtener(idPoliza)?.fechaCreacion ?? new Date().toISOString()),
      fechaModificacion: this.esNueva() ? null : new Date().toISOString(),
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    };

    this.polizasService.guardar(registro);
    this.router.navigate(['/home/polizas']);
  }
}
