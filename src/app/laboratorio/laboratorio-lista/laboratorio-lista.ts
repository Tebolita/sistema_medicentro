import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LaboratorioService,
  OrdenCompleta,
  TipoExamen,
  OpcionCatalogo,
  MedicoOpcion,
  BitacoraItem,
  UsuarioOpcion,
} from '../../service/laboratorio.service';
import { PacientesService } from '../../service/pacientes.service';
import { MENU_SECTIONS } from '../../shared/menu-data';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

@Component({
  selector: 'app-laboratorio-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './laboratorio-lista.html',
  styleUrl: './laboratorio-lista.css',
})
export class LaboratorioLista {
  private laboratorioService = inject(LaboratorioService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);
  private notif = inject(NotificacionesService);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  filtro = signal<'activas' | 'eliminadas'>('activas');

  tiposExamen = signal<TipoExamen[]>([]);
  medicos = signal<MedicoOpcion[]>([]);
  estados = signal<OpcionCatalogo[]>([]);
  prioridades = signal<OpcionCatalogo[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  // ============================================================
  // Historial general de Laboratorio
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  filtroHistorial = signal<'todas' | 'ordenes'>('todas');

  bitacoraFiltrada = computed(() => {
    const filtro = this.filtroHistorial();
    const items = this.bitacoraSignal();
    if (filtro === 'todas') return items;
    return items.filter((i) => i.tablaAfectada === 'ordenes_laboratorio');
  });

  opcionesLaboratorio =
    MENU_SECTIONS.find((s) => s.slug === 'laboratorio-diagnostico')?.items ?? [];

  constructor() {
    this.laboratorioService.RetornarTiposExamen().subscribe({
      next: (tipos) => this.tiposExamen.set(tipos),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [LaboratorioLista] Tipos examen:', err.status);
        this.notif.error('No se pudieron cargar los tipos de examen');
      },
    });

    this.laboratorioService.RetornarMedicos().subscribe({
      next: (m) => this.medicos.set(m),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [LaboratorioLista] Médicos:', err.status);
        this.notif.error('No se pudieron cargar los médicos');
      },
    });

    this.laboratorioService.RetornarEstadosOrden().subscribe({
      next: (e) => this.estados.set(e),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [LaboratorioLista] Estados:', err.status);
      },
    });

    this.laboratorioService.RetornarPrioridades().subscribe({
      next: (p) => this.prioridades.set(p),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [LaboratorioLista] Prioridades:', err.status);
      },
    });

    this.laboratorioService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [LaboratorioLista] Usuarios:', err.status);
      },
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') return;
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });
  }

  ordenes = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const tab = this.filtro();

    const lista = tab === 'activas'
      ? this.laboratorioService.listar()
      : this.laboratorioService.listarInactivas();

    if (!term) return lista;

    return lista.filter((r) =>
      [
        this.nombrePaciente(r.orden.idPaciente),
        this.medicoLabel(r.orden.idMedico),
        this.examenesTexto(r),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService
      .directorio()
      .find((pac) => pac.idPaciente === idPaciente);
    if (!p) return 'Paciente no encontrado';
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido]
      .filter(Boolean)
      .join(' ');
  }

  iniciales(idPaciente: number): string {
    const partes = this.nombrePaciente(idPaciente).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  medicoLabel(idMedico: number | null): string {
    if (idMedico == null) return '—';
    return this.medicos().find((m) => m.id === idMedico)?.nombre ?? '—';
  }

  examenesTexto(r: OrdenCompleta): string {
    return r.detalles
      .map((d) => this.tiposExamen().find((t) => t.idTipoExamen === d.idTipoExamen)?.nombre)
      .filter(Boolean)
      .join(', ');
  }

  prioridadLabel(idPrioridad: number | null): string {
    if (idPrioridad == null) return '—';
    return this.prioridades().find((p) => p.id === idPrioridad)?.label ?? '—';
  }

  esUrgente(idPrioridad: number | null): boolean {
    if (idPrioridad == null) return false;
    const label = this.prioridades().find((p) => p.id === idPrioridad)?.label ?? '';
    return label.toLowerCase().includes('urgente');
  }

  estadoLabel(idEstadoOrden: number | null): string {
    if (idEstadoOrden == null) return '—';
    return this.estados().find((e) => e.id === idEstadoOrden)?.label ?? '—';
  }

  estadoClase(idEstadoOrden: number | null): string {
    if (idEstadoOrden == null) return 'estado-solicitada';
    const label = (this.estados().find((e) => e.id === idEstadoOrden)?.label ?? '').toLowerCase();
    if (label.includes('complet')) return 'estado-completada';
    if (label.includes('cancel')) return 'estado-cancelada';
    if (label.includes('proceso')) return 'estado-en-proceso';
    return 'estado-solicitada';
  }

  /**
   * ✅ Formatea fecha de la orden (viene en LOCAL — la genera el frontend).
   */
  formatFecha(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * ✅ NUEVO: Formatea una fecha UTC corta para la card (día-mes, hh:mm).
   * Se usa para fechaCreacion y fechaModificacion en la sección de auditoría.
   */
  formatFechaUTC(iso: string | null): string {
    if (!iso) return '—';
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';
    const fecha = new Date(isoConZona);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * ✅ Formatea la fecha de eliminación (viene en UTC del backend).
   */
  formatFechaEliminacion(iso: string | null): string {
    if (!iso) return '—';
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';
    const fecha = new Date(isoConZona);
    if (isNaN(fecha.getTime())) return '—';
    return `el ${fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  usuarioLabel(idUsuario: number | null | undefined): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario #${idUsuario}`;
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar la orden de "${paciente}"?`)) return;
    this.laboratorioService.eliminar(id);
    this.notif.exito('Orden de laboratorio eliminada correctamente');
  }

  reactivar(id: number): void {
    if (!confirm('¿Reactivar esta orden de laboratorio?')) return;

    this.laboratorioService.reactivar(id).subscribe({
      next: () => {
        this.notif.exito('Orden de laboratorio reactivada correctamente');
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al reactivar orden:', err);
        this.notif.error('No se pudo reactivar la orden');
      },
    });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);
    this.filtroHistorial.set('todas');

    // "Todas" solo tenía sentido como pestaña distinta de "Órdenes de
    // laboratorio" si de verdad trae más de una tabla — antes solo se
    // pedía ordenes_laboratorio, así que las dos pestañas mostraban
    // exactamente lo mismo. orden_detalle (el detalle de exámenes de cada
    // orden) también tiene sus propias entradas de auditoría.
    let itemsOrdenes: BitacoraItem[] = [];
    let itemsDetalle: BitacoraItem[] = [];
    let pendientes = 2;

    const finalizar = () => {
      pendientes--;
      if (pendientes <= 0) {
        const todos = [...itemsOrdenes, ...itemsDetalle].sort((a, b) =>
          b.fechaHora.localeCompare(a.fechaHora),
        );
        this.bitacoraSignal.set(todos);
        this.cargandoHistorial.set(false);
      }
    };

    this.laboratorioService.RetornarBitacoraGeneral('ordenes_laboratorio').subscribe({
      next: (items) => {
        itemsOrdenes = items;
        finalizar();
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora laboratorio:', err.status);
        finalizar();
      },
    });

    this.laboratorioService.RetornarBitacoraGeneral('orden_detalle').subscribe({
      next: (items) => {
        itemsDetalle = items;
        finalizar();
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora detalle de orden:', err.status);
        finalizar();
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
    if (tabla === 'ordenes_laboratorio') return 'Orden de laboratorio';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'ordenes_laboratorio') return 'science';
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