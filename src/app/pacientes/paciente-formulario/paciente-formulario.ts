import { Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import { PacienteCompleto, PacientesService } from '../pacientes.service';
import {
  ESTADOS_CIVILES,
  ESTADOS_PACIENTE,
  GENEROS,
  NIVELES_CONFIDENCIALIDAD,
  PARENTESCOS,
  SEVERIDADES,
  TIPOS_ALERGIA,
  TIPOS_ANTECEDENTE,
  TIPOS_DOCUMENTO,
  TIPOS_SANGRE,
} from '../pacientes-catalogos';

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

// `new Date('YYYY-MM-DD')` parsea la fecha como medianoche UTC (regla del
// estándar ECMA-262 para fechas sin hora), lo que la corre un día hacia
// atrás en cualquier huso horario negativo (ej. Guatemala, UTC-6). Este
// helper construye la fecha en hora LOCAL para que el datepicker la
// muestre igual a como se guardó.
function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

@Component({
  selector: 'app-paciente-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './paciente-formulario.html',
  styleUrl: './paciente-formulario.css',
})
export class PacienteFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pacientesService = inject(PacientesService);

  generos = GENEROS;
  tiposDocumento = TIPOS_DOCUMENTO;
  estadosCiviles = ESTADOS_CIVILES;
  tiposSangre = TIPOS_SANGRE;
  nivelesConfidencialidad = NIVELES_CONFIDENCIALIDAD;
  estadosPaciente = ESTADOS_PACIENTE;
  parentescos = PARENTESCOS;
  tiposAlergia = TIPOS_ALERGIA;
  severidades = SEVERIDADES;
  tiposAntecedente = TIPOS_ANTECEDENTE;

  idPaciente = signal(0);
  esNuevo = computed(() => this.idPaciente() === 0);

  datosGenerales = this.fb.nonNullable.group({
    codigoExpediente: [{ value: '', disabled: true }],
    primerNombre: ['', Validators.required],
    segundoNombre: [''],
    primerApellido: ['', Validators.required],
    segundoApellido: [''],
    fechaNacimiento: this.fb.control<Date | null>(null, Validators.required),
    idGenero: this.fb.control<number | null>(null),
    idTipoDocumento: this.fb.control<number | null>(null),
    numeroDocumento: [''],
    idEstadoCivil: this.fb.control<number | null>(null),
    idTipoSangre: this.fb.control<number | null>(null),
    idNivelConfidencialidad: this.fb.control<number | null>(1),
    idEstadoPaciente: [1, Validators.required],
  });

  contacto = this.fb.nonNullable.group({
    telefonoPrincipal: [''],
    telefonoSecundario: [''],
    correo: ['', Validators.email],
    direccion: [''],
  });

  contactosEmergencia = this.fb.array<ReturnType<typeof this.crearContactoGroup>>([]);
  alergias = this.fb.array<ReturnType<typeof this.crearAlergiaGroup>>([]);
  antecedentes = this.fb.array<ReturnType<typeof this.crearAntecedenteGroup>>([]);

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      const id = Number(idParam);
      const registro = this.pacientesService.obtener(id);
      if (registro) {
        this.cargar(registro);
      }
    } else {
      this.datosGenerales.patchValue({
        codigoExpediente: 'Se genera automáticamente al guardar',
      });
    }
  }

  private crearContactoGroup(c?: PacienteCompleto['contactos'][number]) {
    return this.fb.nonNullable.group({
      id: c?.idContactoEmergencia ?? this.pacientesService.generarIdTemporal(),
      nombreCompleto: [c?.nombreCompleto ?? '', Validators.required],
      idParentesco: this.fb.control<number | null>(c?.idParentesco ?? null),
      telefono: [c?.telefono ?? '', Validators.required],
      direccion: [c?.direccion ?? ''],
    });
  }

  private crearAlergiaGroup(a?: PacienteCompleto['alergias'][number]) {
    return this.fb.nonNullable.group({
      id: a?.idAlergia ?? this.pacientesService.generarIdTemporal(),
      idTipoAlergia: this.fb.control<number | null>(a?.idTipoAlergia ?? null, Validators.required),
      descripcion: [a?.descripcion ?? '', Validators.required],
      idSeveridad: this.fb.control<number | null>(a?.idSeveridad ?? null, Validators.required),
      fechaDiagnostico: this.fb.control<Date | null>(
        a?.fechaDiagnostico ? parseIsoDateLocal(a.fechaDiagnostico) : null,
      ),
    });
  }

  private crearAntecedenteGroup(a?: PacienteCompleto['antecedentes'][number]) {
    return this.fb.nonNullable.group({
      id: a?.idAntecedente ?? this.pacientesService.generarIdTemporal(),
      idTipoAntecedente: this.fb.control<number | null>(a?.idTipoAntecedente ?? null, Validators.required),
      descripcion: [a?.descripcion ?? '', Validators.required],
      fechaRegistro: this.fb.control<Date | null>(
        a?.fechaRegistro ? parseIsoDateLocal(a.fechaRegistro) : new Date(),
      ),
    });
  }

  agregarContacto(): void {
    this.contactosEmergencia.push(this.crearContactoGroup());
  }

  quitarContacto(index: number): void {
    this.contactosEmergencia.removeAt(index);
  }

  agregarAlergia(): void {
    this.alergias.push(this.crearAlergiaGroup());
  }

  quitarAlergia(index: number): void {
    this.alergias.removeAt(index);
  }

  agregarAntecedente(): void {
    this.antecedentes.push(this.crearAntecedenteGroup());
  }

  quitarAntecedente(index: number): void {
    this.antecedentes.removeAt(index);
  }

  severidadLabel(idSeveridad: number | null): string {
    return this.severidades.find((s) => s.id === idSeveridad)?.label ?? '';
  }

  severidadClase(idSeveridad: number | null): string {
    if (idSeveridad === 3) return 'severidad-alta';
    if (idSeveridad === 2) return 'severidad-media';
    if (idSeveridad === 1) return 'severidad-baja';
    return '';
  }

  edad(): number | null {
    const fecha = this.datosGenerales.controls.fechaNacimiento.value;
    if (!fecha) {
      return null;
    }
    return this.pacientesService.calcularEdad(toIsoDate(fecha)!);
  }

  private cargar(registro: PacienteCompleto): void {
    this.idPaciente.set(registro.paciente.idPaciente);
    const p = registro.paciente;
    this.datosGenerales.patchValue({
      codigoExpediente: p.codigoExpediente,
      primerNombre: p.primerNombre,
      segundoNombre: p.segundoNombre ?? '',
      primerApellido: p.primerApellido,
      segundoApellido: p.segundoApellido ?? '',
      fechaNacimiento: p.fechaNacimiento ? parseIsoDateLocal(p.fechaNacimiento) : null,
      idGenero: p.idGenero,
      idTipoDocumento: p.idTipoDocumento,
      numeroDocumento: p.numeroDocumento ?? '',
      idEstadoCivil: p.idEstadoCivil,
      idTipoSangre: p.idTipoSangre,
      idNivelConfidencialidad: p.idNivelConfidencialidad,
      idEstadoPaciente: p.idEstadoPaciente,
    });
    this.contacto.patchValue({
      telefonoPrincipal: p.telefonoPrincipal ?? '',
      telefonoSecundario: p.telefonoSecundario ?? '',
      correo: p.correo ?? '',
      direccion: p.direccion ?? '',
    });
    registro.contactos.forEach((c) => this.contactosEmergencia.push(this.crearContactoGroup(c)));
    registro.alergias.forEach((a) => this.alergias.push(this.crearAlergiaGroup(a)));
    registro.antecedentes.forEach((a) => this.antecedentes.push(this.crearAntecedenteGroup(a)));
  }

  guardar(): void {
    this.datosGenerales.markAllAsTouched();
    this.contacto.markAllAsTouched();
    this.contactosEmergencia.markAllAsTouched();
    this.alergias.markAllAsTouched();
    this.antecedentes.markAllAsTouched();

    if (
      this.datosGenerales.invalid ||
      this.contacto.invalid ||
      this.contactosEmergencia.invalid ||
      this.alergias.invalid ||
      this.antecedentes.invalid
    ) {
      return;
    }

    const dg = this.datosGenerales.getRawValue();
    const ct = this.contacto.getRawValue();
    const idPaciente = this.idPaciente();

    const registro: PacienteCompleto = {
      paciente: {
        idPaciente,
        codigoExpediente: this.esNuevo() ? '' : dg.codigoExpediente,
        primerNombre: dg.primerNombre,
        segundoNombre: dg.segundoNombre || null,
        primerApellido: dg.primerApellido,
        segundoApellido: dg.segundoApellido || null,
        fechaNacimiento: toIsoDate(dg.fechaNacimiento)!,
        idGenero: dg.idGenero,
        idTipoDocumento: dg.idTipoDocumento,
        numeroDocumento: dg.numeroDocumento || null,
        idEstadoCivil: dg.idEstadoCivil,
        telefonoPrincipal: ct.telefonoPrincipal || null,
        telefonoSecundario: ct.telefonoSecundario || null,
        correo: ct.correo || null,
        direccion: ct.direccion || null,
        idTipoSangre: dg.idTipoSangre,
        idNivelConfidencialidad: dg.idNivelConfidencialidad,
        idEstadoPaciente: dg.idEstadoPaciente,
        activo: true,
        fechaCreacion: this.esNuevo() ? new Date().toISOString() : (this.pacientesService.obtener(idPaciente)?.paciente.fechaCreacion ?? new Date().toISOString()),
        fechaModificacion: this.esNuevo() ? null : new Date().toISOString(),
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      contactos: this.contactosEmergencia.getRawValue().map((c) => ({
        idContactoEmergencia: c.id,
        idPaciente,
        nombreCompleto: c.nombreCompleto,
        idParentesco: c.idParentesco,
        telefono: c.telefono,
        direccion: c.direccion || null,
        activo: true,
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      })),
      alergias: this.alergias.getRawValue().map((a) => ({
        idAlergia: a.id,
        idPaciente,
        idTipoAlergia: a.idTipoAlergia!,
        descripcion: a.descripcion,
        idSeveridad: a.idSeveridad!,
        fechaDiagnostico: toIsoDate(a.fechaDiagnostico),
        activo: true,
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      })),
      antecedentes: this.antecedentes.getRawValue().map((a) => ({
        idAntecedente: a.id,
        idPaciente,
        idTipoAntecedente: a.idTipoAntecedente!,
        descripcion: a.descripcion,
        fechaRegistro: toIsoDate(a.fechaRegistro) ?? toIsoDate(new Date())!,
        activo: true,
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      })),
    };

    const id = this.pacientesService.guardar(registro);
    this.router.navigate(['/home/pacientes', id]);
  }
}
