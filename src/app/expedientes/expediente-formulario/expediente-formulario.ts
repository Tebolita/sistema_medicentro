import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
import { forkJoin } from 'rxjs';

import { ExpedienteService } from '../../service/expediente.service';
import { PacienteService } from '../../service/paciente.service';
import { EmpleadoService } from '../../service/empleado.service';
import { EspecialidadService } from '../../service/especialidad.service';
import { CatalogoService } from '../../service/catalogo.service';
import { HistorialClinico, HistorialClinicoRequest } from '../../models/tratamiento.model';
import { PacienteListado } from '../../models/paciente.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

// Formas que espera el HTML en cada <mat-option>.
interface OpcionCatalogo {
  id: number;
  label: string;
}
interface OpcionMedico {
  id: number;
  nombre: string;
  especialidad: string;
}

// Fecha + hora LOCAL como 'YYYY-MM-DDTHH:mm:ss' (sin 'Z', para que el
// backend no la corra por la zona horaria).
function toIsoDateTimeLocal(value: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}T${p(value.getHours())}:${p(value.getMinutes())}:${p(value.getSeconds())}`;
}

function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Códigos de TIPO_REGISTRO_CLINICO (los ids reales dependen de cada base).
// El esquema no tiene columnas propias para pediatría/signos vitales/tipo de
// consulta, así que esos datos extra viajan dentro de `notas` (con un prefijo).
const TIPO_PEDIATRICA = 'FICHA_PEDIATRICA';
const TIPO_EXTERNA = 'FICHA_EXTERNA';
const TIPO_SIGNOS_VITALES = 'EVOLUCION';

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
  private expedienteService = inject(ExpedienteService);
  private pacienteService = inject(PacienteService);
  private empleadoService = inject(EmpleadoService);
  private especialidadService = inject(EspecialidadService);
  private catalogoService = inject(CatalogoService);
  private platformId = inject(PLATFORM_ID);

  // ==================== DATOS PARA LOS DROPDOWNS (desde la API) ====================
  pacientes = signal<PacienteListado[]>([]);
  private medicosApi = signal<OpcionMedico[]>([]);
  private catalogos = signal<Record<string, CatalogoOpcion[]>>({});

  private opciones(codigo: string): OpcionCatalogo[] {
    return (this.catalogos()[codigo] ?? []).map((c) => ({ id: c.id, label: c.nombre }));
  }
  private idPorCodigo(catalogo: string, codigo: string | null): number | null {
    if (!codigo) return null;
    return this.catalogos()[catalogo]?.find((c) => c.codigo === codigo)?.id ?? null;
  }
  private codigoPorId(catalogo: string, id: number | null): string | null {
    return this.catalogos()[catalogo]?.find((c) => c.id === id)?.codigo ?? null;
  }

  get medicos() { return this.medicosApi(); }
  get tiposRegistro() { return this.opciones(CODIGOS_CATALOGO.TIPO_REGISTRO_CLINICO); }
  get nivelesConfidencialidad() { return this.opciones(CODIGOS_CATALOGO.NIVEL_CONFIDENCIALIDAD); }
  get tiposConsulta() { return this.opciones(CODIGOS_CATALOGO.TIPO_CONSULTA); }

  idHistorial = signal(0);
  esNuevo = computed(() => this.idHistorial() === 0);
  guardando = signal(false);

  // Datos del registro que el formulario no edita, para no perderlos al guardar.
  private idCita: number | null = null;
  private idTratamiento: number | null = null;
  private horaOriginal: Date | null = null;

  // Tipo pedido desde el menú (?tipo=FICHA_PEDIATRICA), se aplica cuando llegan los catálogos.
  private codigoTipoPendiente: string | null = null;

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedico: this.fb.control<number | null>(null, Validators.required),
    idTipoRegistro: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.control<Date | null>(new Date(), Validators.required),
    idNivelConfidencialidad: this.fb.control<number | null>(null),
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
  private tipoSeleccionado = signal<number | null>(null);
  private codigoTipoSeleccionado = computed(() =>
    this.codigoPorId(CODIGOS_CATALOGO.TIPO_REGISTRO_CLINICO, this.tipoSeleccionado()),
  );

  esPediatrica = computed(() => this.codigoTipoSeleccionado() === TIPO_PEDIATRICA);
  esExterna = computed(() => this.codigoTipoSeleccionado() === TIPO_EXTERNA);
  mostrarHintSignosVitales = computed(() => this.codigoTipoSeleccionado() === TIPO_SIGNOS_VITALES);

  tituloFicha = computed(() => {
    if (this.esPediatrica()) return 'pediátrica';
    if (this.esExterna()) return 'externa';
    return null;
  });

  constructor() {
    this.form.controls.idTipoRegistro.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((tipo) => this.tipoSeleccionado.set(tipo));

    const idParam = this.route.snapshot.paramMap.get('id');
    const esEdicion = !!idParam && idParam !== 'nuevo';

    // Los queryParams pueden cambiar sin recrear el componente (p.ej. de
    // "Ficha pediátrica" a "Ficha externa" desde el menú), por eso se suscribe.
    if (!esEdicion) {
      this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
        this.codigoTipoPendiente = params.get('tipo');
        this.aplicarTipoPendiente();

        const idPacienteParam = params.get('paciente');
        if (idPacienteParam) {
          this.form.patchValue({ idPaciente: Number(idPacienteParam) });
        }
      });
    }

    // En el servidor (SSR) no hay sesión ni token.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cargarListas();

    if (esEdicion) {
      this.expedienteService.RetornarExpediente(Number(idParam)).subscribe({
        next: (resp) => {
          if (resp.datos) {
            this.cargar(resp.datos);
          }
        },
        error: (err: Error) => alert('No se pudo cargar el registro clínico: ' + err.message),
      });
    }
  }

  private aplicarTipoPendiente(): void {
    const id = this.idPorCodigo(CODIGOS_CATALOGO.TIPO_REGISTRO_CLINICO, this.codigoTipoPendiente);
    this.form.patchValue({ idTipoRegistro: id });
    this.tipoSeleccionado.set(id);
  }

  private cargarListas(): void {
    const c = CODIGOS_CATALOGO;
    forkJoin({
      pacientes: this.pacienteService.RetornarPacientes(),
      medicos: this.empleadoService.RetornarMedicos(),
      especialidades: this.especialidadService.RetornarEspecialidades(),
      tipos: this.catalogoService.RetornarCatalogo(c.TIPO_REGISTRO_CLINICO),
      niveles: this.catalogoService.RetornarCatalogo(c.NIVEL_CONFIDENCIALIDAD),
      tiposConsulta: this.catalogoService.RetornarCatalogo(c.TIPO_CONSULTA),
    }).subscribe({
      next: (r) => {
        const especialidades = r.especialidades.datos ?? [];
        this.pacientes.set(r.pacientes.datos ?? []);
        this.medicosApi.set(
          (r.medicos.datos ?? []).map((m) => ({
            id: m.idEmpleado,
            nombre: m.nombreCompleto,
            especialidad: especialidades.find((e) => e.idEspecialidad === m.idEspecialidad)?.nombre ?? 'Sin especialidad',
          })),
        );
        this.catalogos.set({
          [c.TIPO_REGISTRO_CLINICO]: r.tipos.datos ?? [],
          [c.NIVEL_CONFIDENCIALIDAD]: r.niveles.datos ?? [],
          [c.TIPO_CONSULTA]: r.tiposConsulta.datos ?? [],
        });

        if (this.esNuevo()) {
          this.aplicarTipoPendiente();
          if (this.form.controls.idNivelConfidencialidad.value === null) {
            this.form.controls.idNivelConfidencialidad.setValue(this.idPorCodigo(c.NIVEL_CONFIDENCIALIDAD, 'NORMAL'));
          }
        } else {
          // Refresca la detección de pediátrica/externa ya con los catálogos cargados.
          this.tipoSeleccionado.set(this.form.controls.idTipoRegistro.value);
        }
      },
      error: (err: Error) => alert('No se pudieron cargar las listas del formulario: ' + err.message),
    });
  }

  private cargar(registro: HistorialClinico): void {
    this.idHistorial.set(registro.idHistorial);
    this.idCita = registro.idCita;
    this.idTratamiento = registro.idTratamiento;
    this.horaOriginal = new Date(registro.fecha);
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
    this.tipoSeleccionado.set(registro.idTipoRegistro);
  }

  guardar(): void {
    if (this.guardando()) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();

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

    // La fecha del formulario + la hora (la original al editar, la actual al crear).
    const hora = this.horaOriginal ?? new Date();
    const fecha = new Date(v.fecha!);
    fecha.setHours(hora.getHours(), hora.getMinutes(), hora.getSeconds(), 0);

    const request: HistorialClinicoRequest = {
      idPaciente: v.idPaciente!,
      idMedico: v.idMedico!,
      idCita: this.idCita,
      idTratamiento: this.idTratamiento,
      idTipoRegistro: v.idTipoRegistro!,
      idNivelConfidencialidad: v.idNivelConfidencialidad,
      fecha: toIsoDateTimeLocal(fecha),
      motivoConsulta: v.motivoConsulta || null,
      diagnostico: v.diagnostico || null,
      notas,
    };

    this.guardando.set(true);
    const peticion = this.esNuevo()
      ? this.expedienteService.CrearExpediente(request)
      : this.expedienteService.ActualizarExpediente(this.idHistorial(), request);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        alert(this.esNuevo() ? 'Registro clínico creado correctamente' : 'Registro clínico actualizado correctamente');
        this.router.navigate(['/home/expedientes']);
      },
      error: (err: Error) => {
        this.guardando.set(false);
        alert('No se pudo guardar el registro clínico: ' + err.message);
      },
    });
  }
}