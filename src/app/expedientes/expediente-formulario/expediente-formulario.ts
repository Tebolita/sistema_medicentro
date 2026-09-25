import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import { HistorialClinico } from '../../models';
import { ExpedientesService } from '../expedientes.service';
import { NIVELES_CONFIDENCIALIDAD, TIPOS_REGISTRO_CLINICO } from '../expedientes-catalogos';
import { MEDICOS, TIPOS_CONSULTA } from '../../consultas-externas/consultas-catalogos';
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

// Ids de TIPOS_REGISTRO_CLINICO (ver expedientes-catalogos.ts). El esquema
// no tiene columnas propias para pediatría/signos vitales/tipo de consulta,
// así que esos datos extra viajan dentro de `notas` (con un prefijo) en vez
// de inventar columnas que no existen todavía en la BD real.
const TIPO_PEDIATRICA = 1;
const TIPO_EXTERNA = 2;
const TIPO_SIGNOS_VITALES = 4;

@Component({
  selector: 'app-expediente-formulario',
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
  templateUrl: './expediente-formulario.html',
  styleUrl: './expediente-formulario.css',
})
export class ExpedienteFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private expedientesService = inject(ExpedientesService);
  private pacientesService = inject(PacientesService);

  pacientes = this.pacientesService.directorio;
  medicos = MEDICOS;
  tiposRegistro = TIPOS_REGISTRO_CLINICO;
  nivelesConfidencialidad = NIVELES_CONFIDENCIALIDAD;
  tiposConsulta = TIPOS_CONSULTA;

  idHistorial = signal(0);
  esNuevo = computed(() => this.idHistorial() === 0);

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedico: this.fb.control<number | null>(null, Validators.required),
    idTipoRegistro: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.control<Date | null>(new Date(), Validators.required),
    idNivelConfidencialidad: this.fb.control<number | null>(1),
    motivoConsulta: [''],
    diagnostico: [''],
    notas: [''],
    // Campos que solo aplican según el tipo de ficha (pediátrica/externa);
    // se guardan dentro de `notas`, ver comentario junto a TIPO_PEDIATRICA.
    acompanante: [''],
    idTipoConsultaExterna: this.fb.control<number | null>(null),
  });

  // FormControl.value no es una signal: se refleja el tipo seleccionado acá
  // para poder reaccionar (mostrar/ocultar campos) cuando el usuario lo cambia.
  private tipoSeleccionado = signal<number | null>(this.form.controls.idTipoRegistro.value);

  esPediatrica = computed(() => this.tipoSeleccionado() === TIPO_PEDIATRICA);
  esExterna = computed(() => this.tipoSeleccionado() === TIPO_EXTERNA);
  mostrarHintSignosVitales = computed(() => this.tipoSeleccionado() === TIPO_SIGNOS_VITALES);

  tituloFicha = computed(() => {
    const tipo = this.tipoSeleccionado();
    if (tipo === TIPO_PEDIATRICA) return 'pediátrica';
    if (tipo === TIPO_EXTERNA) return 'externa';
    return null;
  });

  constructor() {
    this.form.controls.idTipoRegistro.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((tipo) => this.tipoSeleccionado.set(tipo));

    // La ruta "expedientes/nuevo" no tiene :id, así que nunca cambia entre
    // navegaciones dentro de la misma instancia — es seguro leerlo una sola
    // vez acá para decidir el modo (nuevo vs editar).
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      const id = Number(idParam);
      const registro = this.expedientesService.obtener(id);
      if (registro) {
        this.cargar(registro);
      }
      return;
    }

    // En cambio, los queryParams sí pueden cambiar sin recrear el componente
    // (p.ej. al ir de "Ficha pediátrica" a "Ficha externa" desde el menú,
    // ambas apuntan a la misma ruta "expedientes/nuevo"), así que hay que
    // suscribirse en vez de solo leer el snapshot.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const tipoParam = params.get('tipo');
      this.form.patchValue({ idTipoRegistro: tipoParam ? Number(tipoParam) : null });

      const idPacienteParam = params.get('paciente');
      if (idPacienteParam) {
        this.form.patchValue({ idPaciente: Number(idPacienteParam) });
      }
    });
  }

  private cargar(registro: HistorialClinico): void {
    this.idHistorial.set(registro.idHistorial);
    this.form.patchValue({
      idPaciente: registro.idPaciente,
      idMedico: registro.idMedico,
      idTipoRegistro: registro.idTipoRegistro,
      fecha: parseIsoDateLocal(registro.fecha),
      idNivelConfidencialidad: registro.idNivelConfidencialidad,
      motivoConsulta: registro.motivoConsulta ?? '',
      diagnostico: registro.diagnostico ?? '',
      notas: registro.notas ?? '',
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    const idHistorial = this.idHistorial();

    // El esquema no tiene columnas propias para acompañante/tipo de consulta,
    // así que se anteponen a `notas` como un prefijo legible.
    const prefijos: string[] = [];
    if (this.esPediatrica() && v.acompanante) {
      prefijos.push(`Acompañante: ${v.acompanante}.`);
    }
    if (this.esExterna() && v.idTipoConsultaExterna) {
      const tipoConsultaLabel = this.tiposConsulta.find((t) => t.id === v.idTipoConsultaExterna)?.label;
      if (tipoConsultaLabel) {
        prefijos.push(`${tipoConsultaLabel}.`);
      }
    }
    const notas = [...prefijos, v.notas].filter(Boolean).join(' ') || null;

    const registro: HistorialClinico = {
      idHistorial,
      idPaciente: v.idPaciente!,
      idMedico: v.idMedico!,
      idCita: null,
      idTratamiento: null,
      idTipoRegistro: v.idTipoRegistro!,
      idNivelConfidencialidad: v.idNivelConfidencialidad,
      fecha: toIsoDate(v.fecha)!,
      motivoConsulta: v.motivoConsulta || null,
      diagnostico: v.diagnostico || null,
      notas,
      activo: true,
      fechaCreacion: this.esNuevo()
        ? new Date().toISOString()
        : (this.expedientesService.obtener(idHistorial)?.fechaCreacion ?? new Date().toISOString()),
      fechaModificacion: this.esNuevo() ? null : new Date().toISOString(),
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    };

    this.expedientesService.guardar(registro);
    this.router.navigate(['/home/expedientes']);
  }
}
