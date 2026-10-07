import { Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import {
  CompromisoPago,
  CompromisosPagoService,
  MedicoOpcion,
  OpcionCatalogo,
} from '../compromisos-pago.service';
import { TIPO_CONSENTIMIENTO_COMPROMISO_PAGO } from '../emergencias-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

/**
 * Toma un Date del datepicker y le añade la HORA ACTUAL.
 * Devuelve algo como "2026-10-06T17:52:30".
 */
function toIsoDateTime(value: Date | string | null): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  const ahora = new Date();
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  const hh = String(ahora.getHours()).padStart(2, '0');
  const mm = String(ahora.getMinutes()).padStart(2, '0');
  const ss = String(ahora.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`;
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

  pacientes = this.pacientesService.directorio;

  medicosSignal = signal<MedicoOpcion[]>([]);
  parentescosSignal = signal<OpcionCatalogo[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);

  idConsentimiento = signal(0);
  esNuevo = computed(() => this.idConsentimiento() === 0);

  guardando = signal(false);
  errorGuardar = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedicoResponsable: this.fb.control<number | null>(null, Validators.required),
    nombreResponsable: ['', Validators.required],
    idParentescoResponsable: this.fb.control<number | null>(null, Validators.required),
    telefonoResponsable: ['', Validators.required],
    fechaFirma: this.fb.control<Date | null>(null),
    idEstadoConsentimiento: this.fb.control<number | null>(null, Validators.required),
  });

  constructor() {
    this.compromisosService.RetornarMedicos().subscribe({
      next: (m) => {
        console.log('✅ [CompromisoFormulario] Médicos cargados:', m.length);
        this.medicosSignal.set(m);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisoFormulario] Error médicos:', err.status),
    });

    this.compromisosService.RetornarParentescos().subscribe({
      next: (p) => {
        console.log('✅ [CompromisoFormulario] Parentescos cargados:', p.length);
        this.parentescosSignal.set(p);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisoFormulario] Error parentescos:', err.status),
    });

    this.compromisosService.RetornarEstadosConsentimiento().subscribe({
      next: (e) => {
        console.log('✅ [CompromisoFormulario] Estados cargados:', e.length);
        this.estadosSignal.set(e);
        if (this.esNuevo() && e.length > 0 && !this.form.controls.idEstadoConsentimiento.value) {
          const pendiente =
            e.find((x) => x.label.toLowerCase().includes('pendiente')) ?? e[0];
          this.form.patchValue({ idEstadoConsentimiento: pendiente.id });
        }
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisoFormulario] Error estados:', err.status),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      const id = Number(idParam);
      const registro = this.compromisosService.obtener(id);
      if (registro) {
        this.cargar(registro);
      } else {
        this.compromisosService.obtenerDesdeApi(id).subscribe({
          next: (reg) => this.cargar(reg),
          error: (err: HttpErrorResponse) =>
            console.error('No se pudo cargar el compromiso', err),
        });
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
      fechaFirma: registro.consentimiento.fechaFirma
        ? parseIsoDateLocal(registro.consentimiento.fechaFirma)
        : null,
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
        // ✅ CAMBIO: hora actual añadida a la fecha del datepicker
        fechaFirma: toIsoDateTime(v.fechaFirma),
        firmaDigitalHash: null,
        firmaDigitalUrl: null,
        idEstadoConsentimiento: v.idEstadoConsentimiento!,
        activo: true,
        fechaCreacion: this.esNuevo()
          ? new Date().toISOString()
          : (this.compromisosService.obtener(idConsentimiento)?.consentimiento.fechaCreacion
              ?? new Date().toISOString()),
        fechaModificacion: this.esNuevo() ? null : new Date().toISOString(),
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      nombreResponsable: v.nombreResponsable,
      idParentescoResponsable: v.idParentescoResponsable!,
      telefonoResponsable: v.telefonoResponsable,
    };

    this.guardando.set(true);
    this.errorGuardar.set(null);

    this.compromisosService.guardar(registro).subscribe({
      next: () => {
        this.guardando.set(false);
        this.router.navigate(['/home/emergencias/compromisos']);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorGuardar.set(
          err.status === 401
            ? 'Tu sesión expiró. Cierra sesión y vuelve a iniciarla.'
            : 'No se pudo guardar el compromiso. Revisa la consola.',
        );
        console.error('Error al guardar compromiso:', err);
      },
    });
  }
}