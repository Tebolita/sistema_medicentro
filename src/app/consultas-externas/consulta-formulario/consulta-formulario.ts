import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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

import { CitaService } from '../../service/cita.service';
import { PacienteService } from '../../service/paciente.service';
import { EmpleadoService } from '../../service/empleado.service';
import { EspecialidadService } from '../../service/especialidad.service';
import { CatalogoService } from '../../service/catalogo.service';
import { Cita, CitaRequest } from '../../models/cita.model';
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

// Duración por defecto de una consulta: el backend exige fecha/hora de fin.
const DURACION_CONSULTA_MIN = 30;

// La tabla `citas` no tiene columna de tipo de consulta (Primera vez /
// Reconsulta): se guarda al inicio de `notas` con este prefijo.
const PREFIJO_TIPO = /^Tipo de consulta: ([^.]+)\.\s*/;

// Fecha + hora LOCAL como 'YYYY-MM-DDTHH:mm:ss' (sin 'Z', para que el
// backend no la corra por la zona horaria).
function toIsoDateTimeLocal(value: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}T${p(value.getHours())}:${p(value.getMinutes())}:${p(value.getSeconds())}`;
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
  private citaService = inject(CitaService);
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
  private idPorCodigo(catalogo: string, codigo: string): number | null {
    return this.catalogos()[catalogo]?.find((c) => c.codigo === codigo)?.id ?? null;
  }

  get medicos() { return this.medicosApi(); }
  get tiposConsulta() { return this.opciones(CODIGOS_CATALOGO.TIPO_CONSULTA); }
  get estadosCita() { return this.opciones(CODIGOS_CATALOGO.ESTADO_CITA); }

  idCita = signal(0);
  esNueva = computed(() => this.idCita() === 0);
  guardando = signal(false);

  // Datos de la cita que el formulario no edita, para no perderlos al guardar.
  private citaOriginal: Cita | null = null;
  private tipoConsultaPendiente: string | null = null;

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedico: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.control<Date | null>(null, Validators.required),
    hora: ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    idTipoConsulta: this.fb.control<number | null>(null, Validators.required),
    idEstadoCita: this.fb.control<number | null>(null, Validators.required),
    motivoConsulta: [''],
    notas: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const esEdicion = !!idParam && idParam !== 'nueva';

    if (!esEdicion) {
      const idPacienteParam = this.route.snapshot.queryParamMap.get('paciente');
      if (idPacienteParam) {
        this.form.patchValue({ idPaciente: Number(idPacienteParam) });
      }
    }

    // En el servidor (SSR) no hay sesión ni token.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cargarListas();

    if (esEdicion) {
      this.citaService.RetornarCita(Number(idParam)).subscribe({
        next: (resp) => {
          if (resp.datos) {
            this.cargar(resp.datos.cita);
          }
        },
        error: (err: Error) => alert('No se pudo cargar la consulta: ' + err.message),
      });
    }
  }

  private cargarListas(): void {
    const c = CODIGOS_CATALOGO;
    forkJoin({
      pacientes: this.pacienteService.RetornarPacientes(),
      medicos: this.empleadoService.RetornarMedicos(),
      especialidades: this.especialidadService.RetornarEspecialidades(),
      tiposConsulta: this.catalogoService.RetornarCatalogo(c.TIPO_CONSULTA),
      estados: this.catalogoService.RetornarCatalogo(c.ESTADO_CITA),
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
          [c.TIPO_CONSULTA]: r.tiposConsulta.datos ?? [],
          [c.ESTADO_CITA]: r.estados.datos ?? [],
        });

        if (this.esNueva() && this.form.controls.idEstadoCita.value === null) {
          this.form.controls.idEstadoCita.setValue(this.idPorCodigo(c.ESTADO_CITA, 'PROGRAMADA'));
        }
        this.aplicarTipoConsultaPendiente();
      },
      error: (err: Error) => alert('No se pudieron cargar las listas del formulario: ' + err.message),
    });
  }

  // El tipo de consulta viene como texto en `notas`; se traduce al id del catálogo.
  private aplicarTipoConsultaPendiente(): void {
    if (!this.tipoConsultaPendiente) return;
    const id = this.catalogos()[CODIGOS_CATALOGO.TIPO_CONSULTA]?.find((t) => t.nombre === this.tipoConsultaPendiente)?.id;
    if (id) {
      this.form.controls.idTipoConsulta.setValue(id);
    }
  }

  private cargar(cita: Cita): void {
    this.citaOriginal = cita;
    this.idCita.set(cita.idCita);
    const fechaHora = new Date(cita.fechaHoraInicio);
    const notas = cita.notas ?? '';
    this.tipoConsultaPendiente = notas.match(PREFIJO_TIPO)?.[1]?.trim() ?? null;

    this.form.patchValue({
      idPaciente: cita.idPaciente,
      idMedico: cita.idMedico,
      fecha: new Date(fechaHora.getFullYear(), fechaHora.getMonth(), fechaHora.getDate()),
      hora: `${String(fechaHora.getHours()).padStart(2, '0')}:${String(fechaHora.getMinutes()).padStart(2, '0')}`,
      idEstadoCita: cita.idEstadoCita,
      motivoConsulta: cita.motivoConsulta ?? '',
      notas: notas.replace(PREFIJO_TIPO, ''),
    });
    this.aplicarTipoConsultaPendiente();
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
    const [horas, minutos] = v.hora.split(':').map(Number);
    const inicio = new Date(v.fecha!);
    inicio.setHours(horas, minutos, 0, 0);

    // Al editar se conserva la duración original; al crear se usan 30 minutos.
    const duracionMs = this.citaOriginal
      ? new Date(this.citaOriginal.fechaHoraFin).getTime() - new Date(this.citaOriginal.fechaHoraInicio).getTime()
      : DURACION_CONSULTA_MIN * 60_000;
    const fin = new Date(inicio.getTime() + (duracionMs > 0 ? duracionMs : DURACION_CONSULTA_MIN * 60_000));

    const tipoTexto = this.tiposConsulta.find((t) => t.id === v.idTipoConsulta)?.label;
    const notas = [tipoTexto ? `Tipo de consulta: ${tipoTexto}.` : '', v.notas].filter(Boolean).join(' ') || null;

    const request: CitaRequest = {
      idPaciente: v.idPaciente!,
      idMedico: v.idMedico!,
      idEspecialidad: this.citaOriginal?.idEspecialidad ?? null,
      idSala: this.citaOriginal?.idSala ?? null,
      fechaHoraInicio: toIsoDateTimeLocal(inicio),
      fechaHoraFin: toIsoDateTimeLocal(fin),
      idEstadoCita: v.idEstadoCita!,
      idMotivoCancelacion: this.citaOriginal?.idMotivoCancelacion ?? null,
      motivoConsulta: v.motivoConsulta || null,
      notas,
      idPoliza: this.citaOriginal?.idPoliza ?? null,
      motivoCambio: this.esNueva() ? null : 'Actualizada desde Consulta externa',
    };

    this.guardando.set(true);
    const peticion = this.esNueva()
      ? this.citaService.CrearCita(request)
      : this.citaService.ActualizarCita(this.idCita(), request);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        alert(this.esNueva() ? 'Consulta registrada correctamente' : 'Consulta actualizada correctamente');
        this.router.navigate(['/home/consultas']);
      },
      error: (err: Error) => {
        this.guardando.set(false);
        alert('No se pudo guardar la consulta: ' + err.message);
      },
    });
  }
}