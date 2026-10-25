import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, ElementRef, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { listaOpcional } from '../../shared/lista-opcional';

import { BitacoraItem, CitaService } from '../../service/cita.service';
import { PacienteService } from '../../service/paciente.service';
import { EmpleadoService } from '../../service/empleado.service';
import { CatalogoService } from '../../service/catalogo.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { Cita } from '../../models/cita.model';
import { esConsultaDeLaboratorio } from '../../shared/tipo-consulta.util';
import { PacienteListado, PacienteAlergia, PacienteAntecedente } from '../../models/paciente.model';
import { Medico } from '../../models/medico.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

// Una tarjeta por paciente en el nivel 1 de esta pantalla.
interface PacienteConConsultas {
  idPaciente: number;
  nombre: string;
  cantidad: number;
  ultimaFecha: string;
}

// El expediente clínico ya no es una lista plana de registros sueltos: es
// el historial de CONSULTAS de un paciente (SOLICITUD_MOTOR_CONSULTAS.md,
// secciones 2 y 9). Nivel 1 = una tarjeta por paciente (sin repetir).
// Nivel 2 (clic en la tarjeta) = sus consultas; cada consulta lleva a su
// pantalla de atención, donde viven los datos clínicos, el recetario, los
// exámenes y el enlace a hospitalización — ya no sueltos aquí.
@Component({
  selector: 'app-expedientes-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './expedientes-lista.html',
  styleUrl: './expedientes-lista.css',
})
export class ExpedientesLista {
  private citaService = inject(CitaService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private pacienteService = inject(PacienteService);
  private empleadoService = inject(EmpleadoService);
  private catalogoService = inject(CatalogoService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');

  cargando = signal(false);
  errorCarga = signal('');

  private citas = signal<Cita[]>([]);
  private pacientesApi = signal<PacienteListado[]>([]);
  private medicos = signal<Medico[]>([]);
  private estadosCita = signal<CatalogoOpcion[]>([]);
  private tiposOperacion = signal<CatalogoOpcion[]>([]);
  private tiposAlergia = signal<CatalogoOpcion[]>([]);
  private severidades = signal<CatalogoOpcion[]>([]);
  private tiposAntecedente = signal<CatalogoOpcion[]>([]);

  // Nivel 1 (null) o paciente seleccionado (nivel 2).
  pacienteSeleccionado = signal<number | null>(null);

  // "Vistazo rápido" del paciente antes de entrar a una consulta en
  // particular. Lo básico ya está cargado con el listado; alergias y
  // antecedentes se piden al backend solo al abrirlo (no para cada
  // paciente del listado, uno por uno).
  vistazoAbierto = signal(false);
  cargandoVistazo = signal(false);
  private idPacienteConVistazoCargado: number | null = null;
  alergiasPaciente = signal<PacienteAlergia[]>([]);
  antecedentesPaciente = signal<PacienteAntecedente[]>([]);

  // ============================================================
  // Historial general de auditoría (tabla real: citas)
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    // Si se vuelve desde la atención de una consulta (ver consulta-atencion.ts,
    // back-link), este query param trae de regreso directo a las consultas
    // de ese paciente en vez de a la lista completa de pacientes.
    const idPacienteParam = this.route.snapshot.queryParamMap.get('paciente');
    if (idPacienteParam) {
      this.pacienteSeleccionado.set(Number(idPacienteParam));
    }

    // En el servidor (SSR) no hay sesión ni token: solo se consulta desde el navegador.
    if (isPlatformBrowser(this.platformId)) {
      this.cargar();
    }
  }

  private cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    forkJoin({
      citas: this.citaService.RetornarCitas(),
      pacientes: this.pacienteService.RetornarPacientes(),
      pacientesEliminados: this.pacienteService.RetornarPacientesEliminados().pipe(listaOpcional()),
      medicos: this.empleadoService.RetornarMedicos(),
      estados: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.ESTADO_CITA),
      tiposOperacion: this.catalogoService.RetornarCatalogo('TIPO_OPERACION').pipe(listaOpcional()),
      tiposAlergia: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.TIPO_ALERGIA).pipe(listaOpcional()),
      severidades: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.SEVERIDAD).pipe(listaOpcional()),
      tiposAntecedente: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.TIPO_ANTECEDENTE).pipe(listaOpcional()),
    }).subscribe({
      next: (r) => {
        this.citas.set((r.citas.datos ?? []).map((c) => c.cita));
        this.pacientesApi.set([...(r.pacientes.datos ?? []), ...(r.pacientesEliminados.datos ?? [])]);
        this.medicos.set(r.medicos.datos ?? []);
        this.estadosCita.set(r.estados.datos ?? []);
        this.tiposOperacion.set(r.tiposOperacion.datos ?? []);
        this.tiposAlergia.set(r.tiposAlergia.datos ?? []);
        this.severidades.set(r.severidades.datos ?? []);
        this.tiposAntecedente.set(r.tiposAntecedente.datos ?? []);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.errorCarga.set('No se pudieron cargar los expedientes: ' + err.message);
      },
    });
  }

  // ==================== Nivel 1: tarjetas por paciente ====================
  pacientesConConsultas = computed<PacienteConConsultas[]>(() => {
    const porPaciente = new Map<number, Cita[]>();
    for (const c of this.citas()) {
      const lista = porPaciente.get(c.idPaciente) ?? [];
      lista.push(c);
      porPaciente.set(c.idPaciente, lista);
    }

    const term = this.buscar().trim().toLowerCase();
    const resultado: PacienteConConsultas[] = [];
    for (const [idPaciente, lista] of porPaciente) {
      const nombre = this.nombrePaciente(idPaciente);
      if (term && !nombre.toLowerCase().includes(term)) {
        continue;
      }
      const ordenadas = [...lista].sort((a, b) => b.fechaHoraInicio.localeCompare(a.fechaHoraInicio));
      resultado.push({
        idPaciente,
        nombre,
        cantidad: ordenadas.length,
        ultimaFecha: ordenadas[0].fechaHoraInicio,
      });
    }
    return resultado.sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  // ==================== Nivel 2: consultas del paciente elegido ====================
  nombrePacienteActual = computed(() => {
    const id = this.pacienteSeleccionado();
    return id ? this.nombrePaciente(id) : '';
  });

  consultasDelPaciente = computed<Cita[]>(() => {
    const id = this.pacienteSeleccionado();
    if (!id) {
      return [];
    }
    return this.citas()
      .filter((c) => c.idPaciente === id)
      .sort((a, b) => b.fechaHoraInicio.localeCompare(a.fechaHoraInicio));
  });

  // Datos útiles para el médico ANTES de entrar a una consulta en
  // particular: la más reciente, la última vez que se marcó para
  // operación, y un vistazo rápido de la ficha del paciente.
  ultimaConsulta = computed<Cita | null>(() => this.consultasDelPaciente()[0] ?? null);

  ultimaOperacion = computed<Cita | null>(
    () => this.consultasDelPaciente().find((c) => c.requiereOperacion) ?? null,
  );

  esLaboratorio(c: Cita): boolean {
    return esConsultaDeLaboratorio(c.notas);
  }

  pacienteActual = computed<PacienteListado | null>(() => {
    const id = this.pacienteSeleccionado();
    return id ? this.pacientesApi().find((p) => p.idPaciente === id) ?? null : null;
  });

  nombreTipoOperacion(idTipoOperacion: number | null): string {
    if (idTipoOperacion === null) return 'tipo sin especificar';
    return this.tiposOperacion().find((t) => t.id === idTipoOperacion)?.nombre ?? 'tipo sin especificar';
  }

  tipoAlergiaLabel(idTipoAlergia: number): string {
    return this.tiposAlergia().find((t) => t.id === idTipoAlergia)?.nombre ?? '—';
  }

  severidadLabel(idSeveridad: number): string {
    return this.severidades().find((s) => s.id === idSeveridad)?.nombre ?? '—';
  }

  tipoAntecedenteLabel(idTipoAntecedente: number): string {
    return this.tiposAntecedente().find((t) => t.id === idTipoAntecedente)?.nombre ?? '—';
  }

  toggleVistazo(): void {
    const abrir = !this.vistazoAbierto();
    this.vistazoAbierto.set(abrir);

    const idPaciente = this.pacienteSeleccionado();
    if (!abrir || !idPaciente || this.idPacienteConVistazoCargado === idPaciente) {
      return;
    }

    this.cargandoVistazo.set(true);
    this.pacienteService.RetornarPaciente(idPaciente).subscribe({
      next: (resp) => {
        this.idPacienteConVistazoCargado = idPaciente;
        this.alergiasPaciente.set((resp.datos?.alergias ?? []).filter((a) => a.activo));
        this.antecedentesPaciente.set((resp.datos?.antecedentes ?? []).filter((a) => a.activo));
        this.cargandoVistazo.set(false);
      },
      error: () => {
        this.cargandoVistazo.set(false);
        this.notificaciones.error('No se pudieron cargar las alergias y antecedentes del paciente');
      },
    });
  }

  seleccionarPaciente(idPaciente: number): void {
    this.pacienteSeleccionado.set(idPaciente);
    this.vistazoAbierto.set(false);
    this.idPacienteConVistazoCargado = null;
    this.alergiasPaciente.set([]);
    this.antecedentesPaciente.set([]);
  }

  volverAPacientes(): void {
    this.pacienteSeleccionado.set(null);
  }

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesApi().find((pac) => pac.idPaciente === idPaciente);
    if (!p) {
      return 'Paciente no encontrado';
    }
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
  }

  iniciales(idPaciente: number): string {
    const partes = this.nombrePaciente(idPaciente).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  medicoLabel(idMedico: number): string {
    return this.medicos().find((m) => m.idEmpleado === idMedico)?.nombreCompleto ?? '—';
  }

  estadoLabel(idEstadoCita: number): string {
    return this.estadosCita().find((e) => e.id === idEstadoCita)?.nombre ?? '—';
  }

  formatFechaSolo(iso: string | null): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatFecha(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.citaService.RetornarBitacoraGeneral('citas').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora expedientes:', err.status);
        this.cargandoHistorial.set(false);
        this.notificaciones.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorialGeneral(): void {
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

  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  formatFechaHoraUTC(iso: string): string {
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
}
