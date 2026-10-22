import { HistorialCambios } from '../../shared/historial-cambios/historial-cambios';
import { tieneCambios } from '../../shared/bitacora-cambios';
import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, HabitacionesService, UsuarioOpcion } from '../../service/habitaciones.service';
import { CatalogosService } from '../../service/catalogos.service';
import { TIPOS_HABITACION, ESTADOS_HABITACION } from '../habitaciones-catalogos';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-habitaciones-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './habitaciones-lista.html',
  styleUrl: './habitaciones-lista.css',
})
export class HabitacionesLista {
  private habitacionesService = inject(HabitacionesService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private notificaciones = inject(NotificacionesService);

  private catalogos = inject(CatalogosService);
  private confirmacion = inject(ConfirmacionService);
  private tiposApi = this.catalogos.obtener('TIPO_HABITACION');
  private tipos = computed(() => {
    const api = this.tiposApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_HABITACION;
  });
  private estadosApi = this.catalogos.obtener('ESTADO_HABITACION');
  private estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_HABITACION;
  });

  buscar = signal('');
  errorAccion = signal('');

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.habitacionesService.cargandoEliminadas;
  errorEliminadas = this.habitacionesService.errorEliminadas;

  cargando = computed(() =>
    this.vista() === 'activas' ? this.habitacionesService.cargando() : this.cargandoEliminadas(),
  );
  errorCarga = computed(() =>
    this.vista() === 'activas' ? this.habitacionesService.errorCarga() : this.errorEliminadas(),
  );

  constructor() {
    this.habitacionesService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: Error) => console.error('❌ [HabitacionesLista] Error usuarios:', err.message),
    });
  }

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.habitacionesService.listarEliminadas().length) {
      this.habitacionesService.cargarEliminadas();
    }
  }

  habitaciones = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista =
      this.vista() === 'activas' ? this.habitacionesService.listar() : this.habitacionesService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((r) => r.habitacion.numero.toLowerCase().includes(term));
  });

  tipoLabel(idTipoHabitacion: number | null): string {
    if (!idTipoHabitacion) {
      return 'Sin tipo';
    }
    return this.tipos().find((t) => t.id === idTipoHabitacion)?.label ?? '—';
  }

  estadoLabel(idEstadoHabitacion: number): string {
    return this.estados().find((e) => e.id === idEstadoHabitacion)?.label ?? '—';
  }

  async eliminar(id: number, numero: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Dar de baja la habitación "${numero}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.habitacionesService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  async reactivar(id: number, numero: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Reactivar la habitación "${numero}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.habitacionesService.reactivar(id).subscribe({
      next: () => this.notificaciones.exito('Reactivado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.habitacionesService.RetornarBitacoraGeneral('habitaciones').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora habitaciones:', err.message);
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
    if (tabla === 'habitaciones') return 'Habitación';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'habitaciones') return 'bed';
    return 'description';
  }

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario #${idUsuario}`;
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
