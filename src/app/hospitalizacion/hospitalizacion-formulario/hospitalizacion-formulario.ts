import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import {
  Hospitalizacion,
  OrdenMedicaHospitalizacion,
  MedicamentoProgramadoHospitalizacion,
  AdministracionMedicamento,
  ControlSignosHospitalizacion,
  CostoPacienteHospitalizacion,
} from '../../models';
import {
  CamaOpcion,
  HospitalizacionCompleta,
  HospitalizacionesService,
  MedicoOpcion,
  OpcionCatalogo,
  BitacoraItem,
  UsuarioOpcion,
} from '../../service/hospitalizaciones.service';
import { PacientesService } from '../../service/pacientes.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { CatalogosService } from '../../service/catalogos.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
import {
  abrirVentanaImpresion,
  construirHtmlOrdenes,
  construirHtmlEnfermeria,
  construirHtmlEvolucion,
  construirHtmlControlMedicamentos,
  construirHtmlControlSignos,
  construirHtmlCostoPaciente,
} from '../hospitalizacion-impresiones';

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
  selector: 'app-hospitalizacion-formulario',
  imports: [
    NgClass,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './hospitalizacion-formulario.html',
  styleUrl: './hospitalizacion-formulario.css',
})
export class HospitalizacionFormulario {
  private fb = inject(FormBuilder);
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private hospitalizacionesService = inject(HospitalizacionesService);
  private pacientesService = inject(PacientesService);
  private medicamentosService = inject(MedicamentosService);
  private catalogosService = inject(CatalogosService);
  medicamentos = this.medicamentosService.listar;

  // Hoja de Control de Medicamentos: solo tiene sentido administrar a un
  // hospitalizado medicamentos de uso CLINICA o AMBOS (no los que son
  // exclusivos de Farmacia, que se venden/facturan al paciente).
  private destinosApi = this.catalogosService.obtener('DESTINO_MEDICAMENTO');
  medicamentosClinicos = computed(() => {
    const destinos = this.destinosApi();
    const idClinica = destinos.find((d) => d.codigo === 'CLINICA')?.id;
    const idAmbos = destinos.find((d) => d.codigo === 'AMBOS')?.id;
    return this.medicamentos().filter(
      (m) => m.idDestinoMedicamento != null && (m.idDestinoMedicamento === idClinica || m.idDestinoMedicamento === idAmbos),
    );
  });
  private notif = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);

  pacientes = this.pacientesService.directorio;

  medicosSignal = signal<MedicoOpcion[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);
  tiposOrdenSignal = signal<OpcionCatalogo[]>([]);

  camasLibres = signal<CamaOpcion[]>([]);
  camasTodas = signal<CamaOpcion[]>([]);
  camaOriginal = signal<CamaOpcion | null>(null);

  idHospitalizacion = signal(0);
  esNueva = computed(() => this.idHospitalizacion() === 0);
  registro = signal<HospitalizacionCompleta | undefined>(undefined);

  guardando = signal(false);
  errorGuardar = signal<string | null>(null);

  ordenEditando = signal<OrdenMedicaHospitalizacion | null>(null);
  guardandoOrden = signal(false);

  // Enfermería (hoja "ENFERMERIA", notas-enfermeria en el backend): fecha +
  // nota + quién la escribió.
  notaNueva = signal<{ idEmpleado: number | null; evolucion: string } | null>(null);
  guardandoNota = signal(false);

  // Hoja de Evolución del médico (notas-evolucion en el backend): mismo
  // papel físico que Enfermería, pero propio de cada profesión.
  notaEvolucionNueva = signal<{ idMedico: number | null; evolucion: string } | null>(null);
  guardandoNotaEvolucion = signal(false);

  // Hoja de Control de Medicamentos: medicamento programado (con su hora) +
  // una marca por cada dosis administrada.
  medicamentoProgramadoNuevo = signal<{ idMedicamento: number | null; hora: string; fechaInicial: Date | null; observaciones: string } | null>(null);
  guardandoMedicamentoProgramado = signal(false);

  // Control de Signos: bitácora de signos vitales (fecha+hora, P/A,
  // temperatura, F.R., observaciones), varias filas a lo largo del tiempo.
  controlSignosNuevo = signal<{ presionArterial: string; temperatura: number | null; frecuenciaRespiratoria: number | null; observaciones: string } | null>(null);
  guardandoControlSignos = signal(false);

  // Costo Paciente: bitácora manual de todo lo que genera costo durante la
  // hospitalización (medicamentos, insumos, procedimientos...).
  // idMedicamento es opcional, solo para prellenar descripción/valor.
  costoPacienteNuevo = signal<{ idMedicamento: number | null; fecha: Date | null; descripcion: string; cantidad: number | null; valorUnitario: number | null } | null>(null);
  guardandoCostoPaciente = signal(false);

  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);
  cargandoHistorial = signal(false);
  registroHistorial = signal<{ tabla: string; id: number; titulo: string } | null>(null);

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idCama: this.fb.control<number | null>(null, Validators.required),
    idMedicoResponsable: this.fb.control<number | null>(null, Validators.required),
    fechaIngreso: this.fb.control<Date | null>(new Date(), Validators.required),
    motivoIngreso: [
      '',
      [
        Validators.required,
        Validators.minLength(5),
        Validators.maxLength(300),
      ],
    ],
    idEstadoHospitalizacion: this.fb.control<number | null>(null, Validators.required),
    fechaEgreso: this.fb.control<Date | null>(null),
    diagnosticoEgreso: ['', [Validators.maxLength(300)]],
  });

  constructor() {
    this.hospitalizacionesService.precargarCatalogosCamas();
    // El servicio no se autocarga al inyectarse — si esta pantalla es la
    // primera en pedir medicamentos en la sesión, el selector de la Hoja de
    // Control se quedaba vacío hasta que algo más llamaba cargar().
    this.medicamentosService.cargar();

    this.hospitalizacionesService.RetornarCamas().subscribe({
      next: (camas) => {
        this.camasTodas.set(camas);
        this.actualizarCamasLibres();
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error camas:', err.status);
        this.notif.error('No se pudieron cargar las camas');
      },
    });

    this.hospitalizacionesService.RetornarMedicos().subscribe({
      next: (m) => this.medicosSignal.set(m),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error médicos:', err.status);
      },
    });

    this.hospitalizacionesService.RetornarEstadosHospitalizacion().subscribe({
      next: (e) => {
        this.estadosSignal.set(e);
        if (this.esNueva() && e.length > 0 && !this.form.controls.idEstadoHospitalizacion.value) {
          const activa = e.find((x) => x.label.toLowerCase().includes('activ')) ?? e[0];
          this.form.patchValue({ idEstadoHospitalizacion: activa.id });
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error estados:', err.status);
      },
    });

    this.hospitalizacionesService.RetornarTiposOrden().subscribe({
      next: (t) => this.tiposOrdenSignal.set(t),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error tipos de orden:', err.status);
      },
    });

    this.hospitalizacionesService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error usuarios:', err.status);
      },
    });

    // Angular reutiliza esta misma instancia del componente al navegar entre
    // dos hospitalizaciones distintas sin salir de esta ruta: suscribirse
    // solo a queryParamMap (leyendo el id del snapshot adentro) no reacciona
    // si lo único que cambia es el :id del path, así que el formulario (y su
    // historial) se quedaban pegados a la primera hospitalización abierta.
    // Suscribirse directo a paramMap sí reacciona cuando cambia.
    this.route.paramMap.subscribe((params) => {
      const idParam = params.get('id');
      this.resetFormulario();
      if (!idParam || idParam === 'nuevo') return;

      const id = Number(idParam);
      this.cargarDesdeBackend(id);
    });
  }

  // Deja el formulario (y el historial) como recién creados antes de cargar
  // una hospitalización distinta o una nueva: si no se limpia, la anterior
  // se queda mezclada con la nueva (cama, historial abierto, etc.).
  private resetFormulario(): void {
    this.idHospitalizacion.set(0);
    this.registro.set(undefined);
    this.form.reset({
      idPaciente: null,
      idCama: null,
      idMedicoResponsable: null,
      fechaIngreso: new Date(),
      motivoIngreso: '',
      idEstadoHospitalizacion: null,
      fechaEgreso: null,
      diagnosticoEgreso: '',
    });
    this.ordenEditando.set(null);
    this.notaNueva.set(null);
    this.notaEvolucionNueva.set(null);
    this.medicamentoProgramadoNuevo.set(null);
    this.controlSignosNuevo.set(null);
    this.costoPacienteNuevo.set(null);
    this.errorGuardar.set(null);
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
    this.registroHistorial.set(null);
  }

  private actualizarCamasLibres(): void {
    const todas = this.camasTodas();
    const idCamaActual = this.form.controls.idCama.value;
    const camaActual = todas.find((c) => c.id === idCamaActual) ?? null;
    this.camaOriginal.set(camaActual);

    const idLibre = this.hospitalizacionesService.idPorCodigo('ESTADO_CAMA', 'LIBRE');

    if (idLibre == null) {
      this.camasLibres.set(todas);
      return;
    }

    const libres = todas.filter((c) => c.idEstadoCama === idLibre);

    if (camaActual && camaActual.idEstadoCama !== idLibre) {
      this.camasLibres.set([camaActual, ...libres]);
    } else {
      this.camasLibres.set(libres);
    }
  }

  private cargarDesdeBackend(id: number): void {
    this.hospitalizacionesService.obtenerDesdeApi(id).subscribe({
      next: (reg) => this.cargar(reg),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionFormulario] Error al refrescar detalle:', err.status);
        this.notif.error('No se pudo cargar el detalle');
      },
    });
  }

  private cargar(registro: HospitalizacionCompleta): void {
    this.idHospitalizacion.set(registro.hospitalizacion.idHospitalizacion);
    this.registro.set(registro);
    const h = registro.hospitalizacion;
    this.form.patchValue({
      idPaciente: h.idPaciente,
      idCama: h.idCama,
      idMedicoResponsable: h.idMedicoResponsable,
      fechaIngreso: parseIsoDateLocal(h.fechaIngreso),
      motivoIngreso: h.motivoIngreso,
      idEstadoHospitalizacion: h.idEstadoHospitalizacion,
      fechaEgreso: h.fechaEgreso ? parseIsoDateLocal(h.fechaEgreso) : null,
      diagnosticoEgreso: h.diagnosticoEgreso ?? '',
    });
    this.actualizarCamasLibres();
  }

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.directorio().find((pac) => pac.idPaciente === idPaciente);
    return p ? [p.primerNombre, p.primerApellido].filter(Boolean).join(' ') : '—';
  }

  medicoLabel(idMedico: number | null): string {
    if (idMedico == null) return '—';
    return this.medicosSignal().find((m) => m.id === idMedico)?.nombre ?? '—';
  }

  tipoOrdenLabel(idTipoOrden: number | null): string {
    if (idTipoOrden == null) return '—';
    return this.tiposOrdenSignal().find((t) => t.id === idTipoOrden)?.label ?? '—';
  }

  formatFecha(iso: any): string {
    const valor = iso?.fechaOrden ?? iso?.fecha_orden ?? iso;
    if (!valor) return '—';
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Reproduce el papel físico "ÓRDENES MÉDICAS" del Sanatorio Medicentro:
  // logo, nombre del paciente y una tabla Fecha/Hora/Médico — Indicaciones
  // con todas las órdenes activas de esta hospitalización.
  imprimirOrdenes(): void {
    const reg = this.registro();
    if (!reg) return;
    const html = construirHtmlOrdenes(
      reg,
      this.nombrePaciente(reg.hospitalizacion.idPaciente),
      (id) => this.medicoLabel(id),
      (id) => this.tipoOrdenLabel(id),
      (o) => this.formatFecha(o),
    );
    abrirVentanaImpresion(html);
  }

  // ==================== Enfermería (hoja "ENFERMERIA") ====================
  abrirAgregarNota(): void {
    const r = this.registro();
    this.notaNueva.set({ idEmpleado: r?.hospitalizacion.idMedicoResponsable ?? null, evolucion: '' });
  }

  cancelarAgregarNota(): void {
    this.notaNueva.set(null);
  }

  guardarNota(nota: { idEmpleado: number | null; evolucion: string }): void {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;
    if (!nota.idEmpleado || !nota.evolucion.trim()) {
      this.notif.error('Completa el empleado y la nota');
      return;
    }

    this.guardandoNota.set(true);
    this.hospitalizacionesService
      .agregarNotaEnfermeria(idHospitalizacion, {
        idEmpleado: nota.idEmpleado,
        fechaHora: toIsoDateTime(new Date())!,
        nota: nota.evolucion.trim(),
      })
      .subscribe({
        next: () => {
          this.guardandoNota.set(false);
          this.notaNueva.set(null);
          this.cargarDesdeBackend(idHospitalizacion);
          this.notif.exito('Nota de enfermería agregada correctamente');
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoNota.set(false);
          console.error('❌ Error al agregar nota de enfermería:', err);
          this.notif.error('No se pudo agregar la nota');
        },
      });
  }

  // Reproduce el papel físico "ENFERMERIA" del Sanatorio Medicentro: logo,
  // nombre del paciente, fecha de ingreso y una tabla Fecha | Evolución.
  imprimirEnfermeria(): void {
    const reg = this.registro();
    if (!reg) return;
    const html = construirHtmlEnfermeria(reg, this.nombrePaciente(reg.hospitalizacion.idPaciente), (id) => this.medicoLabel(id));
    abrirVentanaImpresion(html);
  }

  // ==================== Hoja de Evolución (médico) ====================
  abrirAgregarNotaEvolucion(): void {
    const r = this.registro();
    this.notaEvolucionNueva.set({ idMedico: r?.hospitalizacion.idMedicoResponsable ?? null, evolucion: '' });
  }

  cancelarAgregarNotaEvolucion(): void {
    this.notaEvolucionNueva.set(null);
  }

  guardarNotaEvolucion(nota: { idMedico: number | null; evolucion: string }): void {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;
    if (!nota.idMedico || !nota.evolucion.trim()) {
      this.notif.error('Completa el médico y la evolución');
      return;
    }

    this.guardandoNotaEvolucion.set(true);
    this.hospitalizacionesService
      .agregarNotaEvolucion(idHospitalizacion, {
        idMedico: nota.idMedico,
        fechaHora: toIsoDateTime(new Date())!,
        evolucion: nota.evolucion.trim(),
      })
      .subscribe({
        next: () => {
          this.guardandoNotaEvolucion.set(false);
          this.notaEvolucionNueva.set(null);
          this.cargarDesdeBackend(idHospitalizacion);
          this.notif.exito('Nota de evolución agregada correctamente');
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoNotaEvolucion.set(false);
          console.error('❌ Error al agregar nota de evolución:', err);
          this.notif.error('No se pudo agregar la nota');
        },
      });
  }

  // Reproduce el papel físico "HOJA DE EVOLUCIÓN" del Sanatorio Medicentro:
  // logo, nombre del paciente, fecha de ingreso y una tabla Fecha | Evolución.
  imprimirEvolucion(): void {
    const reg = this.registro();
    if (!reg) return;
    const html = construirHtmlEvolucion(reg, this.nombrePaciente(reg.hospitalizacion.idPaciente), (id) => this.medicoLabel(id));
    abrirVentanaImpresion(html);
  }

  // ==================== Hoja de Control de Medicamentos ====================
  medicamentoLabel(idMedicamento: number): string {
    return this.medicamentos().find((m) => m.idMedicamento === idMedicamento)?.nombre ?? '—';
  }

  formatHora(hora: string): string {
    return hora ? hora.slice(0, 5) : '—';
  }

  abrirAgregarMedicamentoProgramado(): void {
    this.medicamentoProgramadoNuevo.set({ idMedicamento: null, hora: '', fechaInicial: new Date(), observaciones: '' });
  }

  cancelarAgregarMedicamentoProgramado(): void {
    this.medicamentoProgramadoNuevo.set(null);
  }

  guardarMedicamentoProgramado(p: { idMedicamento: number | null; hora: string; fechaInicial: Date | null; observaciones: string }): void {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;
    if (!p.idMedicamento || !p.hora || !p.fechaInicial) {
      this.notif.error('Completa el medicamento, la hora y la fecha inicial');
      return;
    }

    this.guardandoMedicamentoProgramado.set(true);
    this.hospitalizacionesService
      .agregarMedicamentoProgramado(idHospitalizacion, {
        idMedicamento: p.idMedicamento,
        hora: `${p.hora}:00`,
        fechaInicial: toIsoDateTime(p.fechaInicial)!,
        observaciones: p.observaciones.trim() || null,
      })
      .subscribe({
        next: () => {
          this.guardandoMedicamentoProgramado.set(false);
          this.medicamentoProgramadoNuevo.set(null);
          this.cargarDesdeBackend(idHospitalizacion);
          this.notif.exito('Medicamento programado correctamente');
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoMedicamentoProgramado.set(false);
          console.error('❌ Error al programar medicamento:', err);
          this.notif.error('No se pudo programar el medicamento');
        },
      });
  }

  async eliminarMedicamentoProgramado(p: MedicamentoProgramadoHospitalizacion): Promise<void> {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;
    if (!(await this.confirmacion.confirmar(`¿Quitar "${this.medicamentoLabel(p.idMedicamento)}" de la hoja de control?`))) return;

    this.hospitalizacionesService.eliminarMedicamentoProgramado(idHospitalizacion, p.idMedicamentoProgramado).subscribe({
      next: () => this.notif.exito('Medicamento quitado de la hoja de control'),
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al quitar medicamento programado:', err);
        this.notif.error('No se pudo quitar el medicamento');
      },
    });
  }

  marcarAdministrado(p: MedicamentoProgramadoHospitalizacion): void {
    const idHospitalizacion = this.idHospitalizacion();
    const idEmpleado = this.registro()?.hospitalizacion.idMedicoResponsable;
    if (!idHospitalizacion || !idEmpleado) return;

    this.hospitalizacionesService
      .agregarAdministracion(idHospitalizacion, p.idMedicamentoProgramado, { idEmpleado, fechaHora: toIsoDateTime(new Date())! })
      .subscribe({
        next: () => this.notif.exito('Dosis marcada como administrada'),
        error: (err: HttpErrorResponse) => {
          console.error('❌ Error al marcar administración:', err);
          this.notif.error('No se pudo marcar la dosis');
        },
      });
  }

  async eliminarAdministracion(p: MedicamentoProgramadoHospitalizacion, a: AdministracionMedicamento): Promise<void> {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;
    if (!(await this.confirmacion.confirmar('¿Quitar esta marca de administración?'))) return;

    this.hospitalizacionesService.eliminarAdministracion(idHospitalizacion, p.idMedicamentoProgramado, a.idAdministracion).subscribe({
      next: () => this.notif.exito('Marca eliminada'),
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al quitar administración:', err);
        this.notif.error('No se pudo quitar la marca');
      },
    });
  }

  // Reproduce el papel físico "HOJA DE CONTROL DE MEDICAMENTOS": logo,
  // nombre del paciente, sala/cama, y una cuadrícula con una fila por
  // medicamento y una columna por cada día del mes actual, marcando "X"
  // los días en que se administró.
  imprimirControlMedicamentos(): void {
    const reg = this.registro();
    if (!reg) return;
    const html = construirHtmlControlMedicamentos(
      reg,
      this.nombrePaciente(reg.hospitalizacion.idPaciente),
      (id) => this.medicamentoLabel(id),
      (hora) => this.formatHora(hora),
    );
    abrirVentanaImpresion(html);
  }

  // ==================== Control de Signos ====================
  abrirAgregarControlSignos(): void {
    this.controlSignosNuevo.set({ presionArterial: '', temperatura: null, frecuenciaRespiratoria: null, observaciones: '' });
  }

  cancelarAgregarControlSignos(): void {
    this.controlSignosNuevo.set(null);
  }

  guardarControlSignos(c: { presionArterial: string; temperatura: number | null; frecuenciaRespiratoria: number | null; observaciones: string }): void {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;

    this.guardandoControlSignos.set(true);
    this.hospitalizacionesService
      .agregarControlSignos(idHospitalizacion, {
        fechaHora: toIsoDateTime(new Date())!,
        presionArterial: c.presionArterial.trim() || null,
        temperatura: c.temperatura,
        frecuenciaRespiratoria: c.frecuenciaRespiratoria,
        observaciones: c.observaciones.trim() || null,
      })
      .subscribe({
        next: () => {
          this.guardandoControlSignos.set(false);
          this.controlSignosNuevo.set(null);
          this.cargarDesdeBackend(idHospitalizacion);
          this.notif.exito('Control de signos registrado correctamente');
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoControlSignos.set(false);
          console.error('❌ Error al registrar control de signos:', err);
          this.notif.error('No se pudo registrar el control de signos');
        },
      });
  }

  async eliminarControlSignos(c: ControlSignosHospitalizacion): Promise<void> {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;
    if (!(await this.confirmacion.confirmar('¿Quitar este control de signos?'))) return;

    this.hospitalizacionesService.eliminarControlSignos(idHospitalizacion, c.idControlSignos).subscribe({
      next: () => this.notif.exito('Control de signos eliminado'),
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al quitar control de signos:', err);
        this.notif.error('No se pudo quitar el control de signos');
      },
    });
  }

  // Reproduce el papel físico "CONTROL DE SIGNOS" del Sanatorio Medicentro:
  // logo, datos generales y una tabla Fecha/Hora/P.A./Temperatura/F.R./Observaciones.
  // Edad resuelta desde el directorio de pacientes (compartido por los
  // documentos de impresión que la necesitan: Control de signos, Costo paciente).
  private edadPaciente(idPaciente: number): number | null {
    const paciente = this.pacientesService.directorio().find((p) => p.idPaciente === idPaciente);
    if (!paciente?.fechaNacimiento) return null;
    return Math.floor(
      (Date.now() - new Date(paciente.fechaNacimiento.slice(0, 10) + 'T00:00:00').getTime()) / (365.25 * 24 * 60 * 60 * 1000),
    );
  }

  imprimirControlSignos(): void {
    const reg = this.registro();
    if (!reg) return;
    const html = construirHtmlControlSignos(
      reg,
      this.nombrePaciente(reg.hospitalizacion.idPaciente),
      this.edadPaciente(reg.hospitalizacion.idPaciente),
    );
    abrirVentanaImpresion(html);
  }

  // ==================== Costo Paciente ====================
  abrirAgregarCostoPaciente(): void {
    this.costoPacienteNuevo.set({ idMedicamento: null, fecha: new Date(), descripcion: '', cantidad: 1, valorUnitario: null });
  }

  cancelarAgregarCostoPaciente(): void {
    this.costoPacienteNuevo.set(null);
  }

  // Al elegir un medicamento del catálogo, prellena descripción y valor
  // unitario (siguen siendo editables, para renglones que no calcen exacto).
  onSeleccionarMedicamentoCosto(c: { idMedicamento: number | null; descripcion: string; valorUnitario: number | null }): void {
    const m = c.idMedicamento != null ? this.medicamentos().find((x) => x.idMedicamento === c.idMedicamento) : null;
    if (m) {
      c.descripcion = m.nombre;
      c.valorUnitario = m.precioVentaPublico;
    }
  }

  guardarCostoPaciente(c: { idMedicamento: number | null; fecha: Date | null; descripcion: string; cantidad: number | null; valorUnitario: number | null }): void {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;
    if (!c.fecha || !c.descripcion.trim() || !c.cantidad || c.valorUnitario === null) {
      this.notif.error('Completa la fecha, descripción, cantidad y valor unitario');
      return;
    }

    this.guardandoCostoPaciente.set(true);
    this.hospitalizacionesService
      .agregarCostoPaciente(idHospitalizacion, {
        idMedicamento: c.idMedicamento,
        fecha: toIsoDateTime(c.fecha)!,
        descripcion: c.descripcion.trim(),
        cantidad: c.cantidad,
        valorUnitario: c.valorUnitario,
      })
      .subscribe({
        next: () => {
          this.guardandoCostoPaciente.set(false);
          this.costoPacienteNuevo.set(null);
          this.cargarDesdeBackend(idHospitalizacion);
          this.notif.exito('Costo registrado correctamente');
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoCostoPaciente.set(false);
          console.error('❌ Error al registrar costo:', err);
          this.notif.error('No se pudo registrar el costo');
        },
      });
  }

  async eliminarCostoPaciente(c: CostoPacienteHospitalizacion): Promise<void> {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;
    if (!(await this.confirmacion.confirmar(`¿Quitar "${c.descripcion}" de los costos del paciente?`))) return;

    this.hospitalizacionesService.eliminarCostoPaciente(idHospitalizacion, c.idCostoPaciente).subscribe({
      next: () => this.notif.exito('Costo eliminado'),
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al quitar costo:', err);
        this.notif.error('No se pudo quitar el costo');
      },
    });
  }

  totalCostosPaciente(costos: CostoPacienteHospitalizacion[]): number {
    return costos.reduce((acc, c) => acc + c.cantidad * c.valorUnitario, 0);
  }

  // Reproduce el papel físico "COSTO PACIENTE" del Sanatorio Medicentro:
  // logo, datos generales y una tabla Fecha/Medicamentos/Cantidad/Valor, con
  // el total al final.
  imprimirCostoPaciente(): void {
    const reg = this.registro();
    if (!reg) return;
    const html = construirHtmlCostoPaciente(
      reg,
      this.nombrePaciente(reg.hospitalizacion.idPaciente),
      this.edadPaciente(reg.hospitalizacion.idPaciente),
    );
    abrirVentanaImpresion(html);
  }

  abrirEditarOrden(orden: OrdenMedicaHospitalizacion): void {
    this.ordenEditando.set({ ...orden });
  }

  cancelarEditarOrden(): void {
    this.ordenEditando.set(null);
  }

  guardarEdicionOrden(orden: OrdenMedicaHospitalizacion): void {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;

    this.guardandoOrden.set(true);
    this.hospitalizacionesService
      .actualizarOrden(idHospitalizacion, orden.idOrdenMedica, {
        idMedico: orden.idMedico,
        idTipoOrden: orden.idTipoOrden,
        fechaOrden: orden.fechaOrden,
        descripcion: orden.descripcion,
      })
      .subscribe({
        next: () => {
          this.guardandoOrden.set(false);
          this.ordenEditando.set(null);
          this.cargarDesdeBackend(idHospitalizacion);
          this.notif.exito('Orden médica actualizada correctamente');
        },
        error: (err: HttpErrorResponse) => {
          this.guardandoOrden.set(false);
          console.error('❌ Error al actualizar orden:', err);
          this.notif.error('No se pudo actualizar la orden');
        },
      });
  }

  async eliminarOrden(orden: OrdenMedicaHospitalizacion): Promise<void> {
    const idHospitalizacion = this.idHospitalizacion();
    if (!idHospitalizacion) return;

    if (!(await this.confirmacion.confirmar(`¿Eliminar la orden "${orden.descripcion}"?`))) return;

    this.hospitalizacionesService
      .eliminarOrden(idHospitalizacion, orden.idOrdenMedica)
      .subscribe({
        next: () => {
          this.cargarDesdeBackend(idHospitalizacion);
          this.notif.exito('Orden médica eliminada correctamente');
        },
        error: (err: HttpErrorResponse) => {
          console.error('❌ Error al eliminar orden:', err);
          this.notif.error('No se pudo eliminar la orden');
        },
      });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notif.error('Revisá los campos obligatorios');
      return;
    }

    const v = this.form.getRawValue();
    const idHospitalizacion = this.idHospitalizacion();
    const camaSeleccionada = this.camasTodas().find((c) => c.id === v.idCama) ?? null;
    const camaOriginal = this.camaOriginal();
    const cambioEstado = this.esNueva()
      ? true
      : camaOriginal?.id !== camaSeleccionada?.id;

    const registro: Hospitalizacion = {
      idHospitalizacion,
      idPaciente: v.idPaciente!,
      // No se edita aquí: se conserva si ya venía de una consulta (ver
      // SOLICITUD_MOTOR_CONSULTAS.md); null si se creó suelta desde este módulo.
      idCita: this.registro()?.hospitalizacion.idCita ?? null,
      idCama: v.idCama!,
      idMedicoResponsable: v.idMedicoResponsable!,
      fechaIngreso: toIsoDateTime(v.fechaIngreso)!,
      fechaEgreso: toIsoDateTime(v.fechaEgreso),
      motivoIngreso: v.motivoIngreso,
      diagnosticoEgreso: v.diagnosticoEgreso || null,
      idEstadoHospitalizacion: v.idEstadoHospitalizacion!,
      activo: true,
      fechaCreacion: this.esNueva()
        ? toIsoDateTime(new Date())!
        : (this.hospitalizacionesService.obtener(idHospitalizacion)?.hospitalizacion.fechaCreacion ??
            toIsoDateTime(new Date())!),
      fechaModificacion: this.esNueva() ? null : toIsoDateTime(new Date()),
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    };

    this.guardando.set(true);
    this.errorGuardar.set(null);

    this.hospitalizacionesService.guardar(registro).subscribe({
      next: (resp: any) => {
        const id =
          resp?.datos?.hospitalizacion?.idHospitalizacion ??
          resp?.datos?.idHospitalizacion ??
          0;

        if (cambioEstado) {
          this.aplicarCambioDeCama(camaOriginal, camaSeleccionada, id);
        } else {
          this.guardando.set(false);
          this.notif.exito(
            this.esNueva()
              ? 'Ingreso hospitalario creado correctamente'
              : 'Ingreso hospitalario actualizado correctamente',
          );
          this.router.navigate(['/home/hospitalizacion', id]);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorGuardar.set(
          err.status === 401
            ? 'Tu sesión expiró. Cierra sesión y vuelve a iniciarla.'
            : 'No se pudo guardar el ingreso. Intenta de nuevo.',
        );
        console.error('Error al guardar hospitalización:', err);
        this.notif.error('No se pudo guardar el ingreso');
      },
    });
  }

  private aplicarCambioDeCama(
    camaAnterior: CamaOpcion | null,
    camaNueva: CamaOpcion | null,
    idHospitalizacion: number,
  ): void {
    const idOcupada = this.hospitalizacionesService.idPorCodigo('ESTADO_CAMA', 'OCUPADA');
    const idLibre = this.hospitalizacionesService.idPorCodigo('ESTADO_CAMA', 'LIBRE');
    const idActiva = this.hospitalizacionesService.idPorCodigo('ESTADO_HOSPITALIZACION', 'ACTIVA');

    if (idOcupada == null || idLibre == null || idActiva == null) {
      this.guardando.set(false);
      console.error('❌ No se pudieron resolver los IDs de catálogo');
      this.notif.error(
        'No se pudo actualizar el estado de las camas. Verificá los catálogos.',
      );
      this.router.navigate(['/home/hospitalizacion', idHospitalizacion]);
      return;
    }

    const estadoFinal: number =
      this.form.controls.idEstadoHospitalizacion.value === idActiva
        ? idOcupada
        : idLibre;

    const operaciones: any[] = [];

    if (camaAnterior && camaAnterior.id !== camaNueva?.id) {
      operaciones.push(
        this.hospitalizacionesService.actualizarEstadoCama(camaAnterior, idLibre),
      );
    }

    if (camaNueva) {
      operaciones.push(
        this.hospitalizacionesService.actualizarEstadoCama(camaNueva, estadoFinal),
      );
    }

    if (operaciones.length === 0) {
      this.guardando.set(false);
      this.notif.exito(
        this.esNueva()
          ? 'Ingreso hospitalario creado correctamente'
          : 'Ingreso hospitalario actualizado correctamente',
      );
      this.router.navigate(['/home/hospitalizacion', idHospitalizacion]);
      return;
    }

    let idx = 0;
    const siguiente = () => {
      if (idx >= operaciones.length) {
        this.guardando.set(false);
        this.notif.exito(
          this.esNueva()
            ? 'Ingreso hospitalario creado correctamente'
            : 'Ingreso hospitalario actualizado correctamente',
        );
        this.router.navigate(['/home/hospitalizacion', idHospitalizacion]);
        return;
      }
      const op = operaciones[idx++];
      op.subscribe({
        next: () => siguiente(),
        error: (err: HttpErrorResponse) => {
          console.error('❌ Error al actualizar estado de cama:', err.status);
          this.notif.error('No se pudo actualizar el estado de una cama');
          siguiente();
        },
      });
    };
    siguiente();
  }

  abrirHistorial(tabla: string, id: number, titulo: string): void {
    this.registroHistorial.set({ tabla, id, titulo });
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.hospitalizacionesService.RetornarBitacoraPorRegistro(tabla, id).subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al cargar bitácora:', err.status);
        this.cargandoHistorial.set(false);
        this.notif.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorial(): void {
    this.historialAbierto.set(false);
    this.registroHistorial.set(null);
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
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario ${idUsuario}`;
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

      // ✅ idRegistroAfectado viene directo del backend y NO está corrupto.
      const idReal = item.idRegistroAfectado;

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        // ✅ FIX: para IdOrdenMedica, reemplazamos el valor corrupto
        //    con el id real. "antes" como null, "después" como id real,
        //    así NUNCA son iguales y siempre se muestra.
        if (k === 'IdOrdenMedica' && idReal != null) {
          a = null;
          d = String(idReal);
        }

        if (JSON.stringify(a) === JSON.stringify(d)) continue;

        cambios.push({
          campo: this.formatearNombreCampo(k),
          antes: this.formatearValor(a, k),
          despues: this.formatearValor(d, k),
        });
      }

      cambios.sort((x, y) => {
        if (x.campo.toLowerCase().includes('id orden')) return -1;
        if (y.campo.toLowerCase().includes('id orden')) return 1;
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

    if (/id ?medico/i.test(nombreCampo) && valor != null) {
      const nombre = this.medicoLabel(Number(valor));
      if (nombre && nombre !== '—') return nombre;
    }

    if (this.esCampoFecha(nombreCampo) && typeof valor === 'string') {
      const isoConZona = valor.endsWith('Z') ? valor : valor + 'Z';
      const fecha = new Date(isoConZona);
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