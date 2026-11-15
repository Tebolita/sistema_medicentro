import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem } from '../../service/medicamentos.service';
import { ServiciosService } from '../../service/servicios.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-servicios-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './servicios-lista.html',
  styleUrl: './servicios-lista.css',
})
export class ServiciosLista {
  private serviciosService = inject(ServiciosService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);

  buscar = signal('');
  errorAccion = signal('');

  vista = signal<Vista>('activos');
  cargandoEliminados = this.serviciosService.cargandoEliminados;
  errorEliminados = this.serviciosService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.serviciosService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.serviciosService.errorCarga() : this.errorEliminados()));

  // ============================================================
  // Historial general de Servicios
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    afterNextRender(() => {
      this.serviciosService.cargar();
    });
  }

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    if (!this.serviciosService.listarEliminados().length) {
      this.serviciosService.cargarEliminados();
    }
  }

  servicios = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.serviciosService.listar() : this.serviciosService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((s) => [s.nombre, s.descripcion].filter(Boolean).join(' ').toLowerCase().includes(term));
  });

  async eliminar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Dar de baja el servicio "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.serviciosService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  async reactivar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Reactivar el servicio "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.serviciosService.reactivar(id).subscribe({
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

    this.serviciosService.RetornarBitacoraGeneral('servicios').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora servicios:', err.status);
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
    if (tabla === 'servicios') return 'Servicio';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'servicios') return 'design_services';
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
