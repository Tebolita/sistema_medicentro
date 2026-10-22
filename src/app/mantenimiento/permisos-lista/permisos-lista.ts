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
import { BitacoraItem, PermisosService } from '../../service/permisos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { CatalogosService } from '../../service/catalogos.service';
import { MODULOS_SISTEMA } from '../permisos-catalogos';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-permisos-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './permisos-lista.html',
  styleUrl: './permisos-lista.css',
})
export class PermisosLista {
  private permisosService = inject(PermisosService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  // ============================================================
  // Historial general de Permisos
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  private catalogos = inject(CatalogosService);
  private modulosApi = this.catalogos.obtener('MODULO_SISTEMA');
  private modulos = computed(() => {
    const api = this.modulosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : MODULOS_SISTEMA;
  });

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminados": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activos');
  cargandoEliminados = this.permisosService.cargandoEliminados;
  errorEliminados = this.permisosService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.permisosService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.permisosService.errorCarga() : this.errorEliminados()));

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    if (!this.permisosService.listarEliminados().length) {
      this.permisosService.cargarEliminados();
    }
  }

  permisos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.permisosService.listar() : this.permisosService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((p) => [p.nombre, p.codigo].join(' ').toLowerCase().includes(term));
  });

  moduloLabel(idModulo: number): string {
    return this.modulos().find((m) => m.id === idModulo)?.label ?? '—';
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja el permiso "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.permisosService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, nombre: string): void {
    if (!confirm(`¿Reactivar el permiso "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.permisosService.reactivar(id).subscribe({
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

    this.permisosService.RetornarBitacoraGeneral('permisos').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora permisos:', err);
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
    if (tabla === 'permisos') return 'Permiso';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'permisos') return 'key';
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
