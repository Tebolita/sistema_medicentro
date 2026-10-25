import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { forkJoin } from 'rxjs';
import { listaOpcional } from '../../shared/lista-opcional';

import { BitacoraItem, CitaService } from '../../service/cita.service';
import { PacienteService } from '../../service/paciente.service';
import { EmpleadoService } from '../../service/empleado.service';
import { EspecialidadService } from '../../service/especialidad.service';
import { SalaService } from '../../service/sala.service';
import { CatalogoService } from '../../service/catalogo.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { LaboratorioService, OrdenCompleta } from '../../service/laboratorio.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';
import { LARGOS, mensajeError } from '../../shared/validadores';
import { Cita, CitaRequest, Sala } from '../../models/cita.model';
import { PacienteListado } from '../../models/paciente.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

// Empleado "placeholder" para consultas de solo laboratorio (ver
// SOLICITUD_MOTOR_CONSULTAS.md): id_medico sigue siendo obligatorio en la
// base (NOT NULL, usado por hospitalización/atención/factura en todo el
// sistema), así que en vez de volverlo NULL-able se le asigna este empleado
// real sin especialidad (por eso nunca aparece en el dropdown de médicos:
// RetornarMedicos() solo trae empleados con especialidad). Se crea con
// scripts/crear_empleado_laboratorio.sql.
const NOMBRE_EMPLEADO_LABORATORIO = 'Laboratorio';
const APELLIDO_EMPLEADO_LABORATORIO = '(Sin médico asignado)';

// Formas que espera el HTML en cada <mat-option>.
interface OpcionCatalogo {
  id: number;
  label: string;
}
interface OpcionMedico {
  id: number;
  nombre: string;
  idEspecialidad: number | null;
  especialidad: string;
}

// Duración por defecto de una consulta: el backend exige fecha/hora de fin.
const DURACION_CONSULTA_MIN = 30;

// citas.motivo_consulta es nvarchar(255).
const LARGO_MOTIVO = LARGOS.DESCRIPCION_CORTA;

// Estados que ya no ocupan el horario del médico.
const ESTADOS_LIBERAN_HORARIO = ['CANCELADA'];

// La tabla `citas` no tiene columna de tipo de consulta (Primera vez /
// Reconsulta): se guarda al inicio de `notas` con este prefijo.
const PREFIJO_TIPO = /^Tipo de consulta: ([^.]+)\.\s*/;

// Fecha + hora LOCAL como 'YYYY-MM-DDTHH:mm:ss' (sin 'Z', para que el
// backend no la corra por la zona horaria).
function toIsoDateTimeLocal(value: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}T${p(value.getHours())}:${p(value.getMinutes())}:${p(value.getSeconds())}`;
}

function formatoHora(fecha: Date): string {
  return fecha.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
}

@Component({
  selector: 'app-consulta-formulario',
  imports: [
    NgClass,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatCheckboxModule,
    AuditoriaInfo,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './consulta-formulario.html',
  styleUrl: './consulta-formulario.css',
})
export class ConsultaFormulario {
  private fb = inject(FormBuilder);
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private citaService = inject(CitaService);
  private pacienteService = inject(PacienteService);
  private empleadoService = inject(EmpleadoService);
  private especialidadService = inject(EspecialidadService);
  private salaService = inject(SalaService);
  private catalogosService = inject(CatalogosService);
  private catalogoService = inject(CatalogoService);
  private usuariosService = inject(UsuariosService);
  private laboratorioService = inject(LaboratorioService);
  private notificaciones = inject(NotificacionesService);
  private platformId = inject(PLATFORM_ID);

  readonly largoMotivo = LARGO_MOTIVO;
  readonly largoNotas = LARGOS.NOTAS;
  readonly hoy = new Date();

  // ==================== DATOS PARA LOS DROPDOWNS (desde la API) ====================
  private pacientesActivos = signal<PacienteListado[]>([]);
  private pacientesEliminados = signal<PacienteListado[]>([]);
  private medicosApi = signal<OpcionMedico[]>([]);
  salas = signal<Sala[]>([]);
  private catalogos = signal<Record<string, CatalogoOpcion[]>>({});

  // Citas activas, para avisar si el médico o el paciente ya tienen una
  // consulta en ese mismo horario.
  // Signal (no un campo plano): "tienePacienteConsultasPrevias" depende de
  // esto y necesita recalcularse en cuanto cargarListas() lo llena, no solo
  // cuando cambia el paciente elegido.
  private citasRegistradas = signal<Cita[]>([]);

  // Cita cargada (en edición): también sirve para mostrar quién la creó y modificó.
  registro = signal<Cita | null>(null);

  // Para una consulta nueva solo se ofrecen pacientes activos. Al editar, si el
  // paciente fue dado de baja, se agrega para que se vea su nombre.
  pacientes = computed(() => {
    const activos = this.pacientesActivos();
    const idActual = this.registro()?.idPaciente;
    const actualEliminado = this.pacientesEliminados().find((p) => p.idPaciente === idActual);
    return actualEliminado ? [...activos, actualEliminado] : activos;
  });

  esPacienteDadoDeBaja(idPaciente: number): boolean {
    return this.pacientesEliminados().some((p) => p.idPaciente === idPaciente);
  }

  private opciones(codigo: string): OpcionCatalogo[] {
    return (this.catalogos()[codigo] ?? []).map((c) => ({ id: c.id, label: c.nombre }));
  }
  private idPorCodigo(catalogo: string, codigo: string): number | null {
    return this.catalogos()[catalogo]?.find((c) => c.codigo === codigo)?.id ?? null;
  }
  private codigoPorId(catalogo: string, id: number | null): string | null {
    return this.catalogos()[catalogo]?.find((c) => c.id === id)?.codigo ?? null;
  }

  get medicos() { return this.medicosApi(); }

  // "Primera vez" no tiene sentido si el paciente ya tiene otras consultas
  // registradas (cualquier estado, menos esta misma si se está editando).
  private pacienteSeleccionado = signal<number | null>(null);
  tienePacienteConsultasPrevias = computed(() => {
    const idPaciente = this.pacienteSeleccionado();
    if (!idPaciente) return false;
    return this.citasRegistradas().some((c) => c.idPaciente === idPaciente && c.idCita !== this.idCita());
  });

  tiposConsulta = computed(() => {
    const todas = this.opciones(CODIGOS_CATALOGO.TIPO_CONSULTA);
    if (!this.tienePacienteConsultasPrevias()) return todas;
    const valoresCatalogo = this.catalogos()[CODIGOS_CATALOGO.TIPO_CONSULTA] ?? [];
    return todas.filter((t) => valoresCatalogo.find((v) => v.id === t.id)?.codigo !== 'PRIMERA_VEZ');
  });

  get estadosCita() { return this.opciones(CODIGOS_CATALOGO.ESTADO_CITA); }
  get motivosCancelacion() { return this.opciones(CODIGOS_CATALOGO.MOTIVO_CANCELACION); }

  idCita = signal(0);
  esNueva = computed(() => this.idCita() === 0);
  guardando = signal(false);

  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);

  // Se refleja el estado elegido para mostrar el motivo de cancelación.
  private estadoSeleccionado = signal<number | null>(null);
  esCancelada = computed(
    () => this.codigoPorId(CODIGOS_CATALOGO.ESTADO_CITA, this.estadoSeleccionado()) === 'CANCELADA',
  );

  // "Laboratorios" (ver SOLICITUD_MOTOR_CONSULTAS.md): consulta de solo
  // exámenes, sin médico asignado por recepción — la hora/fecha es siempre
  // la actual (es un walk-in, no se agenda para después).
  private tipoConsultaSeleccionado = signal<number | null>(null);
  esTipoLaboratorio = computed(
    () => this.codigoPorId(CODIGOS_CATALOGO.TIPO_CONSULTA, this.tipoConsultaSeleccionado()) === 'LABORATORIOS',
  );
  private idMedicoLaboratorio = signal<number | null>(null);

  // Exámenes a realizar: se eligen aquí mismo, antes de guardar, para que la
  // orden de laboratorio nazca junto con la cita (en vez de obligar a entrar
  // luego a "Atención de la consulta" solo para solicitarlos). Solo aplica
  // al crear una consulta nueva de tipo Laboratorios.
  tiposExamenLab = signal<{ idTipoExamen: number; nombre: string }[]>([]);
  examenesSeleccionados = signal<Set<number>>(new Set());
  private idPrioridadLabDefault: number | null = null;
  private idEstadoOrdenLabDefault: number | null = null;

  toggleExamenLab(idTipoExamen: number): void {
    this.examenesSeleccionados.update((actual) => {
      const nuevo = new Set(actual);
      if (nuevo.has(idTipoExamen)) {
        nuevo.delete(idTipoExamen);
      } else {
        nuevo.add(idTipoExamen);
      }
      return nuevo;
    });
  }

  // Datos de la cita que el formulario no edita, para no perderlos al guardar.
  // "Marcar para operación" (SOLICITUD_MOTOR_CONSULTAS.md, sección 5) ya no
  // se edita aquí: es decisión del médico durante la atención de la
  // consulta (ver consulta-atencion), no al agendarla/editarla desde
  // recepción. Esta pantalla solo conserva lo que ya tenía la cita al
  // guardar (ver citaOriginal en guardar()).
  private citaOriginal: Cita | null = null;
  private tipoConsultaPendiente: string | null = null;

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedico: this.fb.control<number | null>(null, Validators.required),
    idSala: this.fb.control<number | null>(null),
    fecha: this.fb.control<Date | null>(null, Validators.required),
    hora: ['', [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)]],
    idTipoConsulta: this.fb.control<number | null>(null, Validators.required),
    idEstadoCita: this.fb.control<number | null>(null, Validators.required),
    idMotivoCancelacion: this.fb.control<number | null>(null),
    motivoConsulta: ['', Validators.maxLength(LARGO_MOTIVO)],
    notas: ['', Validators.maxLength(LARGOS.NOTAS)],
  });

  constructor() {
    // Si la cita se cancela, el motivo de cancelación es obligatorio.
    this.form.controls.idEstadoCita.valueChanges.pipe(takeUntilDestroyed()).subscribe((estado) => {
      this.estadoSeleccionado.set(estado);
      this.actualizarReglaCancelacion();
    });

    // "Laboratorios": médico opcional (se asigna el placeholder) y fecha/hora
    // fijas a "ahora".
    this.form.controls.idTipoConsulta.valueChanges.pipe(takeUntilDestroyed()).subscribe((idTipo) => {
      this.tipoConsultaSeleccionado.set(idTipo);
      this.actualizarReglaLaboratorio();
    });

    // "Primera vez" deja de ser válido si el paciente elegido ya tiene otras
    // consultas — si quedó esa opción puesta, se cambia a "Reconsulta".
    this.form.controls.idPaciente.valueChanges.pipe(takeUntilDestroyed()).subscribe((idPaciente) => {
      this.pacienteSeleccionado.set(idPaciente);
      const idActual = this.form.controls.idTipoConsulta.value;
      const sigueDisponible = this.tiposConsulta().some((t) => t.id === idActual);
      if (idActual !== null && !sigueDisponible) {
        const idReconsulta = this.idPorCodigo(CODIGOS_CATALOGO.TIPO_CONSULTA, 'RECONSULTA');
        this.form.controls.idTipoConsulta.setValue(idReconsulta);
      }
    });

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
        error: (err: Error) => this.notificaciones.error('No se pudo cargar la consulta: ' + err.message),
      });
    }
  }

  // Mensaje para mostrar en <mat-error> según el error del campo.
  error(control: AbstractControl | null): string {
    const e = control?.errors;
    if (e?.['fechaPasada']) return 'No se puede agendar en una fecha u hora pasada';
    if (e?.['choque']) return e['choque'];
    if (e?.['pattern']) return 'Indica una hora válida';
    return mensajeError(control);
  }

  private actualizarReglaCancelacion(): void {
    const control = this.form.controls.idMotivoCancelacion;
    control.setValidators(this.esCancelada() ? Validators.required : null);
    if (!this.esCancelada()) {
      control.setValue(null, { emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private actualizarReglaLaboratorio(): void {
    const idMedicoControl = this.form.controls.idMedico;
    const fechaControl = this.form.controls.fecha;
    const horaControl = this.form.controls.hora;

    if (this.esTipoLaboratorio()) {
      idMedicoControl.clearValidators();
      const idLab = this.idMedicoLaboratorio();
      if (idLab !== null) {
        idMedicoControl.setValue(idLab, { emitEvent: false });
      }
      idMedicoControl.updateValueAndValidity({ emitEvent: false });

      // Solo al crear: al editar una ya existente se conserva la fecha/hora
      // original (igual que la duración, ver guardar()), no se vuelve a
      // poner "ahora" cada vez que se abre para editarla.
      if (this.esNueva()) {
        const ahora = new Date();
        fechaControl.setValue(ahora, { emitEvent: false });
        horaControl.setValue(
          `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`,
          { emitEvent: false },
        );
      }
      fechaControl.disable({ emitEvent: false });
      horaControl.disable({ emitEvent: false });
    } else {
      idMedicoControl.setValidators(Validators.required);
      // Si había quedado puesto el médico placeholder, se limpia para
      // obligar a elegir uno real.
      if (idMedicoControl.value !== null && idMedicoControl.value === this.idMedicoLaboratorio()) {
        idMedicoControl.setValue(null, { emitEvent: false });
      }
      idMedicoControl.updateValueAndValidity({ emitEvent: false });
      fechaControl.enable({ emitEvent: false });
      horaControl.enable({ emitEvent: false });
    }
  }

  private cargarListas(): void {
    const c = CODIGOS_CATALOGO;
    forkJoin({
      pacientes: this.pacienteService.RetornarPacientes(),
      pacientesEliminados: this.pacienteService.RetornarPacientesEliminados().pipe(listaOpcional()),
      medicos: this.empleadoService.RetornarMedicos(),
      empleadosTodos: this.empleadoService.RetornarEmpleados(),
      especialidades: this.especialidadService.RetornarEspecialidades(),
      salas: this.salaService.RetornarSalas(),
      tiposConsulta: this.catalogoService.RetornarCatalogo(c.TIPO_CONSULTA),
      estados: this.catalogoService.RetornarCatalogo(c.ESTADO_CITA),
      motivos: this.catalogoService.RetornarCatalogo(c.MOTIVO_CANCELACION),
      citas: this.citaService.RetornarCitas(),
      tiposExamen: this.laboratorioService.RetornarTiposExamen(),
      prioridadesLab: this.laboratorioService.RetornarPrioridades(),
      estadosOrdenLab: this.laboratorioService.RetornarEstadosOrden(),
    }).subscribe({
      next: (r) => {
        const especialidades = r.especialidades.datos ?? [];
        this.pacientesActivos.set(r.pacientes.datos ?? []);
        this.pacientesEliminados.set(r.pacientesEliminados.datos ?? []);
        this.medicosApi.set(
          (r.medicos.datos ?? []).map((m) => ({
            id: m.idEmpleado,
            nombre: m.nombreCompleto,
            idEspecialidad: m.idEspecialidad,
            especialidad: especialidades.find((e) => e.idEspecialidad === m.idEspecialidad)?.nombre ?? 'Sin especialidad',
          })),
        );
        this.salas.set(r.salas.datos ?? []);
        this.catalogos.set({
          [c.TIPO_CONSULTA]: r.tiposConsulta.datos ?? [],
          [c.ESTADO_CITA]: r.estados.datos ?? [],
          [c.MOTIVO_CANCELACION]: r.motivos.datos ?? [],
        });
        this.citasRegistradas.set((r.citas.datos ?? []).map((x) => x.cita));

        const empleadoLaboratorio = (r.empleadosTodos.datos ?? []).find(
          (e) => e.primerNombre === NOMBRE_EMPLEADO_LABORATORIO && e.primerApellido === APELLIDO_EMPLEADO_LABORATORIO,
        );
        this.idMedicoLaboratorio.set(empleadoLaboratorio?.idEmpleado ?? null);

        this.tiposExamenLab.set(r.tiposExamen.map((t) => ({ idTipoExamen: t.idTipoExamen, nombre: t.nombre })));
        this.idPrioridadLabDefault = r.prioridadesLab.find((p) => p.codigo === 'NORMAL')?.id ?? r.prioridadesLab[0]?.id ?? null;
        this.idEstadoOrdenLabDefault = r.estadosOrdenLab.find((e) => e.codigo === 'PENDIENTE')?.id ?? r.estadosOrdenLab[0]?.id ?? null;

        if (this.esNueva() && this.form.controls.idEstadoCita.value === null) {
          this.form.controls.idEstadoCita.setValue(this.idPorCodigo(c.ESTADO_CITA, 'PROGRAMADA'));
        }
        this.estadoSeleccionado.set(this.form.controls.idEstadoCita.value);
        this.actualizarReglaCancelacion();
        this.aplicarTipoConsultaPendiente();
        this.tipoConsultaSeleccionado.set(this.form.controls.idTipoConsulta.value);
        this.actualizarReglaLaboratorio();
      },
      error: (err: Error) => this.notificaciones.error('No se pudieron cargar las listas del formulario: ' + err.message),
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
    this.registro.set(cita);
    this.idCita.set(cita.idCita);
    const fechaHora = new Date(cita.fechaHoraInicio);
    const notas = cita.notas ?? '';
    this.tipoConsultaPendiente = notas.match(PREFIJO_TIPO)?.[1]?.trim() ?? null;

    this.form.patchValue({
      idPaciente: cita.idPaciente,
      idMedico: cita.idMedico,
      idSala: cita.idSala,
      fecha: new Date(fechaHora.getFullYear(), fechaHora.getMonth(), fechaHora.getDate()),
      hora: `${String(fechaHora.getHours()).padStart(2, '0')}:${String(fechaHora.getMinutes()).padStart(2, '0')}`,
      idEstadoCita: cita.idEstadoCita,
      motivoConsulta: cita.motivoConsulta ?? '',
      notas: notas.replace(PREFIJO_TIPO, ''),
    });
    this.form.controls.idMotivoCancelacion.setValue(cita.idMotivoCancelacion);
    this.aplicarTipoConsultaPendiente();
  }

  private liberaHorario(idEstado: number | null): boolean {
    const codigo = this.codigoPorId(CODIGOS_CATALOGO.ESTADO_CITA, idEstado);
    return !!codigo && ESTADOS_LIBERAN_HORARIO.includes(codigo);
  }

  // Busca otra cita activa del mismo médico o del mismo paciente que se cruce
  // con el horario [inicio, fin).
  private buscarChoque(inicio: Date, fin: Date, idMedico: number, idPaciente: number): string | null {
    for (const c of this.citasRegistradas()) {
      if (c.idCita === this.idCita() || this.liberaHorario(c.idEstadoCita)) {
        continue;
      }
      const otroInicio = new Date(c.fechaHoraInicio);
      const otroFin = new Date(c.fechaHoraFin);
      if (inicio >= otroFin || fin <= otroInicio) {
        continue;
      }
      const rango = `${formatoHora(otroInicio)} a ${formatoHora(otroFin)}`;
      // El médico placeholder de "Laboratorios" no es un recurso real que se
      // pueda chocar: muchas consultas de solo exámenes comparten ese mismo
      // "médico" al mismo tiempo sin problema.
      if (c.idMedico === idMedico && idMedico !== this.idMedicoLaboratorio()) {
        return `El médico ya tiene una consulta de ${rango}`;
      }
      if (c.idPaciente === idPaciente) {
        return `El paciente ya tiene una consulta de ${rango}`;
      }
    }
    return null;
  }

  guardar(): void {
    if (this.guardando()) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notificaciones.error('Revisa los campos marcados en rojo.');
      return;
    }

    const requiereSeleccionDeExamenes = this.esNueva() && this.esTipoLaboratorio();
    if (requiereSeleccionDeExamenes && this.examenesSeleccionados().size === 0) {
      this.notificaciones.error('Selecciona al menos un examen para esta consulta de laboratorio.');
      return;
    }

    const v = this.form.getRawValue();
    // "Laboratorios" siempre es ahora mismo (es un walk-in, no se agenda):
    // se recalcula aquí en vez de confiar en lo que haya en los controles
    // (deshabilitados, pueden llevar unos segundos de retraso desde que se
    // armó el formulario).
    let inicio: Date;
    if (this.esTipoLaboratorio()) {
      inicio = new Date();
    } else {
      const [horas, minutos] = v.hora.split(':').map(Number);
      inicio = new Date(v.fecha!);
      inicio.setHours(horas, minutos, 0, 0);
    }

    // Al editar se conserva la duración original; al crear se usan 30 minutos.
    const duracionMs = this.citaOriginal
      ? new Date(this.citaOriginal.fechaHoraFin).getTime() - new Date(this.citaOriginal.fechaHoraInicio).getTime()
      : DURACION_CONSULTA_MIN * 60_000;
    const fin = new Date(inicio.getTime() + (duracionMs > 0 ? duracionMs : DURACION_CONSULTA_MIN * 60_000));

    // No se agenda en el pasado. Al editar solo se revisa si cambió el horario
    // (una consulta ya atendida conserva su fecha original).
    const cambioHorario =
      !this.citaOriginal || new Date(this.citaOriginal.fechaHoraInicio).getTime() !== inicio.getTime();
    if (cambioHorario && inicio.getTime() < Date.now() && !this.esTipoLaboratorio()) {
      this.form.controls.hora.setErrors({ fechaPasada: true });
      this.notificaciones.error('No se puede agendar una consulta en una fecha u hora pasada.');
      return;
    }

    // Choque de horario con otra consulta del mismo médico o paciente: no
    // aplica a "Laboratorios" — son walk-ins de solo exámenes, siempre a la
    // hora actual, y es normal que el paciente tenga otra consulta agendada
    // (o varias visitas de laboratorio) al mismo tiempo.
    if (!this.liberaHorario(v.idEstadoCita) && !this.esTipoLaboratorio()) {
      const choque = this.buscarChoque(inicio, fin, v.idMedico!, v.idPaciente!);
      if (choque) {
        this.form.controls.hora.setErrors({ choque });
        this.notificaciones.error(choque + '.');
        return;
      }
    }

    const tipoTexto = this.tiposConsulta().find((t) => t.id === v.idTipoConsulta)?.label;
    const notasTexto = v.notas.trim();
    const notas = [tipoTexto ? `Tipo de consulta: ${tipoTexto}.` : '', notasTexto].filter(Boolean).join(' ') || null;
    const medico = this.medicos.find((m) => m.id === v.idMedico);

    const request: CitaRequest = {
      idPaciente: v.idPaciente!,
      idMedico: v.idMedico!,
      // La especialidad sale del médico elegido.
      idEspecialidad: medico?.idEspecialidad ?? this.citaOriginal?.idEspecialidad ?? null,
      idSala: v.idSala,
      fechaHoraInicio: toIsoDateTimeLocal(inicio),
      fechaHoraFin: toIsoDateTimeLocal(fin),
      idEstadoCita: v.idEstadoCita!,
      idMotivoCancelacion: this.esCancelada() ? v.idMotivoCancelacion : null,
      motivoConsulta: v.motivoConsulta.trim() || null,
      notas,
      idPoliza: this.citaOriginal?.idPoliza ?? null,
      // Se decide desde la atención de la consulta (ver consulta-atencion),
      // no aquí: se conserva tal cual lo que ya tenía (null/false en una
      // consulta nueva).
      requiereOperacion: this.citaOriginal?.requiereOperacion ?? false,
      idTipoOperacion: this.citaOriginal?.idTipoOperacion ?? null,
      notasOperacion: this.citaOriginal?.notasOperacion ?? null,
      motivoCambio: this.esNueva() ? null : 'Actualizada desde Consulta externa',
    };

    const esNueva = this.esNueva();
    this.guardando.set(true);
    const peticion = esNueva
      ? this.citaService.CrearCita(request)
      : this.citaService.ActualizarCita(this.idCita(), request);

    peticion.subscribe({
      next: (resp) => {
        const citaCreada = resp.datos?.cita;
        if (requiereSeleccionDeExamenes && citaCreada) {
          this.crearOrdenExamenesLab(citaCreada, () => {
            this.guardando.set(false);
            this.notificaciones.exito('Consulta y exámenes registrados correctamente');
            this.router.navigate(['/home/consultas']);
          });
          return;
        }
        this.guardando.set(false);
        this.notificaciones.exito(esNueva ? 'Consulta registrada correctamente' : 'Consulta actualizada correctamente');
        this.router.navigate(['/home/consultas']);
      },
      error: (err: Error) => {
        this.guardando.set(false);
        this.notificaciones.error('No se pudo guardar la consulta: ' + err.message);
      },
    });
  }

  // La cita ya existe (recién creada): arma la orden de laboratorio con los
  // exámenes elegidos antes de guardar y la crea, ligada por idCita (mismo
  // patrón que consulta-atencion.ts al "Solicitar examen").
  private crearOrdenExamenesLab(cita: Cita, alTerminar: () => void): void {
    if (this.idPrioridadLabDefault === null || this.idEstadoOrdenLabDefault === null) {
      this.notificaciones.error('La consulta se guardó, pero no se pudo resolver el catálogo de laboratorio para crear la orden de exámenes.');
      alTerminar();
      return;
    }

    const ahora = toIsoDateTimeLocal(new Date());
    const registro: OrdenCompleta = {
      orden: {
        idOrden: 0,
        idPaciente: cita.idPaciente,
        idMedico: cita.idMedico,
        idCita: cita.idCita,
        fechaOrden: ahora,
        idPrioridad: this.idPrioridadLabDefault,
        idEstadoOrden: this.idEstadoOrdenLabDefault,
        notas: null,
        activo: true,
        fechaCreacion: ahora,
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      detalles: [...this.examenesSeleccionados()].map((idTipoExamen) => ({
        idOrdenDetalle: 0,
        idOrden: 0,
        idTipoExamen,
        activo: true,
        fechaCreacion: ahora,
      })),
    };

    this.laboratorioService.guardar(registro).subscribe({
      next: () => alTerminar(),
      error: (err: Error) => {
        this.notificaciones.error('La consulta se guardó, pero no se pudo registrar la orden de exámenes: ' + err.message);
        alTerminar();
      },
    });
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idCita();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.citaService.RetornarBitacoraPorRegistro('citas', id).subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al cargar bitácora:', err.status);
        this.cargandoHistorial.set(false);
        this.notificaciones.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorial(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  accionLabel(idTipoAccion: number): string {
    return this.accionAuditoria.label(idTipoAccion);
  }

  accionClase(idTipoAccion: number): string {
    return this.accionAuditoria.clase(idTipoAccion);
  }

  accionIcono(idTipoAccion: number): string {
    return this.accionAuditoria.icono(idTipoAccion);
  }

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    return this.usuariosService.obtener(idUsuario)?.nombreUsuario ?? `Usuario #${idUsuario}`;
  }

  formatFechaHora(iso: string): string {
    if (!iso) return '—';
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';
    const fecha = new Date(isoConZona);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  camposCambiados(item: BitacoraItem): Array<{ campo: string; antes: string; despues: string }> {
    try {
      const antes = item.valoresAnteriores ? JSON.parse(item.valoresAnteriores) : {};
      const despues = item.valoresNuevos ? JSON.parse(item.valoresNuevos) : {};

      const camposIgnorados = new Set([
        'IdUsuarioModificacion',
        'FechaModificacion',
        'IdUsuarioCreacion',
      ]);

      const idRegistroReal = this.idCita();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdCita' && idRegistroReal != null) {
          a = idRegistroReal;
          d = idRegistroReal;
        }

        if (JSON.stringify(a) === JSON.stringify(d)) continue;

        cambios.push({
          campo: this.formatearNombreCampo(k),
          antes: this.formatearValor(a, k),
          despues: this.formatearValor(d, k),
        });
      }

      cambios.sort((x, y) => {
        if (x.campo.toLowerCase().includes('id cita')) return -1;
        if (y.campo.toLowerCase().includes('id cita')) return 1;
        return x.campo.localeCompare(y.campo);
      });

      return cambios;
    } catch {
      return [];
    }
  }

  private formatearNombreCampo(campo: string): string {
    return campo
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  private formatearValor(valor: any, nombreCampo: string = ''): string {
    if (valor === null || valor === undefined) return '—';

    if (this.esCampoFecha(nombreCampo) && typeof valor === 'string') {
      const fecha = new Date(valor);
      if (!isNaN(fecha.getTime())) {
        return fecha.toLocaleString('es-GT', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  }

  private esCampoFecha(nombreCampo: string): boolean {
    return /fecha|fechahora|creacion|modificacion/i.test(nombreCampo);
  }
}