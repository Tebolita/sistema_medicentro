import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  BitacoraItem,
  CamaOpcion,
  HospitalizacionesService,
  MedicoOpcion,
  OpcionCatalogo,
  UsuarioOpcion,
} from '../../service/hospitalizaciones.service';
import { PacientesService } from '../../service/pacientes.service';
import { MENU_SECTIONS } from '../../shared/menu-data';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

@Component({
  selector: 'app-hospitalizaciones-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './hospitalizaciones-lista.html',
  styleUrl: './hospitalizaciones-lista.css',
})
export class HospitalizacionesLista {
  private hospitalizacionesService = inject(HospitalizacionesService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);
  private notif = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  filtro = signal<'activas' | 'eliminadas'>('activas');

  medicosSignal = signal<MedicoOpcion[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);
  camasSignal = signal<CamaOpcion[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  filtroHistorial = signal<'todas' | 'hospitalizaciones' | 'ordenes'>('todas');

  bitacoraFiltrada = computed(() => {
    const filtro = this.filtroHistorial();
    const items = this.bitacoraSignal();
    if (filtro === 'todas') return items;
    if (filtro === 'hospitalizaciones') {
      return items.filter((i) => i.tablaAfectada === 'hospitalizaciones');
    }
    return items.filter((i) => i.tablaAfectada === 'ordenes_medicas_hospitalizacion');
  });

  opcionesHospitalizacion = MENU_SECTIONS.find((s) => s.slug === 'hospitalizacion')?.items ?? [];

  constructor() {
    this.hospitalizacionesService.RetornarMedicos().subscribe({
      next: (m) => this.medicosSignal.set(m),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionesLista] Error médicos:', err.status);
        this.notif.error('No se pudieron cargar los médicos');
      },
    });

    this.hospitalizacionesService.RetornarEstadosHospitalizacion().subscribe({
      next: (e) => this.estadosSignal.set(e),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionesLista] Error estados:', err.status);
      },
    });

    this.hospitalizacionesService.RetornarCamas().subscribe({
      next: (c) => this.camasSignal.set(c),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionesLista] Error camas:', err.status);
      },
    });

    this.hospitalizacionesService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [HospitalizacionesLista] Error usuarios:', err.status);
      },
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') return;
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });
  }

  hospitalizaciones = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const tab = this.filtro();

    const lista = tab === 'activas'
      ? this.hospitalizacionesService.listar()
      : this.hospitalizacionesService.listarInactivas();

    if (!term) return lista;

    return lista.filter((r) =>
      [
        this.nombrePaciente(r.hospitalizacion.idPaciente),
        this.medicoLabel(r.hospitalizacion.idMedicoResponsable),
        r.hospitalizacion.motivoIngreso,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.directorio().find((pac) => pac.idPaciente === idPaciente);
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
    return this.medicosSignal().find((m) => m.id === idMedico)?.nombre ?? '—';
  }

  camaLabel(idCama: number | null): string {
    if (idCama == null) return '—';
    return this.camasSignal().find((c) => c.id === idCama)?.label ?? '—';
  }

  estadoLabel(idEstadoHospitalizacion: number | null): string {
    if (idEstadoHospitalizacion == null) return '—';
    return this.estadosSignal().find((e) => e.id === idEstadoHospitalizacion)?.label ?? '—';
  }

  estadoClase(idEstadoHospitalizacion: number | null): string {
    const label = this.estadoLabel(idEstadoHospitalizacion).toLowerCase();
    if (label.includes('alta')) return 'estado-alta';
    if (label.includes('traslad')) return 'estado-trasladada';
    return 'estado-activa';
  }

  /**
   * ✅ FIX: fechaIngreso viene en HORA LOCAL (no UTC).
   */
  formatFecha(iso: string | null): string {
    if (!iso) return '—';
    const fecha = new Date(iso);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
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

  async eliminar(id: number, paciente: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Eliminar el registro de hospitalización de "${paciente}"?`))) return;
    this.hospitalizacionesService.eliminar(id);
    this.notif.exito('Ingreso hospitalario eliminado correctamente');
  }

  async reactivar(id: number): Promise<void> {
    if (!(await this.confirmacion.confirmar('¿Reactivar este ingreso hospitalario?'))) return;

    this.hospitalizacionesService.reactivar(id).subscribe({
      next: () => {
        this.notif.exito('Ingreso hospitalario reactivado correctamente');
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al reactivar hospitalización:', err);
        this.notif.error('No se pudo reactivar el ingreso');
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

    let itemsHospitalizaciones: BitacoraItem[] = [];
    let itemsOrdenes: BitacoraItem[] = [];
    let pendientes = 2;

    const finalizar = () => {
      pendientes--;
      if (pendientes <= 0) {
        const todos = [...itemsHospitalizaciones, ...itemsOrdenes].sort((a, b) =>
          b.fechaHora.localeCompare(a.fechaHora),
        );
        this.bitacoraSignal.set(todos);
        this.cargandoHistorial.set(false);
      }
    };

    this.hospitalizacionesService.RetornarBitacoraGeneral('hospitalizaciones').subscribe({
      next: (items) => {
        itemsHospitalizaciones = items;
        finalizar();
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora hospitalizaciones:', err.status);
        finalizar();
      },
    });

    this.hospitalizacionesService
      .RetornarBitacoraGeneral('ordenes_medicas_hospitalizacion')
      .subscribe({
        next: (items) => {
          itemsOrdenes = items;
          finalizar();
        },
        error: (err: HttpErrorResponse) => {
          console.error('❌ Error bitácora órdenes:', err.status);
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
    if (tabla === 'hospitalizaciones') return 'Ingreso hospitalario';
    if (tabla === 'ordenes_medicas_hospitalizacion') return 'Orden médica';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'hospitalizaciones') return 'bed';
    if (tabla === 'ordenes_medicas_hospitalizacion') return 'assignment';
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