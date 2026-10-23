import { esSinPermiso } from '../../service/error.service';
import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
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
import { PacienteListado } from '../../models/paciente.model';
import { Medico } from '../../models/medico.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

// La tabla `citas` no tiene columna de tipo de consulta (Primera vez /
// Reconsulta): el formulario lo guarda al inicio de `notas` con este prefijo.
const PREFIJO_TIPO = /^Tipo de consulta: ([^.\n]+)\.?\s*/;

type Vista = 'activas' | 'eliminadas';

// Fila que muestra la lista (misma forma que usaba la pantalla antes).
interface ConsultaFila {
  idCita: number;
  idPaciente: number;
  idMedico: number;
  fechaHoraInicio: string;
  idEstadoCita: number;
  idTipoConsulta: number | null; // id del catálogo TIPO_CONSULTA
  motivoConsulta: string | null;
  requiereOperacion: boolean;
  fechaModificacion: string | null;
  idUsuarioModificacion: number | null;
}

@Component({
  selector: 'app-consultas-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './consultas-lista.html',
  styleUrl: './consultas-lista.css',
})
export class ConsultasLista {
  private citaService = inject(CitaService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private pacienteService = inject(PacienteService);
  private empleadoService = inject(EmpleadoService);
  private catalogoService = inject(CatalogoService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private platformId = inject(PLATFORM_ID);
  private confirmacion = inject(ConfirmacionService);

  buscar = signal('');

  // Pestaña activa: consultas activas o dadas de baja.
  vista = signal<Vista>('activas');
  cargando = signal(false);
  errorCarga = signal('');

  // Datos reales desde la API (ya no hay datos de ejemplo).
  private lista = signal<ConsultaFila[]>([]);
  private eliminadas = signal<ConsultaFila[]>([]);
  private eliminadasCargadas = false;
  // Pacientes activos y eliminados, para mostrar el nombre aunque el paciente
  // haya sido dado de baja.
  private pacientesApi = signal<PacienteListado[]>([]);
  private medicos = signal<Medico[]>([]);
  private estados = signal<CatalogoOpcion[]>([]);
  private tiposConsulta = signal<CatalogoOpcion[]>([]);

  // ============================================================
  // Historial general de Citas
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
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
      tiposConsulta: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.TIPO_CONSULTA),
    }).subscribe({
      next: (r) => {
        this.tiposConsulta.set(r.tiposConsulta.datos ?? []);
        this.lista.set((r.citas.datos ?? []).map((c) => this.aFila(c.cita)));
        this.pacientesApi.set([...(r.pacientes.datos ?? []), ...(r.pacientesEliminados.datos ?? [])]);
        this.medicos.set(r.medicos.datos ?? []);
        this.estados.set(r.estados.datos ?? []);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.errorCarga.set('No se pudieron cargar las consultas: ' + err.message);
      },
    });
  }

  private cargarActivas(): void {
    this.citaService.RetornarCitas().subscribe({
      next: (resp) => this.lista.set((resp.datos ?? []).map((c) => this.aFila(c.cita))),
      error: (err: Error) => this.errorCarga.set('No se pudieron cargar las consultas: ' + err.message),
    });
  }

  private cargarEliminadas(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.citaService.RetornarCitasEliminadas().subscribe({
      next: (resp) => {
        this.eliminadas.set((resp.datos ?? []).map((c) => this.aFila(c.cita)));
        this.eliminadasCargadas = true;
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        // Sin acceso a lo eliminado: se muestra el mensaje de "no hay registros".
        if (esSinPermiso(err)) {
          this.eliminadas.set([]);
          return;
        }
        this.errorCarga.set('No se pudieron cargar las consultas eliminadas: ' + err.message);
      },
    });
  }

  verActivas(): void {
    // El error de la pestaña "Eliminadas" no aplica a las activas.
    this.errorCarga.set('');
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.eliminadasCargadas) {
      this.cargarEliminadas();
    }
  }

  private aFila(c: Cita): ConsultaFila {
    return {
      idCita: c.idCita,
      idPaciente: c.idPaciente,
      idMedico: c.idMedico,
      fechaHoraInicio: c.fechaHoraInicio,
      idEstadoCita: c.idEstadoCita,
      idTipoConsulta: this.idTipoConsultaDesdeNotas(c.notas),
      motivoConsulta: c.motivoConsulta,
      requiereOperacion: c.requiereOperacion,
      fechaModificacion: c.fechaModificacion,
      idUsuarioModificacion: c.idUsuarioModificacion,
    };
  }

  // Traduce el texto guardado en `notas` ("Tipo de consulta: Reconsulta.") al id del catálogo.
  private idTipoConsultaDesdeNotas(notas: string | null): number | null {
    const nombre = notas?.match(PREFIJO_TIPO)?.[1]?.trim();
    if (!nombre) return null;
    return this.tiposConsulta().find((t) => t.nombre === nombre)?.id ?? null;
  }

  consultas = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activas' ? this.lista() : this.eliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((c) =>
      [this.nombrePaciente(c.idPaciente), this.medicoLabel(c.idMedico), c.motivoConsulta]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

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

  medicoLabel(idMedico: number | null): string {
    return this.medicos().find((m) => m.idEmpleado === idMedico)?.nombreCompleto ?? '—';
  }

  tipoConsultaLabel(idTipoConsulta: number | null): string {
    return this.tiposConsulta().find((t) => t.id === idTipoConsulta)?.nombre ?? '—';
  }

  estadoLabel(idEstadoCita: number): string {
    return this.estados().find((e) => e.id === idEstadoCita)?.nombre ?? '—';
  }

  // Se compara por código: los ids reales dependen de cada base.
  estadoClase(idEstadoCita: number): string {
    const codigo = this.estados().find((e) => e.id === idEstadoCita)?.codigo;
    if (codigo === 'ATENDIDA') return 'estado-atendida';
    if (codigo === 'CANCELADA') return 'estado-cancelada';
    if (codigo === 'EN_ATENCION') return 'estado-en-atencion';
    return 'estado-programada';
  }

  formatFechaHora(iso: string | null): string {
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

  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  async eliminar(c: ConsultaFila): Promise<void> {
    const paciente = this.nombrePaciente(c.idPaciente);
    if (!(await this.confirmacion.confirmar(`¿Eliminar la consulta de "${paciente}"?`))) {
      return;
    }
    this.citaService.EliminarCita(c.idCita).subscribe({
      next: () => {
        this.lista.update((l) => l.filter((x) => x.idCita !== c.idCita));
        // Se vuelve a pedir la lista de eliminadas la próxima vez que se abra
        // la pestaña, para traer quién y cuándo la dio de baja.
        this.eliminadasCargadas = false;
        this.notificaciones.exito(`Consulta de "${paciente}" eliminada correctamente`);
      },
      error: (err: Error) => this.notificaciones.error('No se pudo eliminar la consulta: ' + err.message),
    });
  }

  async reactivar(c: ConsultaFila): Promise<void> {
    const paciente = this.nombrePaciente(c.idPaciente);
    if (!(await this.confirmacion.confirmar(`¿Reactivar la consulta de "${paciente}"?`))) {
      return;
    }
    this.citaService.ReactivarCita(c.idCita).subscribe({
      next: () => {
        this.eliminadas.update((l) => l.filter((x) => x.idCita !== c.idCita));
        this.cargarActivas();
        this.notificaciones.exito(`Consulta de "${paciente}" reactivada correctamente`);
      },
      error: (err: Error) => this.notificaciones.error('No se pudo reactivar la consulta: ' + err.message),
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
        console.error('❌ Error bitácora citas:', err.status);
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

  tablaLabel(tabla: string): string {
    if (tabla === 'citas') return 'Cita';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'citas') return 'event';
    return 'description';
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