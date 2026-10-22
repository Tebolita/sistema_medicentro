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
import { BitacoraItem, PuestosService } from '../../service/puestos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-puestos-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './puestos-lista.html',
  styleUrl: './puestos-lista.css',
})
export class PuestosLista {
  private puestosService = inject(PuestosService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);

  // ============================================================
  // Historial general de Puestos
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminados": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activos');
  cargandoEliminados = this.puestosService.cargandoEliminados;
  errorEliminados = this.puestosService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.puestosService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.puestosService.errorCarga() : this.errorEliminados()));

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    if (!this.puestosService.listarEliminados().length) {
      this.puestosService.cargarEliminados();
    }
  }

  puestos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.puestosService.listar() : this.puestosService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((p) => p.nombre.toLowerCase().includes(term));
  });

  async eliminar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Dar de baja el puesto "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.puestosService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  async reactivar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Reactivar el puesto "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.puestosService.reactivar(id).subscribe({
      next: () => this.notificaciones.exito('Reactivado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  usuarioLabel(id: number | null): string {
    if (!id) return 'Sistema';
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.puestosService.RetornarBitacoraGeneral('puestos').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora puestos:', err);
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
    if (tabla === 'puestos') return 'Puesto';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'puestos') return 'work';
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
