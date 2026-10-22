import { esSinPermiso } from '../../service/error.service';
import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, ElementRef, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { MENU_SECTIONS } from '../../shared/menu-data';

import { PacienteService, BitacoraItem } from '../../service/paciente.service';
import { CatalogoService } from '../../service/catalogo.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { PacienteListado } from '../../models/paciente.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-pacientes-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './pacientes-lista.html',
  styleUrl: './pacientes-lista.css',
})
export class PacientesLista {
  private pacienteService = inject(PacienteService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private catalogoService = inject(CatalogoService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');

  // Mientras se busca, se ocultan recientes/opciones para dar una vista
  // más centrada en los resultados (menos ruido visual).
  buscando = computed(() => this.buscar().trim().length > 0);

  // "Búsqueda de expediente" (menú) trae ?foco=buscar para distinguirse de
  // solo entrar a "Recepción": en vez de aterrizar en la misma vista general,
  // enfoca directo el buscador y lo resalta un momento.
  resaltarBusqueda = signal(false);

  // Pestaña activa: pacientes activos o dados de baja.
  vista = signal<Vista>('activos');
  cargando = signal(false);
  errorCarga = signal('');

  // Datos reales desde la API (/api/Pacientes y /api/catalogos).
  private lista = signal<PacienteListado[]>([]);
  private eliminados = signal<PacienteListado[]>([]);
  private eliminadosCargados = false;
  private tiposDocumento = signal<CatalogoOpcion[]>([]);
  private estadosPaciente = signal<CatalogoOpcion[]>([]);

  // ============================================================
  // Historial general de Pacientes
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });

    // En el prerender (servidor) no hay sesión ni token: solo se consulta
    // la API desde el navegador.
    if (isPlatformBrowser(this.platformId)) {
      this.cargarCatalogos();
      this.cargarPacientes();
    }
  }

  // El módulo "Recepción" del menú ahora entra directo a esta pantalla, así
  // que sus demás opciones se muestran aquí abajo para no perderlas.
  opcionesRecepcion = (MENU_SECTIONS.find((s) => s.slug === 'recepcion')?.items ?? []).filter(
    (item) => item.route !== '/home/pacientes',
  );

  pacientes = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.lista() : this.eliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((p) =>
      [p.codigoExpediente, p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido, p.numeroDocumento]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  // Últimos 5 expedientes, solo cuando hay más de un paciente registrado
  // (con uno solo no aporta nada mostrar un "recientes" aparte de la lista).
  mostrarRecientes = computed(() => this.vista() === 'activos' && this.lista().length > 1);

  recientes = computed(() =>
    [...this.lista()]
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
      .slice(0, 5),
  );

  verActivos(): void {
    // El error de la pestaña "Eliminados" no aplica a los activos.
    this.errorCarga.set('');
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    if (!this.eliminadosCargados) {
      this.cargarEliminados();
    }
  }

  private cargarPacientes(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.pacienteService.RetornarPacientes().subscribe({
      next: (resp) => {
        this.lista.set(resp.datos ?? []);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.errorCarga.set('No se pudieron cargar los pacientes: ' + err.message);
      },
    });
  }

  private cargarEliminados(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.pacienteService.RetornarPacientesEliminados().subscribe({
      next: (resp) => {
        this.eliminados.set(resp.datos ?? []);
        this.eliminadosCargados = true;
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        // Sin acceso a lo eliminado: se muestra "No hay pacientes eliminados".
        if (esSinPermiso(err)) {
          this.eliminados.set([]);
          return;
        }
        this.errorCarga.set('No se pudieron cargar los pacientes eliminados: ' + err.message);
      },
    });
  }

  private cargarCatalogos(): void {
    forkJoin({
      documentos: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.TIPO_DOCUMENTO),
      estados: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.ESTADO_PACIENTE),
    }).subscribe({
      next: (r) => {
        this.tiposDocumento.set(r.documentos.datos ?? []);
        this.estadosPaciente.set(r.estados.datos ?? []);
      },
      error: (err: Error) => this.notificaciones.error('No se pudieron cargar los catálogos: ' + err.message),
    });
  }

  nombreCompleto(p: {
    primerNombre: string;
    segundoNombre: string | null;
    primerApellido: string;
    segundoApellido: string | null;
  }): string {
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
  }

  iniciales(p: { primerNombre: string; primerApellido: string }): string {
    return `${p.primerNombre.charAt(0)}${p.primerApellido.charAt(0)}`.toUpperCase();
  }

  documentoLabel(idTipoDocumento: number | null): string {
    return this.tiposDocumento().find((t) => t.id === idTipoDocumento)?.nombre ?? '—';
  }

  estadoLabel(idEstadoPaciente: number): string {
    return this.estadosPaciente().find((e) => e.id === idEstadoPaciente)?.nombre ?? '—';
  }

  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  formatFecha(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  eliminar(p: PacienteListado): void {
    const nombre = this.nombreCompleto(p);
    if (!confirm(`¿Eliminar al paciente "${nombre}"? Esto no borra su expediente, solo lo marca como inactivo.`)) {
      return;
    }
    this.pacienteService.EliminarPaciente(p.idPaciente).subscribe({
      next: () => {
        this.lista.update((l) => l.filter((x) => x.idPaciente !== p.idPaciente));
        // Se vuelve a pedir la lista de eliminados la próxima vez que se abra
        // la pestaña, para traer quién y cuándo lo dio de baja.
        this.eliminadosCargados = false;
        this.notificaciones.exito(`Paciente "${nombre}" eliminado correctamente`);
      },
      error: (err: Error) => this.notificaciones.error('No se pudo eliminar el paciente: ' + err.message),
    });
  }

  reactivar(p: PacienteListado): void {
    const nombre = this.nombreCompleto(p);
    if (!confirm(`¿Reactivar al paciente "${nombre}"?`)) {
      return;
    }
    this.pacienteService.ReactivarPaciente(p.idPaciente).subscribe({
      next: () => {
        this.eliminados.update((l) => l.filter((x) => x.idPaciente !== p.idPaciente));
        this.cargarPacientes();
        this.notificaciones.exito(`Paciente "${nombre}" reactivado correctamente`);
      },
      error: (err: Error) => this.notificaciones.error('No se pudo reactivar el paciente: ' + err.message),
    });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.pacienteService.RetornarBitacoraGeneral('pacientes').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora pacientes:', err.status);
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
    if (tabla === 'pacientes') return 'Paciente';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'pacientes') return 'person';
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